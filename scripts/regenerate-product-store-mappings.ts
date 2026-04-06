import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function regenerateProductStoreMappings() {
  try {
    console.log('Starting comprehensive product-store mapping regeneration...');

    // Get all products and stores
    const products = await prisma.product.findMany({
      select: { id: true, name: true, collection: true },
    });

    const stores = await prisma.store.findMany({
      select: { id: true, storeName: true },
    });

    console.log(`Found ${products.length} products and ${stores.length} stores`);

    // Delete existing mappings
    console.log('Deleting existing product-store mappings...');
    await prisma.productStore.deleteMany({});
    console.log('✓ Deleted all existing mappings');

    // Create mappings for EVERY product at EVERY store
    console.log('Creating new mappings - every product at every store...');

    const mappings = [];
    for (const product of products) {
      for (const store of stores) {
        // Random quantity between 3-15 (good stock)
        const quantity = Math.floor(Math.random() * 13) + 3;

        mappings.push({
          productId: product.id,
          storeId: store.id,
          quantity,
        });
      }
    }

    console.log(`Creating ${mappings.length} product-store mappings...`);

    // Insert in batches of 500 for better performance
    const batchSize = 500;
    let created = 0;

    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);
      await prisma.productStore.createMany({
        data: batch,
        skipDuplicates: true,
      });
      created += batch.length;
      console.log(`Progress: ${created}/${mappings.length} mappings created`);
    }

    console.log(`\n✓ Successfully created ${mappings.length} product-store mappings`);
    console.log(`✓ Every product is now available at every store with quantities 3-15`);

    // Summary
    console.log('\nSummary:');
    console.log(`- Products: ${products.length}`);
    console.log(`- Stores: ${stores.length}`);
    console.log(`- Total mappings: ${mappings.length}`);
    console.log(`- Average per product: ${(mappings.length / products.length).toFixed(1)} stores`);
    console.log(`- Average per store: ${(mappings.length / stores.length).toFixed(1)} products`);
  } catch (error) {
    console.error('Error regenerating product-store mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

regenerateProductStoreMappings();
