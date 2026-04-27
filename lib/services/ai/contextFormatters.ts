/**
 * Context formatters — serialise products, stores, and availability
 * data into plain-text blocks that get injected into the system prompt
 * so the LLM can reference real catalog data.
 */
import type { Product } from '../productSearch';
import type { Store } from '../storeSearch';
import type { ProductAvailabilityEntry } from './catalogSearch';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function formatProductImageUrl(product: Product): string | null {
  const imageSource = product.productThumbnails || product.productImages;
  if (!imageSource) return null;

  try {
    const images = JSON.parse(imageSource);
    if (Array.isArray(images) && images.length > 0) {
      return images[0];
    }
  } catch {
    return imageSource;
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Product list block                                                 */
/* ------------------------------------------------------------------ */

export function formatProductContext(products: Product[]): string {
  return products
    .map((p) => {
      const imageUrl = formatProductImageUrl(p);
      return `Product: ${p.name}
Price: ${p.currency} ${p.price.toLocaleString()}
Product Link: ${p.link}
${imageUrl ? `Product Image: ${imageUrl}` : ''}
Category: ${p.category}
Material: ${p.material || 'Not specified'}
Purity: ${p.purity || 'Not specified'}
Gemstone 1: ${p.gemStone1 || 'None'}
Gemstone 2: ${p.gemStone2 || 'None'}
Metal Colour: ${p.metalColour || 'Not specified'}
Diamond Caratage: ${p.diamondCaratage || 'Not specified'}
Diamond Clarity: ${p.diamondClarity || 'Not specified'}
Diamond Colour: ${p.diamondColour || 'Not specified'}
Collection: ${p.collection || 'General'}
Product Details: ${p.productDetails || 'Classic Zoya design'}
Stock Status: ${p.stockStatus}
Product ID: ${p.pid}`;
    })
    .join('\n\n---\n\n');
}

/* ------------------------------------------------------------------ */
/*  Store list block                                                   */
/* ------------------------------------------------------------------ */

export function formatStoreContext(stores: Store[]): string {
  return stores
    .map(
      (s) => `Store: ${s.storeName}
Type: ${s.storeType}
Address: ${s.address}, ${s.city}, ${s.state}${s.pincode ? ' - ' + s.pincode : ''}
${s.phone ? `Phone: ${s.phone}` : ''}
${s.email ? `Email: ${s.email}` : ''}
Country: ${s.country}`
    )
    .join('\n\n---\n\n');
}

/* ------------------------------------------------------------------ */
/*  Product-availability block (products + their store stock)          */
/* ------------------------------------------------------------------ */

export function formatAvailabilityContext(
  productAvailability: ProductAvailabilityEntry[]
): string {
  return productAvailability
    .map((pa) => {
      let imageUrl: string | null = null;
      const imageSource = pa.product.productThumbnails || pa.product.productImages;
      if (imageSource) {
        try {
          const images = JSON.parse(imageSource);
          if (Array.isArray(images) && images.length > 0) {
            imageUrl = images[0];
          }
        } catch {
          imageUrl = imageSource;
        }
      }

      const storeList = pa.stores
        .map(
          (s) =>
            `  - ${s.store.storeName}, ${s.store.address}, ${s.store.city} (${s.quantity} in stock)`
        )
        .join('\n');

      return `Product: ${pa.product.name}
Price: ${pa.product.currency} ${pa.product.price.toLocaleString()}
Product Link: ${pa.product.link}
${imageUrl ? `Product Image: ${imageUrl}` : ''}
Category: ${pa.product.category}
Available at these stores:
${storeList}`;
    })
    .join('\n\n---\n\n');
}

/* ------------------------------------------------------------------ */
/*  Pick the right context section for the system prompt               */
/* ------------------------------------------------------------------ */

export function buildContextSection(
  availabilityContext: string,
  storeContext: string,
  productContext: string,
  meta: {
    productAvailabilityCount: number;
    storeCount: number;
    productCount: number;
    requestedCity?: string | null;
    isNearbyFallback?: boolean;
  }
): string {
  if (availabilityContext) {
    console.log(`[AI Suggestions] Using product availability context (${meta.productAvailabilityCount} products)`);
    return `Product Availability Information:\n${availabilityContext}`;
  }
  if (storeContext) {
    console.log(`[AI Suggestions] Using store context (${meta.storeCount} stores):`);
    console.log(storeContext.substring(0, 300) + '...');
    if (meta.isNearbyFallback && meta.requestedCity) {
      return `No Zoya stores found in "${meta.requestedCity}". Here are all Zoya store locations — suggest the nearest ones to ${meta.requestedCity}:\n${storeContext}`;
    }
    return `Available Stores:\n${storeContext}`;
  }
  if (productContext) {
    console.log(`[AI Suggestions] Using product context (${meta.productCount} products)`);
    return `Available Products:\n${productContext}`;
  }
  console.log(`[AI Suggestions] No context found for query`);
  return 'No specific products or stores found for this query.';
}
