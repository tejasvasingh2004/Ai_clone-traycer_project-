import { NextRequest, NextResponse } from 'next/server';

// Placeholder protected route — verifies middleware is working (Phase 2 exit criterion)
export async function GET(req: NextRequest) {
  // If middleware.ts let us through, the token was valid
  return NextResponse.json({
    success: true,
    message: 'Protected route: access granted',
    // The user context is available from the request headers (set by middleware)
    userId: req.headers.get('x-user-id') ?? null,
    username: req.headers.get('x-username') ?? null,
  });
}
