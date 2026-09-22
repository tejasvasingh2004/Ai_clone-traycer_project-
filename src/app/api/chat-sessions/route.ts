import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repositoryId = searchParams.get('repositoryId');

    const sessions = await prisma.chatSession.findMany({
      where: repositoryId ? { repositoryId } : undefined,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(sessions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch chat sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, planId, repositoryId, messages } = body;

    const session = await prisma.chatSession.create({
      data: {
        title: title || 'Task Session',
        planId: planId || null,
        repositoryId: repositoryId || null,
        messages: {
          create: (messages || []).map((msg: any) => ({
            role: msg.role,
            content: msg.content,
          })),
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(session);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create chat session' }, { status: 500 });
  }
}
