import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateProductStoreMappings() {
  try {
    console.log('Fetching all products and stores...');

    const products = await prisma.product.findMany({
      select: { id: true, name: true, pid: true },
    });

    const stores = await prisma.store.findMany({
      select: { id: true, storeName: true, city: true },
    });

    console.log(`Found ${products.length} products and ${stores.length} stores`);

    if (products.length === 0 || stores.length === 0) {
      console.log('No products or stores found. Exiting.');
      return;
    }

    let mappingsCreated = 0;
    let skippedCount = 0;

    // Strategy: Each product will be available in a random subset of stores (30-70%)
    for (const product of products) {
      // Randomly determine how many stores this product should be in
      const minStores = Math.floor(stores.length * 0.3); // At least 30% of stores
      const maxStores = Math.floor(stores.length * 0.7); // At most 70% of stores
      const numStores = Math.floor(Math.random() * (maxStores - minStores + 1)) + minStores;

      // Randomly select stores for this product
      const shuffledStores = [...stores].sort(() => Math.random() - 0.5);
      const selectedStores = shuffledStores.slice(0, numStores);

      for (const store of selectedStores) {
        try {
          // Random quantity between 1 and 10
          const quantity = Math.floor(Math.random() * 10) + 1;

          await prisma.productStore.create({
            data: {
              productId: product.id,
              storeId: store.id,
              quantity,
            },
          });

          mappingsCreated++;

          if (mappingsCreated % 50 === 0) {
            console.log(`Created ${mappingsCreated} mappings...`);
          }
        } catch (error: any) {
          // Skip if mapping already exists (unique constraint)
          if (error.code === 'P2002') {
            skippedCount++;
          } else {
            console.error(`Error creating mapping for ${product.name} at ${store.storeName}:`, error);
          }
        }
      }
    }

    console.log('\n=== Mapping Generation Summary ===');
    console.log(`Total products: ${products.length}`);
    console.log(`Total stores: ${stores.length}`);
    console.log(`Mappings created: ${mappingsCreated}`);
    console.log(`Skipped (already exist): ${skippedCount}`);
    console.log(`Average products per store: ${(mappingsCreated / stores.length).toFixed(1)}`);
    console.log(`Average stores per product: ${(mappingsCreated / products.length).toFixed(1)}`);

    // Show some sample mappings
    console.log('\n=== Sample Mappings ===');
    const sampleMappings = await prisma.productStore.findMany({
      take: 10,
      include: {
        product: {
          select: { name: true, pid: true },
        },
        store: {
          select: { storeName: true, city: true },
        },
      },
    });

    sampleMappings.forEach((mapping) => {
      console.log(
        `  ${mapping.product.name} (${mapping.product.pid}) -> ${mapping.store.storeName}, ${mapping.store.city} (Qty: ${mapping.quantity})`
      );
    });
  } catch (error) {
    console.error('Error generating product-store mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

generateProductStoreMappings();
