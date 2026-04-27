import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { generateEmbedding } from './llm';

/** Devanagari script (Hindi, Marathi, etc.) — catalog fields are English so we augment the query. */
const HAS_DEVANAGARI = /\p{Script=Devanagari}/u;
const VECTOR_SEARCH_ENABLED =
  process.env.PRODUCT_VECTOR_SEARCH_ENABLED === '1' ||
  process.env.PRODUCT_VECTOR_SEARCH_ENABLED === 'true';
const VECTOR_OVERFETCH_MULTIPLIER = Math.max(
  2,
  Number(process.env.PRODUCT_VECTOR_OVERFETCH_MULTIPLIER || 3)
);
const VECTOR_MIN_SIMILARITY = Number(process.env.PRODUCT_VECTOR_MIN_SIMILARITY || 0.18);

const PRODUCT_SELECT = {
  id: true,
  pid: true,
  name: true,
  price: true,
  currency: true,
  category: true,
  material: true,
  stockStatus: true,
  link: true,
  purity: true,
  gemStone1: true,
  gemStone2: true,
  collection: true,
  productDetails: true,
  metalColour: true,
  diamondCaratage: true,
  diamondClarity: true,
  diamondColour: true,
  productThumbnails: true,
  productImages: true,
};

export interface Product {
  id: string;
  pid: string;
  name: string;
  price: number;
  currency: string;
  category: string;
  material: string | null;
  stockStatus: string;
  link: string;
  purity: string | null;
  gemStone1: string | null;
  gemStone2: string | null;
  collection: string | null;
  productDetails: string | null;
  metalColour: string | null;
  diamondCaratage: string | null;
  diamondClarity: string | null;
  diamondColour: string | null;
  productThumbnails: string | null;
  productImages: string | null;
}

interface VectorHit {
  id: string;
  similarity: number;
}

interface VectorDimensionRow {
  dims: number | null;
}

let cachedEmbeddingDimension: number | null = null;

/**
 * Append English jewelry keywords when the query is Hindi/Hinglish so `ILIKE` / `contains`
 * matches English `Product` rows. Safe when the message is already English (no-op).
 */
export function augmentQueryForEnglishCatalog(query: string): string {
  const q = query.normalize('NFC');
  const extras = new Set<string>();

  const addIf = (cond: boolean, term: string) => {
    if (cond) extras.add(term);
  };

  addIf(
    /चूड़|चुड़|चूड|कंगन|कङ्गन|कड़ा|कडा|चूड़ी|चूडी|चुडी|चूड़ियाँ|चूडियाँ|चूडियां/i.test(q) ||
      /\bbangle(s)?\b/i.test(q),
    'bangle'
  );
  addIf(/सोने|सोना|गोल्ड|\bgold\b/i.test(q), 'gold');
  addIf(/अंगूठी|अंगूठ|\bring(s)?\b/i.test(q), 'ring');
  addIf(/हार|नेकलेस|\bnecklace(s)?\b/i.test(q), 'necklace');
  addIf(/बाली|ईयर|\bearring(s)?\b/i.test(q), 'earring');
  addIf(/पेंडेंट|\bpendant(s)?\b/i.test(q), 'pendant');
  addIf(/चेन|\bchain(s)?\b/i.test(q), 'chain');
  addIf(/कंगन|\bbracelet(s)?\b/i.test(q), 'bracelet');

  if (HAS_DEVANAGARI.test(q) && extras.size === 0) {
    extras.add('jewelry');
  }

  if (extras.size === 0) return query;
  return `${query} ${[...extras].join(' ')}`.trim();
}

export function buildProductEmbeddingText(product: {
  name: string;
  category: string;
  material: string | null;
  collection: string | null;
  productDetails: string | null;
  purity: string | null;
  gemStone1: string | null;
  gemStone2: string | null;
  metalColour: string | null;
  diamondCaratage: string | null;
  diamondClarity: string | null;
  diamondColour: string | null;
}): string {
  return [
    product.name,
    `Category: ${product.category}`,
    product.material ? `Material: ${product.material}` : null,
    product.collection ? `Collection: ${product.collection}` : null,
    product.purity ? `Purity: ${product.purity}` : null,
    product.gemStone1 ? `Gemstone: ${product.gemStone1}` : null,
    product.gemStone2 ? `Gemstone 2: ${product.gemStone2}` : null,
    product.metalColour ? `Metal Colour: ${product.metalColour}` : null,
    product.diamondCaratage ? `Diamond Caratage: ${product.diamondCaratage}` : null,
    product.diamondClarity ? `Diamond Clarity: ${product.diamondClarity}` : null,
    product.diamondColour ? `Diamond Colour: ${product.diamondColour}` : null,
    product.productDetails ? `Details: ${product.productDetails}` : null,
  ]
    .filter(Boolean)
    .join('. ');
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

export interface ProductSearchOptions {
  maxPrice?: number;
  minPrice?: number;
}

async function searchProductsByVector(
  query: string,
  limit: number,
  options: ProductSearchOptions = {}
): Promise<Product[]> {
  if (!VECTOR_SEARCH_ENABLED) return [];

  try {
    const augmented = augmentQueryForEnglishCatalog(query);
    if (!cachedEmbeddingDimension) {
      const rows = (await prisma.$queryRaw`
        SELECT vector_dims("embedding")::int AS "dims"
        FROM "Product"
        WHERE "embedding" IS NOT NULL
        LIMIT 1
      `) as VectorDimensionRow[];
      const detected = rows[0]?.dims ?? null;
      cachedEmbeddingDimension = detected && detected > 0 ? detected : null;
    }

    const queryEmbedding = await generateEmbedding(augmented, {
      dimensions: cachedEmbeddingDimension ?? undefined,
    });
    const vectorLiteral = toVectorLiteral(queryEmbedding);
    // Fetch more candidates when filtering by price to ensure we have enough results
    const priceFilterActive = options.maxPrice || options.minPrice;
    const overfetchMultiplier = priceFilterActive ? VECTOR_OVERFETCH_MULTIPLIER * 3 : VECTOR_OVERFETCH_MULTIPLIER;
    const hitLimit = Math.max(limit * overfetchMultiplier, limit);

    const hits = (await prisma.$queryRaw`
      SELECT
        "id"::text AS "id",
        1 - ("embedding" <=> ${vectorLiteral}::vector) AS "similarity"
      FROM "Product"
      WHERE "embedding" IS NOT NULL
      ORDER BY "embedding" <=> ${vectorLiteral}::vector
      LIMIT ${hitLimit}
    `) as VectorHit[];

    const filtered = hits.filter((h) => h.similarity >= VECTOR_MIN_SIMILARITY);
    if (filtered.length === 0) {
      console.log(`[Product Search][Vector] no hits above threshold (${VECTOR_MIN_SIMILARITY})`);
      return [];
    }

    const ids = filtered.map((h) => h.id);
    
    // Build where clause with price filters
    const whereClause: Prisma.ProductWhereInput = { id: { in: ids } };
    const priceFilter: Prisma.FloatFilter = {};
    if (options.maxPrice) {
      priceFilter.lte = options.maxPrice;
    }
    if (options.minPrice) {
      priceFilter.gte = options.minPrice;
    }
    if (Object.keys(priceFilter).length > 0) {
      whereClause.price = priceFilter;
    }

    const products = (await prisma.product.findMany({
      where: whereClause,
      select: PRODUCT_SELECT,
    })) as Product[];
    
    const byId = new Map(products.map((p) => [p.id, p]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, limit);

    console.log(
      `[Product Search][Vector] query="${query}"${
        augmented !== query ? ` (augmented: "${augmented}")` : ''
      }${cachedEmbeddingDimension ? ` embeddingDims=${cachedEmbeddingDimension}` : ''}${
        options.maxPrice ? ` maxPrice=${options.maxPrice}` : ''}${
        options.minPrice ? ` minPrice=${options.minPrice}` : ''
      } hits=${hits.length} filtered=${filtered.length} priceFiltered=${products.length} returned=${ordered.length}`
    );
    return ordered;
  } catch (error) {
    console.error(
      '[Product Search][Vector] failed (check pgvector extension, Product.embedding column, and API keys):',
      error
    );
    return [];
  }
}

export async function searchProducts(
  query: string,
  limit: number = 5,
  options: ProductSearchOptions = {}
): Promise<Product[]> {
  try {
    if (!VECTOR_SEARCH_ENABLED) {
      console.warn(
        '[Product Search] PRODUCT_VECTOR_SEARCH_ENABLED is false; returning empty results because keyword fallback is disabled.'
      );
      return [];
    }
    return await searchProductsByVector(query, limit, options);
  } catch (error) {
    console.error('Product search error:', error);
    return [];
  }
}

export async function getProductsByCategory(category: string, limit: number = 10): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      category: {
        contains: category,
        mode: 'insensitive',
      },
    },
    take: limit,
    orderBy: { price: 'asc' },
    select: PRODUCT_SELECT,
  });

  return products;
}
