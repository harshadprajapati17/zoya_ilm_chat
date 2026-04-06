import 'dotenv/config';
import { prisma } from '../lib/prisma';
import fs from 'fs';
import csv from 'csv-parser';

interface CSVRow {
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
  created_at: string;
  updated_at: string;
}

async function importProducts() {
  const csvFilePath = '/Users/sangeetha/Downloads/products_rows.csv';
  const products: any[] = [];
  let count = 0;

  console.log('Starting product import from CSV...');

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        products.push({
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
        });

        count++;
        if (count % 100 === 0) {
          console.log(`Parsed ${count} products...`);
        }
      })
      .on('end', async () => {
        console.log(`\nParsed ${count} products from CSV.`);
        console.log('Inserting products into database...');

        try {
          // Delete existing products
          await prisma.product.deleteMany({});
          console.log('Cleared existing products.');

          // Insert products in batches
          const batchSize = 100;
          for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize);
            await prisma.product.createMany({
              data: batch,
            });
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${i + batch.length}/${products.length})`);
          }

          console.log(`\n✅ Successfully imported ${products.length} products!`);
          resolve(true);
        } catch (error) {
          console.error('Error inserting products:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

importProducts()
  .then(() => {
    console.log('\nImport completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
