/**
 * LLM-based intent classifier — replaces regex-based browsing/store
 * detection with a single fast LLM call that semantically understands
 * what the user wants, then routes catalog search accordingly.
 */
import { generateChatCompletion } from '../llm';
import type { ChatHistoryTurn } from '../conversationLLMContext';

export type SearchIntent =
  | 'product_search'
  | 'browse_catalog'
  | 'store_query'
  | 'conversation'
  | 'repair_service';

export interface IntentClassification {
  intent: SearchIntent;
  category: string | null;
  city: string | null;
  priceRange: number | null;
  searchQuery: string | null;
}

const CLASSIFICATION_PROMPT = `You are a search-intent classifier for Zoya, a luxury jewelry brand.

Given a customer message and recent conversation history, classify the intent into exactly one of these categories:

- **product_search**: Customer wants specific products (mentions a category like rings/necklaces/bangles/earrings/bracelets, a material, a price range, an occasion, or a specific product name).
- **browse_catalog**: Customer wants to explore without specifics (trending, popular, new arrivals, bestsellers, "show me something", recommendations, "what do you have", gift ideas, or any general discovery request).
- **store_query**: Customer is asking about store locations, visiting a store, store hours, availability at a store, or anything location-related.
- **conversation**: Customer is chatting, greeting, making small talk, asking about the brand, not shopping, or any non-product/non-store message.
- **repair_service**: Customer mentions broken/damaged jewelry, repairs, resizing, maintenance, or service requests.

Also extract these if present in the message or recent history:
- **category**: jewelry category (ring, necklace, bangle, earring, bracelet, pendant) — null if not mentioned
- **city**: city name if mentioned — null if not mentioned
- **priceRange**: maximum budget as a number (e.g., 200000) — null if not mentioned
- **searchQuery**: the core search terms to use for product lookup, stripped of filler words — null for conversation/browse_catalog

Respond with ONLY valid JSON, no markdown fencing:
{"intent":"...","category":null,"city":null,"priceRange":null,"searchQuery":null}`;

export async function classifySearchIntent(
  customerMessage: string,
  historyTail: ChatHistoryTurn[] = []
): Promise<IntentClassification> {
  const recentContext = historyTail
    .slice(-4)
    .map((t) => `${t.role}: ${t.content.substring(0, 150)}`)
    .join('\n');

  const userPrompt = recentContext
    ? `Recent conversation:\n${recentContext}\n\nLatest customer message: "${customerMessage}"`
    : `Customer message: "${customerMessage}"`;

  try {
    const response = await generateChatCompletion(
      [
        { role: 'system', content: CLASSIFICATION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0, maxTokens: 120 },
    );

    const cleaned = response.replace(/```json\s*|```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as IntentClassification;

    if (!isValidIntent(parsed.intent)) {
      parsed.intent = 'product_search';
    }

    console.log(`[Intent Classifier] "${customerMessage}" → ${parsed.intent}`, parsed);
    return parsed;
  } catch (error) {
    console.error('[Intent Classifier] Failed, falling back to product_search:', error);
    return {
      intent: 'product_search',
      category: null,
      city: null,
      priceRange: null,
      searchQuery: customerMessage,
    };
  }
}

function isValidIntent(intent: string): intent is SearchIntent {
  return ['product_search', 'browse_catalog', 'store_query', 'conversation', 'repair_service'].includes(intent);
}
