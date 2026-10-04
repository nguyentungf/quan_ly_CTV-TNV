import crypto from 'crypto';

/**
 * Generate a JWT token directly for testing.
 * @param {Object} payload 
 * @param {string} [secret] - Optional secret, defaults to the hardcoded default fallback
 */
export function generateTestToken(payload, secret = 'quan-ly-ctv-tnv-secret-key-2026') {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
