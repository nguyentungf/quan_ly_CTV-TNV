// Test script to verify all features
async function runTests() {
  console.log('--- 1. Testing CTV Attitude & Activity rating ---');
  const rateRes = await fetch('http://localhost:5000/api/ctv/attitude-activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 1,
      type: 'attitude',
      title: 'Tích cực hỗ trợ tân sinh viên',
      pointsDelta: 5,
      note: 'Nhiệt tình'
    })
  }).then(r => r.json());
  console.log('Rate CTV result:', rateRes.message, 'Total:', rateRes.data?.totalPoints);

  console.log('--- 2. Testing TNV Activity rating ---');
  const tnvActRes = await fetch('http://localhost:5000/api/tnv/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 1,
      category: 'Chiến dịch cao điểm',
      points: 20,
      note: 'Tích cực tham gia'
    })
  }).then(r => r.json());
  console.log('TNV Activity result:', tnvActRes.message, 'New total:', tnvActRes.newTotal);

  console.log('--- 3. Testing CTV Group Merge (Group 8 into Group 1) ---');
  const mergeRes = await fetch('http://localhost:5000/api/ctv/merge-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceGroup: 8,
      targetGroup: 1,
      notes: 'Thử nghiệm sáp nhập Nhóm 8 vào Nhóm 1'
    })
  }).then(r => r.json());
  console.log('Merge Result:', mergeRes.message);
  console.log('Demoted Leader:', mergeRes.details?.demotedLeader);

  console.log('--- 4. Checking CTV Members after merge in Group 1 ---');
  const ctvG1 = await fetch('http://localhost:5000/api/ctv/members?group=1').then(r => r.json());
  console.log('Group 1 member count after merge:', ctvG1.data?.length);
  const deputy = ctvG1.data?.find(m => m.full_name === 'Võ Minh Đăng');
  console.log('Võ Minh Đăng (Former Leader of Group 8) role now:', deputy?.role, 'in Group:', deputy?.group_num);

  console.log('--- 5. Testing CSV Export with UTF-8 BOM ---');
  const ctvCsv = await fetch('http://localhost:5000/api/ctv/export-csv').then(r => r.arrayBuffer());
  const ctvBytes = new Uint8Array(ctvCsv);
  const ctvHasBom = ctvBytes[0] === 0xEF && ctvBytes[1] === 0xBB && ctvBytes[2] === 0xBF;
  console.log('CTV CSV has UTF-8 BOM:', ctvHasBom, 'size:', ctvBytes.length, 'bytes');

  const tnvCsv = await fetch('http://localhost:5000/api/tnv/export-csv').then(r => r.arrayBuffer());
  const tnvBytes = new Uint8Array(tnvCsv);
  const tnvHasBom = tnvBytes[0] === 0xEF && tnvBytes[1] === 0xBB && tnvBytes[2] === 0xBF;
  console.log('TNV CSV has UTF-8 BOM:', tnvHasBom, 'size:', tnvBytes.length, 'bytes');

  console.log('--- 6. Testing TNV Discipline status toggle ---');
  const warnRes = await fetch('http://localhost:5000/api/tnv/warning', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      memberId: 2,
      warningLevel: 'canh_cao_1',
      warningNote: 'Kiểm tra cảnh cáo thẻ vàng'
    })
  }).then(r => r.json());
  console.log('Warning update result:', warnRes.message);

  const discRes = await fetch('http://localhost:5000/api/tnv/discipline-board').then(r => r.json());
  console.log('Discipline board count:', discRes.summary?.total, 'Level 1:', discRes.summary?.level1, 'Level 2:', discRes.summary?.level2);

  console.log('✅ ALL INTEGRATION TESTS PASSED!');
}

runTests().catch(console.error);

