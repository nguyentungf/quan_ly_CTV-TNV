import express from 'express';
import { db } from '../db/index.js';
import * as XLSX from 'xlsx';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 1. Lấy danh sách tất cả các hoạt động / chiến dịch
router.get('/', async (req, res) => {
  try {
    const { status, targetType, search } = req.query;
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM campaign_registrations r WHERE r.campaign_id = c.id) as registered_count,
        (SELECT COUNT(*) FROM campaign_registrations r WHERE r.campaign_id = c.id AND r.attendance_status = 'co_mat') as attended_count,
        (SELECT COUNT(*) FROM campaign_registrations r WHERE r.campaign_id = c.id AND r.attendance_status = 'vang') as absent_count
      FROM campaigns c
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (targetType && targetType !== 'all') {
      query += " AND (c.target_type = ? OR c.target_type = 'all')";
      params.push(targetType);
    }
    if (search) {
      query += ' AND (c.name LIKE ? OR c.location LIKE ? OR c.description LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY c.event_date DESC, c.id DESC';
    const rows = await db.all(query, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách hoạt động', error: error.message });
  }
});

// 2. Thêm hoạt động mới
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description, location, eventDate, points, targetType, status } = req.body;
    if (!name || !eventDate) {
      return res.status(400).json({ success: false, message: 'Tên hoạt động và ngày tổ chức là bắt buộc' });
    }

    const newCamp = await db.get(`
      INSERT INTO campaigns (name, description, location, event_date, points, target_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [
      name.trim(),
      description?.trim() || '',
      location?.trim() || '',
      eventDate.trim(),
      points !== undefined ? Number(points) : 10,
      targetType || 'all',
      status || 'dang_mo_dang_ky'
    ]);

    res.json({ success: true, message: 'Tạo hoạt động thành công', data: newCamp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo hoạt động', error: error.message });
  }
});

// 3. Cập nhật hoạt động
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, eventDate, points, targetType, status } = req.body;

    await db.run(`
      UPDATE campaigns 
      SET name = ?, description = ?, location = ?, event_date = ?, points = ?, target_type = ?, status = ?
      WHERE id = ?
    `, [
      name?.trim(),
      description?.trim(),
      location?.trim(),
      eventDate?.trim(),
      points !== undefined ? Number(points) : 10,
      targetType,
      status,
      Number(id)
    ]);

    res.json({ success: true, message: 'Cập nhật hoạt động thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật hoạt động', error: error.message });
  }
});

// 4. Xóa hoạt động
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM campaign_registrations WHERE campaign_id = ?', [Number(id)]);
    await db.run('DELETE FROM campaigns WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Đã xóa hoạt động' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa hoạt động', error: error.message });
  }
});

// 5. Lấy danh sách đăng ký & điểm danh của 1 hoạt động
router.get('/:id/registrations', async (req, res) => {
  try {
    const { id } = req.params;
    const { group, memberType } = req.query;

    let query = `
      SELECT 
        r.id as registration_id,
        r.campaign_id,
        r.member_type,
        r.member_id,
        r.group_num,
        r.registered_by,
        r.attendance_status,
        r.points_awarded,
        r.created_at as registered_at,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.full_name 
          ELSE t.full_name 
        END as full_name,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.mssv 
          ELSE t.mssv 
        END as mssv,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.gender 
          ELSE t.gender 
        END as gender,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.class_name 
          ELSE t.class_name 
        END as class_name,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.phone 
          ELSE t.phone 
        END as phone,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.email 
          ELSE t.email 
        END as email,
        CASE 
          WHEN r.member_type = 'ctv' THEN c.role 
          ELSE t.role 
        END as role
      FROM campaign_registrations r
      LEFT JOIN ctv_members c ON r.member_type = 'ctv' AND r.member_id = c.id
      LEFT JOIN tnv_members t ON r.member_type = 'tnv' AND r.member_id = t.id
      WHERE r.campaign_id = ?
    `;
    const params = [Number(id)];

    if (group && group !== 'all') {
      query += ' AND r.group_num = ?';
      params.push(Number(group));
    }
    if (memberType && memberType !== 'all') {
      query += ' AND r.member_type = ?';
      params.push(memberType);
    }

    query += ' ORDER BY r.group_num ASC, r.member_type ASC, full_name ASC';
    const rows = await db.all(query, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách đăng ký', error: error.message });
  }
});

// 6. Đăng ký cá nhân vào hoạt động
router.post('/:id/register', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberType, memberId, registeredBy } = req.body;

    if (!memberType || !memberId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người đăng ký' });
    }

    // Kiểm tra trùng
    const existing = await db.get(`
      SELECT id FROM campaign_registrations 
      WHERE campaign_id = ? AND member_type = ? AND member_id = ?
    `, [Number(id), memberType, Number(memberId)]);

    if (existing) {
      return res.status(400).json({ success: false, message: 'Thành viên này đã đăng ký tham gia hoạt động này rồi!' });
    }

    // Lấy thông tin nhóm của thành viên
    let groupNum = 1;
    if (memberType === 'ctv') {
      const m = await db.get('SELECT group_num FROM ctv_members WHERE id = ?', [Number(memberId)]);
      if (m) groupNum = m.group_num;
    } else {
      const m = await db.get('SELECT group_num FROM tnv_members WHERE id = ?', [Number(memberId)]);
      if (m) groupNum = m.group_num;
    }

    // Kiểm tra nếu là Nhóm trưởng thì chỉ được đăng ký cho thành viên nhóm mình
    if (req.user.role !== 'admin' && Number(req.user.groupNum) !== Number(groupNum)) {
      return res.status(403).json({
        success: false,
        message: `Bạn là Nhóm trưởng Nhóm ${req.user.groupNum}, không được đăng ký cho thành viên Nhóm ${groupNum}!`
      });
    }

    const reg = await db.get(`
      INSERT INTO campaign_registrations (campaign_id, member_type, member_id, group_num, registered_by, attendance_status, points_awarded)
      VALUES (?, ?, ?, ?, ?, 'chua_diem_danh', 0)
      RETURNING *
    `, [Number(id), memberType, Number(memberId), groupNum, registeredBy || req.user.displayName || 'Tự đăng ký']);

    res.json({ success: true, message: 'Đăng ký thành công', data: reg });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi đăng ký', error: error.message });
  }
});

// 7. NHÓM TRƯỞNG ĐĂNG KÝ HÀNG LOẠT CHO CẢ NHÓM (1 Cú Click)
router.post('/:id/register-group', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberType, groupNum, registeredBy } = req.body;

    const campId = Number(id);
    const gNum = Number(groupNum);

    if (!memberType || isNaN(gNum)) {
      return res.status(400).json({ success: false, message: 'Thiếu loại nhân sự hoặc số nhóm' });
    }

    // Nếu không phải Admin thì chỉ được đăng ký cho nhóm của mình
    if (req.user.role !== 'admin') {
      if (req.user.targetType !== memberType || Number(req.user.groupNum) !== gNum) {
        return res.status(403).json({
          success: false,
          message: `Bạn chỉ có quyền đăng ký cho nhóm của mình (Nhóm ${req.user.groupNum} ${req.user.targetType.toUpperCase()})!`
        });
      }
    }

    // Lấy danh sách thành viên đang hoạt động của nhóm đó
    let members = [];
    if (memberType === 'ctv') {
      members = await db.all("SELECT id, full_name FROM ctv_members WHERE group_num = ? AND status = 'Đang hoạt động'", [gNum]);
    } else {
      members = await db.all("SELECT id, full_name FROM tnv_members WHERE group_num = ? AND status = 'Đang hoạt động'", [gNum]);
    }

    if (members.length === 0) {
      return res.status(400).json({ success: false, message: `Không có thành viên nào đang hoạt động trong Nhóm ${gNum}!` });
    }

    let newlyRegistered = 0;
    await db.transaction(async (txDb) => {
      for (const m of members) {
        const exist = await txDb.get(`
          SELECT id FROM campaign_registrations 
          WHERE campaign_id = ? AND member_type = ? AND member_id = ?
        `, [campId, memberType, m.id]);

        if (!exist) {
          await txDb.run(`
            INSERT INTO campaign_registrations (campaign_id, member_type, member_id, group_num, registered_by, attendance_status, points_awarded)
            VALUES (?, ?, ?, ?, ?, 'chua_diem_danh', 0)
          `, [campId, memberType, m.id, gNum, registeredBy || req.user.displayName || `Nhóm trưởng Nhóm ${gNum}`]);
          newlyRegistered++;
        }
      }
    });

    res.json({
      success: true,
      message: `Đã đăng ký thành công cho ${newlyRegistered} thành viên Nhóm ${gNum} tham gia hoạt động!`,
      newlyRegistered,
      totalGroupMembers: members.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi đăng ký theo nhóm', error: error.message });
  }
});

// 8. ĐIỂM DANH HOẠT ĐỘNG (Tự động cộng / trừ điểm hoạt động)
router.put('/:id/attendance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { registrationId, attendanceStatus } = req.body;

    if (!registrationId || !attendanceStatus) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm danh' });
    }

    const camp = await db.get('SELECT * FROM campaigns WHERE id = ?', [Number(id)]);
    if (!camp) return res.status(404).json({ success: false, message: 'Không tìm thấy hoạt động' });

    const reg = await db.get('SELECT * FROM campaign_registrations WHERE id = ?', [Number(registrationId)]);
    if (!reg) return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đăng ký' });

    const pointsDelta = camp.points || 10;
    const previousAwarded = reg.points_awarded || 0;
    let newAwarded = previousAwarded;

    await db.transaction(async (txDb) => {
      // Trường hợp 1: Chuyển sang 'co_mat' và trước đó chưa cộng điểm
      if (attendanceStatus === 'co_mat' && previousAwarded === 0) {
        newAwarded = pointsDelta;
        if (reg.member_type === 'ctv') {
          await txDb.run(`
            UPDATE ctv_members 
            SET activity_points = activity_points + ?, total_points = total_points + ? 
            WHERE id = ?
          `, [pointsDelta, pointsDelta, reg.member_id]);

          await txDb.run(`
            INSERT INTO ctv_point_logs (member_id, type, title, points_delta, note)
            VALUES (?, 'activity', ?, ?, ?)
          `, [reg.member_id, `Tham gia hoạt động: ${camp.name}`, pointsDelta, `Điểm danh có mặt tại hoạt động`]);
        } else {
          await txDb.run(`
            UPDATE tnv_members 
            SET total_points = total_points + ? 
            WHERE id = ?
          `, [pointsDelta, reg.member_id]);

          await txDb.run(`
            INSERT INTO tnv_activities (member_id, category, points, note)
            VALUES (?, ?, ?, ?)
          `, [reg.member_id, 'Chiến dịch cao điểm', pointsDelta, `Tham gia hoạt động: ${camp.name}`]);
        }
      } 
      // Trường hợp 2: Chuyển từ 'co_mat' sang 'vang' hoặc 'chua_diem_danh' -> Thu hồi điểm đã cộng
      else if (attendanceStatus !== 'co_mat' && previousAwarded > 0) {
        newAwarded = 0;
        if (reg.member_type === 'ctv') {
          await txDb.run(`
            UPDATE ctv_members 
            SET activity_points = activity_points - ?, total_points = total_points - ? 
            WHERE id = ?
          `, [previousAwarded, previousAwarded, reg.member_id]);

          await txDb.run(`
            INSERT INTO ctv_point_logs (member_id, type, title, points_delta, note)
            VALUES (?, 'activity', ?, ?, ?)
          `, [reg.member_id, `Thu hồi điểm hoạt động: ${camp.name}`, -previousAwarded, `Hủy điểm danh có mặt`]);
        } else {
          await txDb.run(`
            UPDATE tnv_members 
            SET total_points = total_points - ? 
            WHERE id = ?
          `, [previousAwarded, reg.member_id]);

          await txDb.run(`
            INSERT INTO tnv_activities (member_id, category, points, note)
            VALUES (?, ?, ?, ?)
          `, [reg.member_id, 'Điều chỉnh điểm danh', -previousAwarded, `Hủy có mặt tại: ${camp.name}`]);
        }
      }

      await txDb.run(`
        UPDATE campaign_registrations 
        SET attendance_status = ?, points_awarded = ? 
        WHERE id = ?
      `, [attendanceStatus, newAwarded, Number(registrationId)]);
    });

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái điểm danh sang "${attendanceStatus === 'co_mat' ? 'Có mặt (+ ' + pointsDelta + 'đ)' : (attendanceStatus === 'vang' ? 'Vắng mặt' : 'Chưa điểm danh')}"!`,
      attendanceStatus,
      pointsAwarded: newAwarded
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm danh hoạt động', error: error.message });
  }
});

// 9. Hủy đăng ký cá nhân
router.delete('/:id/registrations/:regId', requireAuth, async (req, res) => {
  try {
    const { regId } = req.params;
    const reg = await db.get('SELECT * FROM campaign_registrations WHERE id = ?', [Number(regId)]);
    if (!reg) return res.status(404).json({ success: false, message: 'Không tìm thấy đăng ký' });

    // Thu hồi điểm nếu đã được cộng
    if (reg.points_awarded > 0) {
      if (reg.member_type === 'ctv') {
        await db.run('UPDATE ctv_members SET activity_points = activity_points - ?, total_points = total_points - ? WHERE id = ?',
          [reg.points_awarded, reg.points_awarded, reg.member_id]);
      } else {
        await db.run('UPDATE tnv_members SET total_points = total_points - ? WHERE id = ?',
          [reg.points_awarded, reg.member_id]);
      }
    }

    await db.run('DELETE FROM campaign_registrations WHERE id = ?', [Number(regId)]);
    res.json({ success: true, message: 'Đã hủy đăng ký thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi hủy đăng ký', error: error.message });
  }
});

// 10. Xuất Excel danh sách đăng ký và điểm danh hoạt động
router.get('/:id/export-xlsx', async (req, res) => {
  try {
    const { id } = req.params;
    const camp = await db.get('SELECT * FROM campaigns WHERE id = ?', [Number(id)]);
    if (!camp) return res.status(404).json({ success: false, message: 'Không tìm thấy hoạt động' });

    const regs = await db.all(`
      SELECT 
        r.*,
        CASE WHEN r.member_type = 'ctv' THEN c.full_name ELSE t.full_name END as full_name,
        CASE WHEN r.member_type = 'ctv' THEN c.mssv ELSE t.mssv END as mssv,
        CASE WHEN r.member_type = 'ctv' THEN c.gender ELSE t.gender END as gender,
        CASE WHEN r.member_type = 'ctv' THEN c.class_name ELSE t.class_name END as class_name,
        CASE WHEN r.member_type = 'ctv' THEN c.phone ELSE t.phone END as phone,
        CASE WHEN r.member_type = 'ctv' THEN c.email ELSE t.email END as email,
        CASE WHEN r.member_type = 'ctv' THEN c.role ELSE t.role END as role
      FROM campaign_registrations r
      LEFT JOIN ctv_members c ON r.member_type = 'ctv' AND r.member_id = c.id
      LEFT JOIN tnv_members t ON r.member_type = 'tnv' AND r.member_id = t.id
      WHERE r.campaign_id = ?
      ORDER BY r.group_num ASC, r.member_type ASC, full_name ASC
    `, [Number(id)]);

    const rows = regs.map((r, idx) => ({
      'STT': idx + 1,
      'Đối tượng': r.member_type === 'ctv' ? 'Cộng Tác Viên' : 'Tình Nguyện Viên',
      'Nhóm': `Nhóm ${r.group_num}`,
      'Họ và tên': r.full_name,
      'MSSV': r.mssv,
      'Giới tính': r.gender || 'Nam',
      'Lớp': r.class_name || '',
      'Số điện thoại': r.phone || '',
      'Email': r.email || '',
      'Chức vụ': r.role || 'Thành viên',
      'Người đăng ký': r.registered_by || 'Nhóm trưởng',
      'Trạng thái điểm danh': r.attendance_status === 'co_mat' ? 'Có mặt' : (r.attendance_status === 'vang' ? 'Vắng mặt' : 'Chưa điểm danh'),
      'Điểm cộng': r.points_awarded
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Diem_Danh_Hoat_Dong');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Diem_Danh_Hoat_Dong_${id}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xuất file Excel', error: error.message });
  }
});

export default router;
