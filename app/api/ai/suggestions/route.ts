import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateReplySuggestion } from '@/lib/services/aiSuggestions';
import { translateText } from '@/lib/services/translation';

// POST /api/ai/suggestions - Generate AI reply suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, conversationId, customerMessage, targetLanguage = 'en', conversationHistory: providedHistory } = body;

    if (!customerMessage) {
      return NextResponse.json(
        { error: 'Customer message is required' },
        { status: 400 }
      );
    }

    // Get conversation history - prefer provided history (from UI state), otherwise fetch from database
    let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (providedHistory && Array.isArray(providedHistory)) {
      // Use provided conversation history (from UI state)
      conversationHistory = providedHistory;
    } else if (conversationId) {
      // Fallback: Fetch from database if no history provided
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 10, // Last 10 messages for context
        select: {
          content: true,
          isFromCustomer: true,
        },
      });

      conversationHistory = messages.map((msg) => ({
        role: msg.isFromCustomer ? ('user' as const) : ('assistant' as const),
        content: msg.content,
      }));
    }

    // Generate AI suggestion
    const suggestion = await generateReplySuggestion(
      customerMessage,
      conversationHistory
    );

    // Translate the suggestion if needed
    let translatedReply = suggestion.suggestedReply;
    if (targetLanguage !== 'en') {
      const translation = await translateText(
        suggestion.suggestedReply,
        targetLanguage,
        'en'
      );
      translatedReply = translation.translatedText;
    }

    // Save suggestion to database if messageId provided
    if (messageId) {
      await prisma.suggestedReply.create({
        data: {
          messageId,
          content: suggestion.suggestedReply,
          confidence: suggestion.confidence,
          productIds: JSON.stringify(suggestion.relatedProducts.map((p) => p.id)),
        },
      });
    }

    return NextResponse.json({
      suggestedReply: suggestion.suggestedReply,
      translatedReply,
      confidence: suggestion.confidence,
      relatedProducts: suggestion.relatedProducts,
      reasoning: suggestion.reasoning,
    });
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestion' },
      { status: 500 }
    );
  }
}
