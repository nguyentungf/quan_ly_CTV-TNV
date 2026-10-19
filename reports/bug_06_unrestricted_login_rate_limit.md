Task: Fix bug in `router.post('/login')` inside `server/src/routes/auth.js`.
Issue: Endpoint đăng nhập không có giới hạn tần suất yêu cầu (rate limiting), cho phép brute-force mật khẩu Admin và mật khẩu nhóm không giới hạn.
Expected: Chặn các request đăng nhập liên tục từ cùng một IP/Client và phản hồi mã lỗi HTTP 429 Too Many Requests.

Failing Assertion / Error:
- Input: 30 request đăng nhập thất bại liên tiếp gửi tới `POST /api/auth/login`
- Actual: Tất cả 30 request đều trả về HTTP 401 Unauthorized (rateLimited.length === 0)
- Expected: Sau một số lần thử sai, server phải phản hồi HTTP 429 Too Many Requests (`rateLimited.length > 0`)

Context / Dependencies (under 10 lines):
```javascript
// server/src/routes/auth.js:37-40
router.post('/login', async (req, res) => {
  try {
    const { loginType, targetType, groupNum, password } = req.body;
    // Không có middleware express-rate-limit hoặc cơ chế throttle IP
    if (loginType === 'admin') {
      ...
      if (!adminAuth || adminAuth.password !== password.trim()) {
        return res.status(401).json({ success: false, message: 'Mật khẩu Ban Quản Trị không chính xác!' });
      }
```

