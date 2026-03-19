import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateStockStatus() {
  try {
    console.log('Updating all products to "In Stock"...');

    const result = await prisma.product.updateMany({
      data: {
        stockStatus: 'In Stock',
      },
    });

    console.log(`✓ Updated ${result.count} products to "In Stock"`);
  } catch (error) {
    console.error('Error updating stock status:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateStockStatus();
