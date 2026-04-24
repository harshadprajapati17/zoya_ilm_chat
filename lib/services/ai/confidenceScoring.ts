/**
 * Confidence scoring — assigns a confidence level and human-readable
 * reasoning string based on what data the pipeline found.
 */
import type { Product } from '../productSearch';
import type { Store } from '../storeSearch';
import type { ProductAvailabilityEntry } from './catalogSearch';

export interface ConfidenceResult {
  confidence: number;
  reasoning: string;
}

export function calculateConfidence(opts: {
  products: Product[];
  stores: Store[];
  productAvailability: ProductAvailabilityEntry[];
  contextualProductName: string | null;
  contextualCity: string | null;
  contextualPriceRange: number | null;
}): ConfidenceResult {
  const { products, stores, productAvailability, contextualProductName, contextualCity, contextualPriceRange } = opts;

  const contextInfo: string[] = [];
  if (contextualProductName) contextInfo.push(`product: ${contextualProductName}`);
  if (contextualCity) contextInfo.push(`location: ${contextualCity}`);
  if (contextualPriceRange) contextInfo.push(`budget: ${contextualPriceRange}`);
  const contextString = contextInfo.length > 0 ? ` (context: ${contextInfo.join(', ')})` : '';

  if (productAvailability.length > 0) {
    return {
      confidence: 0.9,
      reasoning: `Found ${productAvailability.length} products with store availability${contextString}`,
    };
  }
  if (stores.length > 0) {
    return {
      confidence: 0.85,
      reasoning: `Found ${stores.length} store locations${contextString}`,
    };
  }
  if (products.length > 0) {
    return {
      confidence: 0.8,
      reasoning: `Found ${products.length} relevant products${contextString}`,
    };
  }

  return { confidence: 0.5, reasoning: 'General inquiry' };
}
