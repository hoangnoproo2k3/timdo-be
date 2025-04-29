import * as crypto from 'crypto';

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
