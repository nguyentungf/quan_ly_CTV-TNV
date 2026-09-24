import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kiểm tra xem có cấu hình Database Cloud (PostgreSQL) qua biến DATABASE_URL không
const rawDbUrl = process.env.DATABASE_URL || '';
const isPostgres = Boolean(
  rawDbUrl && (rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://'))
);

let pool = null;
let sqlite = null;

// Hàm chuyển đổi placeholder từ chuẩn '?' (SQLite) sang '$1, $2, ...' (PostgreSQL)
export function toPgSql(sql) {
  let idx = 1;
  return sql.replace(/\?/g, () => `$${idx++}`);
}

if (isPostgres) {
  console.log('🌐 Kết nối đến Cloud Database (PostgreSQL)...');
  pool = new Pool({
    connectionString: rawDbUrl,
    ssl: rawDbUrl.includes('localhost') || rawDbUrl.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false }
  });

  pool.on('error', (err) => {
    console.error('⚠️ Lỗi bất ngờ từ PostgreSQL Pool:', err.message);
  });
} else {
  console.log('💾 Sử dụng Cơ sở dữ liệu SQLite cục bộ (Local SQLite)...');
  const dataDir = path.resolve(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'database.sqlite');
  sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
}

// ==========================================================
// UNIFIED DATABASE ADAPTER (Tương thích SQLite & PostgreSQL)
// ==========================================================
export const db = {
  isPostgres,

  async all(sqlStr, params = []) {
    const flatParams = Array.isArray(params) ? params : [params];
    if (isPostgres) {
      const pgQuery = toPgSql(sqlStr);
      const res = await pool.query(pgQuery, flatParams);
      return res.rows;
    } else {
      return sqlite.prepare(sqlStr).all(...flatParams);
    }
  },

  async get(sqlStr, params = []) {
    const flatParams = Array.isArray(params) ? params : [params];
    if (isPostgres) {
      const pgQuery = toPgSql(sqlStr);
      const res = await pool.query(pgQuery, flatParams);
      return res.rows[0] || null;
    } else {
      const row = sqlite.prepare(sqlStr).get(...flatParams);
      return row || null;
    }
  },

  async run(sqlStr, params = []) {
    const flatParams = Array.isArray(params) ? params : [params];
    if (isPostgres) {
      let pgQuery = toPgSql(sqlStr);
      const isInsert = /^\s*INSERT\s+INTO/i.test(pgQuery);
      if (isInsert && !/RETURNING/i.test(pgQuery)) {
        pgQuery += ' RETURNING id';
      }
      const res = await pool.query(pgQuery, flatParams);
      const lastInsertRowid = res.rows?.[0]?.id || null;
      return {
        changes: res.rowCount,
        lastInsertRowid,
        rows: res.rows
      };
    } else {
      const res = sqlite.prepare(sqlStr).run(...flatParams);
      return {
        changes: res.changes,
        lastInsertRowid: res.lastInsertRowid
      };
    }
  },

  async exec(sqlStr) {
    if (isPostgres) {
      await pool.query(sqlStr);
    } else {
      sqlite.exec(sqlStr);
    }
  },

  // Hỗ trợ phương thức prepare linh hoạt
  prepare(sqlStr) {
    return {
      all: (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.all(sqlStr, params);
      },
      get: (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.get(sqlStr, params);
      },
      run: (...args) => {
        const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        return db.run(sqlStr, params);
      }
    };
  },

  // Hỗ trợ transaction an toàn
  async transaction(callback) {
    if (isPostgres) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const clientDb = {
          all: async (s, p = []) => (await client.query(toPgSql(s), Array.isArray(p) ? p : [p])).rows,
          get: async (s, p = []) => (await client.query(toPgSql(s), Array.isArray(p) ? p : [p])).rows[0] || null,
          run: async (s, p = []) => {
            let ps = toPgSql(s);
            if (/^\s*INSERT\s+INTO/i.test(ps) && !/RETURNING/i.test(ps)) ps += ' RETURNING id';
            const r = await client.query(ps, Array.isArray(p) ? p : [p]);
            return { changes: r.rowCount, lastInsertRowid: r.rows?.[0]?.id || null };
          },
          prepare: (s) => ({
            all: (...p) => clientDb.all(s, p.length === 1 && Array.isArray(p[0]) ? p[0] : p),
            get: (...p) => clientDb.get(s, p.length === 1 && Array.isArray(p[0]) ? p[0] : p),
            run: (...p) => clientDb.run(s, p.length === 1 && Array.isArray(p[0]) ? p[0] : p)
          })
        };
        const result = await callback(clientDb);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // Đối với SQLite, chạy tuần tự với transaction
      const tx = sqlite.transaction((innerCb) => innerCb());
      return tx(() => callback(db));
    }
  }
};

// Khởi tạo Schema tự động tương thích cả PostgreSQL và SQLite
export async function initSchema() {
  if (isPostgres) {
    console.log('🔄 Đang kiểm tra và khởi tạo bảng PostgreSQL...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ctv_members (
        id SERIAL PRIMARY KEY,
        mssv VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        group_num INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Thành viên',
        gender VARCHAR(10) NOT NULL DEFAULT 'Nam',
        class_name VARCHAR(100) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        attitude_points INTEGER NOT NULL DEFAULT 0,
        activity_points INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Đang hoạt động',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ctv_events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        event_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ctv_attendance (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES ctv_members(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES ctv_events(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'co_mat',
        UNIQUE(member_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS ctv_point_logs (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES ctv_members(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        points_delta INTEGER NOT NULL,
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ctv_merge_logs (
        id SERIAL PRIMARY KEY,
        source_group INTEGER NOT NULL,
        target_group INTEGER NOT NULL,
        demoted_leader_name VARCHAR(255) DEFAULT '',
        merged_count INTEGER NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tnv_members (
        id SERIAL PRIMARY KEY,
        mssv VARCHAR(50) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        group_num INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Thành viên',
        gender VARCHAR(10) NOT NULL DEFAULT 'Nam',
        class_name VARCHAR(100) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        total_points INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(50) NOT NULL DEFAULT 'Đang hoạt động',
        warning_level VARCHAR(50) NOT NULL DEFAULT 'none',
        warning_note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tnv_events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        event_date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tnv_attendance (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES tnv_members(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES tnv_events(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'co_mat',
        UNIQUE(member_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS tnv_activities (
        id SERIAL PRIMARY KEY,
        member_id INTEGER NOT NULL REFERENCES tnv_members(id) ON DELETE CASCADE,
        category VARCHAR(255) NOT NULL,
        points INTEGER NOT NULL,
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        event_date VARCHAR(50) NOT NULL,
        points INTEGER NOT NULL DEFAULT 10,
        target_type VARCHAR(50) NOT NULL DEFAULT 'all',
        status VARCHAR(50) NOT NULL DEFAULT 'dang_mo_dang_ky',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_registrations (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        member_type VARCHAR(20) NOT NULL,
        member_id INTEGER NOT NULL,
        group_num INTEGER NOT NULL,
        registered_by VARCHAR(255) DEFAULT 'Nhóm trưởng',
        attendance_status VARCHAR(50) NOT NULL DEFAULT 'chua_diem_danh',
        points_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, member_type, member_id)
      );
    `);
    console.log('✅ Khởi tạo cấu trúc bảng PostgreSQL hoàn tất!');
  } else {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS ctv_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mssv TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        group_num INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'Thành viên',
        gender TEXT NOT NULL DEFAULT 'Nam',
        class_name TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        attitude_points INTEGER NOT NULL DEFAULT 0,
        activity_points INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Đang hoạt động',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ctv_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ctv_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL REFERENCES ctv_members(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES ctv_events(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'co_mat',
        UNIQUE(member_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS ctv_point_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL REFERENCES ctv_members(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        points_delta INTEGER NOT NULL,
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ctv_merge_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_group INTEGER NOT NULL,
        target_group INTEGER NOT NULL,
        demoted_leader_name TEXT DEFAULT '',
        merged_count INTEGER NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tnv_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mssv TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        group_num INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'Thành viên',
        gender TEXT NOT NULL DEFAULT 'Nam',
        class_name TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        total_points INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'Đang hoạt động',
        warning_level TEXT NOT NULL DEFAULT 'none',
        warning_note TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tnv_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        event_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tnv_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL REFERENCES tnv_members(id) ON DELETE CASCADE,
        event_id INTEGER NOT NULL REFERENCES tnv_events(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'co_mat',
        UNIQUE(member_id, event_id)
      );

      CREATE TABLE IF NOT EXISTS tnv_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL REFERENCES tnv_members(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        points INTEGER NOT NULL,
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        location TEXT DEFAULT '',
        event_date TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 10,
        target_type TEXT NOT NULL DEFAULT 'all',
        status TEXT NOT NULL DEFAULT 'dang_mo_dang_ky',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campaign_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        member_type TEXT NOT NULL,
        member_id INTEGER NOT NULL,
        group_num INTEGER NOT NULL,
        registered_by TEXT DEFAULT 'Nhóm trưởng',
        attendance_status TEXT NOT NULL DEFAULT 'chua_diem_danh',
        points_awarded INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, member_type, member_id)
      );
    `);

    // Migration an toàn các cột mới nếu đã có file sqlite cũ
    try { sqlite.exec(`ALTER TABLE ctv_members ADD COLUMN gender TEXT DEFAULT 'Nam'`); } catch (e) {}
    try { sqlite.exec(`ALTER TABLE ctv_members ADD COLUMN class_name TEXT DEFAULT ''`); } catch (e) {}
    try { sqlite.exec(`ALTER TABLE tnv_members ADD COLUMN gender TEXT DEFAULT 'Nam'`); } catch (e) {}
    try { sqlite.exec(`ALTER TABLE tnv_members ADD COLUMN class_name TEXT DEFAULT ''`); } catch (e) {}
  }
}

// Export cả db và sqlite để tương thích ngược 100%
export { db as sqlite };
