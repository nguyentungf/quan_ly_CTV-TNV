import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../helpers/app.js';
import { generateTestToken } from '../helpers/token.js';
import { initSchema } from '../../src/db/index.js';
import ctvRouter from '../../src/routes/ctv.js';

describe('Audit: Edge Cases & Input Validation', () => {
  let app;
  let leaderToken;

  beforeAll(async () => {
    await initSchema();
    app = createTestApp();
    app.use('/api/ctv', ctvRouter);

    leaderToken = generateTestToken({
      role: 'leader',
      targetType: 'ctv',
      groupNum: 1,
      displayName: 'Nhóm trưởng CTV 1'
    });
  });

  it('BUG-04A: Passing massive memberIds array should not crash SQLite with "too many SQL variables"', async () => {
    // Generate 35,000 IDs to exceed SQLite maximum variable limit (32,766)
    const massiveIds = Array.from({ length: 35000 }, (_, i) => i + 1);

    const res = await request(app)
      .post('/api/ctv/bulk-action')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        action: 'change_status',
        memberIds: massiveIds,
        payload: { status: 'Đang hoạt động' }
      });

    // The endpoint should gracefully reject payloads that exceed batch limits (e.g. 400 or 413)
    // or batch the queries in chunks.
    // In current buggy code: Throws unhandled SqliteError: too many SQL variables (status 500)
    expect(res.status).not.toBe(500);
    expect([400, 413]).toContain(res.status);
  });

  it('BUG-04B: Malformed memberIds containing invalid string or object elements should not cause 500 TypeError in SQLite binding', async () => {
    const malformedIds = ['invalid_string', {}, null, undefined];

    const res = await request(app)
      .post('/api/ctv/bulk-action')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        action: 'change_status',
        memberIds: malformedIds,
        payload: { status: 'Đang hoạt động' }
      });

    // Endpoint must validate inputs and return 400 Bad Request, not crash with 500 TypeError
    // (SQLite3 can only bind numbers, strings, bigints, buffers, and null; NaN throws TypeError)
    expect(res.status).toBe(400);
  });
});

