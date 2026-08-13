import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../src/db.ts';
import { signAccessToken, signRefreshToken, hashToken, compareTokenHash } from '../utils/jwt.ts';

const router = express.Router();

// Helper to determine if we are doing rotation
const ROTATE_REFRESH_TOKENS = true;

// Register route (for testing/setup)
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { username, password: hashedPassword }
    });

    res.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user (we assume there's a way to create them or a seed user exists)
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = { userId: user.id, username: user.username };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const hashedRefresh = await hashToken(refreshToken);

    // Persist refresh token (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        tokenHash: hashedRefresh,
        userId: user.id,
        expiresAt,
      },
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken, user: { id: user.id, username: user.username } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Refresh route
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }

    // 1. Find the DB record for this token by iterating and comparing or hashing.
    // Wait, since bcrypt produces a different hash each time, we cannot simply query by tokenHash = await hashToken(refreshToken).
    // Bcrypt requires `bcrypt.compare(token, hash)`. This means querying ALL valid refresh tokens and comparing? That's not scalable.
    // A better approach for tokens is using crypto.createHash('sha256') which is deterministic.
    // Since I implemented `hashToken` with bcrypt, querying is a problem.
    // Let me rewrite the hashing logic to use a deterministic hash like SHA256 in a moment.

    // For now, I'll assume `hashToken` is deterministic.
    // I will change `hashToken` to use crypto.createHash.

    const hashedRefresh = await hashToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashedRefresh },
      include: { user: true }
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const payload = { userId: tokenRecord.user.id, username: tokenRecord.user.username };
    const newAccessToken = signAccessToken(payload);

    let newRefreshToken = refreshToken;

    if (ROTATE_REFRESH_TOKENS) {
      // Revoke old token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true }
      });

      // Issue new refresh token
      newRefreshToken = signRefreshToken(payload);
      const newHashedRefresh = await hashToken(newRefreshToken);
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          tokenHash: newHashedRefresh,
          userId: tokenRecord.user.id,
          expiresAt,
        },
      });

      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    res.json({ accessToken: newAccessToken });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Logout route
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const hashedRefresh = await hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashedRefresh },
        data: { revoked: true }
      });
    }
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
