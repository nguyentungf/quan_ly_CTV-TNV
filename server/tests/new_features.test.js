import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/app.js';
import { generateTestToken } from './helpers/token.js';
import { db, initSchema } from '../src/db/index.js';
import campaignsRouter from '../src/routes/campaigns.js';
import tnvRouter from '../src/routes/tnv.js';

describe('Kiểm thử 4 Nghiệp Vụ Mới', () => {
  let app;
  let adminToken;
  let leaderToken;

  beforeAll(async () => {
    await initSchema();
    app = createTestApp();
    app.use('/api/campaigns', campaignsRouter);
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

  // Nghiệp vụ 1 & 4: Tạo hoạt động có Kíp & Đăng ký chọn từng thành viên theo Kíp
  it('Nghiệp vụ 4 & 1: Admin tạo hoạt động có Kíp, Trưởng nhóm đăng ký chọn từng thành viên theo Kíp', async () => {
    // 1. Admin tạo campaign có Kíp
    const shiftsData = [
      { id: 'k1', name: 'Kíp 1 (Sáng)', time: '07:30 - 11:30' },
      { id: 'k2', name: 'Kíp 2 (Chiều)', time: '13:30 - 17:30' }
    ];

    const createRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Hoạt động Test Phân Kíp',
        description: 'Mô tả test',
        location: 'Sân C2',
        eventDate: '2026-11-20',
        points: 10,
        targetType: 'ctv',
        status: 'dang_mo_dang_ky',
        shifts: shiftsData
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.success).toBe(true);
    const campaignId = createRes.body.data.id;

    // 2. Lấy 2 thành viên CTV nhóm 1
    const ctvMembers = await db.all("SELECT id FROM ctv_members WHERE group_num = 1 LIMIT 2");
    expect(ctvMembers.length).toBeGreaterThanOrEqual(2);

    const m1 = ctvMembers[0].id;
    const m2 = ctvMembers[1].id;

    // 3. Trưởng nhóm đăng ký chọn từng thành viên kèm kíp cụ thể (m1 kíp 1, m2 kíp 2)
    const regRes = await request(app)
      .post(`/api/campaigns/${campaignId}/register-group`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        memberType: 'ctv',
        groupNum: 1,
        registeredBy: 'Nhóm trưởng Nhóm 1',
        selectedMembers: [
          { memberId: m1, shiftId: 'k1', shiftName: 'Kíp 1 (Sáng)' },
          { memberId: m2, shiftId: 'k2', shiftName: 'Kíp 2 (Chiều)' }
        ]
      });

    if (regRes.status !== 200) {
      console.error('regRes error body:', regRes.body);
    }
    expect(regRes.status).toBe(200);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.totalSelected).toBe(2);

    // 4. Lấy danh sách đăng ký và kiểm tra shift_id, shift_name
    const getRegsRes = await request(app)
      .get(`/api/campaigns/${campaignId}/registrations`);

    expect(getRegsRes.status).toBe(200);
    const regs = getRegsRes.body.data;
    const reg1 = regs.find(r => r.member_id === m1);
    const reg2 = regs.find(r => r.member_id === m2);

    expect(reg1).toBeDefined();
    expect(reg1.shift_id).toBe('k1');
    expect(reg1.shift_name).toBe('Kíp 1 (Sáng)');

    expect(reg2).toBeDefined();
    expect(reg2.shift_id).toBe('k2');
    expect(reg2.shift_name).toBe('Kíp 2 (Chiều)');

    // 5. Kiểm tra xuất Excel phân kíp
    const excelRes = await request(app)
      .get(`/api/campaigns/${campaignId}/export-xlsx`);

    expect(excelRes.status).toBe(200);
    expect(excelRes.headers['content-type']).toContain('spreadsheetml');
  });

  // Nghiệp vụ 3: Chuẩn hóa 3 trạng thái điểm danh & logic thưởng/phạt chuyên cần tuần
  it('Nghiệp vụ 3: Chuẩn hóa 3 trạng thái điểm danh và tính chuyên cần +5 / phạt -5', async () => {
    // Tạo 1 CTV test
    const testMssv = `test_${Date.now()}`;
    const newMember = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Test Chuyên Cần', 1, 'Thành viên', 'Nam', 'ET1', '0912', 'test@sis', 0, 0, 0, 'Đang hoạt động')
      RETURNING *
    `, [testMssv]);

    const mid = newMember.id;

    // Lấy 2 event CTV
    const events = await db.all("SELECT id FROM ctv_events LIMIT 2");
    expect(events.length).toBeGreaterThanOrEqual(2);
    const e1 = events[0].id;
    const e2 = events[1].id;

    // 1. Điểm danh tham_gia cho cả 2 tuần
    const attRes1 = await request(app)
      .post('/api/ctv/attendance')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ memberId: mid, eventId: e1, status: 'tham_gia' });
    expect(attRes1.status).toBe(200);
    expect(attRes1.body.status).toBe('tham_gia');

    const attRes2 = await request(app)
      .post('/api/ctv/attendance')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ memberId: mid, eventId: e2, status: 'tham_gia' });
    expect(attRes2.status).toBe(200);

    // 2. Chuyển tuần 1 sang không phép -> kiểm tra bị phạt -5 điểm
    const attResFail = await request(app)
      .post('/api/ctv/attendance')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ memberId: mid, eventId: e1, status: 'khong_phep' });
    expect(attResFail.status).toBe(200);
    expect(attResFail.body.status).toBe('khong_phep');

    // Kiểm tra CTV bị trừ 5 điểm và có log trừ vi phạm
    const memberAfterPenalty = await db.get('SELECT attitude_points, total_points FROM ctv_members WHERE id = ?', [mid]);
    expect(memberAfterPenalty.attitude_points).toBe(-5);

    const logPenalty = await db.get("SELECT * FROM ctv_point_logs WHERE member_id = ? AND points_delta = -5", [mid]);
    expect(logPenalty).toBeDefined();
    expect(logPenalty.title).toContain('Trừ điểm vi phạm');

    // 3. Sửa tuần 1 từ không phép sang có phép -> thu hồi phạt -5 (về 0)
    const attResExcused = await request(app)
      .post('/api/ctv/attendance')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ memberId: mid, eventId: e1, status: 'co_phep' });
    expect(attResExcused.status).toBe(200);
    expect(attResExcused.body.status).toBe('co_phep');

    const memberAfterExcused = await db.get('SELECT attitude_points, total_points FROM ctv_members WHERE id = ?', [mid]);
    expect(memberAfterExcused.attitude_points).toBe(0);

    // 4. Dọn dẹp test member
    await db.run('DELETE FROM ctv_attendance WHERE member_id = ?', [mid]);
    await db.run('DELETE FROM ctv_point_logs WHERE member_id = ?', [mid]);
    await db.run('DELETE FROM ctv_members WHERE id = ?', [mid]);
  });
});
