import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app.js';
import { generateTestToken } from '../helpers/token.js';
import { db, initSchema } from '../../src/db/index.js';
import campaignsRouter from '../../src/routes/campaigns.js';
import ctvRouter from '../../src/routes/ctv.js';
import tnvRouter from '../../src/routes/tnv.js';

describe('Audit: Concurrency & Race Conditions', () => {
  let app;
  let adminToken;
  let leaderToken;

  beforeAll(async () => {
    await initSchema();
    app = createTestApp();
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/ctv', ctvRouter);
    app.use('/api/tnv', tnvRouter);

    adminToken = generateTestToken({
      role: 'admin',
      targetType: 'admin',
      displayName: 'Ban Quản Trị'
    });

    leaderToken = generateTestToken({
      role: 'leader',
      targetType: 'ctv',
      groupNum: 1,
      displayName: 'Nhóm trưởng Nhóm 1'
    });
  });

  it('BUG-01: db.transaction should safely serialize concurrent async transactions without throwing "cannot start a transaction within a transaction"', async () => {
    // Attempt two simultaneous transactions with an asynchronous delay inside
    const runTx = async (txId) => {
      return db.transaction(async (txDb) => {
        await txDb.get('SELECT 1');
        await new Promise((r) => setTimeout(r, 50));
        await txDb.get('SELECT 2');
        return txId;
      });
    };

    // If SQLite does not synchronize async transactions, the second call throws
    // SqliteError: cannot start a transaction within a transaction
    const results = await Promise.allSettled([runTx(1), runTx(2)]);
    const rejected = results.filter((r) => r.status === 'rejected');
    
    // An ideal database abstraction must successfully serialize transactions
    // Asserting that no transaction should crash
    expect(rejected.length, `Transaction collision occurred: ${rejected[0]?.reason?.message}`).toBe(0);
  });

  it('BUG-02: Concurrent point additions should not suffer from lost updates', async () => {
    // 1. Create a test CTV member
    const testMssv = `AUDIT_${Date.now()}`;
    const insertRes = await db.run(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, status, attitude_points, activity_points, total_points)
      VALUES (?, 'Audit CTV Concurrency', 1, 'Thành viên', 'Đang hoạt động', 0, 0, 0)
    `, [testMssv]);

    const member = await db.get('SELECT id FROM ctv_members WHERE mssv = ?', [testMssv]);
    const memberId = member.id;

    // 2. Fire 5 concurrent requests adding 5 attitude points each
    const calls = Array.from({ length: 5 }).map((_, i) =>
      request(app)
        .post('/api/ctv/attitude-activity')
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          memberId,
          type: 'attitude',
          title: `Concurrent Award ${i}`,
          pointsDelta: 5,
          note: 'Audit concurrency'
        })
    );

    await Promise.all(calls);

    // 3. Expected attitude points: 5 * 5 = 25
    const updatedMember = await db.get('SELECT attitude_points, total_points FROM ctv_members WHERE id = ?', [memberId]);
    
    // In buggy code: In-memory stale points calculation causes lost updates (actual < 25)
    expect(updatedMember.attitude_points).toBe(25);
  });

  it('BUG-05: Double-click attendance marking should not award double points', async () => {
    // 1. Create campaign
    const camp = await db.get(`
      INSERT INTO campaigns (name, description, location, event_date, points, target_type, status)
      VALUES ('Audit Attendance Race', 'Desc', 'Hall', '2026-11-20', 10, 'ctv', 'dang_mo_dang_ky')
      RETURNING *
    `);

    // 2. Create member and registration
    const testMssv = `AUDIT_ATT_${Date.now()}`;
    await db.run(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, status, attitude_points, activity_points, total_points)
      VALUES (?, 'Audit CTV Attendance', 1, 'Thành viên', 'Đang hoạt động', 0, 0, 0)
    `, [testMssv]);
    const member = await db.get('SELECT id FROM ctv_members WHERE mssv = ?', [testMssv]);

    const reg = await db.get(`
      INSERT INTO campaign_registrations (campaign_id, member_type, member_id, group_num, attendance_status, points_awarded)
      VALUES (?, 'ctv', ?, 1, 'chua_diem_danh', 0)
      RETURNING *
    `, [camp.id, member.id]);

    // 3. Send 2 simultaneous requests marking attendance as 'co_mat' (double click simulation)
    const [res1, res2] = await Promise.all([
      request(app)
        .put(`/api/campaigns/${camp.id}/attendance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ registrationId: reg.id, attendanceStatus: 'co_mat' }),
      request(app)
        .put(`/api/campaigns/${camp.id}/attendance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ registrationId: reg.id, attendanceStatus: 'co_mat' })
    ]);

    // 4. Verify points awarded in member and registration
    const updatedMember = await db.get('SELECT activity_points, total_points FROM ctv_members WHERE id = ?', [member.id]);
    const pointLogs = await db.all('SELECT * FROM ctv_point_logs WHERE member_id = ? AND title LIKE ?', [member.id, `%${camp.name}%`]);

    // Should award exactly 10 points once, not 20 points
    expect(updatedMember.activity_points).toBe(10);
    expect(pointLogs.length).toBe(1);
  });
});

