import { describe, it, expect } from 'vitest';

describe('Smoke Test - Test Runner Verification', () => {
  it('kiểm tra runner Vitest hoạt động bình thường', () => {
    expect(1 + 1).toBe(2);
  });

  it('kiểm tra hỗ trợ ES Modules và async/await', async () => {
    const asyncValue = await Promise.resolve('ready');
    expect(asyncValue).toBe('ready');
  });
});
