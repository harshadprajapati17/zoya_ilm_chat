/**
 * Catalog search — routes the query to the correct product / store
 * search path and handles the "no results" early-return logic that
 * prevents the LLM from hallucinating products.
 */
import { searchProducts, Product, ProductSearchOptions } from '../productSearch';
import { searchStores, getProductAvailability, getStoresByCity, getAllStores, Store } from '../storeSearch';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CatalogSearchResult {
  products: Product[];
  stores: Store[];
  productAvailability: ProductAvailabilityEntry[];
  isNearbyFallback?: boolean;
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
  city: string | null;
  country: string | null;
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
    city,
    country,
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
  let isNearbyFallback = false;

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
      if (productAvailability.length === 0) {
        stores = await getStoresByCity(city);
        if (stores.length === 0) {
          stores = await getAllStores(50, country ?? undefined);
          isNearbyFallback = true;
        }
      }
    }
  } else if (isStoreQuery && city && effectiveCategory) {
    productAvailability = (await getProductAvailability(effectiveCategory, city, 3)) as ProductAvailabilityEntry[];
    products = productAvailability.map((pa) => pa.product as Product);
    if (productAvailability.length === 0) {
      stores = await getStoresByCity(city);
      if (stores.length === 0) {
        stores = await getAllStores(50, country ?? undefined);
        isNearbyFallback = true;
      }
    }
  } else if (isStoreQuery && city) {
    stores = await getStoresByCity(city);
    console.log(`[AI Suggestions] Store query for city: "${city}" - Found ${stores.length} stores`);
    if (stores.length > 0) {
      console.log(`[AI Suggestions] Stores:`, stores.map((s) => `${s.storeName} in ${s.city}`));
    } else {
      stores = await getAllStores(50, country ?? undefined);
      isNearbyFallback = true;
      console.log(`[AI Suggestions] No stores in "${city}" — loaded ${country ?? 'all'} stores (${stores.length}) for nearest suggestion`);
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

  return { products, stores, productAvailability, isNearbyFallback };
}
