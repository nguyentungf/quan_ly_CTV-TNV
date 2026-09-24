import express from 'express';
import { db } from '../db/index.js';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Lấy danh sách TNV (kèm tính toán Benchmark % so với Top 1)
router.get('/members', async (req, res) => {
  try {
    const { search, group, warning, status } = req.query;
    let query = 'SELECT * FROM tnv_members WHERE 1=1';
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
    if (warning && warning !== 'all') {
      query += ' AND warning_level = ?';
      params.push(warning);
    }
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += " ORDER BY group_num ASC, CASE role WHEN 'Nhóm trưởng' THEN 1 WHEN 'Nhóm phó' THEN 2 ELSE 3 END, total_points DESC, mssv ASC";
    const rows = await db.all(query, params);

    // Tính điểm cao nhất (Max Score) toàn bộ hệ thống TNV
    const maxScoreRow = await db.get('SELECT MAX(total_points) as max_score FROM tnv_members');
    const maxScore = maxScoreRow && maxScoreRow.max_score > 0 ? maxScoreRow.max_score : 100;

    // Gắn tỷ lệ benchmark so với Top 1
    const membersWithBenchmark = rows.map(m => {
      const benchmarkRate = maxScore > 0 ? Math.min(100, Math.round((m.total_points / maxScore) * 100)) : 0;
      return {
        ...m,
        benchmarkRate,
        maxScore
      };
    });

    res.json({
      success: true,
      maxScore,
      data: membersWithBenchmark
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách TNV', error: error.message });
  }
});

// 2. Thêm mới TNV
router.post('/members', async (req, res) => {
  try {
    const { mssv, fullName, groupNum, role, gender, className, phone, email, status } = req.body;
    if (!mssv || !fullName || !groupNum) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc: MSSV, Họ tên hoặc Nhóm' });
    }

    const newMember = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, total_points, status, warning_level, warning_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'none', '')
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

    res.json({ success: true, message: 'Thêm TNV thành công', data: newMember });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed') || error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
      return res.status(400).json({ success: false, message: 'Mã số sinh viên (MSSV) này đã tồn tại trong hệ thống!' });
    }
    res.status(500).json({ success: false, message: 'Lỗi khi thêm TNV', error: error.message });
  }
});

// 3. Cập nhật thông tin TNV
router.put('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, groupNum, role, gender, className, phone, email, status } = req.body;

    await db.run(`
      UPDATE tnv_members 
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

    res.json({ success: true, message: 'Cập nhật TNV thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật TNV', error: error.message });
  }
});

// 4. Xóa TNV
router.delete('/members/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM tnv_members WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Đã xóa TNV thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa TNV', error: error.message });
  }
});

// 5. Thao tác hàng loạt (Bulk Actions) cho TNV
router.post('/bulk-action', async (req, res) => {
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
      await db.run(`UPDATE tnv_members SET status = ? WHERE id IN (${placeholders})`, [status, ...ids]);
      return res.json({ success: true, message: `Đã đổi trạng thái sang "${status}" cho ${ids.length} TNV!` });
    }

    if (action === 'change_group') {
      const { groupNum } = payload || {};
      const g = Number(groupNum);
      if (isNaN(g) || g < 1 || g > 4) return res.status(400).json({ success: false, message: 'Nhóm đích TNV không hợp lệ (1-4)' });
      await db.run(`UPDATE tnv_members SET group_num = ? WHERE id IN (${placeholders})`, [g, ...ids]);
      return res.json({ success: true, message: `Đã chuyển ${ids.length} TNV sang Nhóm ${g} thành công!` });
    }

    if (action === 'adjust_points') {
      const { category = 'Chiến dịch cao điểm', pointsDelta = 10, note = 'Điểm thưởng hàng loạt' } = payload || {};
      const delta = Number(pointsDelta);

      await db.transaction(async (txDb) => {
        for (const mid of ids) {
          const m = await txDb.get('SELECT total_points FROM tnv_members WHERE id = ?', [mid]);
          if (m) {
            const newTotal = (m.total_points || 0) + delta;
            await txDb.run('UPDATE tnv_members SET total_points = ? WHERE id = ?', [newTotal, mid]);
            await txDb.run(`
              INSERT INTO tnv_activities (member_id, category, points, note)
              VALUES (?, ?, ?, ?)
            `, [mid, category, delta, note]);
          }
        }
      });
      return res.json({ success: true, message: `Đã cộng/trừ ${delta > 0 ? '+' : ''}${delta}đ tích lũy cho ${ids.length} TNV!` });
    }

    if (action === 'set_warning') {
      const { warningLevel = 'none', warningNote = '' } = payload || {};
      await db.run(`UPDATE tnv_members SET warning_level = ?, warning_note = ? WHERE id IN (${placeholders})`, [warningLevel, warningNote, ...ids]);
      return res.json({ success: true, message: `Đã cập nhật mức kỷ luật cho ${ids.length} TNV!` });
    }

    if (action === 'delete') {
      await db.run(`DELETE FROM tnv_members WHERE id IN (${placeholders})`, ids);
      return res.json({ success: true, message: `Đã xóa thành công ${ids.length} TNV được chọn!` });
    }

    res.status(400).json({ success: false, message: 'Hành động hàng loạt không hợp lệ' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi thực hiện thao tác hàng loạt TNV', error: error.message });
  }
});

// 6. Thống kê tổng quan 4 Nhóm TNV
router.get('/groups-summary', async (req, res) => {
  try {
    const groups = [];
    for (let g = 1; g <= 4; g++) {
      const members = await db.all('SELECT * FROM tnv_members WHERE group_num = ?', [g]);
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
    res.status(500).json({ success: false, message: 'Lỗi thống kê nhóm TNV', error: error.message });
  }
});

// 7. Bảng xếp hạng Top 5 TNV xuất sắc nhất
router.get('/top-5', async (req, res) => {
  try {
    const topMembers = await db.all(`
      SELECT * FROM tnv_members 
      WHERE status = 'Đang hoạt động' 
      ORDER BY total_points DESC, mssv ASC 
      LIMIT 5
    `);

    const maxScore = topMembers.length > 0 && topMembers[0].total_points > 0 ? topMembers[0].total_points : 100;
    const ranked = topMembers.map((m, index) => ({
      ...m,
      rank: index + 1,
      benchmarkRate: maxScore > 0 ? Math.min(100, Math.round((m.total_points / maxScore) * 100)) : 0
    }));

    res.json({ success: true, data: ranked });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải Top 5 TNV', error: error.message });
  }
});

// 8. Bảng theo dõi kỷ luật TNV
router.get('/discipline', async (req, res) => {
  try {
    const disciplinedMembers = await db.all(`
      SELECT * FROM tnv_members 
      WHERE warning_level IN ('canh_cao_1', 'canh_cao_2') 
      ORDER BY CASE warning_level WHEN 'canh_cao_2' THEN 1 ELSE 2 END, total_points ASC
    `);

    res.json({ success: true, data: disciplinedMembers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách kỷ luật TNV', error: error.message });
  }
});

// 9. Cập nhật trạng thái kỷ luật của 1 TNV
router.put('/warning/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { warningLevel, warningNote } = req.body;

    if (!warningLevel) {
      return res.status(400).json({ success: false, message: 'Mức cảnh cáo không được để trống' });
    }

    await db.run(`
      UPDATE tnv_members 
      SET warning_level = ?, warning_note = ? 
      WHERE id = ?
    `, [warningLevel, warningNote || '', Number(id)]);

    res.json({ success: true, message: 'Cập nhật trạng thái kỷ luật thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật kỷ luật', error: error.message });
  }
});

// 10. Danh sách tuần trực / ca trực TNV
router.get('/events', async (req, res) => {
  try {
    const events = await db.all('SELECT * FROM tnv_events ORDER BY event_date ASC, id ASC');
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch trực TNV', error: error.message });
  }
});

// 11. Khởi tạo nhanh 19 tuần học trong kỳ cho TNV
router.post('/init-19-weeks', async (req, res) => {
  try {
    const baseDate = new Date();
    const existing = await db.all('SELECT * FROM tnv_events');
    const existingNames = new Set(existing.map(e => e.name));

    const added = [];
    for (let w = 1; w <= 19; w++) {
      const name = `Tuần ${w}`;
      if (!existingNames.has(name)) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + (w - 1) * 7);
        const eventDate = d.toISOString().split('T')[0];
        const newEv = await db.get(`
          INSERT INTO tnv_events (name, event_date)
          VALUES (?, ?)
          RETURNING *
        `, [name, eventDate]);
        added.push(newEv);

        const members = await db.all('SELECT id FROM tnv_members');
        for (const m of members) {
          await db.run(`
            INSERT INTO tnv_attendance (member_id, event_id, status)
            VALUES (?, ?, 'co_mat')
            ON CONFLICT (member_id, event_id) DO NOTHING
          `, [m.id, newEv.id]);
        }
      }
    }

    res.json({ success: true, message: `Đã khởi tạo thành công các tuần trực TNV (Tổng cộng ${added.length} tuần mới)` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khởi tạo 19 tuần trực TNV', error: error.message });
  }
});

// 12. Thêm ca trực / tuần trực mới
router.post('/events', async (req, res) => {
  try {
    const { name, eventDate } = req.body;
    if (!name || !eventDate) {
      return res.status(400).json({ success: false, message: 'Tên ca trực và ngày không được để trống' });
    }

    const newEvent = await db.get(`
      INSERT INTO tnv_events (name, event_date)
      VALUES (?, ?)
      RETURNING *
    `, [name.trim(), eventDate]);

    const members = await db.all('SELECT id FROM tnv_members');
    for (const m of members) {
      await db.run(`
        INSERT INTO tnv_attendance (member_id, event_id, status)
        VALUES (?, ?, 'co_mat')
        ON CONFLICT (member_id, event_id) DO NOTHING
      `, [m.id, newEvent.id]);
    }

    res.json({ success: true, message: 'Đã tạo ca trực mới', data: newEvent });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo ca trực', error: error.message });
  }
});

// 13. Xóa ca trực
router.delete('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.run('DELETE FROM tnv_attendance WHERE event_id = ?', [Number(id)]);
    await db.run('DELETE FROM tnv_events WHERE id = ?', [Number(id)]);
    res.json({ success: true, message: 'Đã xóa ca trực thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xóa ca trực', error: error.message });
  }
});

// 14. Bảng điểm danh co giãn TNV (Elastic Attendance Matrix)
router.get('/attendance-matrix', async (req, res) => {
  try {
    const { group } = req.query;
    let memberQuery = 'SELECT * FROM tnv_members';
    const memberParams = [];
    if (group && group !== 'all') {
      memberQuery += ' WHERE group_num = ?';
      memberParams.push(Number(group));
    }
    memberQuery += " ORDER BY group_num ASC, CASE role WHEN 'Nhóm trưởng' THEN 1 WHEN 'Nhóm phó' THEN 2 ELSE 3 END, full_name ASC";
    const members = await db.all(memberQuery, memberParams);

    const events = await db.all('SELECT * FROM tnv_events ORDER BY event_date ASC, id ASC');
    const attendanceRecords = await db.all('SELECT * FROM tnv_attendance');

    const attendanceMap = {};
    for (const r of attendanceRecords) {
      const mId = r.member_id || r.memberId;
      const eId = r.event_id || r.eventId;
      attendanceMap[`${mId}_${eId}`] = r.status;
    }

    const matrix = members.map(m => {
      const records = {};
      let attendedCount = 0;

      for (const e of events) {
        const status = attendanceMap[`${m.id}_${e.id}`] || 'vang_khong_phep';
        records[e.id] = status;
        if (status === 'co_mat' || status === 'di_muon') {
          attendedCount++;
        }
      }

      return {
        member: m,
        attendance: records,
        attendedSessions: attendedCount,
        totalSessions: events.length
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
    res.status(500).json({ success: false, message: 'Lỗi tải bảng điểm danh TNV', error: error.message });
  }
});

// 15. Cập nhật ô điểm danh TNV
router.post('/attendance', async (req, res) => {
  try {
    const { memberId, eventId, status } = req.body;
    if (!memberId || !eventId || !status) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin điểm danh' });
    }

    await db.run(`
      INSERT INTO tnv_attendance (member_id, event_id, status)
      VALUES (?, ?, ?)
      ON CONFLICT(member_id, event_id) DO UPDATE SET status = EXCLUDED.status
    `, [Number(memberId), Number(eventId), status]);

    res.json({ success: true, message: 'Cập nhật điểm danh TNV thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm danh TNV', error: error.message });
  }
});

// 16. Ghi nhận hoạt động tích lũy điểm TNV
router.post('/activities', async (req, res) => {
  try {
    const { memberId, category, points, note } = req.body;
    if (!memberId || !category || points === undefined) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin hoạt động' });
    }

    const member = await db.get('SELECT * FROM tnv_members WHERE id = ?', [Number(memberId)]);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy TNV' });
    }

    const delta = Number(points);
    const newTotal = (member.total_points || 0) + delta;

    await db.transaction(async (txDb) => {
      await txDb.run(`
        INSERT INTO tnv_activities (member_id, category, points, note)
        VALUES (?, ?, ?, ?)
      `, [Number(memberId), category, delta, note || '']);

      await txDb.run('UPDATE tnv_members SET total_points = ? WHERE id = ?', [newTotal, Number(memberId)]);
    });

    res.json({
      success: true,
      message: `Đã ghi nhận hoạt động và cộng ${delta} điểm cho ${member.full_name}!`,
      newTotal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi ghi nhận hoạt động TNV', error: error.message });
  }
});

// 17. Lịch sử hoạt động của 1 TNV
router.get('/activities/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    const activities = await db.all('SELECT * FROM tnv_activities WHERE member_id = ? ORDER BY created_at DESC', [Number(memberId)]);
    res.json({ success: true, data: activities });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải lịch sử hoạt động', error: error.message });
  }
});

// Helper: Lấy dữ liệu mảng TNV chuẩn theo hình ảnh mẫu
async function getExportTnvRows() {
  const activeMembers = await db.all(`
    SELECT * FROM tnv_members 
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
    let warningStr = 'Bình thường';
    if (m.warning_level === 'canh_cao_1') warningStr = `Cảnh cáo 1 (Thẻ Vàng)${m.warning_note ? ': ' + m.warning_note : ''}`;
    if (m.warning_level === 'canh_cao_2') warningStr = `Cảnh cáo 2 (Thẻ Đỏ)${m.warning_note ? ': ' + m.warning_note : ''}`;

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
      'Điểm tích lũy': m.total_points,
      'Kỷ luật': warningStr
    });
  }
  return rows;
}

// 18. Xuất file EXCEL (.xlsx) TNV chuẩn theo cấu trúc ảnh
router.get('/export-xlsx', async (req, res) => {
  try {
    const rows = await getExportTnvRows();
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
      { wch: 14 }, // Điểm tích lũy
      { wch: 22 }  // Kỷ luật
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách TNV');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_TNV_Dang_hoat_dong.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xuất file Excel TNV', error: error.message });
  }
});

// 19. Xuất file CSV (UTF-8 BOM chuẩn theo ảnh)
router.get('/export-csv', async (req, res) => {
  try {
    const rows = await getExportTnvRows();
    const headers = ['Nhóm trưởng', 'STT', 'Nhóm', 'Họ và tên', 'MSSV', 'Giới tính', 'Số điện thoại', 'Lớp', 'Email', 'Chức vụ', 'Điểm tích lũy', 'Kỷ luật'];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',');
      csvLines.push(line);
    }

    const bomCsv = '\uFEFF' + csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Danh_sach_TNV_Dang_hoat_dong.csv"');
    res.send(bomCsv);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xuất file CSV TNV', error: error.message });
  }
});

// 20. Tải file mẫu EXCEL (.xlsx) TNV
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
        'Nhóm trưởng': 'Lê Đức Minh',
        'STT': 3,
        'Nhóm': 'Nhóm 2',
        'Họ và tên': 'Trần Phương Nhi',
        'MSSV': '202616158',
        'Giới tính': 'Nữ',
        'Số điện thoại': '0396161208',
        'Lớp': 'CH-E11 - 12',
        'Email': 'Nhi.tp2616158@sis.hust.edu.vn'
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

    XLSX.utils.book_append_sheet(wb, ws, 'Mau_TNV');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Mau_danh_sach_TNV.xlsx"');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tạo file mẫu Excel TNV', error: error.message });
  }
});

// 21. Tải file mẫu CSV (.csv) TNV
router.get('/sample-csv', (req, res) => {
  const sampleRows = [
    ['Nhóm trưởng', 'STT', 'Nhóm', 'Họ và tên', 'MSSV', 'Giới tính', 'Số điện thoại', 'Lớp', 'Email'],
    ['Nguyễn Quang Tùng', '1', 'Nhóm 1', 'Vũ Thu Ngân', '202619067', 'Nữ', '0813994808', 'ET1 - 04', 'Ngan.VT2619067@sis.hust.edu.vn'],
    ['Nguyễn Quang Tùng', '2', 'Nhóm 1', 'Vũ Ngọc Ánh', '202610478', 'Nữ', '0826388469', 'BF-E19', 'anh.vn2610478@sis.hust.edu.vn'],
    ['Lê Đức Minh', '3', 'Nhóm 2', 'Bùi Đức Anh', '20236789', 'Nam', '0902233445', 'ET1 - 05', 'anh.bd2023@sis.hust.edu.vn']
  ];
  const csvContent = sampleRows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const bomCsv = '\uFEFF' + csvContent;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="Mau_danh_sach_TNV.csv"');
  res.status(200).send(bomCsv);
});

// 22. Nhập file (Hỗ trợ cả .xlsx, .xls và .csv) cho TNV
router.post('/import-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Vui lòng đính kèm file .xlsx hoặc .csv!' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (records.length === 0) {
      return res.status(400).json({ success: false, message: 'File dữ liệu rỗng hoặc không đúng định dạng!' });
    }

    let importedCount = 0;
    let updatedCount = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      const mssv = String(row['MSSV'] || row['mssv'] || row['Mã định danh'] || '').trim();
      const fullName = String(row['Họ và tên'] || row['Họ tên'] || row['fullName'] || row['full_name'] || '').trim();
      
      let rawGroup = String(row['Nhóm'] || row['groupNum'] || row['group_num'] || '1');
      const matchNum = rawGroup.match(/\d+/);
      let groupNum = matchNum ? Number(matchNum[0]) : 1;
      if (isNaN(groupNum) || groupNum < 1 || groupNum > 4) groupNum = 1;

      const gender = String(row['Giới tính'] || row['gender'] || 'Nam').trim();
      const className = String(row['Lớp'] || row['className'] || row['class_name'] || '').trim();
      const phone = String(row['Số điện thoại'] || row['SĐT'] || row['phone'] || '').trim();
      const email = String(row['Email'] || row['email'] || '').trim();
      let role = String(row['Chức vụ'] || row['role'] || 'Thành viên').trim();

      if (!mssv || !fullName) {
        errors.push(`Dòng ${i + 2}: Thiếu MSSV hoặc Họ tên`);
        continue;
      }

      try {
        const existing = await db.get('SELECT id FROM tnv_members WHERE mssv = ?', [mssv]);
        if (existing) {
          await db.run(`
            UPDATE tnv_members 
            SET full_name = ?, group_num = ?, role = ?, gender = ?, class_name = ?, phone = ?, email = ?
            WHERE id = ?
          `, [fullName, groupNum, role, gender, className, phone, email, existing.id]);
          updatedCount++;
        } else {
          await db.run(`
            INSERT INTO tnv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, total_points, status, warning_level, warning_note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'Đang hoạt động', 'none', '')
          `, [mssv, fullName, groupNum, role, gender, className, phone, email]);
          importedCount++;
        }
      } catch (err) {
        errors.push(`Dòng ${i + 2} (${mssv}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Nhập file hoàn tất: Đã thêm mới ${importedCount} và cập nhật ${updatedCount} TNV.`,
      importedCount,
      updatedCount,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý file Excel/CSV TNV', error: error.message });
  }
});

// Giữ lại endpoint /import-csv cũ làm alias tương thích
router.post('/import-csv', upload.single('file'), (req, res) => {
  return router.handle({ ...req, url: '/import-file' }, res);
});

export default router;
