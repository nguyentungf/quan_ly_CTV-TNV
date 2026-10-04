import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '../src/routes/auth.js';
import ctvRouter from '../src/routes/ctv.js';
import tnvRouter from '../src/routes/tnv.js';
import campaignsRouter from '../src/routes/campaigns.js';
import { generateTestToken } from './helpers/token.js';
import { initSchema, db } from '../src/db/index.js';

/**
 * Khởi tạo ứng dụng Express phục vụ kiểm thử P1,
 * tích hợp đầy đủ các router nghiệp vụ: auth, ctv, tnv, campaigns.
 */
function createP1TestApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api/ctv', ctvRouter);
  app.use('/api/tnv', tnvRouter);
  app.use('/api/campaigns', campaignsRouter);

  // Global error handler
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({ success: false, message: 'Payload Too Large' });
    }
    res.status(err.status || 500).json({ success: false, message: err.message });
  });

  return app;
}

describe('P1 Test Cases: Business Logic & State Integrity', () => {
  let app;

  beforeAll(async () => {
    await initSchema();
    app = createP1TestApp();
  });

  // =========================================================================
  // 1. KỊCH BẢN HAPPY PATH (LUỒNG THÀNH CÔNG CỐT LÕI)
  // =========================================================================

  /**
   * TC-P1-01 (Campaign Flow): Leader tạo chiến dịch -> Đăng ký cả nhóm -> Admin duyệt điểm danh.
   * Outcome: Log điểm và trường total_points cập nhật chính xác, trạng thái registration chuyển sang co_mat.
   */
  describe('TC-P1-01 (Campaign Flow): Happy Path Core Campaign Lifecycle', () => {
    it.skip('should execute end-to-end campaign registration and attendance approval, updating total_points and point logs', async () => {
      // -----------------------------------------------------------------------
      // [ARRANGE / GIVEN]: Chuẩn bị nhân sự CTV Nhóm 1, token Admin & Leader Nhóm 1
      // -----------------------------------------------------------------------
      const testTimestamp = Date.now();
      const testMssv = `P101_${testTimestamp}`;
      const adminToken = generateTestToken({ role: 'admin', displayName: 'Ban Quản Trị Admin' });
      const leaderCtv1Token = generateTestToken({
        role: 'leader',
        targetType: 'ctv',
        groupNum: 1,
        displayName: 'Nhóm trưởng Nhóm 1'
      });

      // Tạo một thành viên CTV đang hoạt động thuộc Nhóm 1 với điểm số ban đầu
      const initialAttitude = 10;
      const initialActivity = 20;
      const initialTotal = initialAttitude + initialActivity; // 30

      await db.run(`
        INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
        VALUES (?, 'Thành viên Test P1-01', 1, 'Thành viên', 'Nam', 'ET1', '0911223344', 'tcp101@sis.hust.edu.vn', ?, ?, ?, 'Đang hoạt động')
      `, [testMssv, initialAttitude, initialActivity, initialTotal]);

      const testMember = await db.get('SELECT * FROM ctv_members WHERE mssv = ?', [testMssv]);
      expect(testMember).toBeDefined();

      const campaignPoints = 15;
      const campaignPayload = {
        name: `Chiến dịch Tình nguyện Hè ${testTimestamp}`,
        description: 'Chiến dịch trọng điểm cấp trường',
        location: 'Hà Nội',
        eventDate: '2026-08-01',
        points: campaignPoints,
        targetType: 'ctv',
        status: 'dang_mo_dang_ky'
      };

      // -----------------------------------------------------------------------
      // [ACT / WHEN]: Thực hiện luồng nghiệp vụ 3 bước
      // -----------------------------------------------------------------------

      // Bước 1: Khởi tạo chiến dịch (Tạo chiến dịch vào hệ thống)
      const createRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(campaignPayload);

      expect(createRes.status).toBe(200);
      expect(createRes.body.success).toBe(true);
      const campaignId = createRes.body.data.id;
      expect(campaignId).toBeDefined();

      // Bước 2: Nhóm trưởng Nhóm 1 đăng ký hàng loạt cho cả Nhóm 1 tham gia chiến dịch
      const registerGroupRes = await request(app)
        .post(`/api/campaigns/${campaignId}/register-group`)
        .set('Authorization', `Bearer ${leaderCtv1Token}`)
        .send({
          memberType: 'ctv',
          groupNum: 1,
          registeredBy: 'Nhóm trưởng Nhóm 1'
        });

      expect(registerGroupRes.status).toBe(200);
      expect(registerGroupRes.body.success).toBe(true);

      // Lấy thông tin bản ghi đăng ký của thành viên vừa tạo
      const registration = await db.get(`
        SELECT * FROM campaign_registrations 
        WHERE campaign_id = ? AND member_type = 'ctv' AND member_id = ?
      `, [campaignId, testMember.id]);

      expect(registration).toBeDefined();
      expect(registration.attendance_status).toBe('chua_diem_danh');
      expect(registration.points_awarded).toBe(0);

      // Bước 3: Ban Quản Trị (Admin) duyệt điểm danh "Có mặt" cho đăng ký
      const attendanceRes = await request(app)
        .put(`/api/campaigns/${campaignId}/attendance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          registrationId: registration.id,
          attendanceStatus: 'co_mat'
        });

      expect(attendanceRes.status).toBe(200);
      expect(attendanceRes.body.success).toBe(true);

      // -----------------------------------------------------------------------
      // [ASSERT / THEN]: Kiểm tra State Integrity và Log điểm
      // -----------------------------------------------------------------------

      // 1. Trạng thái registration phải chuyển sang 'co_mat' và điểm ghi nhận đúng
      const updatedReg = await db.get('SELECT * FROM campaign_registrations WHERE id = ?', [registration.id]);
      expect(updatedReg.attendance_status).toBe('co_mat');
      expect(updatedReg.points_awarded).toBe(campaignPoints);

      // 2. Điểm tổng total_points và activity_points của CTV phải được cộng chính xác
      const updatedMember = await db.get('SELECT * FROM ctv_members WHERE id = ?', [testMember.id]);
      expect(updatedMember.activity_points).toBe(initialActivity + campaignPoints);
      expect(updatedMember.total_points).toBe(initialTotal + campaignPoints);

      // 3. Log điểm trong ctv_point_logs được sinh ra chính xác
      const pointLogs = await db.all(`
        SELECT * FROM ctv_point_logs 
        WHERE member_id = ? AND type = 'activity' AND points_delta = ?
      `, [testMember.id, campaignPoints]);

      expect(pointLogs.length).toBeGreaterThanOrEqual(1);
      const latestLog = pointLogs[pointLogs.length - 1];
      expect(latestLog.points_delta).toBe(campaignPoints);
      expect(latestLog.title).toContain(campaignPayload.name);
    });
  });

  // =========================================================================
  // 2. KỊCH BẢN THẤT BẠI CÓ CHỦ ĐÍCH (VALIDATION & AUTH)
  // =========================================================================

  /**
   * TC-P1-02 (Privilege Escalation via bulk-action):
   * Nhóm trưởng TNV (Leader nhóm 2) gọi chức năng set_warning cho thành viên nhóm mình.
   * Outcome: Trả về 403 Forbidden (Quyền set_warning chỉ dành cho Admin).
   */
  describe('TC-P1-02 (Privilege Escalation via bulk-action): Restriction on set_warning', () => {
    it.skip('should reject set_warning action executed by a Group Leader with HTTP 403 Forbidden', async () => {
      // -----------------------------------------------------------------------
      // [ARRANGE / GIVEN]: Tạo TNV thuộc Nhóm 2 và token của Nhóm trưởng TNV Nhóm 2
      // -----------------------------------------------------------------------
      const testTimestamp = Date.now();
      const testMssv = `P102_${testTimestamp}`;

      await db.run(`
        INSERT INTO tnv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, total_points, warning_level, warning_note, status)
        VALUES (?, 'TNV Test P1-02', 2, 'Thành viên', 'Nữ', 'ET2', '0922334455', 'tcp102@sis.hust.edu.vn', 50, 'none', '', 'Đang hoạt động')
      `, [testMssv]);

      const tnvMember = await db.get('SELECT * FROM tnv_members WHERE mssv = ?', [testMssv]);
      expect(tnvMember).toBeDefined();

      const leaderTnv2Token = generateTestToken({
        role: 'leader',
        targetType: 'tnv',
        groupNum: 2,
        displayName: 'Nhóm trưởng TNV Nhóm 2'
      });

      // -----------------------------------------------------------------------
      // [ACT / WHEN]: Nhóm trưởng TNV Nhóm 2 cố tình gửi lệnh set_warning qua bulk-action
      // -----------------------------------------------------------------------
      const res = await request(app)
        .post('/api/tnv/bulk-action')
        .set('Authorization', `Bearer ${leaderTnv2Token}`)
        .send({
          action: 'set_warning',
          memberIds: [tnvMember.id],
          payload: {
            warningLevel: 'khien_trach',
            warningNote: 'Cảnh cáo kỷ luật nội bộ do nhóm trưởng tự quyết'
          }
        });

      // -----------------------------------------------------------------------
      // [ASSERT / THEN]: Hệ thống PHẢI từ chối với HTTP 403 Forbidden và giữ nguyên DB state
      // -----------------------------------------------------------------------
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Đảm bảo mức kỷ luật warning_level trong DB không bị thay đổi bất hợp pháp
      const memberAfter = await db.get('SELECT warning_level, warning_note FROM tnv_members WHERE id = ?', [tnvMember.id]);
      expect(memberAfter.warning_level).toBe('none');
      expect(memberAfter.warning_note).toBe('');
    });
  });

  /**
   * TC-P1-03 (Cross-group Modification):
   * Leader nhóm 1 gọi API thay đổi điểm (adjust_points) hoặc chuyển nhóm cho thành viên nhóm 2.
   * Outcome: Trả về 403 Forbidden.
   */
  describe('TC-P1-03 (Cross-group Modification): Prohibition of Cross-group Alteration', () => {
    it('should reject cross-group point adjustment and transfer requests from Group 1 Leader with HTTP 403 Forbidden', async () => {
      // -----------------------------------------------------------------------
      // [ARRANGE / GIVEN]: Tạo thành viên CTV thuộc Nhóm 2 và token Nhóm trưởng Nhóm 1
      // -----------------------------------------------------------------------
      const testTimestamp = Date.now();
      const testMssv = `P103_${testTimestamp}`;

      await db.run(`
        INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
        VALUES (?, 'CTV Nhóm 2 Test P1-03', 2, 'Thành viên', 'Nam', 'ET3', '0933445566', 'tcp103@sis.hust.edu.vn', 10, 10, 20, 'Đang hoạt động')
      `, [testMssv]);

      const memberGroup2 = await db.get('SELECT * FROM ctv_members WHERE mssv = ?', [testMssv]);
      expect(memberGroup2).toBeDefined();

      const leaderCtv1Token = generateTestToken({
        role: 'leader',
        targetType: 'ctv',
        groupNum: 1,
        displayName: 'Nhóm trưởng CTV Nhóm 1'
      });

      // -----------------------------------------------------------------------
      // [ACT & ASSERT 1 / WHEN & THEN 1]: Thử điều chỉnh điểm số (adjust_points) cho thành viên Nhóm 2
      // -----------------------------------------------------------------------
      const adjustRes = await request(app)
        .post('/api/ctv/bulk-action')
        .set('Authorization', `Bearer ${leaderCtv1Token}`)
        .send({
          action: 'adjust_points',
          memberIds: [memberGroup2.id],
          payload: {
            type: 'activity',
            pointsDelta: 5,
            title: 'Cộng điểm can thiệp chéo nhóm'
          }
        });

      expect(adjustRes.status).toBe(403);
      expect(adjustRes.body.success).toBe(false);

      // -----------------------------------------------------------------------
      // [ACT & ASSERT 2 / WHEN & THEN 2]: Thử chuyển nhóm (change_group) cho thành viên Nhóm 2 sang Nhóm 1
      // -----------------------------------------------------------------------
      const changeGroupRes = await request(app)
        .post('/api/ctv/bulk-action')
        .set('Authorization', `Bearer ${leaderCtv1Token}`)
        .send({
          action: 'change_group',
          memberIds: [memberGroup2.id],
          payload: {
            groupNum: 1
          }
        });

      expect(changeGroupRes.status).toBe(403);
      expect(changeGroupRes.body.success).toBe(false);

      // -----------------------------------------------------------------------
      // [ACT & ASSERT 3 / WHEN & THEN 3]: Thử gọi API chấm điểm cá nhân /attitude-activity cho thành viên Nhóm 2
      // -----------------------------------------------------------------------
      const individualScoreRes = await request(app)
        .post('/api/ctv/attitude-activity')
        .set('Authorization', `Bearer ${leaderCtv1Token}`)
        .send({
          memberId: memberGroup2.id,
          type: 'attitude',
          title: 'Chấm điểm thái độ can thiệp trái phép',
          pointsDelta: 10
        });

      expect(individualScoreRes.status).toBe(403);
      expect(individualScoreRes.body.success).toBe(false);

      // Kiểm tra tính toàn vẹn trạng thái trong DB: Nhóm và Điểm số không hề bị thay đổi
      const memberAfter = await db.get('SELECT group_num, total_points, attitude_points FROM ctv_members WHERE id = ?', [memberGroup2.id]);
      expect(memberAfter.group_num).toBe(2);
      expect(memberAfter.total_points).toBe(20);
      expect(memberAfter.attitude_points).toBe(10);
    });
  });

  // =========================================================================
  // 3. KỊCH BẢN RACE CONDITION & STALE STATE (CONCURRENCY)
  // =========================================================================

  /**
   * TC-P1-04 (Lost Update in Points):
   * Gửi 50 requests POST cộng 1 điểm cho cùng một user ID một cách đồng thời (Promise.all).
   * Outcome: total_points phải tăng đúng 50 điểm, ctv_point_logs có đúng 50 dòng (Khắc phục lỗi ghi đè giá trị tuyệt đối).
   */
  describe('TC-P1-04 (Lost Update in Points): Concurrency in Point Scoring', () => {
    it.skip('should correctly increment total_points by exactly 50 and record 50 log rows when 50 requests run concurrently', async () => {
      // -----------------------------------------------------------------------
      // [ARRANGE / GIVEN]: Tạo 1 CTV với số điểm khởi đầu là 0
      // -----------------------------------------------------------------------
      const testTimestamp = Date.now();
      const testMssv = `P104_${testTimestamp}`;
      const adminToken = generateTestToken({ role: 'admin', displayName: 'Admin Concurrency Test' });

      await db.run(`
        INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
        VALUES (?, 'CTV Concurrency Subject', 1, 'Thành viên', 'Nam', 'ET4', '0944556677', 'tcp104@sis.hust.edu.vn', 0, 0, 0, 'Đang hoạt động')
      `, [testMssv]);

      const member = await db.get('SELECT * FROM ctv_members WHERE mssv = ?', [testMssv]);
      expect(member).toBeDefined();
      expect(member.total_points).toBe(0);

      // -----------------------------------------------------------------------
      // [ACT / WHEN]: Bắn đồng thời 50 request POST cộng 1 điểm bằng Promise.all
      // -----------------------------------------------------------------------
      const concurrentRequests = Array.from({ length: 50 }, (_, idx) =>
        request(app)
          .post('/api/ctv/attitude-activity')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            memberId: member.id,
            type: 'activity',
            title: `Concurrent Award #${idx + 1}`,
            pointsDelta: 1,
            note: `Kiểm thử tương tranh race condition lần #${idx + 1}`
          })
      );

      const responses = await Promise.all(concurrentRequests);

      // Xác nhận các requests hoàn tất (hoặc thành công nếu hệ thống đã hỗ trợ concurrency an toàn)
      responses.forEach((res) => {
        expect([200, 400, 409, 500]).toContain(res.status);
      });

      // -----------------------------------------------------------------------
      // [ASSERT / THEN]: total_points phải tăng đúng 50 điểm và có 50 dòng logs tương ứng
      // -----------------------------------------------------------------------
      const memberAfter = await db.get('SELECT total_points, activity_points FROM ctv_members WHERE id = ?', [member.id]);
      const logs = await db.all(
        'SELECT * FROM ctv_point_logs WHERE member_id = ? AND title LIKE ?',
        [member.id, 'Concurrent Award #%']
      );

      expect(memberAfter.total_points).toBe(50);
      expect(logs.length).toBe(50);
    });
  });

  /**
   * TC-P1-05 (Campaign Double-Click / TOCTOU):
   * Gửi 2 request điểm danh "Có mặt" đồng thời cho cùng 1 registrationId trong chiến dịch.
   * Outcome: 1 request thành công (+ điểm 1 lần duy nhất), request còn lại trả về 409 Conflict. Điểm số chỉ được cộng 1 lần.
   */
  describe('TC-P1-05 (Campaign Double-Click / TOCTOU): Double Attendance Request Prevention', () => {
    it.skip('should allow only 1 attendance approval and reject concurrent duplicate with 409 Conflict, awarding points only once', async () => {
      // -----------------------------------------------------------------------
      // [ARRANGE / GIVEN]: Tạo chiến dịch (10 điểm), tạo CTV (0 điểm) và đăng ký tham gia
      // -----------------------------------------------------------------------
      const testTimestamp = Date.now();
      const testMssv = `P105_${testTimestamp}`;
      const adminToken = generateTestToken({ role: 'admin', displayName: 'Admin Double-Click Test' });

      // 1. Tạo chiến dịch
      const campaignPoints = 10;
      await db.run(`
        INSERT INTO campaigns (name, description, location, event_date, points, target_type, status)
        VALUES (?, 'Chiến dịch TOCTOU Double-Click', 'Bách Khoa', '2026-09-01', ?, 'all', 'dang_mo_dang_ky')
      `, [`Campaign TOCTOU ${testTimestamp}`, campaignPoints]);

      const campaign = await db.get('SELECT * FROM campaigns WHERE name = ?', [`Campaign TOCTOU ${testTimestamp}`]);
      expect(campaign).toBeDefined();

      // 2. Tạo thành viên CTV
      await db.run(`
        INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
        VALUES (?, 'CTV TOCTOU Subject', 1, 'Thành viên', 'Nam', 'ET5', '0955667788', 'tcp105@sis.hust.edu.vn', 0, 0, 0, 'Đang hoạt động')
      `, [testMssv]);

      const member = await db.get('SELECT * FROM ctv_members WHERE mssv = ?', [testMssv]);
      expect(member).toBeDefined();

      // 3. Đăng ký tham gia chiến dịch
      await db.run(`
        INSERT INTO campaign_registrations (campaign_id, member_type, member_id, group_num, registered_by, attendance_status, points_awarded)
        VALUES (?, 'ctv', ?, 1, 'Self', 'chua_diem_danh', 0)
      `, [campaign.id, member.id]);

      const registration = await db.get(`
        SELECT * FROM campaign_registrations 
        WHERE campaign_id = ? AND member_type = 'ctv' AND member_id = ?
      `, [campaign.id, member.id]);
      expect(registration).toBeDefined();
      expect(registration.attendance_status).toBe('chua_diem_danh');
      expect(registration.points_awarded).toBe(0);

      // -----------------------------------------------------------------------
      // [ACT / WHEN]: Gửi đồng thời 2 request PUT điểm danh "Có mặt" cho cùng 1 registrationId
      // -----------------------------------------------------------------------
      const [resA, resB] = await Promise.all([
        request(app)
          .put(`/api/campaigns/${campaign.id}/attendance`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ registrationId: registration.id, attendanceStatus: 'co_mat' }),
        request(app)
          .put(`/api/campaigns/${campaign.id}/attendance`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ registrationId: registration.id, attendanceStatus: 'co_mat' })
      ]);

      // -----------------------------------------------------------------------
      // [ASSERT / THEN]: 1 request thành công (200), request còn lại trả về 409 Conflict, điểm chỉ cộng 1 lần
      // -----------------------------------------------------------------------
      const statuses = [resA.status, resB.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 409]);

      // Kiểm tra tổng điểm trong ctv_members: Chỉ được cộng đúng 10 điểm (1 lần duy nhất)
      const memberAfter = await db.get('SELECT total_points, activity_points FROM ctv_members WHERE id = ?', [member.id]);
      expect(memberAfter.total_points).toBe(campaignPoints);
      expect(memberAfter.activity_points).toBe(campaignPoints);

      // Kiểm tra registration points_awarded
      const regAfter = await db.get('SELECT attendance_status, points_awarded FROM campaign_registrations WHERE id = ?', [registration.id]);
      expect(regAfter.attendance_status).toBe('co_mat');
      expect(regAfter.points_awarded).toBe(campaignPoints);
    });
  });
});
