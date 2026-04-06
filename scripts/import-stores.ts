import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importStores() {
  try {
    console.log('Reading SQL backup file...');
    const sqlContent = fs.readFileSync(
      '/Users/sangeetha/Downloads/zoya_stores_rows.sql',
      'utf-8'
    );

    // Parse INSERT statement
    const insertMatch = sqlContent.match(/INSERT INTO "public"."zoya_stores" \((.*?)\) VALUES/);
    if (!insertMatch) {
      throw new Error('Could not parse column names from SQL');
    }

    const columnNames = insertMatch[1]
      .split(',')
      .map((col) => col.trim().replace(/"/g, ''));

    console.log('Column names:', columnNames);

    // Find the indices for the columns we need
    const storeNameIndex = columnNames.indexOf('store_name');
    const storeTypeIndex = columnNames.indexOf('store_type');
    const addressIndex = columnNames.indexOf('address');
    const emailIndex = columnNames.indexOf('email');
    const phoneIndex = columnNames.indexOf('phone');
    const cityIndex = columnNames.indexOf('city');
    const stateIndex = columnNames.indexOf('state');
    const pincodeIndex = columnNames.indexOf('pincode');
    const latitudeIndex = columnNames.indexOf('latitude');
    const longitudeIndex = columnNames.indexOf('longitude');
    const countryIndex = columnNames.indexOf('country');

    console.log('Column indices:', {
      storeNameIndex,
      storeTypeIndex,
      addressIndex,
      emailIndex,
      phoneIndex,
      cityIndex,
      stateIndex,
      pincodeIndex,
      latitudeIndex,
      longitudeIndex,
      countryIndex,
    });

    // Extract all VALUES entries
    const valuesMatch = sqlContent.match(/VALUES\s+(.+)/s);
    if (!valuesMatch) {
      throw new Error('Could not parse VALUES from SQL');
    }

    // Split by '), (' to get individual records
    const valuesString = valuesMatch[1].trim();
    const records = valuesString.split(/\),\s*\(/);

    console.log(`Found ${records.length} store records`);

    let importedCount = 0;

    for (let i = 0; i < records.length; i++) {
      // Clean up the record string
      let record = records[i];
      record = record.replace(/^\(/, '').replace(/\);?\s*$/, '');

      // Parse CSV-like values handling quoted strings
      const values: string[] = [];
      let current = '';
      let inQuote = false;
      let quoteChar = '';

      for (let j = 0; j < record.length; j++) {
        const char = record[j];

        if (!inQuote) {
          if (char === "'" || char === '"') {
            inQuote = true;
            quoteChar = char;
            current += char;
          } else if (char === ',') {
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

      if (values.length <= Math.max(
        storeNameIndex,
        storeTypeIndex,
        addressIndex,
        cityIndex,
        stateIndex
      )) {
        console.log(`Skipping record ${i + 1}: insufficient columns`);
        continue;
      }

      // Extract store data
      const storeName = values[storeNameIndex]?.replace(/^'|'$/g, '') || '';
      const storeType = values[storeTypeIndex]?.replace(/^'|'$/g, '') || '';
      const address = values[addressIndex]?.replace(/^'|'$/g, '') || '';
      const email = values[emailIndex]?.replace(/^'|'$/g, '') || null;
      const phone = values[phoneIndex]?.replace(/^'|'$/g, '') || null;
      const city = values[cityIndex]?.replace(/^'|'$/g, '') || '';
      const state = values[stateIndex]?.replace(/^'|'$/g, '') || '';
      const pincode = values[pincodeIndex]?.replace(/^'|'$/g, '') || null;
      const latitude = values[latitudeIndex]?.replace(/^'|'$/g, '') || null;
      const longitude = values[longitudeIndex]?.replace(/^'|'$/g, '') || null;
      const country = values[countryIndex]?.replace(/^'|'$/g, '') || 'India';

      if (!storeName || !city) {
        console.log(`Skipping record ${i + 1}: missing required fields`);
        continue;
      }

      try {
        // Create the store
        await prisma.store.create({
          data: {
            storeName,
            storeType,
            address,
            email,
            phone,
            city,
            state,
            pincode,
            latitude,
            longitude,
            country,
          },
        });

        importedCount++;
        console.log(`✓ Imported ${storeName} (${i + 1}/${records.length})`);
      } catch (error) {
        console.error(`Error importing ${storeName}:`, error);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total records: ${records.length}`);
    console.log(`Imported: ${importedCount}`);
    console.log(`Failed: ${records.length - importedCount}`);
  } catch (error) {
    console.error('Error importing stores:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importStores();
