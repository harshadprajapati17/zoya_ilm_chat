import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

const prisma = new PrismaClient();

interface ProductRow {
  id: string;
  pid: string;
  name: string;
  price: string;
  currency: string;
  category: string;
  material: string;
  stock_status: string;
  link: string;
  purity: string;
  gem_stone_1: string;
  gem_stone_2: string;
  collection: string;
  product_details: string;
  metal_colour: string;
  diamond_caratage: string;
  diamond_clarity: string;
  diamond_colour: string;
  embedding: string;
}

async function importProducts(csvFilePath: string) {
  console.log('Starting product import from:', csvFilePath);

  if (!fs.existsSync(csvFilePath)) {
    console.error('CSV file not found:', csvFilePath);
    process.exit(1);
  }

  const products: any[] = [];
  let count = 0;

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (row: ProductRow) => {
        count++;

        // Parse the embedding if it exists
        let embedding = null;
        if (row.embedding && row.embedding.trim() !== '') {
          try {
            // The embedding is stored as a string representation of an array
            embedding = JSON.parse(row.embedding);
          } catch (e) {
            console.warn(`Failed to parse embedding for product ${row.pid}`);
          }
        }

        const product = {
          pid: row.pid,
          name: row.name,
          price: parseFloat(row.price) || 0,
          currency: row.currency || 'INR',
          category: row.category,
          material: row.material || null,
          stockStatus: row.stock_status,
          link: row.link,
          purity: row.purity || null,
          gemStone1: row.gem_stone_1 || null,
          gemStone2: row.gem_stone_2 || null,
          collection: row.collection || null,
          productDetails: row.product_details || null,
          metalColour: row.metal_colour || null,
          diamondCaratage: row.diamond_caratage || null,
          diamondClarity: row.diamond_clarity || null,
          diamondColour: row.diamond_colour || null,
          // Note: Embedding will be stored as raw data
          // In production, you'd convert this to proper vector format
        };

        products.push(product);

        // Batch insert every 100 products
        if (products.length >= 100) {
          insertBatch(products.splice(0, 100));
        }

        if (count % 1000 === 0) {
          console.log(`Processed ${count} products...`);
        }
      })
      .on('end', async () => {
        // Insert remaining products
        if (products.length > 0) {
          await insertBatch(products);
        }
        console.log(`\nImport completed! Total products processed: ${count}`);
        resolve();
      })
      .on('error', (error: unknown) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

async function insertBatch(products: any[]) {
  try {
    await prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });
    console.log(`Inserted batch of ${products.length} products`);
  } catch (error) {
    console.error('Error inserting batch:', error);
  }
}

// Main execution
const csvPath = process.argv[2] || '/Users/sangeetha/Downloads/products_rows.csv';

importProducts(csvPath)
  .then(async () => {
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Import failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
