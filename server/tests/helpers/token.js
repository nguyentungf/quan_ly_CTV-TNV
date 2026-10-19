import crypto from 'crypto';
import { getJwtSecret } from '../../src/routes/auth.js';

/**
 * Generate a JWT token directly for testing.
 * @param {Object} payload 
 * @param {string} [secret] - Optional secret, defaults to the current valid server secret
 */
export function generateTestToken(payload, secret = null) {
  const signingSecret = secret || getJwtSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', signingSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}
