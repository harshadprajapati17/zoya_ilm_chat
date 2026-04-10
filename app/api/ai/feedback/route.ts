import { NextRequest, NextResponse } from 'next/server';
import { storeEditFeedback } from '@/lib/services/aiEditAnalysis';

// POST /api/ai/feedback - Record edit feedback when manager edits AI suggestion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      suggestedReplyId,
      originalSuggestion,
      editedContent,
      editedBy,
      customerQuery,
      conversationContext,
    } = body;

    if (!suggestedReplyId || !originalSuggestion || !editedContent || !editedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store the edit feedback
    const feedback = await storeEditFeedback(
      suggestedReplyId,
      originalSuggestion,
      editedContent,
      editedBy,
      customerQuery || '',
      conversationContext || {}
    );

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        editCategory: feedback.editCategory,
        editPercentage: feedback.editPercentage,
        acceptanceScore: feedback.acceptanceScore,
      },
    });
  } catch (error) {
    console.error('Error storing edit feedback:', error);
    return NextResponse.json(
      { error: 'Failed to store feedback' },
      { status: 500 }
    );
  }
}
