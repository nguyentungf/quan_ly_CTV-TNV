import express from 'express';
import { db } from '../db/index.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { requireAuth, requireAdmin, checkGroupPermission } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Lấy danh sách CTV (kèm lọc và tìm kiếm)
router.get('/members', async (req, res) => {
  try {
    const { search, group, status } = req.query;
    let query = 'SELECT * FROM ctv_members WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (mssv LIKE ? OR full_name LIKE ? OR phone LIKE ? OR class_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    if (group && group !== 'all') {
      query += ' AND group_num = ?';
      params.push(Number(group));
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += " ORDER BY group_num ASC, CASE role WHEN 'Nhóm trưởng' THEN 1 WHEN 'Nhóm phó' THEN 2 ELSE 3 END, mssv ASC";
    const rows = await db.all(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách CTV', error: error.message });
  }
});

// 2. Thêm mới CTV
router.post('/members', checkGroupPermission('ctv'), async (req, res) => {
  try {
    const { mssv, fullName, groupNum, role, gender, className, phone, email, status } = req.body;
    if (!mssv || !fullName || !groupNum) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: MSSV, Họ tên hoặc Nhóm' });
    }

    const newMember = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?)
      RETURNING *
    `, [
      mssv.trim(),
      fullName.trim(),
      Number(groupNum),
      role || 'Thành viên',
      gender || 'Nam',
      className?.trim() || '',
      phone?.trim() || '',
      email?.trim() || '',
      status || 'Đang hoạt động'
    ]);

    res.json({ success: true, message: 'Thêm CTV thành công', data: newMember });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
      return res.status(400).json({ success: false, message: 'Mã số sinh viên (MSSV) này đã tồn tại trong hệ thống!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi khi thêm CTV', error: error.message });
  }
});

// 3. Cập nhật thông tin CTV
router.put('/members/:id', checkGroupPermission('ctv'), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, groupNum, role, gender, className, phone, email, status } = req.body;

    await db.run(`
      UPDATE ctv_members 
      SET full_name = ?, group_num = ?, role = ?, gender = ?, class_name = ?, phone = ?, email = ?, status = ?
      WHERE id = ?
    `, [
      fullName?.trim(),
      Number(groupNum),
      role || 'Thành viên',
      gender || 'Nam',
      className?.trim() || '',
      phone?.trim() || '',
      email?.trim() || '',
      status || 'Đang hoạt động',
      Number(id)
    ]);

    res.json({ success: true, message: 'Cập nhật CTV thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật CTV', error: error.message });
  }
});

// 4. Xóa CTV
router.delete('/members/:id', checkGroupPermission('ctv'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM ctv_members WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Đã xóa CTV thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa CTV', error: error.message });
  }
});

// 5. Thao tác hàng loạt (Bulk Actions)
router.post('/bulk-action', checkGroupPermission('ctv'), async (req, res) => {
  try {
    const { action, memberIds, payload } = req.body;
    if (!action || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách nhân sự được chọn không hợp lệ!' });
    }

    const ids = memberIds.map(Number);
    const placeholders = ids.map(() => '?').join(',');

    if (action === 'change_status') {
      const { status } = payload || {};
      if (!status) return res.status(400).json({ success: false, message: 'Thiếu trạng thái mới' });
      await db.run(`UPDATE ctv_members SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
      return res.json({ success: true, message: `Đã đổi trạng thái sang "${status}" cho ${ids.length} CTV!` });
    }

    if (action === 'change_group') {
      const { groupNum } = payload || {};
      const g = Number(groupNum);
      if (isNaN(g) || g < 1 || g > 8) return res.status(400).json({ success: false, message: 'Nhóm đích không hợp lệ (1-8)' });
      await db.run(`UPDATE ctv_members SET group_num = ? WHERE id IN (${placeholders})`, [g, ...ids]);
      return res.json({ success: true, message: `Đã chuyển ${ids.length} CTV sang Nhóm ${g} thành công!` });
    }

    if (action === 'adjust_points') {
      const { type = 'activity', title = 'Điểm thưởng hàng loạt', pointsDelta = 5, note = '' } = payload || {};
      const delta = Number(pointsDelta);
      const isAttitude = type === 'attitude';

      await db.transaction(async (txDb) => {
        for (const mid of ids) {
          const m = await txDb.get('SELECT attitude_points, activity_points FROM ctv_members WHERE id = ?', [mid]);
          if (m) {
            let newAtt = m.attitude_points;
            let newAct = m.activity_points;
            if (isAttitude) newAtt += delta;
            else newAct += delta;
            const newTotal = newAtt + newAct;

            await txDb.run(`
              UPDATE ctv_members 
              SET attitude_points = ?, activity_points = ?, total_points = ? 
              WHERE id = ?
            `, [newAtt, newAct, newTotal, mid]);

            await txDb.run(`
              INSERT INTO ctv_point_logs (member_id, type, title, points_delta, note)
              VALUES (?, ?, ?, ?, ?)
            `, [mid, type, title, delta, note]);
          }
        }
      });
      return res.json({ success: true, message: `Đã cộng/trừ ${delta > 0 ? '+' : ''}${delta}đ cho ${ids.length} CTV!` });
    }

    if (action === 'delete') {
      await db.run(`DELETE FROM ctv_members WHERE id IN (${placeholders})`, ids);
      return res.json({ success: true, message: `Đã xóa thành công ${ids.length} CTV được chọn!` });
    }

    res.status(400).json({ success: false, message: 'Hành động hàng loạt không hợp lệ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi thực hiện thao tác hàng loạt', error: error.message });
  }
});

// 6. Thống kê tổng quan 8 Nhóm CTV
router.get('/groups-summary', async (req, res) => {
  try {
    const groups = [];
    for (let g = 1; g <= 8; g++) {
      const members = await db.all('SELECT * FROM ctv_members WHERE group_num = ?', [g]);
      const leader = members.find(m => m.role === 'Nhóm trưởng');
      const deputy = members.find(m => m.role === 'Nhóm phó');
      const totalPoints = members.reduce((sum, m) => sum + (m.total_points || 0), 0);
      const avgPoints = members.length > 0 ? (totalPoints / members.length).toFixed(1) : 0;

      groups.push({
        groupNum: g,
        groupName: `Nhóm ${g}`,
        memberCount: members.length,
        leaderName: leader ? leader.full_name : 'Chưa phân công',
        leaderMssv: leader ? leader.mssv : null,
        deputyName: deputy ? deputy.full_name : null,
        avgPoints: Number(avgPoints),
        activeCount: members.filter(m => m.status === 'Đang hoạt động').length
      });
    }
    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi thống kê nhóm CTV', error: error.message });
  }
});

// 7. Danh sách các buổi họp/sự kiện điểm danh CTV
router.get('/events', async (req, res) => {
  try {
    const events = await db.all('SELECT * FROM ctv_events ORDER BY event_date ASC, id ASC');
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải ngày điểm danh', error: error.message });
  }
});

// 8. Khởi tạo nhanh 19 tuần họp trong kỳ
router.post('/init-19-weeks', requireAdmin, async (req, res) => {
  try {
    const baseDate = new Date();
    const existing = await db.all('SELECT * FROM ctv_events');
    const existingNames = new Set(existing.map(e => e.name));

    const added = [];
    for (let w = 1; w <= 19; w++) {
      const name = `Tuần ${w}`;
      if (!existingNames.has(name)) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + (w - 1) * 7);
        const eventDate = d.toISOString().split('T')[0];
        const newEv = await db.get(`
          INSERT INTO ctv_events (name, event_date)
          VALUES (?, ?)
          RETURNING *
        `, [name, eventDate]);
        added.push(newEv);

        // Mặc định tạo trạng thái có mặt
        const members = await db.all('SELECT id FROM ctv_members');
        for (const m of members) {
          await db.run(`
            INSERT INTO ctv_attendance (member_id, event_id, status)
            VALUES (?, ?, 'co_mat')
            ON CONFLICT (member_id, event_id) DO NOTHING
          `, [m.id, newEv.id]);
        }
      }
    }

    res.json({ success: true, message: `Đã khởi tạo thành công các tuần họp (Tổng cộng ${added.length} tuần mới)` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khởi tạo 19 tuần họp', error: error.message });
  }
});

// 9. Thêm ngày điểm danh mới
router.post('/events', requireAdmin, async (req, res) => {
  try {
    const { name, eventDate } = req.body;
    if (!name || !eventDate) {
      return res.status(400).json({ success: false, message: 'Tên buổi họp và ngày không được để trống' });
    }
    const newEvent = await db.get(`
      INSERT INTO ctv_events (name, event_date)
      VALUES (?, ?)
      RETURNING *
    `, [name.trim(), eventDate]);

    const members = await db.all('SELECT id FROM ctv_members');
    for (const m of members) {
      await db.run(`
        INSERT INTO ctv_attendance (member_id, event_id, status)
        VALUES (?, ?, 'co_mat')
        ON CONFLICT (member_id, event_id) DO NOTHING
      `, [m.id, newEvent.id]);
    }

    res.json({ success: true, message: 'Đã tạo ngày điểm danh mới', data: newEvent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo ngày điểm danh', error: error.message });
  }
});

// 10. Xóa ngày điểm danh
router.delete('/events/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM ctv_attendance WHERE event_id = ?', [Number(id)]);
    await db.run('DELETE FROM ctv_events WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Đã xóa ngày điểm danh' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa ngày điểm danh', error: error.message });
  }
});

// 11. Ma trận điểm danh co giãn (Elastic Attendance Matrix)
router.get('/attendance-matrix', async (req, res) => {
  try {
    const { group } = req.query;
    let memberQuery = 'SELECT * FROM ctv_members';
    const memberParams = [];
    if (group && group !== 'all') {
      memberQuery += ' WHERE group_num = ?';
      memberParams.push(Number(group));
    }
    memberQuery += " ORDER BY group_num ASC, CASE role WHEN 'Nhóm trưởng' THEN 1 WHEN 'Nhóm phó' THEN 2 ELSE 3 END, full_name ASC";
    const members = await db.all(memberQuery, memberParams);

    const events = await db.all('SELECT * FROM ctv_events ORDER BY event_date ASC, id ASC');
    const attendanceRecords = await db.all('SELECT * FROM ctv_attendance');

    const attendanceMap = {};
    for (const r of attendanceRecords) {
      const mId = r.member_id || r.memberId;
      const eId = r.event_id || r.eventId;
      attendanceMap[`${mId}_${eId}`] = r.status;
    }

    const weightMap = { co_mat: 100, di_muon: 50, co_phep: 0, vang_khong_phep: -50 };

    const matrix = members.map(m => {
      const records = {};
      let totalWeightedScore = 0;
      let recordedCount = 0;

      for (const e of events) {
        const status = attendanceMap[`${m.id}_${e.id}`] || 'vang_khong_phep';
        records[e.id] = status;
        totalWeightedScore += (weightMap[status] !== undefined ? weightMap[status] : 0);
        recordedCount++;
      }

      let rate = 0;
      if (recordedCount > 0) {
        const rawRate = totalWeightedScore / recordedCount;
        rate = Math.max(0, Math.min(100, Math.round(rawRate)));
      }

      return {
        member: m,
        attendance: records,
        attendanceRate: rate
      };
    });

    res.json({
      success: true,
      data: {
        events,
        matrix
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải ma trận điểm danh', error: error.message });
  }
});

// 12. Cập nhật ô điểm danh
router.post('/attendance', checkGroupPermission('ctv'), async (req, res) => {
  try {
    const { memberId, eventId, status } = req.body;
    if (!memberId || !eventId || !status) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm danh' });
    }

    await db.run(`
      INSERT INTO ctv_attendance (member_id, event_id, status)
      VALUES (?, ?, ?)
      ON CONFLICT(member_id, event_id) DO UPDATE SET status = EXCLUDED.status
    `, [Number(memberId), Number(eventId), status]);

    res.json({ success: true, message: 'Cập nhật điểm danh thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm danh', error: error.message });
  }
});

// 13. Đánh giá thái độ & Ghi nhận hoạt động
router.post('/attitude-activity', checkGroupPermission('ctv'), async (req, res) => {
  try {
    const { memberId, type, title, pointsDelta, note } = req.body;
    if (!memberId || !type || !title || pointsDelta === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin chấm điểm' });
    }

    const member = await db.get('SELECT * FROM ctv_members WHERE id = ?', [Number(memberId)]);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy CTV' });
    }

    const delta = Number(pointsDelta);
    let newAttitude = member.attitude_points;
    let newActivity = member.activity_points;

    if (type === 'attitude') newAttitude += delta;
    else newActivity += delta;
    const newTotal = newAttitude + newActivity;

    await db.transaction(async (txDb) => {
      await txDb.run(`
        INSERT INTO ctv_point_logs (member_id, type, title, points_delta, note)
        VALUES (?, ?, ?, ?, ?)
      `, [Number(memberId), type, title, delta, note || '']);

      await txDb.run(`
        UPDATE ctv_members 
        SET attitude_points = ?, activity_points = ?, total_points = ?
        WHERE id = ?
      `, [newAttitude, newActivity, newTotal, Number(memberId)]);
    });

    res.json({
      success: true,
      message: 'Ghi nhận điểm thành công',
      data: { attitudePoints: newAttitude, activityPoints: newActivity, totalPoints: newTotal }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi chấm điểm CTV', error: error.message });
  }
});

// 14. Lịch sử chấm điểm của 1 CTV
router.get('/point-logs/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const logs = await db.all('SELECT * FROM ctv_point_logs WHERE member_id = ? ORDER BY created_at DESC', [Number(memberId)]);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử điểm', error: error.message });
  }
});

// 15. Gộp nhóm CTV
router.post('/merge-groups', requireAdmin, async (req, res) => {
  try {
    const { sourceGroup, targetGroup, notes } = req.body;
    const src = Number(sourceGroup);
    const tgt = Number(targetGroup);

    if (isNaN(src) || isNaN(tgt)) return res.status(400).json({ success: false, message: 'Mã nhóm không hợp lệ' });
    if (src === tgt) return res.status(400).json({ success: false, message: 'Không thể gộp nhóm vào chính nó!' });
    if (src < tgt) {
      return res.status(400).json({
        success: false,
        message: `Theo quy tắc, nhóm có số thứ tự lớn hơn (Nhóm ${src}) phải được gộp vào nhóm nhỏ hơn (Nhóm ${tgt})!`
      });
    }

    const srcMembers = await db.all('SELECT * FROM ctv_members WHERE group_num = ?', [src]);
    if (srcMembers.length === 0) {
      return res.status(400).json({ success: false, message: `Nhóm ${src} hiện không có thành viên nào để gộp!` });
    }

    const srcLeader = srcMembers.find(m => m.role === 'Nhóm trưởng');
    const demotedLeaderName = srcLeader ? srcLeader.full_name : 'Không có Nhóm trưởng';

    await db.transaction(async (txDb) => {
      if (srcLeader) {
        await txDb.run(`UPDATE ctv_members SET group_num = ?, role = 'Nhóm phó' WHERE id = ?`, [tgt, srcLeader.id]);
      }
      await txDb.run(`UPDATE ctv_members SET group_num = ? WHERE group_num = ? AND id != ?`, [tgt, src, srcLeader ? srcLeader.id : -1]);

      await txDb.run(`
        INSERT INTO ctv_merge_logs (source_group, target_group, demoted_leader_name, merged_count, note)
        VALUES (?, ?, ?, ?, ?)
      `, [src, tgt, demotedLeaderName, srcMembers.length, notes || `Gộp Nhóm ${src} vào Nhóm ${tgt}. ${demotedLeaderName} chuyển thành Nhóm phó.`]);
    });

    res.json({
      success: true,
      message: `Đã gộp thành công ${srcMembers.length} thành viên từ Nhóm ${src} vào Nhóm ${tgt}!`,
      details: {
        sourceGroup: src,
        targetGroup: tgt,
        demotedLeader: demotedLeaderName,
        mergedCount: srcMembers.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi thực hiện gộp nhóm', error: error.message });
  }
});

// 16. Lịch sử gộp nhóm
router.get('/merge-logs', async (req, res) => {
  try {
    const logs = await db.all('SELECT * FROM ctv_merge_logs ORDER BY created_at DESC');
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử gộp nhóm', error: error.message });
  }
});

// Helper: Lấy dữ liệu dạng mảng chuẩn theo hình ảnh mẫu
async function getExportRows() {
  const activeMembers = await db.all(`
    SELECT * FROM ctv_members 
    WHERE status = 'Đang hoạt động' 
    ORDER BY group_num ASC, CASE role WHEN 'Nhóm trưởng' THEN 1 WHEN 'Nhóm phó' THEN 2 ELSE 3 END, mssv ASC
  `);

  const groupLeaders = {};
  for (const m of activeMembers) {
    if (m.role === 'Nhóm trưởng') {
      groupLeaders[m.group_num] = m.full_name;
    }
  }

  const rows = [];
  let stt = 1;
  for (const m of activeMembers) {
    const leaderName = groupLeaders[m.group_num] || 'Chưa phân công';
    rows.push({
      'Nhóm trưởng': leaderName,
      'STT': stt++,
      'Nhóm': `Nhóm ${m.group_num}`,
      'Họ và tên': m.full_name,
      'MSSV': m.mssv,
      'Giới tính': m.gender || 'Nam',
      'Số điện thoại': m.phone || '',
      'Lớp': m.class_name || '',
      'Email': m.email || '',
      'Chức vụ': m.role,
      'Điểm thái độ': m.attitude_points,
      'Điểm hoạt động': m.activity_points,
      'Tổng điểm': m.total_points
    });
  }
  return rows;
}

// 17. Xuất file EXCEL (.xlsx) chuẩn theo ảnh
router.get('/export-xlsx', async (req, res) => {
  try {
    const rows = await getExportRows();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = [
      { wch: 22 }, // Nhóm trưởng
      { wch: 6 },  // STT
      { wch: 10 }, // Nhóm
      { wch: 25 }, // Họ và tên
      { wch: 14 }, // MSSV
      { wch: 10 }, // Giới tính
      { wch: 14 }, // Số điện thoại
      { wch: 14 }, // Lớp
      { wch: 32 }, // Email
      { wch: 12 }, // Chức vụ
      { wch: 12 }, // Điểm thái độ
      { wch: 14 }, // Điểm hoạt động
      { wch: 12 }  // Tổng điểm
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách CTV');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_CTV_Dang_hoat_dong.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xuất file Excel', error: error.message });
  }
});

// 18. Xuất file CSV (UTF-8 BOM chuẩn theo ảnh)
router.get('/export-csv', async (req, res) => {
  try {
    const rows = await getExportRows();
    const headers = ['Nhóm trưởng', 'STT', 'Nhóm', 'Họ và tên', 'MSSV', 'Giới tính', 'Số điện thoại', 'Lớp', 'Email', 'Chức vụ', 'Điểm thái độ', 'Điểm hoạt động', 'Tổng điểm'];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',');
      csvLines.push(line);
    }

    const bomCsv = '\uFEFF' + csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_CTV_Dang_hoat_dong.csv"');
    res.send(bomCsv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xuất file CSV', error: error.message });
  }
});

// 19. Tải file mẫu EXCEL (.xlsx) y hệt ảnh đính kèm
router.get('/sample-xlsx', (req, res) => {
  try {
    const sampleData = [
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 1,
        'Nhóm': 'Nhóm 1',
        'Họ và tên': 'Vũ Thu Ngân',
        'MSSV': '202619067',
        'Giới tính': 'Nữ',
        'Số điện thoại': '0813994808',
        'Lớp': 'ET1 - 04',
        'Email': 'Ngan.VT2619067@sis.hust.edu.vn'
      },
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 2,
        'Nhóm': 'Nhóm 1',
        'Họ và tên': 'Vũ Ngọc Ánh',
        'MSSV': '202610478',
        'Giới tính': 'Nữ',
        'Số điện thoại': '0826388469',
        'Lớp': 'BF-E19',
        'Email': 'anh.vn2610478@sis.hust.edu.vn'
      },
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 3,
        'Nhóm': 'Nhóm 1',
        'Họ và tên': 'Trần Phương Nhi',
        'MSSV': '202616158',
        'Giới tính': 'Nữ',
        'Số điện thoại': '0396161208',
        'Lớp': 'CH-E11 - 12',
        'Email': 'Nhi.tp2616158@sis.hust.edu.vn'
      },
      {
        'Nhóm trưởng': 'Nguyễn Quang Tùng',
        'STT': 4,
        'Nhóm': 'Nhóm 1',
        'Họ và tên': 'Trần Trung Thành',
        'MSSV': '202619907',
        'Giới tính': 'Nam',
        'Số điện thoại': '0839128133',
        'Lớp': 'ET1 - 02',
        'Email': 'Thanh.TT2619907@sis.hust.edu.vn'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 20 },
      { wch: 6 },
      { wch: 10 },
      { wch: 22 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Mau_CTV');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_danh_sach_CTV.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo file mẫu Excel', error: error.message });
  }
});

// 20. Tải file mẫu CSV (.csv)
router.get('/sample-csv', (req, res) => {
  const sampleRows = [
    ['Nhóm trưởng', 'STT', 'Nhóm', 'Họ và tên', 'MSSV', 'Giới tính', 'Số điện thoại', 'Lớp', 'Email'],
    ['Nguyễn Quang Tùng', '1', 'Nhóm 1', 'Vũ Thu Ngân', '202619067', 'Nữ', '0813994808', 'ET1 - 04', 'Ngan.VT2619067@sis.hust.edu.vn'],
    ['Nguyễn Quang Tùng', '2', 'Nhóm 1', 'Vũ Ngọc Ánh', '202610478', 'Nữ', '0826388469', 'BF-E19', 'anh.vn2610478@sis.hust.edu.vn'],
    ['Phạm Minh Tuấn', '3', 'Nhóm 2', 'Bùi Đức Anh', '20236789', 'Nam', '0902233445', 'ET1 - 05', 'anh.bd2023@sis.hust.edu.vn']
  ];
  const csvContent = sampleRows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const bomCsv = '\uFEFF' + csvContent;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Mau_danh_sach_CTV.csv"');
  res.status(200).send(bomCsv);
});

// 21. Nhập file (Hỗ trợ cả .xlsx, .xls và .csv, tự động nhận diện header dù có tiêu đề/banner phía trên)
router.post('/import-file', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng đính kèm file .xlsx hoặc .csv!' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Đọc toàn bộ sheet thành mảng 2D
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (!rawData || rawData.length === 0) {
      return res.status(400).json({ success: false, message: 'File dữ liệu rỗng!' });
    }

    // Tự động tìm dòng tiêu đề thật (dòng chứa từ khóa 'MSSV' và 'Họ và tên' / 'Họ tên')
    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rawData.length, 30); r++) {
      const row = rawData[r].map(c => String(c).trim().toLowerCase());
      const hasMssv = row.some(c => c.includes('mssv') || c.includes('mã định danh'));
      const hasName = row.some(c => c.includes('họ') && (c.includes('tên') || c.includes('ten')));
      if (hasMssv && hasName) {
        headerRowIdx = r;
        break;
      }
    }

    // Nếu không tìm thấy, fallback về dòng đầu tiên
    if (headerRowIdx === -1) headerRowIdx = 0;

    const headers = rawData[headerRowIdx].map(c => String(c).trim());
    
    // Xác định chỉ số các cột
    const findCol = (keywords) => {
      return headers.findIndex(h => {
        const lower = h.toLowerCase();
        return keywords.some(k => lower.includes(k));
      });
    };

    const colLeader = headers.findIndex(h => {
      const lower = h.toLowerCase().trim();
      return lower.includes('nhóm trưởng') || lower.includes('trưởng nhóm') || lower.includes('leader');
    });

    const colGroup = headers.findIndex(h => {
      const lower = h.toLowerCase().trim();
      return (lower === 'nhóm' || lower === 'group' || (lower.includes('nhóm') && !lower.includes('trưởng')));
    });

    const colMssv = findCol(['mssv', 'mã định danh']);
    const colName = findCol(['họ và tên', 'họ tên', 'full_name', 'fullname']);
    const colGender = findCol(['giới tính', 'gender']);
    const colClass = findCol(['lớp', 'class']);
    const colPhone = findCol(['số điện thoại', 'sđt', 'phone', 'điện thoại']);
    const colEmail = findCol(['email']);
    const colRole = findCol(['chức vụ', 'role']);

    if (colMssv === -1 || colName === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không tìm thấy các cột bắt buộc (MSSV, Họ và tên) trong file!' 
      });
    }

    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];
    let currentLeader = '';
    let currentGroupNum = 1;

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const mssv = String(row[colMssv] || '').trim();
      const fullName = String(row[colName] || '').trim();

      // Bỏ qua dòng trống hoặc dòng tổng cộng/thống kê
      if (!mssv || !fullName) continue;

      // Xử lý nhóm
      let groupNum = currentGroupNum;
      if (colGroup !== -1 && row[colGroup]) {
        const rawGroup = String(row[colGroup]);
        const match = rawGroup.match(/\d+/);
        if (match) {
          groupNum = Number(match[0]);
          if (groupNum >= 1 && groupNum <= 8) {
            currentGroupNum = groupNum;
          }
        }
      }

      // Xử lý Nhóm trưởng (nếu có cột và có giá trị ở dòng này)
      if (colLeader !== -1 && row[colLeader]) {
        currentLeader = String(row[colLeader]).trim();
      }

      const gender = colGender !== -1 && row[colGender] ? String(row[colGender]).trim() : 'Nam';
      const className = colClass !== -1 && row[colClass] ? String(row[colClass]).trim() : '';
      const phone = colPhone !== -1 && row[colPhone] ? String(row[colPhone]).trim() : '';
      const email = colEmail !== -1 && row[colEmail] ? String(row[colEmail]).trim() : '';
      
      let role = 'Thành viên';
      if (colRole !== -1 && row[colRole]) {
        role = String(row[colRole]).trim();
      }

      try {
        const existing = await db.get('SELECT id FROM ctv_members WHERE mssv = ?', [mssv]);
        if (existing) {
          await db.run(`
            UPDATE ctv_members 
            SET full_name = ?, group_num = ?, role = ?, gender = ?, class_name = ?, phone = ?, email = ?
            WHERE id = ?
          `, [fullName, currentGroupNum, role, gender, className, phone, email, existing.id]);
          updatedCount++;
        } else {
          await db.run(`
            INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'Đang hoạt động')
          `, [mssv, fullName, currentGroupNum, role, gender, className, phone, email]);
          importedCount++;
        }
      } catch (err) {
        errors.push(`Dòng ${i + 1} (${mssv}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Nhập file hoàn tất: Đã thêm mới ${importedCount} và cập nhật ${updatedCount} CTV từ ${rawData.length - headerRowIdx - 1} dòng dữ liệu.`,
      importedCount,
      updatedCount,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý file Excel/CSV', error: error.message });
  }
});

export default router;
