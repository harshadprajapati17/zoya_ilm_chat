import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateReplySuggestion } from '@/lib/services/aiSuggestions';
import { translateText } from '@/lib/services/translation';
import {
  attachCustomerMessageToHistory,
  isProvidedHistoryArray,
  mergeConversationHistoryDbWins,
  messagesToHistory,
  sanitizeHistoryTailForSuggestion,
} from '@/lib/services/conversationLLMContext';

// POST /api/ai/suggestions - Generate AI reply suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messageId,
      conversationId,
      customerMessage,
      targetLanguage = 'en',
      conversationHistory: providedHistory,
    } = body;

    if (!customerMessage) {
      return NextResponse.json({ error: 'Customer message is required' }, { status: 400 });
    }

    let historyTail = attachCustomerMessageToHistory([], customerMessage);

    if (conversationId) {
      const dbMessages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 80,
        select: {
          content: true,
          isFromCustomer: true,
          createdAt: true,
        },
      });

      const fromDb = messagesToHistory(dbMessages);
      const clientHistory = isProvidedHistoryArray(providedHistory) ? providedHistory : [];
      const merged =
        clientHistory.length > 0 ? mergeConversationHistoryDbWins(fromDb, clientHistory) : fromDb;
      historyTail = attachCustomerMessageToHistory(merged, customerMessage);

      console.log(
        '[api/ai/suggestions] history built',
        JSON.stringify({
          conversationId,
          dbMessageCount: dbMessages.length,
          usedClientOverlay: clientHistory.length > 0,
          historyTurns: historyTail.length,
        })
      );
    } else if (isProvidedHistoryArray(providedHistory) && providedHistory.length > 0) {
      historyTail = attachCustomerMessageToHistory(providedHistory, customerMessage);
    }

    historyTail = sanitizeHistoryTailForSuggestion(historyTail);

    const suggestion = await generateReplySuggestion(customerMessage, historyTail);

    // Translate the suggestion if needed
    let translatedReply = suggestion.suggestedReply;
    if (targetLanguage !== 'en') {
      const translation = await translateText(suggestion.suggestedReply, targetLanguage, 'en');
      translatedReply = translation.translatedText;
    }

    // Save suggestion to database if messageId provided
    let suggestedReplyId: string | undefined;
    if (messageId) {
      const savedSuggestion = await prisma.suggestedReply.create({
        data: {
          messageId,
          content: suggestion.suggestedReply,
          confidence: suggestion.confidence,
          productIds: JSON.stringify(suggestion.relatedProducts.map((p) => p.id)),
          wasUsed: false, // Will be updated if admin uses it
        },
      });
      suggestedReplyId = savedSuggestion.id;
    }

    return NextResponse.json({
      suggestedReply: suggestion.suggestedReply,
      translatedReply,
      confidence: suggestion.confidence,
      relatedProducts: suggestion.relatedProducts,
      reasoning: suggestion.reasoning,
      usedDefaultFallback: suggestion.usedDefaultFallback ?? false,
      suggestedReplyId, // Return the database ID for feedback tracking
    });
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 });
  }
}
