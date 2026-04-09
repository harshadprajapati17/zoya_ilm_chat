import { prisma } from '@/lib/prisma';

export interface Store {
  id: string;
  storeName: string;
  storeType: string;
  address: string;
  email: string | null;
  phone: string | null;
  city: string;
  state: string;
  pincode: string | null;
  latitude: string | null;
  longitude: string | null;
  country: string;
}

export interface ProductAvailability {
  product: {
    id: string;
    pid: string;
    name: string;
    price: number;
    currency: string;
    category: string;
    link: string;
    productThumbnails: string | null;
    productImages: string | null;
  };
  stores: Array<{
    store: Store;
    quantity: number;
  }>;
}

export async function searchStores(
  query: string,
  limit: number = 10
): Promise<Store[]> {
  const lowerQuery = query.toLowerCase();

  // Extract location keywords
  const cityMatch = lowerQuery.match(/(?:in|at|near)\s+([a-z\s]+?)(?:\s|$|,)/i);
  const city = cityMatch ? cityMatch[1].trim() : null;

  const whereConditions: any = {};

  if (city) {
    whereConditions.OR = [
      { city: { contains: city, mode: 'insensitive' } },
      { state: { contains: city, mode: 'insensitive' } },
      { address: { contains: city, mode: 'insensitive' } },
    ];
  } else {
    // If no specific city, search in store name, city, or address
    whereConditions.OR = [
      { storeName: { contains: lowerQuery.split(' ')[0], mode: 'insensitive' } },
      { city: { contains: lowerQuery.split(' ')[0], mode: 'insensitive' } },
      { address: { contains: lowerQuery.split(' ')[0], mode: 'insensitive' } },
    ];
  }

  const stores = await prisma.store.findMany({
    where: whereConditions,
    take: limit,
    orderBy: { city: 'asc' },
  });

  return stores;
}

export async function getProductAvailability(
  productCategory: string,
  city?: string,
  limit: number = 5
): Promise<ProductAvailability[]> {
  // First find products matching the category
  const products = await prisma.product.findMany({
    where: {
      category: { contains: productCategory, mode: 'insensitive' },
    },
    take: limit,
    select: {
      id: true,
      pid: true,
      name: true,
      price: true,
      currency: true,
      category: true,
      link: true,
      productThumbnails: true,
      productImages: true,
    },
  });

  // For each product, get stores where it's available
  const availabilities: ProductAvailability[] = [];

  for (const product of products) {
    const storeAvailability = await prisma.productStore.findMany({
      where: {
        productId: product.id,
        quantity: { gt: 0 },
        ...(city && {
          store: {
            OR: [
              { city: { contains: city, mode: 'insensitive' } },
              { state: { contains: city, mode: 'insensitive' } },
            ],
          },
        }),
      },
      include: {
        store: true,
      },
      take: 10,
    });

    if (storeAvailability.length > 0) {
      availabilities.push({
        product,
        stores: storeAvailability.map((sa) => ({
          store: sa.store,
          quantity: sa.quantity,
        })),
      });
    }
  }

  return availabilities;
}

export async function getStoresByCity(city: string): Promise<Store[]> {
  return await prisma.store.findMany({
    where: {
      OR: [
        { city: { contains: city, mode: 'insensitive' } },
        { state: { contains: city, mode: 'insensitive' } },
      ],
    },
    orderBy: { storeName: 'asc' },
  });
}
