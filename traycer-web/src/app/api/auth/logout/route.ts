import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;

    if (refreshToken) {
      // BUG-011: SHA-256 for deterministic lookup
      const hashedRefresh = await hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashedRefresh },
        data: { revoked: true },
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[logout] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
