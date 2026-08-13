// lib/jwt.ts — BUG-011 confirmed fix: uses SHA-256 (deterministic) for refresh token hashing,
// NOT bcrypt. bcrypt is non-deterministic (different hash per call) and cannot be used for
// exact-match DB lookup via prisma.refreshToken.findUnique({ where: { tokenHash } }).
// bcrypt.compare() remains correct for password verification — this is a separate use case.

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'traycer_super_secret_key_change_in_production';

export interface TokenPayload {
  userId: string;
  username: string;
}

/**
 * Issue a short-lived (15 min) access token. Returned in response body,
 * held in memory/React state on the client (not localStorage — per HLD §4).
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Issue a long-lived (7 day) refresh token. Stored as SHA-256 hash in the
 * RefreshToken table; delivered to client as httpOnly sameSite:strict cookie.
 */
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify any token (access or refresh). Throws if invalid or expired.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Hash a refresh token using SHA-256 for deterministic, exact-match DB lookup.
 * BUG-011: Do NOT use bcrypt here — bcrypt produces different output each call,
 * making findUnique({ where: { tokenHash } }) always fail.
 */
export async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare a raw token against its SHA-256 hash.
 */
export async function compareTokenHash(token: string, hash: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return tokenHash === hash;
}
