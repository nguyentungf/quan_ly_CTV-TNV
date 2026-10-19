Task: Fix bug in `router.put('/:id/attendance')` inside `server/src/routes/campaigns.js`.
Issue: Truy vấn `reg` và kiểm tra `previousAwarded` nằm ngoài transaction khiến click đúp điểm danh dẫn đến tình trạng TOCTOU cộng điểm trùng lặp.
Expected: Kiểm tra và khóa bản ghi đăng ký điểm danh bên trong transaction để đảm bảo điểm chỉ được cộng duy nhất một lần.

Failing Assertion / Error:
- Input: Hai request gửi đồng thời cùng lúc `PUT /api/campaigns/:id/attendance` đánh dấu `attendanceStatus = 'co_mat'`
- Actual: Điểm hoạt động của thành viên bị cộng gấp đôi (+20đ thay vì +10đ) và sinh 2 log điểm lặp lại
- Expected: Điểm cộng chính xác là +10đ một lần duy nhất và chỉ sinh 1 bản ghi log

Context / Dependencies (under 10 lines):
```javascript
// server/src/routes/campaigns.js:459-478
const reg = await db.get('SELECT * FROM campaign_registrations WHERE id = ?', [Number(registrationId)]);
const previousAwarded = reg.points_awarded || 0; // Đọc ngoài transaction
await db.transaction(async (txDb) => {
  if (attendanceStatus === 'co_mat' && previousAwarded === 0) {
    await txDb.run(`UPDATE ctv_members SET activity_points = activity_points + ? ...`);
    await txDb.run(`INSERT INTO ctv_point_logs ...`);
  }
```

