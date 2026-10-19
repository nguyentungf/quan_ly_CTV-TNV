Task: Fix bug in `generateToken` & `verifyToken` inside `server/src/routes/auth.js`.
Issue: `JWT_SECRET` sử dụng giá trị mặc định tĩnh ('quan-ly-ctv-tnv-secret-key-2026') trong mã nguồn cho phép kẻ tấn công giả mạo token Admin toàn quyền.
Expected: Bắt buộc `process.env.JWT_SECRET` phải được thiết lập an toàn, hoặc throw error từ chối hoạt động ở môi trường triển khai thực tế khi dùng default secret.

Failing Assertion / Error:
- Input: Token JWT tự ký bằng chuỗi `'quan-ly-ctv-tnv-secret-key-2026'` với payload `{ role: 'admin' }` gửi tới endpoint Admin
- Actual: HTTP 200 OK (Token giả mạo được chấp nhận và cấp quyền Admin)
- Expected: HTTP 401 Unauthorized (`res.status === 401`)

Context / Dependencies (under 10 lines):
```javascript
// server/src/routes/auth.js:6-14
const JWT_SECRET = process.env.JWT_SECRET || 'quan-ly-ctv-tnv-secret-key-2026';

export function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
```

