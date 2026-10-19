Task: Fix bug in `checkGroupPermission` inside `server/src/middleware/auth.js`.
Issue: Callback async truyền vào `requireAuth` không có try/catch làm Unhandled Rejection khi câu query SQLite gặp lỗi (quá 32,766 biến), dẫn đến treo HTTP request vô hạn.
Expected: Bọc try/catch xử lý lỗi hoặc giới hạn kích thước mảng `memberIds` thành từng batch nhỏ, phản hồi mã lỗi HTTP 400 hoặc 413 rõ ràng.

Failing Assertion / Error:
- Input: `POST /api/ctv/bulk-action` với `memberIds` gồm 35,000 số ID
- Actual: `SqliteError: too many SQL variables` tại `src/db/index.js:63` và request bị treo vĩnh viễn không trả về response
- Expected: Server phản hồi HTTP 400 Bad Request hoặc HTTP 413 Payload Too Large (`[400, 413].includes(res.status)`)

Context / Dependencies (under 10 lines):
```javascript
// server/src/middleware/auth.js:44-46, 93-97
export function checkGroupPermission(expectedTargetType) {
  return async (req, res, next) => {
    requireAuth(req, res, async () => {
      const placeholders = req.body.memberIds.map(() => '?').join(',');
      const otherGroupMembers = await db.all(
        `SELECT id, full_name, group_num FROM ${table} WHERE id IN (${placeholders}) AND group_num != ?`,
        [...req.body.memberIds.map(Number), userGroup]
      );
```

