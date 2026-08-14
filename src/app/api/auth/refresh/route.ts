import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { signAccessToken, signRefreshToken, hashToken } from '@/lib/jwt';

const ROTATE_REFRESH_TOKENS = true;

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // BUG-011: SHA-256 deterministic hash for exact DB lookup.
    // bcrypt.hash() would produce a different hash each call — lookup would always fail.
    const hashedRefresh = await hashToken(refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashedRefresh },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const payload = {
      userId: tokenRecord.user.id,
      username: tokenRecord.user.username,
    };
    const newAccessToken = signAccessToken(payload);

    let newRefreshToken = refreshToken;

    if (ROTATE_REFRESH_TOKENS) {
      // Revoke old token
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked: true },
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
    }

    const response = NextResponse.json({ accessToken: newAccessToken });

    if (ROTATE_REFRESH_TOKENS) {
      response.cookies.set('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    }

    return response;
  } catch (error: any) {
    console.error('[refresh] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
