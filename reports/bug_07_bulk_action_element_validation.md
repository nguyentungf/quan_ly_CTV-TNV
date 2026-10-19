Task: Fix bug in `router.post('/bulk-action')` inside `server/src/routes/ctv.js`.
Issue: Không kiểm tra tính hợp lệ của các phần tử trong `memberIds` (nhận chuỗi ký tự, object, null) và vẫn trả về HTTP 200 báo thành công giả.
Expected: Validate toàn bộ các phần tử trong `memberIds` phải là số nguyên dương hợp lệ, nếu không trả về HTTP 400 Bad Request.

Failing Assertion / Error:
- Input: `POST /api/ctv/bulk-action` với `memberIds: ['invalid_string', {}, null, undefined]`
- Actual: HTTP 200 OK (`message: 'Đã đổi trạng thái sang "Đang hoạt động" cho 4 CTV!'`)
- Expected: HTTP 400 Bad Request (`res.status === 400`)

Context / Dependencies (under 10 lines):
```javascript
// server/src/routes/ctv.js:120-128
router.post('/bulk-action', checkGroupPermission('ctv'), async (req, res) => {
  const { action, memberIds, payload } = req.body;
  if (!action || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Danh sách nhân sự được chọn không hợp lệ!' });
  }
  const ids = memberIds.map(Number); // Ra [NaN, NaN, 0, NaN] mà không validate
  const placeholders = ids.map(() => '?').join(',');
```

