/**
 * Shared types used across the AI suggestion pipeline modules.
 */
import type { Product } from '../productSearch';

export interface SuggestionResponse {
  suggestedReply: string;
  confidence: number;
  relatedProducts: Product[];
  reasoning: string;
  usedDefaultFallback?: boolean;
}
