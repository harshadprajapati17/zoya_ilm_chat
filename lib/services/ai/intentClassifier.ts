/**
 * LLM-based intent classifier — replaces regex-based browsing/store
 * detection with a single fast LLM call that semantically understands
 * what the user wants, then routes catalog search accordingly.
 */
import { generateChatCompletion, getLLMProvider } from '../llm';
import type { ChatHistoryTurn } from '../conversationLLMContext';

export type SearchIntent =
  | 'product_search'
  | 'browse_catalog'
  | 'store_query'
  | 'conversation'
  | 'repair_service'
  | 'callback_request';

export interface IntentClassification {
  intent: SearchIntent;
  category: string | null;
  city: string | null;
  country: string | null;
  priceRange: number | null;
  searchQuery: string | null;
}

const CLASSIFICATION_PROMPT = `Classify the customer's latest intent for Zoya.

Return exactly one intent:
- product_search
- browse_catalog
- store_query
- conversation
- repair_service
- callback_request

Decision rules:
1) Use latest message as primary signal; use history only to resolve follow-ups.
2) If user asks about stores/branches/locations/visit/nearby, choose store_query.
3) If assistant previously asked for city and user now replies with only a place name, choose store_query and set city to that reply.
4) For generic location phrases without an explicit place (e.g. "nearest store", "near me"), keep city = null.
5) For discovery requests (trending, popular, recommendations, what's new), choose browse_catalog.
6) For damage/repair/service requests, choose repair_service.
7) If user asks to speak over phone or requests a call back, choose callback_request.
8) For small talk/non-shopping, choose conversation.

Extract fields:
- category: ring | necklace | bangle | earring | bracelet | pendant | null
- city: explicit city/place from latest message or city-follow-up reply; otherwise null
- country: the country the city belongs to (e.g. "India", "United States"); null if no city
- priceRange: max budget as number, else null
- searchQuery: concise product-search terms only; null for store_query/browse_catalog/conversation/repair_service/callback_request

Examples:
- "stores near Surat" => {"intent":"store_query","category":null,"city":"Surat","country":"India","priceRange":null,"searchQuery":null}
- (history: assistant asked city) latest: "SURAT" => {"intent":"store_query","category":null,"city":"SURAT","country":"India","priceRange":null,"searchQuery":null}
- "nearest store" => {"intent":"store_query","category":null,"city":null,"country":null,"priceRange":null,"searchQuery":null}
- "store in Chicago" => {"intent":"store_query","category":null,"city":"Chicago","country":"United States","priceRange":null,"searchQuery":null}
- "show trending pieces" => {"intent":"browse_catalog","category":null,"city":null,"country":null,"priceRange":null,"searchQuery":null}
- "gold rings under 2 lakhs" => {"intent":"product_search","category":"ring","city":null,"country":null,"priceRange":200000,"searchQuery":"gold rings"}
- "call me" => {"intent":"callback_request","category":null,"city":null,"country":null,"priceRange":null,"searchQuery":null}

Return ONLY valid JSON (no markdown):
{"intent":"...","category":null,"city":null,"country":null,"priceRange":null,"searchQuery":null}`;

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

  const classifierModel =
    process.env.INTENT_CLASSIFIER_MODEL
    || (getLLMProvider() === 'gemini' ? 'gemini-2.5-flash-lite' : undefined);

  try {
    const parsed = await classifyWithRetry(userPrompt, classifierModel);

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
      country: null,
      priceRange: null,
      searchQuery: customerMessage,
    };
  }
}

function isValidIntent(intent: string): intent is SearchIntent {
  return ['product_search', 'browse_catalog', 'store_query', 'conversation', 'repair_service', 'callback_request'].includes(intent);
}

async function classifyWithRetry(
  userPrompt: string,
  model: string | undefined
): Promise<IntentClassification> {
  const primaryResponse = await generateChatCompletion(
    [
      { role: 'system', content: CLASSIFICATION_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0, maxTokens: 120, model },
  );

  const primaryParsed = tryParseClassification(primaryResponse);
  if (primaryParsed) return primaryParsed;

  // Retry with a stricter minimal prompt when model returns empty/non-JSON text.
  const retryResponse = await generateChatCompletion(
    [
      {
        role: 'system',
        content:
          'Classify the user intent and return JSON only. Allowed intents: product_search, browse_catalog, store_query, conversation, repair_service, callback_request. Output shape: {"intent":"...","category":null,"city":null,"country":null,"priceRange":null,"searchQuery":null}.',
      },
      { role: 'user', content: userPrompt },
    ],
    { temperature: 0, maxTokens: 80, model },
  );

  const retryParsed = tryParseClassification(retryResponse);
  if (retryParsed) return retryParsed;

  throw new Error('Intent classifier returned non-JSON/empty output after retry');
}

function tryParseClassification(raw: string): IntentClassification | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
  try {
    return JSON.parse(cleaned) as IntentClassification;
  } catch {
    return null;
  }
}
