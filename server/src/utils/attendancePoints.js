import { db } from '../db/index.js';

/**
 * Tính toán và đồng bộ điểm thưởng/phạt chuyên cần theo tuần cho Cộng Tác Viên (CTV)
 * - Đi đầy đủ tất cả các tuần (trạng thái 'tham_gia' / 'co_mat'): Thưởng +5 điểm (kèm log).
 * - Có từ 1 tuần nghỉ 'khong_phep' (hoặc 'vang_khong_phep'): Trừ 5 điểm (kèm log).
 * - Trường hợp khác (ví dụ nghỉ có phép hoặc chưa đủ dữ liệu): Không thưởng, không phạt.
 * 
 * @param {number} memberId 
 * @param {object} txDb - Database connection/transaction (mặc định db)
 */
export async function syncCtvWeeklyAttendancePoints(memberId, txDb = db) {
  const mid = Number(memberId);
  const events = await txDb.all('SELECT id FROM ctv_events ORDER BY event_date ASC, id ASC');
  if (!events || events.length === 0) return;

  const attendanceRecords = await txDb.all(
    'SELECT event_id, status FROM ctv_attendance WHERE member_id = ?',
    [mid]
  );

  const statusMap = {};
  for (const r of attendanceRecords) {
    statusMap[r.event_id || r.eventId] = r.status;
  }

  let hasUnexcused = false; // Nghỉ không phép
  let allPresent = events.length > 0; // Đi đầy đủ tất cả các tuần

  for (const ev of events) {
    const st = statusMap[ev.id];
    const isPresent = st === 'tham_gia' || st === 'co_mat';
    const isUnexcused = st === 'khong_phep' || st === 'vang_khong_phep';

    if (isUnexcused) {
      hasUnexcused = true;
    }
    if (!isPresent) {
      allPresent = false;
    }
  }

  // Xác định điểm chuyên cần mục tiêu
  let targetDelta = 0;
  let targetTitle = '';
  let targetNote = '';

  if (hasUnexcused) {
    targetDelta = -5;
    targetTitle = 'Trừ điểm vi phạm: Nghỉ họp không phép';
    targetNote = 'Tự động trừ 5 điểm do có tuần sinh hoạt nghỉ không phép';
  } else if (allPresent) {
    targetDelta = 5;
    targetTitle = 'Thưởng chuyên cần: Tham gia đầy đủ tất cả các tuần';
    targetNote = 'Tự động thưởng 5 điểm do tham gia đầy đủ tất cả các buổi họp tuần';
  }

  // Lấy các log chuyên cần tuần hiện có của thành viên này
  const existingLogs = await txDb.all(`
    SELECT id, points_delta FROM ctv_point_logs 
    WHERE member_id = ? AND (
      title LIKE 'Thưởng chuyên cần%' OR 
      title LIKE 'Trừ điểm vi phạm: Nghỉ họp không phép%' OR
      note LIKE '%Tự động%chuyên cần%' OR
      note LIKE '%Tự động trừ 5 điểm do có tuần%'
    )
  `, [mid]);

  let currentAppliedDelta = 0;
  for (const log of existingLogs) {
    currentAppliedDelta += Number(log.points_delta || 0);
  }

  // Nếu điểm mục tiêu khác với điểm đã áp dụng trong log
  if (currentAppliedDelta !== targetDelta) {
    // 1. Hoàn lại điểm cũ
    const netChange = targetDelta - currentAppliedDelta;

    await txDb.run(`
      UPDATE ctv_members 
      SET attitude_points = attitude_points + ?, total_points = total_points + ? 
      WHERE id = ?
    `, [netChange, netChange, mid]);

    // 2. Xóa các log cũ liên quan đến chuyên cần tuần
    for (const log of existingLogs) {
      await txDb.run('DELETE FROM ctv_point_logs WHERE id = ?', [log.id]);
    }

    // 3. Nếu targetDelta !== 0, ghi log mới duy nhất
    if (targetDelta !== 0) {
      await txDb.run(`
        INSERT INTO ctv_point_logs (member_id, type, title, points_delta, note)
        VALUES (?, 'attitude', ?, ?, ?)
      `, [mid, targetTitle, targetDelta, targetNote]);
    }
  }
}

/**
 * Tính toán và đồng bộ điểm thưởng/phạt chuyên cần theo tuần cho Tình Nguyện Viên (TNV)
 * - Đi đầy đủ tất cả các tuần trực (trạng thái 'tham_gia' / 'co_mat'): Thưởng +5 điểm.
 * - Có từ 1 tuần nghỉ 'khong_phep' (hoặc 'vang'): Trừ 5 điểm.
 * 
 * @param {number} memberId 
 * @param {object} txDb 
 */
export async function syncTnvWeeklyAttendancePoints(memberId, txDb = db) {
  const mid = Number(memberId);
  const events = await txDb.all('SELECT id FROM tnv_events ORDER BY event_date ASC, id ASC');
  if (!events || events.length === 0) return;

  const attendanceRecords = await txDb.all(
    'SELECT event_id, status FROM tnv_attendance WHERE member_id = ?',
    [mid]
  );

  const statusMap = {};
  for (const r of attendanceRecords) {
    statusMap[r.event_id || r.eventId] = r.status;
  }

  let hasUnexcused = false;
  let allPresent = events.length > 0;

  for (const ev of events) {
    const st = statusMap[ev.id];
    const isPresent = st === 'tham_gia' || st === 'co_mat';
    const isUnexcused = st === 'khong_phep' || st === 'vang';

    if (isUnexcused) {
      hasUnexcused = true;
    }
    if (!isPresent) {
      allPresent = false;
    }
  }

  let targetDelta = 0;
  let targetCategory = '';
  let targetNote = '';

  if (hasUnexcused) {
    targetDelta = -5;
    targetCategory = 'Kỷ luật chuyên cần';
    targetNote = 'Trừ 5 điểm vi phạm: Nghỉ ca trực không phép';
  } else if (allPresent) {
    targetDelta = 5;
    targetCategory = 'Thưởng chuyên cần';
    targetNote = 'Thưởng chuyên cần: Trực ca đầy đủ tất cả các tuần';
  }

  const existingActivities = await txDb.all(`
    SELECT id, points FROM tnv_activities 
    WHERE member_id = ? AND (
      category LIKE '%chuyên cần%' OR 
      note LIKE '%Thưởng chuyên cần%' OR 
      note LIKE '%Trừ 5 điểm vi phạm%'
    )
  `, [mid]);

  let currentAppliedDelta = 0;
  for (const act of existingActivities) {
    currentAppliedDelta += Number(act.points || 0);
  }

  if (currentAppliedDelta !== targetDelta) {
    const netChange = targetDelta - currentAppliedDelta;

    await txDb.run(`
      UPDATE tnv_members 
      SET total_points = total_points + ? 
      WHERE id = ?
    `, [netChange, mid]);

    for (const act of existingActivities) {
      await txDb.run('DELETE FROM tnv_activities WHERE id = ?', [act.id]);
    }

    if (targetDelta !== 0) {
      await txDb.run(`
        INSERT INTO tnv_activities (member_id, category, points, note)
        VALUES (?, ?, ?, ?)
      `, [mid, targetCategory, targetDelta, targetNote]);
    }
  }
}
