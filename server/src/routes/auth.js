import express from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';

const router = express.Router();
const INSECURE_LEGACY_JWT_SECRET = 'quan-ly-ctv-tnv-secret-key-2026';

// Khóa bảo mật ngẫu nhiên trong bộ nhớ khi môi trường chưa cấu hình JWT_SECRET.
// Giúp server không bị crash khi deploy trên Render, đồng thời đảm bảo an toàn tuyệt đối
// vì kẻ tấn công dùng khóa mặc định cũ sẽ không thể giả mạo token.
const IN_MEMORY_JWT_SECRET = crypto.randomBytes(32).toString('hex');
let hasWarnedAboutJwt = false;

/**
 * Lấy khóa ký JWT an toàn. Tuyệt đối không chấp nhận khóa mặc định cũ.
 */
export function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();

  // Chặn tuyệt đối khóa tĩnh cũ bị lộ trong mã nguồn
  if (secret === INSECURE_LEGACY_JWT_SECRET) {
    if (!hasWarnedAboutJwt) {
      console.warn('⚠️ CẢNH BÁO BẢO MẬT: JWT_SECRET đang dùng khóa tĩnh mặc định! Tự động chuyển sang khóa ngẫu nhiên an toàn.');
      hasWarnedAboutJwt = true;
    }
    return IN_MEMORY_JWT_SECRET;
  }

  if (secret) {
    return secret;
  }

  // Nếu môi trường (như Render) chưa cấu hình JWT_SECRET
  if (!hasWarnedAboutJwt) {
    console.warn('⚠️ CẢNH BÁO: Chưa cấu hình biến môi trường JWT_SECRET! Hệ thống đang tạm thời sử dụng khóa bảo mật ngẫu nhiên trong bộ nhớ.');
    hasWarnedAboutJwt = true;
  }
  return IN_MEMORY_JWT_SECRET;
}

// Count requests as they arrive, rather than only failed attempts after the
// async database lookup. This also protects against parallel password guesses.
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT_MAX_REQUESTS = 5;
const loginRequestsByClient = new Map();

function getLoginClientKey(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function loginRateLimiter(req, res, next) {
  const now = Date.now();

  // Remove expired buckets while handling login traffic so the in-memory
  // limiter does not retain inactive clients indefinitely.
  for (const [key, value] of loginRequestsByClient) {
    if (now >= value.resetAt) loginRequestsByClient.delete(key);
  }

  const clientKey = getLoginClientKey(req);
  const attempt = loginRequestsByClient.get(clientKey);

  if (!attempt || now >= attempt.resetAt) {
    loginRequestsByClient.set(clientKey, {
      count: 1,
      resetAt: now + LOGIN_RATE_LIMIT_WINDOW_MS
    });
    return next();
  }

  if (attempt.count >= LOGIN_RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((attempt.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.'
    });
  }

  attempt.count += 1;
  next();
}

// Helper: Ký và tạo Token
export function generateToken(payload) {
  const jwtSecret = getJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

// Helper: Xác thực Token
export function verifyToken(token) {
  if (!token) return null;
  if (token === 'guest_token') {
    return { role: 'guest', isGuest: true, displayName: 'Khách (Chế độ xem)' };
  }
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;

  let expectedSig;
  try {
    expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest();
  } catch {
    // Refuse every bearer token when JWT signing is not securely configured.
    // This lets authentication middleware return 401 rather than accepting a
    // token signed with a known default.
    return null;
  }

  let providedSig;
  try {
    providedSig = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (providedSig.length !== expectedSig.length || !crypto.timingSafeEqual(providedSig, expectedSig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null; // Token hết hạn
    return payload;
  } catch (e) {
    return null;
  }
}

// 1. Đăng nhập hệ thống (Hỗ trợ Khách, Nhóm trưởng, Ban Quản Trị)
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { loginType, targetType, groupNum, password } = req.body;

    // Chế độ Khách (Xem công khai)
    if (loginType === 'guest') {
      const user = {
        role: 'guest',
        targetType: 'all',
        groupNum: null,
        displayName: 'Khách (Chế độ xem)',
        isGuest: true
      };
      return res.json({
        success: true,
        message: 'Đăng nhập thành công với Chế độ xem!',
        token: 'guest_token',
        user
      });
    }

    // Chế độ Ban Quản Trị (Admin)
    if (loginType === 'admin') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập Mật khẩu Ban Quản Trị!' });
      }

      const adminAuth = await db.get("SELECT * FROM system_auth WHERE role = 'admin'");
      if (!adminAuth || adminAuth.password !== password.trim()) {
        return res.status(401).json({ success: false, message: 'Mật khẩu Ban Quản Trị không chính xác!' });
      }

      const user = {
        role: 'admin',
        targetType: 'all',
        groupNum: null,
        displayName: adminAuth.display_name || 'Ban Chủ Nhiệm (Admin)',
        isGuest: false
      };
      const token = generateToken(user);
      return res.json({
        success: true,
        message: 'Đăng nhập Ban Quản Trị thành công!',
        token,
        user
      });
    }

    // Chế độ Nhóm trưởng (CTV hoặc TNV)
    if (loginType === 'leader') {
      const g = Number(groupNum);
      if (!targetType || isNaN(g) || g < 1) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn đối tượng (CTV/TNV) và Số nhóm hợp lệ!' });
      }
      if (!password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập Mật khẩu của nhóm!' });
      }

      const roleKey = targetType === 'ctv' ? 'ctv_leader' : 'tnv_leader';
      const auth = await db.get(
        'SELECT * FROM system_auth WHERE role = ? AND target_type = ? AND group_num = ?',
        [roleKey, targetType, g]
      );

      if (!auth || auth.password !== password.trim()) {
        return res.status(401).json({ 
          success: false, 
          message: `Mật khẩu Nhóm ${g} (${targetType.toUpperCase()}) không chính xác! Vui lòng liên hệ Ban Chủ Nhiệm để được cấp lại.` 
        });
      }

      const user = {
        role: 'leader',
        targetType,
        groupNum: g,
        displayName: auth.display_name || `Nhóm trưởng Nhóm ${g} (${targetType.toUpperCase()})`,
        isGuest: false
      };
      const token = generateToken(user);
      return res.json({
        success: true,
        message: `Đăng nhập thành công với vai trò ${user.displayName}!`,
        token,
        user
      });
    }

    res.status(400).json({ success: false, message: 'Chế độ đăng nhập không hợp lệ!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi xử lý đăng nhập', error: error.message });
  }
});

// 2. Lấy thông tin phiên đăng nhập hiện tại
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const user = verifyToken(token);
  if (!user) {
    return res.json({
      success: true,
      user: {
        role: 'guest',
        targetType: 'all',
        groupNum: null,
        displayName: 'Khách (Chế độ xem)',
        isGuest: true
      }
    });
  }
  res.json({ success: true, user });
});

// 3. ADMIN: Lấy danh sách toàn bộ mật khẩu các nhóm để quản lý và cấp lại
router.get('/passwords', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const user = verifyToken(token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác này!' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ có Ban Chủ Nhiệm (Admin) mới có quyền xem danh sách mật khẩu!' });
    }

    const passwords = await db.all('SELECT id, role, target_type, group_num, display_name, password, updated_at FROM system_auth ORDER BY target_type ASC, group_num ASC');
    res.json({ success: true, data: passwords });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách mật khẩu', error: error.message });
  }
});

// 4. ADMIN: Đổi / Cấp lại mật khẩu cho từng nhóm hoặc Admin
router.post('/reset-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const user = verifyToken(token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác này!' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ có Ban Chủ Nhiệm (Admin) mới có quyền cấp lại mật khẩu!' });
    }

    const { targetType, groupNum, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có tối thiểu 4 ký tự!' });
    }

    const trimmedPass = newPassword.trim();

    if (targetType === 'admin') {
      await db.run("UPDATE system_auth SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE role = 'admin'", [trimmedPass]);
      return res.json({ success: true, message: 'Đã đổi mật khẩu Ban Quản Trị (Admin) thành công!' });
    }

    const g = Number(groupNum);
    const roleKey = targetType === 'ctv' ? 'ctv_leader' : 'tnv_leader';
    const result = await db.run(
      'UPDATE system_auth SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE role = ? AND target_type = ? AND group_num = ?',
      [trimmedPass, roleKey, targetType, g]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhóm cần cấp lại mật khẩu!' });
    }

    res.json({ 
      success: true, 
      message: `Đã cấp lại mật khẩu thành công cho Nhóm ${g} (${targetType.toUpperCase()}): "${trimmedPass}"` 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi cấp lại mật khẩu', error: error.message });
  }
});

// 5. ADMIN: Đặt lại toàn bộ mật khẩu về mặc định ban đầu
router.post('/reset-all-default', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const user = verifyToken(token);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập để thực hiện thao tác này!' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Chỉ có Ban Chủ Nhiệm (Admin) mới có quyền thực hiện thao tác này!' });
    }

    // Đặt lại Admin
    await db.run("UPDATE system_auth SET password = 'admin123', updated_at = CURRENT_TIMESTAMP WHERE role = 'admin'");

    // Đặt lại 8 nhóm CTV
    for (let g = 1; g <= 8; g++) {
      await db.run(
        "UPDATE system_auth SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE role = 'ctv_leader' AND group_num = ?",
        [`ctv${g}@123`, g]
      );
    }

    // Đặt lại 4 nhóm TNV
    for (let g = 1; g <= 4; g++) {
      await db.run(
        "UPDATE system_auth SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE role = 'tnv_leader' AND group_num = ?",
        [`tnv${g}@123`, g]
      );
    }

    res.json({ success: true, message: 'Đã khôi phục toàn bộ mật khẩu hệ thống về mặc định thành công!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi khôi phục mật khẩu mặc định', error: error.message });
  }
});

export default router;

