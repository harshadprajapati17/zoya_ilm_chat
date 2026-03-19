import { prisma } from '@/lib/prisma';

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

export async function searchProducts(
  query: string,
  limit: number = 5
): Promise<Product[]> {
  try {
    // Using case-insensitive keyword search with PostgreSQL
    // Future enhancement: implement full-text search or pgvector for semantic search
    return fallbackKeywordSearch(query, limit);
  } catch (error) {
    console.error('Product search error:', error);
    return [];
  }
}

async function fallbackKeywordSearch(
  query: string,
  limit: number
): Promise<Product[]> {
  const lowerQuery = query.toLowerCase();

  // Extract category keywords
  const categoryKeywords = ['ring', 'necklace', 'bangle', 'bracelet', 'earring', 'pendant', 'chain'];
  const foundCategory = categoryKeywords.find(cat => lowerQuery.includes(cat));

  // Extract price limit (look for numbers)
  const priceMatch = lowerQuery.match(/(\d+)/g);
  const priceLimit = priceMatch ? Math.max(...priceMatch.map(Number)) : null;

  // Build search conditions
  const whereConditions: any = {};
  const orConditions: any[] = [];

  // If category found, search by category
  if (foundCategory) {
    orConditions.push({
      category: { contains: foundCategory, mode: 'insensitive' }
    });
  }

  // Search in name, productDetails, collection
  orConditions.push(
    { name: { contains: foundCategory || query.split(' ')[0], mode: 'insensitive' } },
    { productDetails: { contains: foundCategory || query.split(' ')[0], mode: 'insensitive' } },
    { collection: { contains: foundCategory || query.split(' ')[0], mode: 'insensitive' } }
  );

  whereConditions.OR = orConditions;

  // Add price filter if found
  if (priceLimit) {
    whereConditions.price = { lte: priceLimit };
  }

  const products = await prisma.product.findMany({
    where: whereConditions,
    take: limit,
    orderBy: { price: 'asc' },
    select: {
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
    },
  });

  return products;
}

export async function getProductsByCategory(
  category: string,
  limit: number = 10
): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      category: {
        contains: category,
        mode: 'insensitive',
      },
    },
    take: limit,
    orderBy: { price: 'asc' },
    select: {
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
    },
  });

  return products;
}
