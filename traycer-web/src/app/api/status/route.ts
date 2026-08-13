import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const planCount = await prisma.plan.count();
    const proposalCount = await prisma.proposal.count();
    const approvedCount = await prisma.proposal.count({
      where: { approved: true }
    });

    return NextResponse.json({
      plans: planCount,
      proposals: proposalCount,
      approved: approvedCount,
      pending: proposalCount - approvedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
