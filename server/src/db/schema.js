import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ==========================================
// CỘNG TÁC VIÊN (CTV) SCHEMAS
// ==========================================

export const ctvMembers = sqliteTable('ctv_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mssv: text('mssv').notNull().unique(),
  fullName: text('full_name').notNull(),
  groupNum: integer('group_num').notNull(), // Nhóm 1 đến Nhóm 8
  role: text('role').notNull().default('Thành viên'), // 'Nhóm trưởng' | 'Nhóm phó' | 'Thành viên'
  gender: text('gender').notNull().default('Nam'), // 'Nam' | 'Nữ'
  className: text('class_name').default(''), // Ví dụ: 'ET1 - 04', 'BF-E19'
  phone: text('phone').default(''),
  email: text('email').default(''),
  attitudePoints: integer('attitude_points').notNull().default(0),
  activityPoints: integer('activity_points').notNull().default(0),
  totalPoints: integer('total_points').notNull().default(0),
  status: text('status').notNull().default('Đang hoạt động'), // 'Đang hoạt động' | 'Tạm dừng'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const ctvEvents = sqliteTable('ctv_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // Ví dụ: 'Tuần 1', 'Tuần 2', ... 'Tuần 19'
  eventDate: text('event_date').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const ctvAttendance = sqliteTable('ctv_attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => ctvMembers.id, { onDelete: 'cascade' }),
  eventId: integer('event_id').notNull().references(() => ctvEvents.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('co_mat'), // 'co_mat' (100%), 'di_muon' (50%), 'co_phep' (0%), 'vang_khong_phep' (-50%)
});

export const ctvPointLogs = sqliteTable('ctv_point_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => ctvMembers.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'attitude' | 'activity'
  title: text('title').notNull(),
  pointsDelta: integer('points_delta').notNull(),
  note: text('note').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const ctvMergeLogs = sqliteTable('ctv_merge_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceGroup: integer('source_group').notNull(), // Nhóm B (bị gộp)
  targetGroup: integer('target_group').notNull(), // Nhóm A (nhóm nhận)
  demotedLeaderName: text('demoted_leader_name').default(''),
  mergedCount: integer('merged_count').notNull().default(0),
  note: text('note').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// TÌNH NGUYỆN VIÊN (TNV) SCHEMAS
// ==========================================

export const tnvMembers = sqliteTable('tnv_members', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  mssv: text('mssv').notNull().unique(),
  fullName: text('full_name').notNull(),
  groupNum: integer('group_num').notNull(), // Nhóm 1 đến Nhóm 4
  role: text('role').notNull().default('Thành viên'), // 'Nhóm trưởng' | 'Nhóm phó' | 'Thành viên'
  gender: text('gender').notNull().default('Nam'), // 'Nam' | 'Nữ'
  className: text('class_name').default(''), // Ví dụ: 'ET1 - 04', 'BF-E19'
  phone: text('phone').default(''),
  email: text('email').default(''),
  totalPoints: integer('total_points').notNull().default(0),
  status: text('status').notNull().default('Đang hoạt động'), // 'Đang hoạt động' | 'Tạm dừng'
  warningLevel: text('warning_level').notNull().default('none'), // 'none' | 'canh_cao_1' | 'canh_cao_2'
  warningNote: text('warning_note').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tnvEvents = sqliteTable('tnv_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // Ví dụ: 'Tuần 1', 'Tuần 2', ... 'Tuần 19'
  eventDate: text('event_date').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tnvAttendance = sqliteTable('tnv_attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => tnvMembers.id, { onDelete: 'cascade' }),
  eventId: integer('event_id').notNull().references(() => tnvEvents.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('co_mat'), // 'co_mat' | 'vang'
});

export const tnvActivities = sqliteTable('tnv_activities', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  memberId: integer('member_id').notNull().references(() => tnvMembers.id, { onDelete: 'cascade' }),
  category: text('category').notNull(), // 'Hỗ trợ tuyển sinh' (+10), 'Trực văn phòng' (+5), 'Chiến dịch cao điểm' (+20), ...
  points: integer('points').notNull(),
  note: text('note').default(''),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// QUẢN LÝ HOẠT ĐỘNG & ĐĂNG KÝ (CAMPAIGNS)
// ==========================================

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // Tên hoạt động: 'Chiến dịch Tiếp sức mùa thi 2026', 'Trực bàn thông tin'...
  description: text('description').default(''),
  location: text('location').default(''),
  eventDate: text('event_date').notNull(),
  points: integer('points').notNull().default(10), // Điểm cộng khi tham gia
  targetType: text('target_type').notNull().default('all'), // 'all' | 'ctv' | 'tnv'
  status: text('status').notNull().default('dang_mo_dang_ky'), // 'dang_mo_dang_ky' | 'dang_tien_hanh' | 'da_hoan_thanh'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const campaignRegistrations = sqliteTable('campaign_registrations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  memberType: text('member_type').notNull(), // 'ctv' | 'tnv'
  memberId: integer('member_id').notNull(),
  groupNum: integer('group_num').notNull(),
  registeredBy: text('registered_by').default('Nhóm trưởng'),
  attendanceStatus: text('attendance_status').notNull().default('chua_diem_danh'), // 'chua_diem_danh' | 'co_mat' | 'vang'
  pointsAwarded: integer('points_awarded').notNull().default(0), // Điểm đã cộng
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});
