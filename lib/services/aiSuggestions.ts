/**
 * AI Suggestions — thin orchestrator.
 *
 * All heavy logic lives in dedicated modules under ./ai/:
 *   intentDetection   → regex-based intent classifiers
 *   contextExtraction → extract product, city, price, category from history
 *   catalogSearch     → product / store search routing + empty-result handling
 *   contextFormatters → serialise catalog data into LLM-ready text blocks
 *   systemPrompt      → Aakriti persona prompt + dynamic context notes
 *   confidenceScoring → confidence level + reasoning string
 */

import { generateChatCompletion, generateSuggestionChatCompletion } from './llm';
import type { ChatHistoryTurn } from './conversationLLMContext';
import type { ProductSearchOptions } from './productSearch';
import { getEnhancedPromptInstructions, getSimilarPastEdits } from './aiFeedbackLearning';
import { translateText } from './translation';

import {
  detectLowerPriceFollowUp,
  detectPriorWelcomeIntro,
  detectUserCorrection,
  detectReference,
  detectStoreQuery,
  detectBrowsingIntent,
} from './ai/intentDetection';

import {
  extractProductNameFromHistory,
  extractCityFromHistory,
  extractPriceFromCurrentMessage,
  inferLowerPriceFromHistory,
  extractPriceFromHistory,
  extractCategoryFromMessage,
  extractCategoryFromContext,
  extractCategoryFromHistory as extractCategoryFromHistoryFn,
  extractCityFromMessage,
} from './ai/contextExtraction';

import { runCatalogSearch } from './ai/catalogSearch';

import {
  formatProductContext,
  formatStoreContext,
  formatAvailabilityContext,
  buildContextSection,
} from './ai/contextFormatters';

import {
  buildPersonaPrompt,
  buildContextNotes,
  assembleSystemInstruction,
} from './ai/systemPrompt';

import { calculateConfidence } from './ai/confidenceScoring';

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

import type { SuggestionResponse } from './ai/types';
export type { SuggestionResponse } from './ai/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function stripEmojiAndSymbols(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu, '')
    .replace(/[\u2600-\u27BF]/g, '')
    .replace(/[•★☆✓✔✦✧✨🔥💎💫🌟⭐️]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/*  Dev mock toggle                                                    */
/* ------------------------------------------------------------------ */

const USE_DEV_MOCK_AI_SUGGESTION = false;

const DEV_MOCK_SUGGESTED_REPLY = `That's a lovely idea! Here are a couple of stunning diamond rings that might be perfect for your father:

1. **Infinite Arc Ring** - INR 1,84,636  
   This one is absolutely stunning! It's crafted in 18K rose gold with a beautiful amethyst and diamonds totaling 0.18 carats. The design is elegant and unique!  
   ![Product Image](https://www.zoya.in/dw/image/v2/BKCK_PRD/on/demandware.static/-/Sites-Tanishq-product-catalog/default/dw68019125/images/ZOYA/hi-res/ZLFL21FAAAA34_2.jpg?sw=115&sh=115)  
   [View here](https://www.zoya.in/product/finger_ring-zlfl21faaaa34.html?lang=en_IN)

2. **The Purple Prism** - INR 1,95,966  
   I think you'll really love the design on this one! Made in 18K gold, it features an amethyst and diamonds totaling 0.24 carats. It's a statement piece that your father would cherish.  
   ![Product Image](https://www.zoya.in/dw/image/v2/BKCK_PRD/on/demandware.static/-/Sites-Tanishq-product-catalog/default/dw09fb6d36/images/ZOYA/hi-res/ZLFL24FDFAA34.jpg?sw=115&sh=115)  
   [View here](https://www.zoya.in/product/finger_ring-zlfl24fdfaa34.html?lang=en_IN)

Would you like to know more about any of these rings or explore other options?`;

/* ------------------------------------------------------------------ */
/*  Main orchestrator                                                  */
/* ------------------------------------------------------------------ */

export async function generateReplySuggestion(
  customerMessage: string,
  historyTail: ChatHistoryTurn[] = []
): Promise<SuggestionResponse> {
  if (USE_DEV_MOCK_AI_SUGGESTION) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      suggestedReply: DEV_MOCK_SUGGESTED_REPLY,
      confidence: 0.85,
      relatedProducts: [],
      reasoning: 'TEMP dev mock (no OpenAI) — revert before push',
    };
  }

  try {
    // ── Translation ──────────────────────────────────────────────────
    let catalogSearchQuery = customerMessage;
    try {
      const { translatedText } = await translateText(customerMessage, 'en');
      const t = translatedText?.trim();
      if (t && t !== customerMessage.trim()) {
        catalogSearchQuery = t;
      }
    } catch {
      /* keep original */
    }

    // ── Feedback learning ────────────────────────────────────────────
    let enhancedInstructions = '';
    let similarPastEdits: { originalSuggestion: string; editedContent: string; editCategory: string; keyChanges: string[] }[] = [];
    try {
      enhancedInstructions = await getEnhancedPromptInstructions();
      similarPastEdits = await getSimilarPastEdits(catalogSearchQuery, 3);
    } catch (learningError) {
      console.log('[AI Suggestions] Feedback learning not available (might be first deployment):', learningError);
    }

    // ── Normalised message text ──────────────────────────────────────
    const lowerMessage =
      catalogSearchQuery !== customerMessage.trim()
        ? `${customerMessage} ${catalogSearchQuery}`.toLowerCase()
        : customerMessage.toLowerCase();
    const latestUserMessage = customerMessage.trim();

    // ── Intent detection ─────────────────────────────────────────────
    const isLowerPriceFollowUp = detectLowerPriceFollowUp(lowerMessage);
    const hasPriorWelcomeIntro = detectPriorWelcomeIntro(historyTail);
    const isUserCorrection = detectUserCorrection(lowerMessage);
    const hasReference = detectReference(lowerMessage);
    const isStoreQuery = detectStoreQuery(lowerMessage);

    if (isUserCorrection) {
      console.log(`[AI Suggestions] USER CORRECTION DETECTED: "${customerMessage}"`);
    }

    // ── Context extraction ───────────────────────────────────────────
    const contextualProductName = extractProductNameFromHistory(historyTail, hasReference);
    const contextualCity = extractCityFromHistory(historyTail);

    let contextualPriceRange = extractPriceFromCurrentMessage(lowerMessage, customerMessage);
    if (!contextualPriceRange && isLowerPriceFollowUp) {
      contextualPriceRange = inferLowerPriceFromHistory(historyTail);
    }
    if (!contextualPriceRange) {
      contextualPriceRange = extractPriceFromHistory(historyTail);
    }

    console.log(`[AI Suggestions] Extracted contextual price range: ${contextualPriceRange ? 'INR ' + contextualPriceRange.toLocaleString() : 'none'}`);

    const category = extractCategoryFromMessage(lowerMessage);
    const categoryFromContext = hasReference && !category ? extractCategoryFromContext(contextualProductName) : null;
    const categoryFromHistory = !category && !categoryFromContext ? extractCategoryFromHistoryFn(historyTail) : null;
    const effectiveCategory = category || categoryFromContext || categoryFromHistory;

    let city = extractCityFromMessage(lowerMessage);
    if (!city && contextualCity && isStoreQuery) {
      city = contextualCity;
    }

    // ── Browsing intent ──────────────────────────────────────────────
    const { isBrowsingQuery } = detectBrowsingIntent(lowerMessage, effectiveCategory, contextualPriceRange);
    const allowLlmNoResultHandling =
      !isStoreQuery &&
      !isBrowsingQuery &&
      !effectiveCategory &&
      !contextualPriceRange &&
      !contextualProductName;

    // ── Build search query ───────────────────────────────────────────
    let enhancedQuery = catalogSearchQuery;
    if (contextualProductName && hasReference) {
      enhancedQuery = `${contextualProductName} ${catalogSearchQuery}`;
    }

    const searchOptions: ProductSearchOptions = {};
    if (contextualPriceRange) {
      searchOptions.maxPrice = contextualPriceRange;
      console.log(`[AI Suggestions] Applying price filter: max INR ${contextualPriceRange.toLocaleString()}`);
    }

    // ── Catalog search ───────────────────────────────────────────────
    const searchResult = await runCatalogSearch({
      enhancedQuery,
      customerMessage,
      isStoreQuery,
      isBrowsingQuery,
      allowLlmNoResultHandling,
      city,
      effectiveCategory,
      category,
      contextualProductName,
      hasReference,
      contextualPriceRange,
      searchOptions,
    });

    if (searchResult.earlyReturn) return searchResult.earlyReturn;

    const { products, stores, productAvailability } = searchResult;

    // ── Format data for LLM ──────────────────────────────────────────
    const productContext = formatProductContext(products);
    const storeContext = formatStoreContext(stores);
    const availabilityCtx = formatAvailabilityContext(productAvailability);

    const contextSection = buildContextSection(availabilityCtx, storeContext, productContext, {
      productAvailabilityCount: productAvailability.length,
      storeCount: stores.length,
      productCount: products.length,
    });

    // ── Build learning context ───────────────────────────────────────
    let learningContext = '';
    if (enhancedInstructions) {
      learningContext += `\n## AI IMPROVEMENT GUIDELINES\n${enhancedInstructions}\n`;
    }
    if (similarPastEdits.length > 0) {
      learningContext += `\n## LEARNING FROM PAST EDITS\nHere are similar queries where managers improved AI responses. Learn from these patterns:\n\n`;
      similarPastEdits.forEach((edit, i) => {
        learningContext += `Example ${i + 1}:\nAI Original: "${edit.originalSuggestion.substring(0, 150)}..."\nManager's Edit: "${edit.editedContent.substring(0, 150)}..."\nEdit Type: ${edit.editCategory}\nKey Changes: ${edit.keyChanges.join(', ')}\n\n`;
      });
    }

    // ── System prompt assembly ────────────────────────────────────────
    const personaPrompt = buildPersonaPrompt({
      learningContext,
      contextSection,
      latestUserMessage,
      contextualProductName,
      contextualCity,
      contextualPriceRange,
      isUserCorrection,
    });

    const contextNote = buildContextNotes({
      isLastTurnFromUser: historyTail.length > 0 && historyTail[historyTail.length - 1]?.role === 'user',
      hasPriorWelcomeIntro,
      isLowerPriceFollowUp,
      latestUserMessage,
    });

    const systemInstruction = assembleSystemInstruction(personaPrompt, contextNote);

    // ── LLM call ─────────────────────────────────────────────────────
    const aiReply = await generateSuggestionChatCompletion(systemInstruction, historyTail);
    const cleanedReply = stripEmojiAndSymbols(aiReply);

    // ── Confidence ───────────────────────────────────────────────────
    const { confidence, reasoning } = calculateConfidence({
      products,
      stores,
      productAvailability,
      contextualProductName,
      contextualCity,
      contextualPriceRange,
    });

    return {
      suggestedReply: cleanedReply,
      confidence,
      relatedProducts: products,
      reasoning,
      usedDefaultFallback: false,
    };
  } catch (error) {
    console.error('Error generating AI suggestion:', error);

    return {
      suggestedReply: "Thank you for reaching out! I'd love to help you find the perfect piece from our Zoya collection. What are you looking for today?",
      confidence: 0.3,
      relatedProducts: [],
      reasoning: 'Fallback response due to error',
      usedDefaultFallback: true,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Tone enhancer (unchanged)                                          */
/* ------------------------------------------------------------------ */

export async function enhanceReply(
  reply: string,
  tone: 'formal' | 'friendly' | 'concise' = 'friendly'
): Promise<string> {
  const tonePrompts = {
    formal: 'Rewrite this response in a formal, professional tone while maintaining the key information.',
    friendly: 'Rewrite this response in a warm, friendly tone while maintaining the key information.',
    concise: 'Rewrite this response to be more concise while maintaining the key information.',
  };

  const messages = [
    { role: 'system' as const, content: tonePrompts[tone] },
    { role: 'user' as const, content: reply },
  ];

  return await generateChatCompletion(messages);
}
