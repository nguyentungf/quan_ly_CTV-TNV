import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createTestApp } from '../helpers/app.js';
import { generateTestToken } from '../helpers/token.js';
import { db, initSchema } from '../../src/db/index.js';
import ctvRouter from '../../src/routes/ctv.js';
import tnvRouter from '../../src/routes/tnv.js';
import campaignsRouter from '../../src/routes/campaigns.js';
import authRouter from '../../src/routes/auth.js';
import evaluationsRouter from '../../src/routes/evaluations.js';

describe('Audit: Security & Access Control Vulnerabilities', () => {
  let app;
  let leaderToken;

  beforeAll(async () => {
    await initSchema();
    app = createTestApp();
    app.use('/api/auth', authRouter);
    app.use('/api/ctv', ctvRouter);
    app.use('/api/tnv', tnvRouter);
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/evaluations', evaluationsRouter);

    leaderToken = generateTestToken({
      role: 'leader',
      targetType: 'tnv',
      groupNum: 1,
      displayName: 'Nhóm trưởng TNV 1'
    });
  });

  it('BUG-03: Export endpoints should require authentication to prevent PII exfiltration', async () => {
    // 1. Check CTV export-csv without Authorization header
    const ctvCsvRes = await request(app).get('/api/ctv/export-csv');
    // 2. Check CTV export-xlsx without Authorization header
    const ctvXlsxRes = await request(app).get('/api/ctv/export-xlsx');
    // 3. Check TNV export-csv without Authorization header
    const tnvCsvRes = await request(app).get('/api/tnv/export-csv');
    // 4. Check TNV export-xlsx without Authorization header
    const tnvXlsxRes = await request(app).get('/api/tnv/export-xlsx');

    // Expected behavior: Unauthenticated requests MUST receive 401 Unauthorized
    // In current buggy code: Returns 200 OK with full PII data (MSSV, phone, email, full name)
    expect(ctvCsvRes.status, 'CTV CSV export leaked to public').toBe(401);
    expect(ctvXlsxRes.status, 'CTV XLSX export leaked to public').toBe(401);
    expect(tnvCsvRes.status, 'TNV CSV export leaked to public').toBe(401);
    expect(tnvXlsxRes.status, 'TNV XLSX export leaked to public').toBe(401);
  });

  it('BUG-06: Group Leaders should NOT have permission to issue disciplinary warnings (Privilege Escalation)', async () => {
    // 1. Create a test TNV member in Group 1
    const testMssv = `TNV_WARN_${Date.now()}`;
    await db.run(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, status, warning_level, total_points)
      VALUES (?, 'Audit Disciplinary Target', 1, 'Thành viên', 'Đang hoạt động', 'none', 0)
    `, [testMssv]);
    const member = await db.get('SELECT id FROM tnv_members WHERE mssv = ?', [testMssv]);

    // 2. Group Leader tries to apply disciplinary warning 'canh_cao_2'
    const res = await request(app)
      .post('/api/tnv/bulk-action')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        action: 'set_warning',
        memberIds: [member.id],
        payload: {
          warningLevel: 'canh_cao_2',
          warningNote: 'Unauthorized warning by group leader'
        }
      });

    // Disciplinary actions must strictly require Admin (403 Forbidden for leader)
    // In current buggy code: checkGroupPermission passes and returns 200 OK
    expect(res.status, 'Group leader was able to set disciplinary warning').toBe(403);
  });

  it('BUG-07: Forged Admin JWT token with hardcoded default secret should be rejected', async () => {
    // Attacker crafts Admin token using public default secret
    const forgedPayload = {
      role: 'admin',
      targetType: 'admin',
      displayName: 'Malicious Attacker',
      exp: Date.now() + 86400000
    };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(forgedPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', 'quan-ly-ctv-tnv-secret-key-2026').update(`${header}.${body}`).digest('base64url');
    const forgedToken = `${header}.${body}.${signature}`;

    // Test hitting an admin-protected endpoint with forged token
    const res = await request(app)
      .post('/api/ctv/merge-groups')
      .set('Authorization', `Bearer ${forgedToken}`)
      .send({ sourceGroup: 2, targetGroup: 1 });

    // When default secret is banned in production/secured, forged tokens should be rejected (401/403)
    // In current buggy code: Accepted as valid Admin!
    expect(res.status, 'Forged JWT with default secret was accepted').toBe(401);
  });

  it('BUG-08: Repeated failed logins should trigger rate limiting (429)', async () => {
    const attempts = [];
    for (let i = 0; i < 30; i++) {
      attempts.push(
        request(app)
          .post('/api/auth/login')
          .send({ loginType: 'admin', password: `wrong_pass_${i}` })
      );
    }

    const responses = await Promise.all(attempts);
    const rateLimited = responses.filter(r => r.status === 429);

    // Systems should rate limit brute-force login attempts
    // In current buggy code: Zero rate limiting, all 30 return 401
    expect(rateLimited.length, 'No rate limiting protection on login endpoint').toBeGreaterThan(0);
  });

  it('SEC-IDOR-01: Leader creating member with another groupNum is forced to their own groupNum', async () => {
    const testMssv = `SEC_IDOR_${Date.now()}`;
    const res = await request(app)
      .post('/api/tnv/members')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        mssv: testMssv,
        fullName: 'IDOR Creation Test Target',
        groupNum: 3 // Leader is group 1, attempts to create into group 3
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.group_num).toBe(1); // Forced to Leader's groupNum 1
  });

  it('SEC-IDOR-02: Leader attempting to edit or delete cross-group member is rejected with 403 Forbidden', async () => {
    // 1. Create a member belonging to Group 2
    const targetMssv = `SEC_G2_${Date.now()}`;
    const memberG2 = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, status)
      VALUES (?, 'Group 2 Cross-Group Target', 2, 'Thành viên', 'Đang hoạt động')
      RETURNING *
    `, [targetMssv]);

    // 2. Leader of Group 1 attempts to PUT member of Group 2 -> 403 Forbidden
    const putRes = await request(app)
      .put(`/api/tnv/members/${memberG2.id}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        fullName: 'Hacked Name',
        groupNum: 1
      });
    expect(putRes.status).toBe(403);
    expect(putRes.body.success).toBe(false);

    // 3. Leader of Group 1 attempts to DELETE member of Group 2 -> 403 Forbidden
    const delRes = await request(app)
      .delete(`/api/tnv/members/${memberG2.id}`)
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(delRes.status).toBe(403);
    expect(delRes.body.success).toBe(false);
  });

  it('SEC-IDOR-03: Leader attempting to register campaign for cross-group member is rejected with 403 Forbidden', async () => {
    // 1. Create campaign
    const camp = await db.get(`
      INSERT INTO campaigns (name, description, location, event_date, points, target_type, status)
      VALUES ('SEC Campaign', 'Test', 'Hanoi', '2026-11-01', 10, 'tnv', 'dang_mo_dang_ky')
      RETURNING id
    `);

    // 2. Create Group 2 member
    const g2Member = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, status)
      VALUES (?, 'G2 Cam Target', 2, 'Thành viên', 'Đang hoạt động')
      RETURNING id
    `, [`SEC_CAM_${Date.now()}`]);

    // 3. Leader of Group 1 attempts register-group with Group 2 memberId -> 403 Forbidden
    const regRes = await request(app)
      .post(`/api/campaigns/${camp.id}/register-group`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        memberType: 'tnv',
        groupNum: 1,
        memberIds: [g2Member.id]
      });
    expect(regRes.status).toBe(403);
    expect(regRes.body.message).toContain('Phát hiện thao tác trái phép');
  });

  it('SEC-IDOR-04: Leader attempting to override manual attendance/activity scores in grade-draft is prevented', async () => {
    // 1. Create member in Leader's group (Group 1)
    const g1Member = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, status, total_points)
      VALUES (?, 'G1 Eval Target', 1, 'Thành viên', 'Đang hoạt động', 0)
      RETURNING id
    `, [`SEC_EVAL_${Date.now()}`]);

    // 2. Leader submits draft attempting to inject 9999 attendance and activity points
    const draftRes = await request(app)
      .post('/api/evaluations/grade-draft')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        period: 'midterm',
        memberType: 'tnv',
        evaluations: [{
          memberId: g1Member.id,
          attendanceScore: 9999, // Forged manual attendance score
          activityScore: 9999,   // Forged manual activity score
          qualitativeScore: 10,
          notes: 'Legit qualitative score'
        }]
      });

    expect(draftRes.status).toBe(200);

    // 3. Verify in DB: Attendance & Activity scores were NOT overwritten by forged values!
    const savedEval = await db.get(
      'SELECT attendance_score, activity_score, qualitative_score FROM evaluations WHERE period = ? AND member_type = ? AND member_id = ?',
      ['midterm', 'tnv', g1Member.id]
    );
    expect(savedEval.attendance_score).not.toBe(9999);
    expect(savedEval.activity_score).not.toBe(9999);
    expect(savedEval.qualitative_score).toBe(10);
  });
});

