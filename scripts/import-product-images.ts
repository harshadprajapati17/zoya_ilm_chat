import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importProductImages() {
  try {
    console.log('Reading SQL backup file...');
    const sqlContent = fs.readFileSync(
      '/Users/sangeetha/Downloads/products_rows (2).sql',
      'utf-8'
    );

    // Parse INSERT statement
    const insertMatch = sqlContent.match(/INSERT INTO "public"."products" \((.*?)\) VALUES/);
    if (!insertMatch) {
      throw new Error('Could not parse column names from SQL');
    }

    const columnNames = insertMatch[1]
      .split(',')
      .map((col) => col.trim().replace(/"/g, ''));

    console.log('Column names:', columnNames);

    // Find the indices for the columns we need
    const pidIndex = columnNames.indexOf('pid');
    const thumbnailsIndex = columnNames.indexOf('product_thumbnails');
    const imagesIndex = columnNames.indexOf('product_images');

    if (pidIndex === -1 || thumbnailsIndex === -1 || imagesIndex === -1) {
      throw new Error('Could not find required columns in SQL');
    }

    console.log('Column indices - pid:', pidIndex, 'thumbnails:', thumbnailsIndex, 'images:', imagesIndex);

    // Extract all VALUES entries
    const valuesMatch = sqlContent.match(/VALUES\s+(.+)/s);
    if (!valuesMatch) {
      throw new Error('Could not parse VALUES from SQL');
    }

    // Split by '), (' to get individual records
    const valuesString = valuesMatch[1].trim();
    const records = valuesString.split(/\),\s*\(/);

    console.log(`Found ${records.length} product records`);

    let updatedCount = 0;
    let notFoundCount = 0;

    for (let i = 0; i < records.length; i++) {
      // Clean up the record string
      let record = records[i];
      record = record.replace(/^\(/, '').replace(/\);?\s*$/, '');

      // Parse CSV-like values handling quoted strings
      const values: string[] = [];
      let current = '';
      let inQuote = false;
      let quoteChar = '';
      let bracketDepth = 0;

      for (let j = 0; j < record.length; j++) {
        const char = record[j];

        if (!inQuote) {
          if (char === "'" || char === '"') {
            inQuote = true;
            quoteChar = char;
            current += char;
          } else if (char === '[') {
            bracketDepth++;
            current += char;
          } else if (char === ']') {
            bracketDepth--;
            current += char;
          } else if (char === ',' && bracketDepth === 0) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        } else {
          current += char;
          if (char === quoteChar && (j === 0 || record[j - 1] !== '\\')) {
            inQuote = false;
          }
        }
      }

      // Add the last value
      if (current) {
        values.push(current.trim());
      }

      if (values.length <= Math.max(pidIndex, thumbnailsIndex, imagesIndex)) {
        console.log(`Skipping record ${i + 1}: insufficient columns`);
        continue;
      }

      // Extract PID and image data
      const pid = values[pidIndex]?.replace(/^'|'$/g, '') || '';
      const thumbnails = values[thumbnailsIndex]?.replace(/^'|'$/g, '') || null;
      const images = values[imagesIndex]?.replace(/^'|'$/g, '') || null;

      if (!pid) {
        console.log(`Skipping record ${i + 1}: no PID`);
        continue;
      }

      try {
        // Update the product in database
        const result = await prisma.product.updateMany({
          where: { pid },
          data: {
            productThumbnails: thumbnails === 'null' ? null : thumbnails,
            productImages: images === 'null' ? null : images,
          },
        });

        if (result.count > 0) {
          updatedCount++;
          console.log(`✓ Updated ${pid} (${i + 1}/${records.length})`);
        } else {
          notFoundCount++;
          console.log(`✗ Product not found: ${pid} (${i + 1}/${records.length})`);
        }
      } catch (error) {
        console.error(`Error updating ${pid}:`, error);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total records: ${records.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not found: ${notFoundCount}`);
    console.log(`Skipped: ${records.length - updatedCount - notFoundCount}`);
  } catch (error) {
    console.error('Error importing product images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importProductImages();
