/**
 * Context extraction — pulls structured signals (product name, city,
 * price range, category) out of the current message and conversation
 * history so the orchestrator can route searches correctly.
 */
import type { ChatHistoryTurn } from '../conversationLLMContext';

/* ------------------------------------------------------------------ */
/*  Product name from history (bold **Name** markers)                  */
/* ------------------------------------------------------------------ */

export function extractProductNameFromHistory(
  historyTail: ChatHistoryTurn[],
  hasReference: boolean
): string | null {
  if (!hasReference) return null;

  const recentHistory = historyTail.slice(-5);
  for (const msg of recentHistory.reverse()) {
    const productMatches = msg.content.match(/\*\*([^*]+)\*\*/g);
    if (productMatches && productMatches.length > 0) {
      return productMatches[0].replace(/\*\*/g, '');
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  City / location from history                                       */
/* ------------------------------------------------------------------ */

export function extractCityFromHistory(historyTail: ChatHistoryTurn[]): string | null {
  const recentHistory = historyTail.slice(-10);
  const stopWords = [
    'Store', 'Stores', 'Branch', 'Branches', 'Location', 'Shop',
    'Area', 'City', 'Ring', 'Necklace', 'Bangle', 'Bracelet',
  ];

  for (const msg of recentHistory.reverse()) {
    const cityPatterns = [
      /(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
      /(?:stores?|branches?|location|shop)\s+(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:stores?|branches?|area|city)/gi,
    ];

    for (const pattern of cityPatterns) {
      const matches = [...msg.content.matchAll(pattern)];
      if (matches.length > 0) {
        const extractedCity = matches[0][1].trim();
        if (!stopWords.includes(extractedCity)) {
          return extractedCity;
        }
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Price range — current message then history                         */
/* ------------------------------------------------------------------ */

export function extractPriceFromCurrentMessage(
  lowerMessage: string,
  rawMessage: string
): number | null {
  let match = lowerMessage.match(
    /(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs?)/i
  );
  if (match) return parseFloat(match[1]) * 100000;

  match = lowerMessage.match(
    /(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crore|crores?)/i
  );
  if (match) return parseFloat(match[1]) * 10000000;

  const plainPatterns = [
    /(?:under|below|less than|up to)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
    /(?:around|about|approximately)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
    /budget\s+(?:of|is)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
  ];

  for (const pattern of plainPatterns) {
    const matches = [...rawMessage.matchAll(pattern)];
    if (matches.length > 0) {
      return parseInt(matches[0][1].replace(/,/g, ''));
    }
  }
  return null;
}

export function inferLowerPriceFromHistory(
  historyTail: ChatHistoryTurn[]
): number | null {
  const assistantMessages = [...historyTail].reverse().filter((msg) => msg.role === 'assistant');

  for (const assistantMsg of assistantMessages) {
    const mentionedPrices = [...assistantMsg.content.matchAll(/(?:inr|rs\.?|₹)\s*([0-9][0-9,]*)/gi)]
      .map((m) => parseInt(m[1].replace(/,/g, ''), 10))
      .filter((price) => Number.isFinite(price) && price > 0);

    if (mentionedPrices.length > 0) {
      const baselinePrice = Math.min(...mentionedPrices);
      const inferredMax = Math.max(10000, Math.floor(baselinePrice * 0.85));
      console.log(
        `[AI Suggestions] Lower-price follow-up detected. Baseline INR ${baselinePrice.toLocaleString()} -> inferred max INR ${inferredMax.toLocaleString()}`
      );
      return inferredMax;
    }
  }
  return null;
}

export function extractPriceFromHistory(
  historyTail: ChatHistoryTurn[]
): number | null {
  const recentHistory = historyTail.slice(-10);

  for (const msg of [...recentHistory].reverse()) {
    const msgContent = msg.content.toLowerCase();

    const lakhMatch = msgContent.match(
      /(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs?)/i
    );
    if (lakhMatch) {
      const price = parseFloat(lakhMatch[1]) * 100000;
      console.log(`[AI Suggestions] Found budget in history: INR ${price.toLocaleString()}`);
      return price;
    }

    const croreMatch = msgContent.match(
      /(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crore|crores?)/i
    );
    if (croreMatch) {
      const price = parseFloat(croreMatch[1]) * 10000000;
      console.log(`[AI Suggestions] Found budget in history: INR ${price.toLocaleString()}`);
      return price;
    }

    const plainPatterns = [
      /(?:under|below|less than|up to)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/i,
      /(?:around|about|approximately)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/i,
      /budget\s+(?:of|is)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+)/i,
    ];

    for (const pattern of plainPatterns) {
      const m = msgContent.match(pattern);
      if (m) {
        const price = parseInt(m[1].replace(/,/g, ''));
        if (price > 10000) {
          console.log(`[AI Suggestions] Found budget in history: INR ${price.toLocaleString()}`);
          return price;
        }
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Category from message / context / history                          */
/* ------------------------------------------------------------------ */

const CATEGORY_RE = /\b(ring|necklace|bangle|bracelet|earring|pendant|chain)s?\b/i;

export function extractCategoryFromMessage(lowerMessage: string): string | null {
  const match = lowerMessage.match(CATEGORY_RE);
  return match ? match[1] : null;
}

export function extractCategoryFromContext(contextualProductName: string | null): string | null {
  if (!contextualProductName) return null;
  const match = contextualProductName.match(CATEGORY_RE);
  return match ? match[1] : null;
}

export function extractCategoryFromHistory(historyTail: ChatHistoryTurn[]): string | null {
  const historyText = historyTail.map((h) => h.content).join(' ');
  const match = historyText.match(CATEGORY_RE);
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------ */
/*  City from current message                                          */
/* ------------------------------------------------------------------ */

export function extractCityFromMessage(lowerMessage: string): string | null {
  const match = lowerMessage.match(/(?:in|at|near)\s+([a-z\s]+?)(?:\s|$|,|\?)/i);
  return match ? match[1].trim() : null;
}
