/**
 * Catalog search — routes the query to the correct product / store
 * search path and handles the "no results" early-return logic that
 * prevents the LLM from hallucinating products.
 */
import { searchProducts, Product, ProductSearchOptions } from '../productSearch';
import { searchStores, getProductAvailability, getStoresByCity, Store } from '../storeSearch';
import type { SuggestionResponse } from './types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CatalogSearchResult {
  products: Product[];
  stores: Store[];
  productAvailability: ProductAvailabilityEntry[];
  earlyReturn?: SuggestionResponse;
}

export interface ProductAvailabilityEntry {
  product: Product & { productThumbnails?: string; productImages?: string };
  stores: { store: Store; quantity: number }[];
}

/* ------------------------------------------------------------------ */
/*  Main search router                                                 */
/* ------------------------------------------------------------------ */

export async function runCatalogSearch(opts: {
  enhancedQuery: string;
  customerMessage: string;
  isStoreQuery: boolean;
  isBrowsingQuery: boolean;
  allowLlmNoResultHandling: boolean;
  city: string | null;
  effectiveCategory: string | null;
  category: string | null;
  contextualProductName: string | null;
  hasReference: boolean;
  contextualPriceRange: number | null;
  searchOptions: ProductSearchOptions;
}): Promise<CatalogSearchResult> {
  const {
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
  } = opts;

  let stores: Store[] = [];
  let productAvailability: ProductAvailabilityEntry[] = [];
  let products: Product[] = [];

  if (contextualProductName && hasReference) {
    console.log(`[AI Suggestions] User referencing product: "${contextualProductName}"`);
    products = await searchProducts(contextualProductName, 5, searchOptions);

    if (isStoreQuery && city && products.length > 0) {
      const productCategory = products[0].category;
      productAvailability = (await getProductAvailability(productCategory, city, 5)) as ProductAvailabilityEntry[];
      productAvailability = productAvailability.filter(
        (pa) => pa.product.name === products[0].name || pa.product.pid === products[0].pid
      );
      products = productAvailability.map((pa) => pa.product as Product);
    }
  } else if (isStoreQuery && city && effectiveCategory) {
    productAvailability = (await getProductAvailability(effectiveCategory, city, 3)) as ProductAvailabilityEntry[];
    products = productAvailability.map((pa) => pa.product as Product);
  } else if (isStoreQuery && city) {
    stores = await getStoresByCity(city);
    console.log(`[AI Suggestions] Store query for city: "${city}" - Found ${stores.length} stores`);
    if (stores.length > 0) {
      console.log(`[AI Suggestions] Stores:`, stores.map((s) => `${s.storeName} in ${s.city}`));
    }
  } else if (isStoreQuery) {
    stores = await searchStores(enhancedQuery, 5);
    console.log(`[AI Suggestions] General store query: "${enhancedQuery}" - Found ${stores.length} stores`);
  } else if (isBrowsingQuery) {
    console.log(`[AI Suggestions] General browsing query detected: "${customerMessage}"`);
    const categories = ['ring', 'necklace', 'bangle', 'earring', 'bracelet'];
    const sampleProducts: Product[] = [];
    for (const cat of categories) {
      const catProducts = await searchProducts(cat, 2, searchOptions);
      sampleProducts.push(...catProducts);
      if (sampleProducts.length >= 6) break;
    }
    products = sampleProducts.slice(0, 6);
    console.log(`[AI Suggestions] Showing ${products.length} sample products from different categories`);
  } else {
    products = await searchProducts(enhancedQuery, 5, searchOptions);
    if (products.length === 0 && (effectiveCategory || contextualProductName)) {
      const contextQuery = effectiveCategory || contextualProductName;
      products = await searchProducts(contextQuery!, 5, searchOptions);
      console.log(`[AI Suggestions] Context-based search "${contextQuery}": ${products.length} products`);
    }
  }

  // Early return for empty results (prevents LLM hallucination)
  if (
    !isStoreQuery &&
    products.length === 0 &&
    productAvailability.length === 0 &&
    !contextualProductName &&
    !isBrowsingQuery &&
    !allowLlmNoResultHandling
  ) {
    const earlyReturn = await buildNoProductResponse(category, contextualPriceRange);
    return { products, stores, productAvailability, earlyReturn };
  }

  return { products, stores, productAvailability };
}

/* ------------------------------------------------------------------ */
/*  Hard-coded "no products" response builder                          */
/* ------------------------------------------------------------------ */

async function buildNoProductResponse(
  category: string | null,
  contextualPriceRange: number | null
): Promise<SuggestionResponse> {
  let noProductMessage = "I'd love to help you find the perfect piece! ";

  if (category && contextualPriceRange) {
    noProductMessage += `Unfortunately, I don't see any ${category}s under INR ${contextualPriceRange.toLocaleString()} in our current inventory. `;
    const categoryProducts = await searchProducts(category, 3);
    if (categoryProducts.length > 0) {
      const lowestPrice = Math.min(...categoryProducts.map((p) => p.price));
      noProductMessage += `However, we have beautiful ${category}s starting from INR ${lowestPrice.toLocaleString()}. Would you like to see those options? `;
    }
    noProductMessage += `\n\nAlternatively, I can show you other jewelry pieces within your budget of INR ${contextualPriceRange.toLocaleString()}. What would you prefer?`;
  } else if (category) {
    noProductMessage += `I'd be happy to show you our ${category} collection! Could you let me know your budget range so I can recommend the best options for you?`;
  } else if (contextualPriceRange) {
    noProductMessage += `I can definitely help you find beautiful jewelry within your budget of INR ${contextualPriceRange.toLocaleString()}! What type of piece are you looking for - rings, necklaces, bangles, or something else?`;
  } else {
    noProductMessage += `What type of jewelry are you interested in, and do you have a budget in mind? This will help me show you the perfect pieces!`;
  }

  console.log(`[AI Suggestions] NO PRODUCTS FOUND - returning hard-coded response to prevent hallucination`);

  return {
    suggestedReply: noProductMessage,
    confidence: 0.5,
    relatedProducts: [],
    reasoning: 'No products found matching criteria - returned helpful guidance without hallucination',
  };
}
