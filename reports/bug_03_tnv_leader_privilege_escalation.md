Task: Fix bug in `router.post('/bulk-action')` inside `server/src/routes/tnv.js`.
Issue: Nhóm trưởng (`role: 'leader'`) có thể tự ý áp dụng mức kỷ luật cảnh cáo (`set_warning`) và đổi nhóm (`change_group`) cho thành viên vì endpoint không yêu cầu quyền Admin.
Expected: Các thao tác kỷ luật hoặc thay đổi cơ cấu nhóm phải yêu cầu `requireAdmin`; trả về HTTP 403 Forbidden nếu gửi bởi Nhóm trưởng.

Failing Assertion / Error:
- Input: `POST /api/tnv/bulk-action` với header của Nhóm trưởng, body `{ action: 'set_warning', memberIds: [1], payload: { warningLevel: 'canh_cao_2' } }`
- Actual: HTTP 200 OK (`message: 'Đã cập nhật mức kỷ luật cho 1 TNV!'`)
- Expected: HTTP 403 Forbidden (`res.status === 403`)

Context / Dependencies (under 10 lines):
```javascript
// server/src/routes/tnv.js:141, 186-190
router.post('/bulk-action', checkGroupPermission('tnv'), async (req, res) => {
  ...
  if (action === 'set_warning') {
    const { warningLevel = 'none', warningNote = '' } = payload || {};
    await db.run(`UPDATE tnv_members SET warning_level = ?, warning_note = ? WHERE id IN (${placeholders})`, [warningLevel, warningNote, ...ids]);
    return res.json({ success: true, message: `Đã cập nhật mức kỷ luật cho ${ids.length} TNV!` });
  }
```

