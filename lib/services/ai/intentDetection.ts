/**
 * Intent detection — regex-based classifiers that determine what kind
 * of message the customer sent so the orchestrator can route accordingly.
 */
import type { ChatHistoryTurn } from '../conversationLLMContext';

/* ------------------------------------------------------------------ */
/*  Lower-price follow-up ("too expensive", "cheaper", etc.)           */
/* ------------------------------------------------------------------ */

export function detectLowerPriceFollowUp(lowerMessage: string): boolean {
  return /\b(not too expensive|too expensive|expensive|cheaper|more affordable|affordable|lower price|lower budget|less expensive|within budget|budget friendly)\b/i.test(lowerMessage);
}

/* ------------------------------------------------------------------ */
/*  Prior welcome intro already sent                                   */
/* ------------------------------------------------------------------ */

export function detectPriorWelcomeIntro(historyTail: ChatHistoryTurn[]): boolean {
  return historyTail.some((msg) => {
    if (msg.role !== 'assistant') return false;
    const content = msg.content.toLowerCase();
    return (
      content.includes('welcome to zoya') ||
      (content.includes('aakriti') && /\b(i'm|i am|this is|my name)\b/.test(content))
    );
  });
}

/* ------------------------------------------------------------------ */
/*  User correction / contradiction                                    */
/* ------------------------------------------------------------------ */

export function detectUserCorrection(lowerMessage: string): boolean {
  return /\b(i did(n't| not) say|i never (said|mentioned)|that's not what i (said|meant)|not for (my|a)|i'm not looking for|no,? i (said|meant)|you('re| are) (wrong|mistaken)|i don't (want|need)|didn't mention|never asked|not what i)\b/i.test(lowerMessage);
}

/* ------------------------------------------------------------------ */
/*  Reference to previously mentioned items                            */
/* ------------------------------------------------------------------ */

export function detectReference(lowerMessage: string): boolean {
  return /\b(this|that|it|these|those|the same|same)\b/.test(lowerMessage);
}

/* ------------------------------------------------------------------ */
/*  Store / location query                                             */
/* ------------------------------------------------------------------ */

export function detectStoreQuery(lowerMessage: string): boolean {
  return /\b(store|location|shop|branch|where|near|in|at|city|available|availability)\b/.test(lowerMessage);
}

/* ------------------------------------------------------------------ */
/*  Browsing / gift / general "what do you have" queries               */
/* ------------------------------------------------------------------ */

export interface BrowsingFlags {
  isGiftQuery: boolean;
  isJewelryBrowsing: boolean;
  isWhatDoYouHave: boolean;
  isBrowsingQuery: boolean;
}

export function detectBrowsingIntent(
  lowerMessage: string,
  effectiveCategory: string | null,
  contextualPriceRange: number | null
): BrowsingFlags {
  const isGiftQuery = /\b(gift|present|surprise|occasion)\b/i.test(lowerMessage);
  const isJewelryBrowsing =
    /\b(jewelry|jewellery|ornaments?|items?|pieces?|collection)\b/i.test(lowerMessage) &&
    /\b(what|show|see|browse|have|sell|offer|available|looking for)\b/i.test(lowerMessage);
  const isWhatDoYouHave = /\b(what|which)\b.*\b(do you have|have you got|available|sell|offer|got)\b/i.test(lowerMessage);

  const isBrowsingQuery =
    (isGiftQuery || isJewelryBrowsing || isWhatDoYouHave) &&
    !effectiveCategory &&
    !contextualPriceRange &&
    lowerMessage.length < 100;

  return { isGiftQuery, isJewelryBrowsing, isWhatDoYouHave, isBrowsingQuery };
}
