import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/app.js';
import { generateTestToken } from './helpers/token.js';
import { db, initSchema } from '../src/db/index.js';
import ctvRouter from '../src/routes/ctv.js';
import campaignsRouter from '../src/routes/campaigns.js';
import tnvRouter from '../src/routes/tnv.js';
import evaluationsRouter from '../src/routes/evaluations.js';
import * as XLSX from 'xlsx';

describe('Kiểm thử 4 Nghiệp Vụ Mới', () => {
  let app;
  let adminToken;
  let leaderToken;

  beforeAll(async () => {
    await initSchema();
    app = createTestApp();
    app.use('/api/ctv', ctvRouter);
    app.use('/api/campaigns', campaignsRouter);
    app.use('/api/tnv', tnvRouter);
    app.use('/api/evaluations', evaluationsRouter);

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

    // 2. Đảm bảo có ít nhất 2 thành viên CTV nhóm 1
    let ctvMembers = await db.all("SELECT id FROM ctv_members WHERE group_num = 1 LIMIT 2");
    while (ctvMembers.length < 2) {
      const idx = ctvMembers.length + 1;
      const m = await db.get(`
        INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
        VALUES (?, ?, 1, 'Thành viên', 'Nam', 'ET1', '0912345678', 'test@sis.edu.vn', 0, 0, 0, 'Đang hoạt động')
        RETURNING *
      `, [`test_ctv_fix_${Date.now()}_${idx}`, `CTV Test ${idx}`]);
      ctvMembers.push(m);
    }

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

    // Lấy 2 event CTV, nếu thiếu thì tự tạo
    let events = await db.all("SELECT id FROM ctv_events LIMIT 2");
    while (events.length < 2) {
      const idx = events.length + 1;
      const ev = await db.get(`
        INSERT INTO ctv_events (name, event_date)
        VALUES (?, '2026-10-20')
        RETURNING *
      `, [`Tuần Test ${idx}`]);
      events.push(ev);
    }
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

  // Nghiệp vụ Đánh giá Nửa kỳ & Toàn kỳ
  it('Nghiệp vụ Đánh giá Nửa kỳ & Toàn kỳ: Quản lý Rubric, Bảng tổng hợp dynamic, Lưu nháp và Admin Khóa điểm', async () => {
    // 1. Kiểm tra lấy rubric mặc định
    const rubricRes = await request(app).get('/api/evaluations/rubric');
    expect(rubricRes.status).toBe(200);
    expect(rubricRes.body.success).toBe(true);
    expect(rubricRes.body.data.attendanceWeight).toBe(30);

    // 2. Tạo 1 CTV test để đánh giá
    const ctvMssv = `eval_ctv_${Date.now()}`;
    const testCtv = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Test Đánh Giá', 1, 'Thành viên', 'Nữ', 'K67', '0988776655', 'eval@sis.edu.vn', 10, 20, 30, 'Đang hoạt động')
      RETURNING *
    `, [ctvMssv]);

    // 3. Lấy bảng tổng hợp summary cho CTV Nửa kỳ (midterm)
    const summaryRes = await request(app)
      .get('/api/evaluations/summary?type=ctv&milestone=midterm&group=1')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.success).toBe(true);
    const targetMember = summaryRes.body.data.find(m => m.id === testCtv.id);
    expect(targetMember).toBeDefined();
    expect(targetMember.is_finalized).toBe(false);

    // 4. Trưởng nhóm chấm nháp điểm định tính & nhận xét
    const draftRes = await request(app)
      .post('/api/evaluations/grade-draft')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        memberType: 'ctv',
        memberId: testCtv.id,
        milestone: 'midterm',
        qualitativeScore: 18,
        leaderNotes: 'Rất tích cực, hoàn thành tốt nhiệm vụ'
      });
    expect(draftRes.status).toBe(200);
    expect(draftRes.body.success).toBe(true);
    expect(draftRes.body.data.qualitative_score).toBe(18);

    // 5. Admin Khóa kết quả & chốt xếp loại
    const finalizeRes = await request(app)
      .post('/api/evaluations/finalize')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        memberType: 'ctv',
        memberId: testCtv.id,
        milestone: 'midterm'
      });
    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.body.success).toBe(true);
    expect(finalizeRes.body.data.is_finalized).toBe(1);
    expect(finalizeRes.body.data.classification).toBeDefined();

    // 6. Trưởng nhóm cố gắng chấm lại khi đã khóa -> phải bị từ chối 400
    const failDraftRes = await request(app)
      .post('/api/evaluations/grade-draft')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        memberType: 'ctv',
        memberId: testCtv.id,
        milestone: 'midterm',
        qualitativeScore: 15,
        leaderNotes: 'Sửa điểm'
      });
    expect(failDraftRes.status).toBe(400);

    // 7. Cleanup
    await db.run('DELETE FROM evaluations WHERE member_id = ?', [testCtv.id]);
    await db.run('DELETE FROM ctv_members WHERE id = ?', [testCtv.id]);
  });

  // Nghiệp vụ Hoạt động: Chặn CTV đăng ký hoạt động TNV & Xóa an toàn hoàn tác điểm
  it('Nghiệp vụ Hoạt động: Chặn CTV đăng ký hoạt động TNV & Xóa hoạt động an toàn tự động hoàn tác điểm', async () => {
    // 1. Tạo hoạt động dành riêng cho TNV
    const campRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Chiến Dịch Riêng Của TNV',
        description: 'Chỉ TNV mới được đăng ký',
        location: 'Hội trường C1',
        eventDate: '2026-11-25',
        points: 15,
        targetType: 'tnv',
        status: 'dang_mo_dang_ky'
      });
    expect(campRes.status).toBe(200);
    const campId = campRes.body.data.id;

    // Tạo 1 CTV test
    const ctvUser = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Thử Đăng Ký TNV', 1, 'Thành viên', 'Nam', 'ET1', '0912', 'ctv@sis', 0, 0, 0, 'Đang hoạt động')
      RETURNING *
    `, [`ctv_guard_${Date.now()}`]);

    // 2. CTV cố gắng đăng ký -> Bị chặn 403 Forbidden
    const blockRes = await request(app)
      .post(`/api/campaigns/${campId}/register`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        memberType: 'ctv',
        memberId: ctvUser.id,
        registeredBy: 'Nhóm trưởng'
      });
    expect(blockRes.status).toBe(403);
    expect(blockRes.body.success).toBe(false);
    expect(blockRes.body.message).toContain('chỉ dành riêng cho Tình Nguyện Viên');

    // 3. Tạo 1 TNV test và đăng ký vào hoạt động
    const tnvUser = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, class_name, phone, email, total_points, status, warning_level)
      VALUES (?, 'TNV Test Điểm Danh', 1, 'Thành viên', 'K68', '0977', 'tnv@sis', 50, 'Đang hoạt động', 'none')
      RETURNING *
    `, [`tnv_test_${Date.now()}`]);

    const regTnvRes = await request(app)
      .post(`/api/campaigns/${campId}/register`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        memberType: 'tnv',
        memberId: tnvUser.id,
        registeredBy: 'Admin'
      });
    expect(regTnvRes.status).toBe(200);
    const regId = regTnvRes.body.data.id;

    // 4. Điểm danh 'co_mat' -> TNV được cộng 15 điểm (50 + 15 = 65)
    const attRes = await request(app)
      .put(`/api/campaigns/${campId}/attendance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationId: regId,
        attendanceStatus: 'co_mat'
      });
    expect(attRes.status).toBe(200);

    const tnvAfterAtt = await db.get('SELECT total_points FROM tnv_members WHERE id = ?', [tnvUser.id]);
    expect(tnvAfterAtt.total_points).toBe(65);

    // 5. Admin Xóa chiến dịch -> Điểm số 15 điểm phải tự động hoàn tác (65 - 15 = 50)
    const delRes = await request(app)
      .delete(`/api/campaigns/${campId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);

    const tnvAfterDel = await db.get('SELECT total_points FROM tnv_members WHERE id = ?', [tnvUser.id]);
    expect(tnvAfterDel.total_points).toBe(50);

    // 6. Cleanup
    await db.run('DELETE FROM ctv_members WHERE id = ?', [ctvUser.id]);
    await db.run('DELETE FROM tnv_members WHERE id = ?', [tnvUser.id]);
    await db.run('DELETE FROM tnv_activities WHERE member_id = ?', [tnvUser.id]);
  });

  // Nghiệp vụ: Sáp nhập nhóm CTV (Merge Groups)
  it('Nghiệp vụ Sáp nhập nhóm CTV: Admin sáp nhập thành công nhóm lớn vào nhóm nhỏ và lưu audit log', async () => {
    // 1. Chuẩn bị 2 CTV thuộc nhóm 8 (nhóm nguồn)
    const mssv1 = `ctv_m_${Date.now()}_1`;
    const mssv2 = `ctv_m_${Date.now()}_2`;
    const m1 = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Nguồn 1', 8, 'Thành viên', 'Nam', 'ET1', '0911', 'm1@sis', 0, 0, 0, 'Đang hoạt động')
      RETURNING *
    `, [mssv1]);
    const m2 = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Nguồn 2', 8, 'Thành viên', 'Nữ', 'ET2', '0922', 'm2@sis', 0, 0, 0, 'Đang hoạt động')
      RETURNING *
    `, [mssv2]);

    // 2. Không cho phép gộp nếu không phải Admin (403)
    const nonAdminRes = await request(app)
      .post('/api/ctv/merge-groups')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ sourceGroup: 8, targetGroup: 1, notes: 'Thử gộp bởi Leader' });
    expect(nonAdminRes.status).toBe(403);

    // 3. Không cho phép gộp nhóm nhỏ vào nhóm lớn (400)
    const invalidOrderRes = await request(app)
      .post('/api/ctv/merge-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceGroup: 1, targetGroup: 8 });
    expect(invalidOrderRes.status).toBe(400);

    // 4. Admin thực hiện sáp nhập Nhóm 8 vào Nhóm 1 thành công (200)
    const mergeRes = await request(app)
      .post('/api/ctv/merge-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceGroup: 8, targetGroup: 1, notes: 'Sáp nhập tối ưu nhân sự test' });

    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.success).toBe(true);
    expect(mergeRes.body.details.sourceGroup).toBe(8);
    expect(mergeRes.body.details.targetGroup).toBe(1);

    // 5. Kiểm tra thành viên đã được chuyển sang nhóm 1
    const updatedM1 = await db.get('SELECT group_num FROM ctv_members WHERE id = ?', [m1.id]);
    const updatedM2 = await db.get('SELECT group_num FROM ctv_members WHERE id = ?', [m2.id]);
    expect(updatedM1.group_num).toBe(1);
    expect(updatedM2.group_num).toBe(1);

    // 6. Kiểm tra audit log đã được ghi nhận trong ctv_merge_logs
    const auditLog = await db.get(
      'SELECT * FROM ctv_merge_logs WHERE source_group = 8 AND target_group = 1 ORDER BY id DESC LIMIT 1'
    );
    expect(auditLog).toBeDefined();
    expect(auditLog.source_group).toBe(8);
    expect(auditLog.target_group).toBe(1);
    expect(auditLog.note).toContain('Sáp nhập tối ưu nhân sự test');

    // Cleanup
    await db.run('DELETE FROM ctv_members WHERE id IN (?, ?)', [m1.id, m2.id]);
    await db.run('DELETE FROM ctv_merge_logs WHERE id = ?', [auditLog.id]);
  });

  // Nghiệp vụ: Phân công TNV làm Nhóm trưởng/Nhóm phó CTV, Chặn kiêm nhiệm & Tự động hạ cấp khi gộp nhóm
  it('Nghiệp vụ Phân công TNV phụ trách nhóm CTV: Chặn kiêm nhiệm & Chuyển trưởng B thành phó A khi gộp', async () => {
    // 1. Tạo 2 TNV test
    const tnv1 = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, total_points, status)
      VALUES (?, 'TNV Test Leader 1', 1, 'Thành viên', 'Nam', 'ET1', '0988111222', 'tnv1@sis.edu.vn', 50, 'Đang hoạt động')
      RETURNING *
    `, [`tnv_test_${Date.now()}_1`]);

    const tnv2 = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, total_points, status)
      VALUES (?, 'TNV Test Leader 2', 2, 'Thành viên', 'Nữ', 'ET2', '0988333444', 'tnv2@sis.edu.vn', 60, 'Đang hoạt động')
      RETURNING *
    `, [`tnv_test_${Date.now()}_2`]);

    // 2. Kiểm tra GET /api/tnv/potential-leaders
    const potentialRes = await request(app)
      .get('/api/tnv/potential-leaders')
      .set('Authorization', `Bearer ${leaderToken}`);
    expect(potentialRes.status).toBe(200);
    expect(potentialRes.body.success).toBe(true);
    expect(Array.isArray(potentialRes.body.data)).toBe(true);

    // 3. Phân công TNV: Không phải Admin thì bị 403
    const forbiddenAssign = await request(app)
      .post('/api/ctv/assign-leader')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ groupNum: 6, tnvId: tnv1.id, role: 'leader' });
    expect(forbiddenAssign.status).toBe(403);

    // 4. Admin phân công TNV1 làm Nhóm trưởng Nhóm 6
    const assignRes1 = await request(app)
      .post('/api/ctv/assign-leader')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupNum: 6, tnvId: tnv1.id, role: 'leader', note: 'Phụ trách nhóm 6' });
    expect(assignRes1.status).toBe(200);
    expect(assignRes1.body.success).toBe(true);

    // 5. Kiểm tra groups-summary của Nhóm 6
    const summaryRes1 = await request(app).get('/api/ctv/groups-summary');
    expect(summaryRes1.status).toBe(200);
    const group6 = summaryRes1.body.data.find(g => g.groupNum === 6);
    expect(group6.leaderName).toBe(tnv1.full_name);
    expect(group6.leaderTnvId).toBe(tnv1.id);

    // 6. Kiểm tra quy tắc KHÔNG KIÊM NHIỆM: Cố tình phân công TNV1 phụ trách thêm Nhóm 7 -> Phải bị 400
    const conflictAssign = await request(app)
      .post('/api/ctv/assign-leader')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupNum: 7, tnvId: tnv1.id, role: 'leader' });
    expect(conflictAssign.status).toBe(400);
    expect(conflictAssign.body.message).toContain('không được kiêm nhiệm');

    // 7. Admin phân công TNV2 làm Nhóm trưởng Nhóm 5
    const assignRes2 = await request(app)
      .post('/api/ctv/assign-leader')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ groupNum: 5, tnvId: tnv2.id, role: 'leader' });
    expect(assignRes2.status).toBe(200);

    // 8. Tạo 1 thành viên CTV ở nhóm 6 để đủ điều kiện gộp
    const ctvIn6 = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Nhóm 6', 6, 'Thành viên', 'Nam', 'ET1', '0919999888', 'ctv6@sis', 0, 0, 0, 'Đang hoạt động')
      RETURNING *
    `, [`ctv_g6_${Date.now()}`]);

    // 9. Thực hiện sáp nhập Nhóm 6 (có Trưởng là TNV1) vào Nhóm 5 (có Trưởng là TNV2)
    const mergeRes = await request(app)
      .post('/api/ctv/merge-groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceGroup: 6, targetGroup: 5, notes: 'Test sáp nhập chuyển trưởng B thành phó A' });
    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.success).toBe(true);

    // 10. Kiểm tra sau khi sáp nhập:
    // - Nhóm 5 phải có Nhóm trưởng là TNV2 và Nhóm phó là TNV1!
    // - Nhóm 6 không còn phân công lãnh đạo.
    const summaryRes2 = await request(app).get('/api/ctv/groups-summary');
    const updatedGroup5 = summaryRes2.body.data.find(g => g.groupNum === 5);
    const updatedGroup6 = summaryRes2.body.data.find(g => g.groupNum === 6);

    expect(updatedGroup5.leaderTnvId).toBe(tnv2.id);
    expect(updatedGroup5.leaderName).toBe(tnv2.full_name);
    expect(updatedGroup5.deputyTnvId).toBe(tnv1.id);
    expect(updatedGroup5.deputyName).toBe(tnv1.full_name);
    expect(updatedGroup6.leaderTnvId).toBeNull();
    expect(updatedGroup6.leaderName).toBe('Chưa phân công');

    // 11. Kiểm tra DELETE /api/ctv/assign-leader/:groupNum/:role
    const deleteDeputyRes = await request(app)
      .delete('/api/ctv/assign-leader/5/deputy')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteDeputyRes.status).toBe(200);

    const summaryRes3 = await request(app).get('/api/ctv/groups-summary');
    const group5AfterDelete = summaryRes3.body.data.find(g => g.groupNum === 5);
    expect(group5AfterDelete.deputyTnvId).toBeNull();
    expect(group5AfterDelete.deputyName).toBeNull();

    // Cleanup
    await db.run('DELETE FROM ctv_group_leaders WHERE group_num IN (5, 6)');
    await db.run('DELETE FROM ctv_members WHERE id = ?', [ctvIn6.id]);
    await db.run('DELETE FROM tnv_members WHERE id IN (?, ?)', [tnv1.id, tnv2.id]);
  });

  // Nghiệp vụ: Import file định dạng danh sách CTV vào TNV và bảo toàn điểm hoạt động
  it('Nghiệp vụ Import TNV từ file format CTV: Tương thích 13 cột và bảo toàn điểm hoạt động', async () => {
    // 1. Tạo 1 CTV trong DB đã có điểm hoạt động
    const mssvCtv1 = `test_ctv_to_tnv_${Date.now()}_1`;
    const mssvCtv2 = `test_ctv_to_tnv_${Date.now()}_2`;

    const ctv1 = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, 'CTV Chuyển TNV 1', 6, 'Thành viên', 'Nam', 'ET1-01', '0912345001', 'ctv1@sis.edu.vn', 5, 25, 30, 'Đang hoạt động')
      RETURNING *
    `, [mssvCtv1]);

    // Tạo file Excel giả lập có đúng cấu trúc 13 cột như file D:\Danh_sach_CTV_Dang_hoat_dong.xlsx
    const mssvCtv3 = `test_ctv_to_tnv_${Date.now()}_3`;
    const mssvCtv4 = `test_ctv_to_tnv_${Date.now()}_4`;
    const sampleRows = [
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 1,
        'Nhóm': 'Nhóm 6', // Nhóm 6 của CTV -> sẽ map về Nhóm 2 của TNV (((6-1)%4)+1)
        'Họ và tên': 'CTV Chuyển TNV 1',
        'MSSV': mssvCtv1,
        'Giới tính': 'Nam',
        'Số điện thoại': '0912345001',
        'Lớp': 'ET1-01',
        'Email': 'ctv1@sis.edu.vn',
        'Chức vụ': 'Thành viên',
        'Điểm thái độ': 5,
        'Điểm hoạt động': 25,
        'Tổng điểm': 30 // Cột M: 30đ
      },
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 2,
        'Nhóm': 'Nhóm 2',
        'Họ và tên': 'CTV Chuyển TNV 2',
        'MSSV': mssvCtv2,
        'Giới tính': 'Nữ',
        'Số điện thoại': '0912345002',
        'Lớp': 'ET1-02',
        'Email': 'ctv2@sis.edu.vn',
        'Chức vụ': 'Nhóm phó',
        'Điểm thái độ': 10,
        'Điểm hoạt động': 40,
        'Tổng điểm': 50 // Cột M: 50đ
      },
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 3,
        'Nhóm': 'Nhóm 1',
        'Họ và tên': 'Tạ Thanh Tùng',
        'MSSV': mssvCtv3,
        'Giới tính': 'Nam',
        'Số điện thoại': '0376800137',
        'Lớp': 'ETTN - 02',
        'Email': 'tung.tt@sis.hust.edu.vn',
        'Chức vụ': 'Thành viên',
        'Điểm thái độ': 5,
        'Điểm hoạt động': 0,
        'Tổng điểm': 5 // Cột M: 5đ
      },
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 4,
        'Nhóm': 'Nhóm 1',
        'Họ và tên': 'Nguyễn Lê Mai Anh',
        'MSSV': mssvCtv4,
        'Giới tính': 'Nữ',
        'Số điện thoại': '0988776655',
        'Lớp': 'ET2-01',
        'Email': 'maianh.nl@sis.hust.edu.vn',
        'Chức vụ': 'Thành viên',
        'Điểm thái độ': 0,
        'Điểm hoạt động': 0,
        'Tổng điểm': 0 // Cột M: 0đ
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách CTV');
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 2. Gửi request POST /api/tnv/import-file với buffer Excel
    const importRes = await request(app)
      .post('/api/tnv/import-file')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', excelBuffer, 'Danh_sach_CTV_Dang_hoat_dong.xlsx');

    expect(importRes.status).toBe(200);
    expect(importRes.body.success).toBe(true);
    expect(importRes.body.importedCount).toBe(4);
    expect(importRes.body.preservedPointsCount).toBe(3); // 3 người có điểm Cột M > 0

    // 3. Kiểm tra TNV 1 sau khi import (Cột M = 30đ):
    const tnv1 = await db.get('SELECT * FROM tnv_members WHERE mssv = ?', [mssvCtv1]);
    expect(tnv1).toBeDefined();
    expect(tnv1.full_name).toBe('CTV Chuyển TNV 1');
    expect(tnv1.group_num).toBe(2); // Ánh xạ từ Nhóm 6 CTV sang Nhóm 2 TNV
    expect(tnv1.total_points).toBe(30); // Điểm lấy CHÍNH XÁC từ Cột M (30đ)

    // Kiểm tra bản ghi trong tnv_activities của TNV 1
    const activityLog1 = await db.get(
      "SELECT * FROM tnv_activities WHERE member_id = ? AND category = 'Bảo lưu điểm CTV'",
      [tnv1.id]
    );
    expect(activityLog1).toBeDefined();
    expect(activityLog1.points).toBe(30);

    // 4. Kiểm tra TNV 2 sau khi import (Cột M = 50đ):
    const tnv2 = await db.get('SELECT * FROM tnv_members WHERE mssv = ?', [mssvCtv2]);
    expect(tnv2).toBeDefined();
    expect(tnv2.total_points).toBe(50); // Điểm lấy CHÍNH XÁC từ Cột M (50đ)

    // 5. Kiểm tra TNV 3 (Tạ Thanh Tùng: Cột M = 5đ):
    const tnv3 = await db.get('SELECT * FROM tnv_members WHERE mssv = ?', [mssvCtv3]);
    expect(tnv3).toBeDefined();
    expect(tnv3.total_points).toBe(5); // Điểm lấy CHÍNH XÁC từ Cột M (5đ)
    const activityLog3 = await db.get(
      "SELECT * FROM tnv_activities WHERE member_id = ? AND category = 'Bảo lưu điểm CTV'",
      [tnv3.id]
    );
    expect(activityLog3).toBeDefined();
    expect(activityLog3.points).toBe(5);

    // 6. Kiểm tra TNV 4 (Cột M = 0đ):
    const tnv4 = await db.get('SELECT * FROM tnv_members WHERE mssv = ?', [mssvCtv4]);
    expect(tnv4).toBeDefined();
    expect(tnv4.total_points).toBe(0); // 0 điểm, không có log bảo lưu nào
    const activityLog4 = await db.get(
      "SELECT * FROM tnv_activities WHERE member_id = ? AND category = 'Bảo lưu điểm CTV'",
      [tnv4.id]
    );
    expect(activityLog4).toBeFalsy();

    // Cleanup
    await db.run('DELETE FROM tnv_activities WHERE member_id IN (?, ?, ?, ?)', [tnv1.id, tnv2.id, tnv3.id, tnv4.id]);
    await db.run('DELETE FROM tnv_members WHERE id IN (?, ?, ?, ?)', [tnv1.id, tnv2.id, tnv3.id, tnv4.id]);
    await db.run('DELETE FROM ctv_members WHERE id = ?', [ctv1.id]);
  });

  it('Nghiệp vụ 5: Chỉnh sửa và Xóa thủ công bản ghi hoạt động TNV (kèm kiểm soát phân quyền)', async () => {
    // 1. Tạo 1 TNV thuộc Nhóm 2
    const mssvTest = `tnv_edit_test_${Date.now()}`;
    const tnv = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, total_points, status)
      VALUES (?, 'TNV Test Edit Delete', 2, 'Thành viên', 10, 'Đang hoạt động')
      RETURNING *
    `, [mssvTest]);

    // 2. Tạo 1 bản ghi hoạt động 10đ
    const act = await db.get(`
      INSERT INTO tnv_activities (member_id, category, points, note)
      VALUES (?, 'Hoạt động ban đầu', 10, 'Điểm ban đầu')
      RETURNING *
    `, [tnv.id]);

    // Token cho Leader Nhóm 1 và Leader Nhóm 2
    const leaderTokenG1 = generateTestToken({ role: 'leader', targetType: 'tnv', groupNum: 1, displayName: 'Leader G1' });
    const leaderTokenG2 = generateTestToken({ role: 'leader', targetType: 'tnv', groupNum: 2, displayName: 'Leader G2' });

    // 3. Leader Nhóm 1 cố gắng sửa hoạt động của TNV Nhóm 2 -> 403 Forbidden
    const forbiddenEditRes = await request(app)
      .put(`/api/tnv/activities/${act.id}`)
      .set('Authorization', `Bearer ${leaderTokenG1}`)
      .send({ category: 'Hack điểm', points: 99, note: 'Lỗi' });
    expect(forbiddenEditRes.status).toBe(403);

    // 4. Leader Nhóm 2 (đúng nhóm) sửa hoạt động thành 25đ -> 200 OK
    const successEditRes = await request(app)
      .put(`/api/tnv/activities/${act.id}`)
      .set('Authorization', `Bearer ${leaderTokenG2}`)
      .send({ category: 'Hoạt động đã sửa', points: 25, note: 'Nhóm trưởng đã sửa' });
    expect(successEditRes.status).toBe(200);
    expect(successEditRes.body.success).toBe(true);
    expect(successEditRes.body.newTotal).toBe(25);

    // Kiểm tra DB: TNV total_points đã cập nhật thành 25
    const updatedTnv = await db.get('SELECT total_points FROM tnv_members WHERE id = ?', [tnv.id]);
    expect(updatedTnv.total_points).toBe(25);

    // 5. Leader Nhóm 1 cố gắng xóa hoạt động của TNV Nhóm 2 -> 403 Forbidden
    const forbiddenDeleteRes = await request(app)
      .delete(`/api/tnv/activities/${act.id}`)
      .set('Authorization', `Bearer ${leaderTokenG1}`);
    expect(forbiddenDeleteRes.status).toBe(403);

    // 6. Admin xóa bản ghi hoạt động -> 200 OK, total_points trở về 0
    const successDeleteRes = await request(app)
      .delete(`/api/tnv/activities/${act.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(successDeleteRes.status).toBe(200);
    expect(successDeleteRes.body.success).toBe(true);
    expect(successDeleteRes.body.newTotal).toBe(0);

    // Kiểm tra DB: bản ghi activity đã bị xóa, total_points TNV là 0
    const deletedAct = await db.get('SELECT * FROM tnv_activities WHERE id = ?', [act.id]);
    expect(deletedAct).toBeFalsy();
    const finalTnv = await db.get('SELECT total_points FROM tnv_members WHERE id = ?', [tnv.id]);
    expect(finalTnv.total_points).toBe(0);

    // Cleanup
    await db.run('DELETE FROM tnv_members WHERE id = ?', [tnv.id]);
  });
});

