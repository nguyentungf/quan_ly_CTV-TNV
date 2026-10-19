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
});
