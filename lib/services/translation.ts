import axios from 'axios';

// Using Google Translate API (you can also use other services like DeepL, Azure Translator, etc.)
const GOOGLE_TRANSLATE_API = 'https://translation.googleapis.com/language/translate/v2';

interface TranslationResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<{ translatedText: string; detectedLanguage?: string }> {
  try {
    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.warn('Translation API key not configured');
      return { translatedText: text };
    }

    const params: any = {
      q: text,
      target: targetLanguage,
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    };

    if (sourceLanguage) {
      params.source = sourceLanguage;
    }

    const response = await axios.post<TranslationResponse>(
      GOOGLE_TRANSLATE_API,
      null,
      { params }
    );

    const translation = response.data.data.translations[0];
    return {
      translatedText: translation.translatedText,
      detectedLanguage: translation.detectedSourceLanguage,
    };
  } catch (error) {
    console.error('Translation error:', error);
    // Fallback to original text if translation fails
    return { translatedText: text };
  }
}

export async function detectLanguage(text: string): Promise<string> {
  try {
    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      return 'en';
    }

    const response = await axios.post(
      'https://translation.googleapis.com/language/translate/v2/detect',
      null,
      {
        params: {
          q: text,
          key: process.env.GOOGLE_TRANSLATE_API_KEY,
        },
      }
    );

    return response.data.data.detections[0][0].language || 'en';
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en';
  }
}

// Supported languages mapping
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  ar: 'Arabic',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
};
