import { NextRequest, NextResponse } from 'next/server';
import { translateText, detectLanguage } from '@/lib/services/translation';

// POST /api/translate - Translate text
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, targetLanguage, sourceLanguage } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Text and target language are required' },
        { status: 400 }
      );
    }

    // Detect source language if not provided
    const detectedLanguage = sourceLanguage || (await detectLanguage(text));

    // Skip translation if source and target are the same
    if (detectedLanguage === targetLanguage) {
      return NextResponse.json({
        translatedText: text,
        sourceLanguage: detectedLanguage,
        targetLanguage,
      });
    }

    // Translate
    const result = await translateText(text, targetLanguage, detectedLanguage);

    return NextResponse.json({
      translatedText: result.translatedText,
      sourceLanguage: detectedLanguage,
      targetLanguage,
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    );
  }
}
