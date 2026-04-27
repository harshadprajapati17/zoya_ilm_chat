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

