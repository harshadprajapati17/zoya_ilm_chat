import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// GET /api/conversations - Get all conversations (for lead management dashboard)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const managerId = searchParams.get('managerId');

    const where: any = { status };
    if (managerId) {
      where.assignedManagerId = managerId;
    }

    const conversations = await prisma.conversation.findMany({
      where,
      select: {
        id: true,
        customerId: true,
        assignedManagerId: true,
        status: true,
        customerLanguage: true,
        currentSessionId: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            language: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const conversationIds = conversations.map((c) => c.id);
    const lastByConversation = new Map<
      string,
      { content: string; createdAt: Date; isFromCustomer: boolean }
    >();

    if (conversationIds.length > 0) {
      const rows = await prisma.$queryRaw<
        Array<{
          conversationId: string;
          content: string;
          createdAt: Date;
          isFromCustomer: boolean;
        }>
      >(Prisma.sql`
        SELECT DISTINCT ON ("conversationId")
          "conversationId",
          "content",
          "createdAt",
          "isFromCustomer"
        FROM "Message"
        WHERE "conversationId" IN (${Prisma.join(conversationIds)})
        ORDER BY "conversationId", "createdAt" DESC
      `);
      for (const row of rows) {
        lastByConversation.set(row.conversationId, {
          content: row.content,
          createdAt: row.createdAt,
          isFromCustomer: row.isFromCustomer,
        });
      }
    }

    const conversationsWithPreview = conversations.map((c) => {
      const last = lastByConversation.get(c.id);
      return {
        ...c,
        messages: last ? [last] : [],
      };
    });

    return NextResponse.json({ conversations: conversationsWithPreview });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation or start a new session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, customerName, customerEmail, customerPhone, customerLanguage = 'en' } = body;

    // First, try to find customer by phone number (most reliable for returning customers)
    let customer = null;

    if (customerPhone) {
      customer = await prisma.user.findFirst({
        where: { phone: customerPhone },
      });
    }

    // If not found by phone, try by customerId or email
    if (!customer && customerId) {
      customer = await prisma.user.findUnique({ where: { id: customerId } });
    }

    if (!customer && customerEmail) {
      customer = await prisma.user.findUnique({ where: { email: customerEmail } });
    }

    // Create new customer if doesn't exist
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          role: 'CUSTOMER',
          language: customerLanguage,
        },
      });
    }

    // Check if customer has an existing active conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        customerId: customer.id,
        status: 'active',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            language: true,
          },
        },
      },
    });

    // Get the default manager (Aakriti)
    const manager = await prisma.user.findUnique({
      where: { id: 'manager-123' },
    });

    // Generate a new session ID for this chat session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // If no active conversation exists, create a new one
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          customerId: customer.id,
          customerLanguage,
          status: 'active',
          assignedManagerId: 'manager-123',
          currentSessionId: newSessionId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              language: true,
            },
          },
        },
      });
    } else {
      // Update existing conversation with new session ID
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { currentSessionId: newSessionId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              language: true,
            },
          },
        },
      });
    }

    // Send automatic welcome message for this new session
    if (manager) {
      const welcomeMessage = `Hello ${customer.name} and welcome to Zoya!\nI'm ${manager.name}, and I'll be glad to assist you today.`;

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: manager.id,
          content: welcomeMessage,
          isFromCustomer: false,
          originalLanguage: 'en',
          sessionId: newSessionId,
        },
      });
    }

    return NextResponse.json({ conversation, sessionId: newSessionId });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
