import { db } from './index.js';

export async function seedDatabase() {
  console.log('🌱 Bắt đầu nạp dữ liệu mẫu tiếng Việt vào Database...');

  // Xóa dữ liệu cũ an toàn
  const tables = [
    'campaign_registrations',
    'campaigns',
    'ctv_attendance',
    'ctv_point_logs',
    'ctv_merge_logs',
    'ctv_events',
    'ctv_members',
    'tnv_attendance',
    'tnv_activities',
    'tnv_events',
    'tnv_members'
  ];
  for (const t of tables) {
    await db.run(`DELETE FROM ${t}`);
  }

  // ============================================
  // 1. SEED CTV MEMBERS (8 Nhóm chuẩn format ảnh)
  // ============================================
  const ctvList = [
    // Nhóm 1: Nhóm trưởng Nguyễn Quang Tùng
    { mssv: '20210001', fullName: 'Nguyễn Quang Tùng', groupNum: 1, role: 'Nhóm trưởng', gender: 'Nam', className: 'ET1 - 01', phone: '0912000001', email: 'Tung.NQ20210001@sis.hust.edu.vn', attitudePoints: 20, activityPoints: 60, totalPoints: 80, status: 'Đang hoạt động' },
    { mssv: '202619067', fullName: 'Vũ Thu Ngân', groupNum: 1, role: 'Nhóm phó', gender: 'Nữ', className: 'ET1 - 04', phone: '0813994808', email: 'Ngan.VT2619067@sis.hust.edu.vn', attitudePoints: 15, activityPoints: 45, totalPoints: 60, status: 'Đang hoạt động' },
    { mssv: '202610478', fullName: 'Vũ Ngọc Ánh', groupNum: 1, role: 'Thành viên', gender: 'Nữ', className: 'BF-E19', phone: '0826388469', email: 'anh.vn2610478@sis.hust.edu.vn', attitudePoints: 10, activityPoints: 35, totalPoints: 45, status: 'Đang hoạt động' },
    { mssv: '202616158', fullName: 'Trần Phương Nhi', groupNum: 1, role: 'Thành viên', gender: 'Nữ', className: 'CH-E11 - 12', phone: '0396161208', email: 'Nhi.tp2616158@sis.hust.edu.vn', attitudePoints: 12, activityPoints: 30, totalPoints: 42, status: 'Đang hoạt động' },
    { mssv: '202619907', fullName: 'Trần Trung Thành', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 02', phone: '0839128133', email: 'Thanh.TT2619907@sis.hust.edu.vn', attitudePoints: 8, activityPoints: 25, totalPoints: 33, status: 'Đang hoạt động' },
    { mssv: '202613806', fullName: 'Phạm Ngọc Phúc', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ETE9 - 02', phone: '0901430025', email: 'Phuc.PN2613806@sis.hust.edu.vn', attitudePoints: 5, activityPoints: 20, totalPoints: 25, status: 'Đang hoạt động' },
    { mssv: '202618877', fullName: 'Tạ Thanh Tùng', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ETTN - 02', phone: '0376800137', email: 'tung.tt2618877@sis.hust.edu.vn', attitudePoints: 10, activityPoints: 40, totalPoints: 50, status: 'Đang hoạt động' },
    { mssv: '202613296', fullName: 'Hoàng Minh Nghĩa', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 06', phone: '0383998387', email: 'Nghia.HM2613296@sis.hust.edu.vn', attitudePoints: 6, activityPoints: 18, totalPoints: 24, status: 'Đang hoạt động' },
    { mssv: '202612401', fullName: 'Đỗ Thế Phong', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 11', phone: '0373134048', email: 'Phong.DT2612401@sis.hust.edu.vn', attitudePoints: 8, activityPoints: 24, totalPoints: 32, status: 'Đang hoạt động' },
    { mssv: '202414179', fullName: 'Vũ Đăng Khải', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 03', phone: '0398787074', email: 'Khai.vd2414179@sis.hust.edu.vn', attitudePoints: 14, activityPoints: 35, totalPoints: 49, status: 'Đang hoạt động' },
    { mssv: '202612606', fullName: 'Nguyễn Hữu Bảo Khanh', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ETE4 - 01', phone: '0982010332', email: 'Khanh.NHB2612606@sis.hust.edu.vn', attitudePoints: -2, activityPoints: 10, totalPoints: 8, status: 'Tạm dừng' },
    { mssv: '202616047', fullName: 'Ngô Tấn Vượng', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ETE9 - 02', phone: '0938413861', email: 'Vuong.NT2616047@sis.hust.edu.vn', attitudePoints: 5, activityPoints: 22, totalPoints: 27, status: 'Đang hoạt động' },
    { mssv: '202414459', fullName: 'Đặng Hữu Ý', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 07', phone: '0343948823', email: 'y.dh2414459@sis.hust.edu.vn', attitudePoints: 8, activityPoints: 28, totalPoints: 36, status: 'Đang hoạt động' },
    { mssv: '202612450', fullName: 'Giang Hồng Phúc', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'MS2 - 03', phone: '0916440756', email: 'phuc.gh2612450@sis.hust.edu.vn', attitudePoints: 10, activityPoints: 30, totalPoints: 40, status: 'Đang hoạt động' },
    { mssv: '202619154', fullName: 'Nguyễn Danh Hải Đăng', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 10', phone: '0365528991', email: 'Dang.NDH2619154@sis.hust.edu.vn', attitudePoints: 7, activityPoints: 25, totalPoints: 32, status: 'Đang hoạt động' },
    { mssv: '202514072', fullName: 'Nguyễn Anh Dũng', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 09', phone: '0366554824', email: 'Dung.NA2514072@sis.hust.edu.vn', attitudePoints: 12, activityPoints: 38, totalPoints: 50, status: 'Đang hoạt động' },
    { mssv: '202612586', fullName: 'Vũ Đình Quang Minh', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'EEE8 - 03', phone: '0911071208', email: 'Minh.VDQ2612586@sis.hust.edu.vn', attitudePoints: 9, activityPoints: 26, totalPoints: 35, status: 'Đang hoạt động' },

    // Nhóm 2: Nhóm trưởng Phạm Minh Tuấn
    { mssv: '20210202', fullName: 'Phạm Minh Tuấn', groupNum: 2, role: 'Nhóm trưởng', gender: 'Nam', className: 'CN-TT01', phone: '0913456789', email: 'tuan.pm2021@sis.hust.edu.vn', attitudePoints: 20, activityPoints: 50, totalPoints: 70, status: 'Đang hoạt động' },
    { mssv: '20222345', fullName: 'Đỗ Thị Thu Trang', groupNum: 2, role: 'Nhóm phó', gender: 'Nữ', className: 'CK-E02', phone: '0988765432', email: 'trang.dtt2022@sis.hust.edu.vn', attitudePoints: 12, activityPoints: 30, totalPoints: 42, status: 'Đang hoạt động' },
    { mssv: '20236789', fullName: 'Bùi Đức Anh', groupNum: 2, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 05', phone: '0902233445', email: 'anh.bd2023@sis.hust.edu.vn', attitudePoints: 8, activityPoints: 25, totalPoints: 33, status: 'Đang hoạt động' },

    // Nhóm 3: Nhóm trưởng Hoàng Đức Nam
    { mssv: '20210303', fullName: 'Hoàng Đức Nam', groupNum: 3, role: 'Nhóm trưởng', gender: 'Nam', className: 'DTVT-01', phone: '0914567890', email: 'nam.hd2021@sis.hust.edu.vn', attitudePoints: 15, activityPoints: 40, totalPoints: 55, status: 'Đang hoạt động' },
    { mssv: '20223456', fullName: 'Đinh Phương Thảo', groupNum: 3, role: 'Thành viên', gender: 'Nữ', className: 'QLCN-02', phone: '0989876543', email: 'thao.dp2022@sis.hust.edu.vn', attitudePoints: 5, activityPoints: 25, totalPoints: 30, status: 'Đang hoạt động' },

    // Nhóm 4: Nhóm trưởng Lý Quốc Bảo
    { mssv: '20210404', fullName: 'Lý Quốc Bảo', groupNum: 4, role: 'Nhóm trưởng', gender: 'Nam', className: 'KT-DK03', phone: '0915678901', email: 'bao.lq2021@sis.hust.edu.vn', attitudePoints: 18, activityPoints: 48, totalPoints: 66, status: 'Đang hoạt động' },
    { mssv: '20224567', fullName: 'Dương Khánh Linh', groupNum: 4, role: 'Thành viên', gender: 'Nữ', className: 'NN-TA01', phone: '0990987654', email: 'linh.dk2022@sis.hust.edu.vn', attitudePoints: 10, activityPoints: 28, totalPoints: 38, status: 'Đang hoạt động' },

    // Nhóm 5 đến 8
    { mssv: '20210505', fullName: 'Trịnh Hoài Nam', groupNum: 5, role: 'Nhóm trưởng', gender: 'Nam', className: 'VL-KT01', phone: '0916789012', email: 'nam.th2021@sis.hust.edu.vn', attitudePoints: 14, activityPoints: 42, totalPoints: 56, status: 'Đang hoạt động' },
    { mssv: '20210606', fullName: 'Tạ Minh Khang', groupNum: 6, role: 'Nhóm trưởng', gender: 'Nam', className: 'SH-CN01', phone: '0917890123', email: 'khang.tm2021@sis.hust.edu.vn', attitudePoints: 16, activityPoints: 38, totalPoints: 54, status: 'Đang hoạt động' },
    { mssv: '20210707', fullName: 'Chu Đình Trọng', groupNum: 7, role: 'Nhóm trưởng', gender: 'Nam', className: 'XD-CT01', phone: '0918901234', email: 'trong.cd2021@sis.hust.edu.vn', attitudePoints: 12, activityPoints: 36, totalPoints: 48, status: 'Đang hoạt động' },
    { mssv: '20210808', fullName: 'Võ Minh Đăng', groupNum: 8, role: 'Nhóm trưởng', gender: 'Nam', className: 'TOAN-TIN01', phone: '0919012345', email: 'dang.vm2021@sis.hust.edu.vn', attitudePoints: 15, activityPoints: 44, totalPoints: 59, status: 'Đang hoạt động' }
  ];

  const insertedCtv = [];
  for (const c of ctvList) {
    const res = await db.get(`
      INSERT INTO ctv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, attitude_points, activity_points, total_points, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [c.mssv, c.fullName, c.groupNum, c.role, c.gender, c.className, c.phone, c.email, c.attitudePoints, c.activityPoints, c.totalPoints, c.status]);
    insertedCtv.push(res);
  }

  // ============================================
  // 2. SEED CTV MEETINGS (19 tuần học trong kỳ)
  // ============================================
  const insertedCtvEvents = [];
  const baseDate = new Date('2026-09-07');
  for (let w = 1; w <= 19; w++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + (w - 1) * 7);
    const dateStr = d.toISOString().split('T')[0];
    const res = await db.get(`
      INSERT INTO ctv_events (name, event_date)
      VALUES (?, ?)
      RETURNING *
    `, [`Tuần ${w}`, dateStr]);
    insertedCtvEvents.push(res);
  }

  // Nạp điểm danh cho 6 tuần đầu tiên
  const statuses = ['co_mat', 'co_mat', 'di_muon', 'co_mat', 'co_phep', 'vang_khong_phep'];
  for (const m of insertedCtv) {
    for (let i = 0; i < 6; i++) {
      const ev = insertedCtvEvents[i];
      const s = statuses[(m.id + i) % statuses.length];
      await db.run(`
        INSERT INTO ctv_attendance (member_id, event_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT (member_id, event_id) DO UPDATE SET status = EXCLUDED.status
      `, [m.id, ev.id, s]);
    }
  }

  // ============================================
  // 3. SEED TNV MEMBERS (4 Nhóm)
  // ============================================
  const tnvList = [
    // Nhóm 1: Nhóm trưởng Lê Thanh Bình
    { mssv: '20211111', fullName: 'Lê Thanh Bình', groupNum: 1, role: 'Nhóm trưởng', gender: 'Nam', className: 'ET1 - 01', phone: '0981112222', email: 'binh.lt2021@sis.hust.edu.vn', totalPoints: 125, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20222222', fullName: 'Nguyễn Thị Cẩm Tú', groupNum: 1, role: 'Nhóm phó', gender: 'Nữ', className: 'BF-E19', phone: '0982223333', email: 'tu.ntc2022@sis.hust.edu.vn', totalPoints: 105, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20233333', fullName: 'Hoàng Quốc Việt', groupNum: 1, role: 'Thành viên', gender: 'Nam', className: 'CH-E11', phone: '0983334444', email: 'viet.hq2023@sis.hust.edu.vn', totalPoints: 85, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20244444', fullName: 'Đào Thu Hương', groupNum: 1, role: 'Thành viên', gender: 'Nữ', className: 'ET1 - 04', phone: '0984445555', email: 'huong.dt2024@sis.hust.edu.vn', totalPoints: 30, status: 'Đang hoạt động', warningLevel: 'canh_cao_1', warningNote: 'Vắng 2 buổi trực văn phòng không phép' },

    // Nhóm 2: Nhóm trưởng Vũ Hải Đăng (Top 1)
    { mssv: '20215555', fullName: 'Vũ Hải Đăng', groupNum: 2, role: 'Nhóm trưởng', gender: 'Nam', className: 'CN-TT02', phone: '0985556666', email: 'dang.vh2021@sis.hust.edu.vn', totalPoints: 140, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20226666', fullName: 'Phạm Thị Quỳnh', groupNum: 2, role: 'Nhóm phó', gender: 'Nữ', className: 'ETE9 - 02', phone: '0986667777', email: 'quynh.pt2022@sis.hust.edu.vn', totalPoints: 110, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20237777', fullName: 'Trần Đình Trọng', groupNum: 2, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 06', phone: '0987778888', email: 'trong.td2023@sis.hust.edu.vn', totalPoints: 65, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20248888', fullName: 'Bùi Thị Hà', groupNum: 2, role: 'Thành viên', gender: 'Nữ', className: 'MS2 - 03', phone: '0988889999', email: 'ha.bt2024@sis.hust.edu.vn', totalPoints: 15, status: 'Đang hoạt động', warningLevel: 'canh_cao_2', warningNote: 'Vi phạm kỷ luật nghiêm trọng trong chiến dịch cao điểm' },

    // Nhóm 3
    { mssv: '20219999', fullName: 'Nguyễn Tiến Dũng', groupNum: 3, role: 'Nhóm trưởng', gender: 'Nam', className: 'ETTN - 02', phone: '0989990000', email: 'dung.nt2021@sis.hust.edu.vn', totalPoints: 115, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20220000', fullName: 'Lê Thảo My', groupNum: 3, role: 'Nhóm phó', gender: 'Nữ', className: 'ET1 - 02', phone: '0980001111', email: 'my.lt2022@sis.hust.edu.vn', totalPoints: 95, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20231122', fullName: 'Đỗ Hữu Thắng', groupNum: 3, role: 'Thành viên', gender: 'Nam', className: 'ET1 - 10', phone: '0971112233', email: 'thang.dh2023@sis.hust.edu.vn', totalPoints: 70, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20242233', fullName: 'Phan Diệu Linh', groupNum: 3, role: 'Thành viên', gender: 'Nữ', className: 'EEE8 - 03', phone: '0972223344', email: 'linh.pd2024@sis.hust.edu.vn', totalPoints: 45, status: 'Tạm dừng', warningLevel: 'none', warningNote: '' },

    // Nhóm 4
    { mssv: '20213344', fullName: 'Trương Quang Khải', groupNum: 4, role: 'Nhóm trưởng', gender: 'Nam', className: 'ET1 - 07', phone: '0973334455', email: 'khai.tq2021@sis.hust.edu.vn', totalPoints: 120, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20224455', fullName: 'Ngô Mỹ Uyên', groupNum: 4, role: 'Nhóm phó', gender: 'Nữ', className: 'ET1 - 11', phone: '0974445566', email: 'uyen.nm2022@sis.hust.edu.vn', totalPoints: 90, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20235566', fullName: 'Bùi Gia Huy', groupNum: 4, role: 'Thành viên', gender: 'Nam', className: 'ETE4 - 01', phone: '0975556677', email: 'huy.bg2023@sis.hust.edu.vn', totalPoints: 60, status: 'Đang hoạt động', warningLevel: 'none', warningNote: '' },
    { mssv: '20246677', fullName: 'Đỗ Khánh Vy', groupNum: 4, role: 'Thành viên', gender: 'Nữ', className: 'CH-E11', phone: '0976667788', email: 'vy.dk2024@sis.hust.edu.vn', totalPoints: 20, status: 'Đang hoạt động', warningLevel: 'canh_cao_1', warningNote: 'Không tham gia 2 buổi sinh hoạt nhóm' }
  ];

  const insertedTnv = [];
  for (const t of tnvList) {
    const res = await db.get(`
      INSERT INTO tnv_members (mssv, full_name, group_num, role, gender, class_name, phone, email, total_points, status, warning_level, warning_note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [t.mssv, t.fullName, t.groupNum, t.role, t.gender, t.className, t.phone, t.email, t.totalPoints, t.status, t.warningLevel, t.warningNote]);
    insertedTnv.push(res);
  }

  // ============================================
  // 4. SEED TNV MEETINGS & ATTENDANCE
  // ============================================
  const insertedTnvEvents = [];
  for (let w = 1; w <= 19; w++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + (w - 1) * 7);
    const dateStr = d.toISOString().split('T')[0];
    const res = await db.get(`
      INSERT INTO tnv_events (name, event_date)
      VALUES (?, ?)
      RETURNING *
    `, [`Tuần ${w}`, dateStr]);
    insertedTnvEvents.push(res);
  }

  for (const m of insertedTnv) {
    for (let i = 0; i < 5; i++) {
      const ev = insertedTnvEvents[i];
      const s = statuses[(m.id + i) % statuses.length];
      await db.run(`
        INSERT INTO tnv_attendance (member_id, event_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT (member_id, event_id) DO UPDATE SET status = EXCLUDED.status
      `, [m.id, ev.id, s]);
    }
  }

  // ============================================
  // 5. SEED HOẠT ĐỘNG / CHIẾN DỊCH (CAMPAIGNS)
  // ============================================
  const campaignSamples = [
    {
      name: 'Chiến dịch Tiếp sức Mùa thi 2026',
      description: 'Hỗ trợ thí sinh và phụ huynh tại các điểm thi tốt nghiệp THPT',
      location: 'Cổng Parabol - ĐHBK Hà Nội',
      eventDate: '2026-06-25',
      points: 20,
      targetType: 'all',
      status: 'dang_dien_ra'
    },
    {
      name: 'Trực bàn Thông tin & Tư vấn Tuyển sinh Đại học',
      description: 'Phát tờ rơi, hướng dẫn thí sinh nộp hồ sơ xét tuyển',
      location: 'Sảnh Hội trường C2',
      eventDate: '2026-07-15',
      points: 10,
      targetType: 'ctv',
      status: 'dang_mo_dang_ky'
    },
    {
      name: 'Hỗ trợ Lễ Khai giảng Khóa mới K71',
      description: 'Hậu cần sân khấu, điều phối khán giả và an ninh sự kiện',
      location: 'Sân vận động Bách Khoa',
      eventDate: '2026-10-10',
      points: 15,
      targetType: 'all',
      status: 'dang_mo_dang_ky'
    },
    {
      name: 'Ngày hội Hiến máu tình nguyện Bách Khoa Nghìn Giọt Hồng',
      description: 'Hỗ trợ bàn đăng ký, phát quà và chăm sóc người hiến máu',
      location: 'Nhà thi đấu Bách Khoa',
      eventDate: '2026-09-02',
      points: 15,
      targetType: 'tnv',
      status: 'da_hoan_thanh'
    }
  ];

  const insertedCampaigns = [];
  for (const camp of campaignSamples) {
    const res = await db.get(`
      INSERT INTO campaigns (name, description, location, event_date, points, target_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `, [camp.name, camp.description, camp.location, camp.eventDate, camp.points, camp.targetType, camp.status]);
    insertedCampaigns.push(res);
  }

  // Đăng ký mẫu: Nhóm 1 CTV tham gia Trực bàn thông tin (Hoạt động số 2)
  for (let i = 0; i < 6; i++) {
    const ctv = insertedCtv[i];
    await db.run(`
      INSERT INTO campaign_registrations (campaign_id, member_type, member_id, group_num, registered_by, attendance_status, points_awarded)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      insertedCampaigns[1].id,
      'ctv',
      ctv.id,
      ctv.group_num,
      'Nguyễn Quang Tùng (Nhóm trưởng)',
      i < 4 ? 'co_mat' : 'chua_diem_danh',
      i < 4 ? 10 : 0
    ]);
  }

  // Đăng ký mẫu: Nhóm 1 & 2 TNV tham gia Hiến máu (Hoạt động số 4 - Đã hoàn thành)
  for (let i = 0; i < 4; i++) {
    const tnv = insertedTnv[i];
    await db.run(`
      INSERT INTO campaign_registrations (campaign_id, member_type, member_id, group_num, registered_by, attendance_status, points_awarded)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      insertedCampaigns[3].id,
      'tnv',
      tnv.id,
      tnv.group_num,
      'Lê Thanh Bình (Nhóm trưởng)',
      'co_mat',
      15
    ]);
  }

  // Ghi nhật ký khởi tạo gộp nhóm
  await db.run(`
    INSERT INTO ctv_merge_logs (source_group, target_group, demoted_leader_name, merged_count, note)
    VALUES (?, ?, ?, ?, ?)
  `, [8, 8, 'Hệ thống khởi tạo', 0, 'Khởi tạo cấu trúc 8 nhóm Cộng Tác Viên thành công']);

  console.log('✅ Nạp dữ liệu mẫu hoàn tất!');
}

// Chạy trực tiếp nếu file được gọi bằng node
if (process.argv[1]?.endsWith('seed.js')) {
  try {
    await seedDatabase();
    console.log('Hoàn thành khởi tạo dữ liệu!');
  } catch (err) {
    console.error('Lỗi khi nạp dữ liệu:', err);
  }
}
