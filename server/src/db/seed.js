import { db, initSchema } from './index.js';

export async function seedDatabase() {
  console.log('🌱 Bắt đầu dọn dẹp và khởi tạo Database sạch...');

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

  console.log('✅ Cơ sở dữ liệu đã được làm sạch hoàn toàn (Không chứa dữ liệu mẫu)!');
}

// Chạy trực tiếp nếu file được gọi bằng node
if (process.argv[1]?.endsWith('seed.js')) {
  try {
    await initSchema();
    await seedDatabase();
    console.log('Hoàn thành khởi tạo dữ liệu!');
    process.exitCode = 0;
  } catch (err) {
    console.error('Lỗi khi khởi tạo dữ liệu:', err);
    process.exitCode = 1;
  }
}
