import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth.js';
import ctvRouter from '../src/routes/ctv.js';
import tnvRouter from '../src/routes/tnv.js';
import campaignsRouter from '../src/routes/campaigns.js';
import { generateTestToken } from './helpers/token.js';
import { initSchema, db } from '../src/db/index.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/ctv', ctvRouter);
  app.use('/api/tnv', tnvRouter);
  app.use('/api/campaigns', campaignsRouter);
  return app;
}

describe('Admin Campaign Override: Attendance & Special Points', () => {
  let app;
  let adminToken;
  let leaderCtvToken;
  let leaderTnvToken;

  beforeAll(async () => {
    await initSchema();
    app = createTestApp();
    adminToken = generateTestToken({ role: 'admin', displayName: 'Ban Quản Trị' });
    leaderCtvToken = generateTestToken({ role: 'ctv_leader', targetType: 'ctv', groupNum: 1, displayName: 'Nhóm trưởng CTV 1' });
    leaderTnvToken = generateTestToken({ role: 'tnv_leader', targetType: 'tnv', groupNum: 1, displayName: 'Nhóm trưởng TNV 1' });
  });

  it('TC-OVERRIDE-01: Non-admin users should be rejected with 403 Forbidden', async () => {
    // 1. Calling without token -> 401
    const unauthRes = await request(app)
      .put('/api/campaigns/1/override-attendance')
      .send({ registrationId: 1, finalPoints: 15 });
    expect(unauthRes.status).toBe(401);

    // 2. Calling with Leader token -> 403
    const leaderRes = await request(app)
      .put('/api/campaigns/1/override-attendance')
      .set('Authorization', `Bearer ${leaderCtvToken}`)
      .send({ registrationId: 1, finalPoints: 15 });
    expect(leaderRes.status).toBe(403);
  });

  it('TC-OVERRIDE-02: Admin should award bonus points (+5) to CTV member with point logs', async () => {
    const ts = Date.now();
    // 1. Tạo CTV test
    const ctvInsert = await db.run(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, attitude_points, activity_points, total_points)
      VALUES (?, ?, 1, 'Thành viên', 0, 0, 0)
    `, [`CTV_OVR_${ts}`, `CTV Test Override ${ts}`]);
    const memberId = ctvInsert.lastInsertRowid || ctvInsert.id;

    // 2. Tạo Campaign test (10 điểm)
    const campRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Chiến dịch Test Override CTV ${ts}`,
        eventDate: '2026-11-01',
        points: 10,
        targetType: 'all',
        shifts: []
      });
    expect([200, 201]).toContain(campRes.status);
    const campaignId = campRes.body.data.id;

    // 3. Đăng ký CTV vào chiến dịch
    const regRes = await request(app)
      .post(`/api/campaigns/${campaignId}/register`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ memberType: 'ctv', memberId, groupNum: 1 });
    expect([200, 201]).toContain(regRes.status);
    const registrationId = regRes.body.data.id;

    // 4. Admin thực hiện Can thiệp đặc cách: Thưởng +5 điểm (Tổng finalPoints = 15)
    const overrideRes = await request(app)
      .put(`/api/campaigns/${campaignId}/override-attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationId,
        attendanceStatus: 'co_mat',
        finalPoints: 15,
        reason: 'Trưởng kíp xuất sắc'
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.success).toBe(true);
    expect(overrideRes.body.data.points_awarded).toBe(15);
    expect(overrideRes.body.data.admin_override_points).toBe(5);
    expect(overrideRes.body.data.admin_override_reason).toBe('Trưởng kíp xuất sắc');

    // 5. Kiểm tra hồ sơ điểm CTV
    const memberRow = await db.get('SELECT * FROM ctv_members WHERE id = ?', [memberId]);
    expect(Number(memberRow.activity_points)).toBe(15);
    expect(Number(memberRow.total_points)).toBe(15);

    // 6. Kiểm tra point log
    const logRow = await db.get('SELECT * FROM ctv_point_logs WHERE member_id = ? ORDER BY id DESC LIMIT 1', [memberId]);
    expect(logRow.type).toBe('activity');
    expect(logRow.points_delta).toBe(15);
    expect(logRow.title).toContain('[Admin Đặc Cách]');
    expect(logRow.note).toContain('Trưởng kíp xuất sắc');
  });

  it('TC-OVERRIDE-03: Admin should apply penalty deduction (-4) to TNV member', async () => {
    const ts = Date.now();
    // 1. Tạo TNV test ban đầu có 50 điểm
    const tnvInsert = await db.run(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, total_points)
      VALUES (?, ?, 1, 'Tình nguyện viên', 50)
    `, [`TNV_OVR_${ts}`, `TNV Test Override ${ts}`]);
    const memberId = tnvInsert.lastInsertRowid || tnvInsert.id;

    // 2. Tạo Campaign test (10 điểm)
    const campRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Chiến dịch Test Override TNV ${ts}`,
        eventDate: '2026-11-02',
        points: 10,
        targetType: 'all',
        shifts: []
      });
    const campaignId = campRes.body.data.id;

    // 3. Đăng ký & điểm danh thông thường trước (nhận 10 điểm -> tổng điểm thành 60)
    const regRes = await request(app)
      .post(`/api/campaigns/${campaignId}/register`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ memberType: 'tnv', memberId, groupNum: 1 });
    const registrationId = regRes.body.data.id;

    await request(app)
      .put(`/api/campaigns/${campaignId}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationId, attendanceStatus: 'co_mat' });

    const beforeOverrideMember = await db.get('SELECT total_points FROM tnv_members WHERE id = ?', [memberId]);
    expect(Number(beforeOverrideMember.total_points)).toBe(60);

    // 4. Admin phát hiện đến muộn, can thiệp giảm điểm xuống chỉ còn 6 điểm (Phạt -4 điểm so với điểm chuẩn 10đ)
    const overrideRes = await request(app)
      .put(`/api/campaigns/${campaignId}/override-attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationId,
        attendanceStatus: 'co_mat',
        finalPoints: 6,
        reason: 'Đến muộn quá 30 phút'
      });

    expect(overrideRes.status).toBe(200);
    expect(overrideRes.body.data.points_awarded).toBe(6);
    expect(overrideRes.body.data.admin_override_points).toBe(-4);
    expect(overrideRes.body.data.admin_override_reason).toBe('Đến muộn quá 30 phút');

    // 5. Kiểm tra tổng điểm TNV: 60 - 4 = 56 điểm
    const afterOverrideMember = await db.get('SELECT total_points FROM tnv_members WHERE id = ?', [memberId]);
    expect(Number(afterOverrideMember.total_points)).toBe(56);

    // 6. Kiểm tra tnv_activities log
    const actRow = await db.get('SELECT * FROM tnv_activities WHERE member_id = ? ORDER BY id DESC LIMIT 1', [memberId]);
    expect(actRow.category).toBe('Đặc cách Admin');
    expect(actRow.points).toBe(-4);
    expect(actRow.note).toContain('Đến muộn quá 30 phút');
  });

  it('TC-OVERRIDE-04: Should return 404 when registration does not exist', async () => {
    const res = await request(app)
      .put('/api/campaigns/99999/override-attendance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationId: 99999, finalPoints: 10 });
    expect(res.status).toBe(404);
  });
});
