Task: Fix bug in `transaction(callback)` inside `server/src/db/index.js`.
Issue: `sqlite.exec('BEGIN TRANSACTION')` không có cơ chế xếp hàng / khóa async khiến 2 transaction đồng thời ném lỗi `cannot start a transaction within a transaction`.
Expected: Các transaction bất đồng bộ gọi qua adapter SQLite phải được tuần tự hóa (mutex / queue) an toàn, không được ném lỗi va chạm transaction.

Failing Assertion / Error:
- Input: Hai lời gọi đồng thời `Promise.allSettled([db.transaction(tx1), db.transaction(tx2)])`
- Actual: SqliteError: cannot start a transaction within a transaction (rejected count = 1)
- Expected: rejected.length === 0 (Cả hai transaction hoàn thành thành công theo thứ tự)

Context / Dependencies (under 10 lines):
```javascript
// server/src/db/index.js:161-169
sqlite.exec('BEGIN TRANSACTION');
try {
  const result = await callback(db);
  sqlite.exec('COMMIT');
  return result;
} catch (err) {
  sqlite.exec('ROLLBACK');
  throw err;
}
```

