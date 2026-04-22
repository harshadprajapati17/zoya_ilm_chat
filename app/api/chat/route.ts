import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/chat - Send a message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      senderId,
      content,
      isFromCustomer = true,
    } = body;

    if (!conversationId || !senderId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify that the sender exists, if not return error
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      return NextResponse.json(
        { error: 'Sender not found. Please ensure user is created.' },
        { status: 400 }
      );
    }

    // Keep chat posting fast: skip synchronous translation on send.
    const originalLanguage = 'en';
    const translatedContent = null;

    // Get the current session ID from the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { currentSessionId: true },
    });

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        translatedContent,
        originalLanguage,
        isFromCustomer,
        status: 'SENT',
        sessionId: conversation?.currentSessionId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// GET /api/chat?conversationId=xxx - Get messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        suggestedReplies: {
          take: 3,
          orderBy: { confidence: 'desc' },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat?messageId=xxx - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID required' },
        { status: 400 }
      );
    }

    // Delete the message
    await prisma.message.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
