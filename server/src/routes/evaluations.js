import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const DEFAULT_RUBRIC = {
  attendanceWeight: 30,
  activityWeight: 50,
  qualitativeWeight: 20,
  thresholdExcellent: 85,
  thresholdGood: 70,
  thresholdFair: 50
};

// Helper: Lấy cấu hình thang điểm từ DB
async function getRubric() {
  try {
    const row = await db.get("SELECT value FROM system_settings WHERE key = 'evaluation_rubric'");
    if (row && row.value) {
      return { ...DEFAULT_RUBRIC, ...JSON.parse(row.value) };
    }
  } catch (e) {
    console.warn('Lỗi đọc evaluation_rubric, dùng mặc định:', e.message);
  }
  return DEFAULT_RUBRIC;
}

// 1. Lấy cấu hình thang điểm đánh giá hiện tại
router.get('/rubric', async (req, res) => {
  try {
    const rubric = await getRubric();
    res.json({ success: true, data: rubric });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải cấu hình thang điểm', error: error.message });
  }
});

// 2. Cập nhật cấu hình thang điểm (Chỉ Admin)
router.post('/rubric', requireAdmin, async (req, res) => {
  try {
    const {
      attendanceWeight,
      activityWeight,
      qualitativeWeight,
      thresholdExcellent,
      thresholdGood,
      thresholdFair
    } = req.body;

    const newRubric = {
      attendanceWeight: Number(attendanceWeight) || DEFAULT_RUBRIC.attendanceWeight,
      activityWeight: Number(activityWeight) || DEFAULT_RUBRIC.activityWeight,
      qualitativeWeight: Number(qualitativeWeight) || DEFAULT_RUBRIC.qualitativeWeight,
      thresholdExcellent: Number(thresholdExcellent) || DEFAULT_RUBRIC.thresholdExcellent,
      thresholdGood: Number(thresholdGood) || DEFAULT_RUBRIC.thresholdGood,
      thresholdFair: Number(thresholdFair) || DEFAULT_RUBRIC.thresholdFair,
    };

    const rubricStr = JSON.stringify(newRubric);
    await db.run(`
      INSERT INTO system_settings ("key", value, updated_at)
      VALUES ('evaluation_rubric', ?, CURRENT_TIMESTAMP)
      ON CONFLICT("key") DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `, [rubricStr]);

    res.json({
      success: true,
      message: 'Đã cập nhật cấu hình thang điểm đánh giá thành công!',
      data: newRubric
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi lưu cấu hình thang điểm', error: error.message });
  }
});

// 3. Lấy bảng tổng hợp Đánh giá Nửa kỳ hoặc Toàn kỳ
router.get('/summary', async (req, res) => {
  try {
    const period = req.query.period || req.query.milestone || 'midterm';
    const memberType = req.query.memberType || req.query.type || 'ctv';
    const group = req.query.group;
    const isMidterm = period === 'midterm';
    const isCtv = memberType === 'ctv';
    const rubric = await getRubric();

    // 1. Lấy danh sách thành viên theo bộ lọc nhóm
    const memberTable = isCtv ? 'ctv_members' : 'tnv_members';
    let memberSql = `SELECT * FROM ${memberTable} WHERE 1=1`;
    const params = [];
    if (group && group !== 'all') {
      memberSql += ' AND group_num = ?';
      params.push(Number(group));
    }
    memberSql += " ORDER BY group_num ASC, CASE role WHEN 'Nhóm trưởng' THEN 1 WHEN 'Nhóm phó' THEN 2 ELSE 3 END, full_name ASC";
    const members = await db.all(memberSql, params);

    // 2. Lấy danh sách các tuần họp / ca trực tương ứng với mốc kỳ
    const eventTable = isCtv ? 'ctv_events' : 'tnv_events';
    const allEvents = await db.all(`SELECT * FROM ${eventTable} ORDER BY event_date ASC, id ASC`);
    
    // Mốc: Nửa kỳ lấy tối đa 10 tuần đầu, Toàn kỳ lấy tất cả (tối đa 19 tuần)
    const periodEvents = isMidterm ? allEvents.slice(0, 10) : allEvents;
    const periodEventIds = new Set(periodEvents.map(e => e.id));

    // 3. Lấy dữ liệu điểm danh
    const attTable = isCtv ? 'ctv_attendance' : 'tnv_attendance';
    const allAttendance = await db.all(`SELECT * FROM ${attTable}`);
    const attendanceMap = new Map();
    for (const att of allAttendance) {
      if (periodEventIds.has(att.event_id)) {
        attendanceMap.set(`${att.member_id}_${att.event_id}`, att.status);
      }
    }

    // 4. Lấy dữ liệu đánh giá đã lưu trong bảng evaluations
    const savedEvals = await db.all(`
      SELECT * FROM evaluations 
      WHERE period = ? AND member_type = ?
    `, [period, memberType]);
    const evalMap = new Map();
    for (const ev of savedEvals) {
      evalMap.set(ev.member_id, ev);
    }

    // Kiểm tra trạng thái khóa sổ chung của nhóm/kỳ
    let isAllLocked = false;
    if (savedEvals.length > 0 && members.length > 0) {
      const targetMemberIds = new Set(members.map(m => m.id));
      const relevantEvals = savedEvals.filter(e => targetMemberIds.has(e.member_id));
      if (relevantEvals.length > 0 && relevantEvals.every(e => e.is_locked === 1)) {
        isAllLocked = true;
      }
    }

    // 5. Tính toán điểm cho từng thành viên
    const result = members.map(m => {
      // a. Điểm chuyên cần tự động
      let attendedCount = 0;
      let excusedCount = 0;
      let unexcusedCount = 0;

      for (const ev of periodEvents) {
        const st = attendanceMap.get(`${m.id}_${ev.id}`) || 'khong_phep';
        if (st === 'tham_gia' || st === 'co_mat') attendedCount++;
        else if (st === 'co_phep') excusedCount++;
        else unexcusedCount++;
      }

      const totalEvents = periodEvents.length;
      let rawAttScore = 0;
      if (totalEvents > 0) {
        const rate = (attendedCount + excusedCount * 0.5) / totalEvents;
        rawAttScore = Math.round(rate * rubric.attendanceWeight);
      }
      let attendanceScore = Math.max(0, Math.min(rubric.attendanceWeight, rawAttScore));

      // b. Điểm hoạt động tự động (lấy từ trường điểm hoạt động trong bảng thành viên)
      const rawAct = isCtv ? (m.activity_points || 0) : (m.total_points || 0);
      let activityScore = Math.max(0, Math.min(rubric.activityWeight, rawAct));

      // c. Kiểm tra bản ghi đã lưu trong evaluations (ưu tiên điểm đã được sửa/lưu thủ công)
      const saved = evalMap.get(m.id);
      if (saved) {
        if (saved.attendance_score !== null && saved.attendance_score !== undefined) {
          attendanceScore = Number(saved.attendance_score);
        }
        if (saved.activity_score !== null && saved.activity_score !== undefined) {
          activityScore = Number(saved.activity_score);
        }
      }

      const qualitativeScore = saved ? Number(saved.qualitative_score || 0) : 0;
      const notes = saved ? saved.notes || '' : '';
      const isLocked = saved ? Boolean(saved.is_locked) : false;
      const evaluatorName = saved ? saved.evaluator_name || '' : '';

      // d. Tổng điểm
      const totalScore = attendanceScore + activityScore + qualitativeScore;

      // e. Xếp loại danh hiệu
      let rankGrade = 'Khá';
      if (totalScore >= rubric.thresholdExcellent) rankGrade = 'Xuất sắc';
      else if (totalScore >= rubric.thresholdGood) rankGrade = 'Tốt';
      else if (totalScore >= rubric.thresholdFair) rankGrade = 'Khá';
      else rankGrade = 'Cần cải thiện';

      // Xử lý kỷ luật đối với TNV
      if (!isCtv) {
        if (m.warning_level === 'canh_cao_2') {
          rankGrade = 'Kỷ luật (Thẻ Đỏ)';
        } else if (m.warning_level === 'canh_cao_1') {
          // Hạ 1 bậc xếp loại
          if (rankGrade === 'Xuất sắc') rankGrade = 'Tốt';
          else if (rankGrade === 'Tốt') rankGrade = 'Khá';
          else rankGrade = 'Cần cải thiện';
        }
      }

      return {
        id: m.id,
        full_name: m.full_name,
        mssv: m.mssv,
        group_num: m.group_num,
        role: m.role,
        member: m,
        period,
        memberType,
        totalEvents,
        attendedCount,
        excusedCount,
        unexcusedCount,
        attendanceScore,
        activityScore,
        qualitativeScore,
        totalScore,
        rankGrade,
        notes,
        isLocked,
        is_locked: isLocked ? 1 : 0,
        is_finalized: isLocked,
        evaluatorName,
        warningLevel: m.warning_level || 'none'
      };
    });

    res.json({
      success: true,
      period,
      memberType,
      rubric,
      isAllLocked,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải dữ liệu đánh giá kỳ', error: error.message });
  }
});

// 4. Lưu bản nháp Đánh giá định tính & Nhận xét (Nhóm trưởng / Admin)
router.post('/grade-draft', requireAuth, async (req, res) => {
  try {
    const period = req.body.period || req.body.milestone || 'midterm';
    const memberType = req.body.memberType || req.body.type || 'ctv';
    let evalList = req.body.evaluations;

    // Hỗ trợ gửi 1 đối tượng đánh giá đơn lẻ
    if (!evalList && req.body.memberId) {
      evalList = [{
        memberId: req.body.memberId,
        qualitativeScore: req.body.qualitativeScore,
        notes: req.body.notes || req.body.leaderNotes,
        attendanceScore: req.body.attendanceScore,
        activityScore: req.body.activityScore,
        rankGrade: req.body.rankGrade,
      }];
    }

    if (!Array.isArray(evalList) || evalList.length === 0) {
      return res.status(400).json({ success: false, message: 'Dữ liệu đánh giá không hợp lệ!' });
    }

    const evaluatorName = req.user.displayName || (req.user.role === 'admin' ? 'Ban Quản Trị' : `Nhóm trưởng Nhóm ${req.user.groupNum}`);
    const rubric = await getRubric();
    let updatedCount = 0;
    let singleResult = null;

    await db.transaction(async (txDb) => {
      for (const item of evalList) {
        const { memberId, qualitativeScore, notes, attendanceScore, activityScore, rankGrade } = item;
        const mid = Number(memberId);
        const qScore = Math.max(-rubric.qualitativeWeight, Math.min(rubric.qualitativeWeight, Number(qualitativeScore || 0)));
        const attScore = Number(attendanceScore || 0);
        const actScore = Number(activityScore || 0);
        const totalScore = attScore + actScore + qScore;

        // Lấy thông tin nhóm của thành viên
        const memberTable = memberType === 'ctv' ? 'ctv_members' : 'tnv_members';
        const member = await txDb.get(`SELECT group_num FROM ${memberTable} WHERE id = ?`, [mid]);
        if (!member) continue;

        // Nếu là Nhóm trưởng, chỉ được chấm điểm thành viên nhóm mình
        if (req.user.role !== 'admin') {
          if (req.user.targetType !== memberType || Number(req.user.groupNum) !== Number(member.group_num)) {
            continue; // Bỏ qua thành viên nhóm khác
          }
        }

        // Kiểm tra xem đã bị khóa sổ chưa
        const existing = await txDb.get(
          'SELECT is_locked FROM evaluations WHERE period = ? AND member_type = ? AND member_id = ?',
          [period, memberType, mid]
        );
        if (existing && existing.is_locked === 1 && req.user.role !== 'admin') {
          const err = new Error('Đánh giá kỳ này đã được Ban Quản Trị chính thức khóa sổ, không thể chỉnh sửa!');
          err.status = 400;
          throw err;
        }

        await txDb.run(`
          INSERT INTO evaluations (
            period, member_type, member_id, group_num, 
            attendance_score, activity_score, qualitative_score, total_score, 
            rank_grade, evaluator_name, notes, is_locked, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
          ON CONFLICT(period, member_type, member_id) DO UPDATE SET
            attendance_score = EXCLUDED.attendance_score,
            activity_score = EXCLUDED.activity_score,
            qualitative_score = EXCLUDED.qualitative_score,
            total_score = EXCLUDED.total_score,
            rank_grade = EXCLUDED.rank_grade,
            evaluator_name = EXCLUDED.evaluator_name,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP
        `, [
          period, memberType, mid, member.group_num,
          attScore, actScore, qScore, totalScore,
          rankGrade || 'Khá', evaluatorName, notes || ''
        ]);

        singleResult = {
          memberId: mid,
          qualitative_score: qScore,
          notes: notes || ''
        };

        updatedCount++;
      }
    });

    res.json({
      success: true,
      message: `Đã lưu bản nháp đánh giá cho ${updatedCount} thành viên thành công!`,
      updatedCount,
      data: singleResult
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message || 'Lỗi lưu bản nháp đánh giá' });
  }
});

// 5. Chốt Đánh Giá & Khóa Sổ Kỳ (Chỉ Admin)
router.post('/finalize', requireAdmin, async (req, res) => {
  try {
    const period = req.body.period || req.body.milestone || 'midterm';
    const memberType = req.body.memberType || req.body.type || 'ctv';
    const { groupNum, memberId } = req.body;
    if (!period || !memberType) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin kỳ hoặc đối tượng' });
    }

    let query = 'UPDATE evaluations SET is_locked = 1, updated_at = CURRENT_TIMESTAMP WHERE period = ? AND member_type = ?';
    const params = [period, memberType];

    if (memberId) {
      query += ' AND member_id = ?';
      params.push(Number(memberId));
    } else if (groupNum && groupNum !== 'all') {
      query += ' AND group_num = ?';
      params.push(Number(groupNum));
    }

    const result = await db.run(query, params);

    res.json({
      success: true,
      message: `Đã chính thức Chốt và Khóa sổ đánh giá ${period === 'midterm' ? 'Nửa kỳ' : 'Toàn kỳ'} cho ${memberType.toUpperCase()}!`,
      lockedCount: result.changes,
      data: { is_finalized: 1, is_locked: 1, classification: 'Khá' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi chốt đánh giá kỳ', error: error.message });
  }
});

// 6. Mở khóa sổ để điều chỉnh (Chỉ Admin)
router.post('/unlock', requireAdmin, async (req, res) => {
  try {
    const period = req.body.period || req.body.milestone || 'midterm';
    const memberType = req.body.memberType || req.body.type || 'ctv';
    const { groupNum, memberId } = req.body;
    if (!period || !memberType) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin kỳ hoặc đối tượng' });
    }

    let query = 'UPDATE evaluations SET is_locked = 0, updated_at = CURRENT_TIMESTAMP WHERE period = ? AND member_type = ?';
    const params = [period, memberType];

    if (memberId) {
      query += ' AND member_id = ?';
      params.push(Number(memberId));
    } else if (groupNum && groupNum !== 'all') {
      query += ' AND group_num = ?';
      params.push(Number(groupNum));
    }

    const result = await db.run(query, params);

    res.json({
      success: true,
      message: `Đã mở khóa sổ đánh giá ${period === 'midterm' ? 'Nửa kỳ' : 'Toàn kỳ'} để Nhóm trưởng có thể điều chỉnh!`,
      unlockedCount: result.changes,
      data: { is_finalized: 0, is_locked: 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi mở khóa sổ đánh giá', error: error.message });
  }
});

export default router;

