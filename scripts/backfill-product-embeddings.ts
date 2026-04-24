import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { buildProductEmbeddingText } from '../lib/services/productSearch';
import { generateEmbedding } from '../lib/services/llm';

const BATCH_SIZE = Number(process.env.PRODUCT_EMBEDDING_BATCH_SIZE || 50);
const START_OFFSET = Number(process.env.PRODUCT_EMBEDDING_START_OFFSET || 0);
const MAX_ROWS = Number(process.env.PRODUCT_EMBEDDING_MAX_ROWS || 0);

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

async function updateProductEmbedding(productId: string, embedding: number[]) {
  const vectorLiteral = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `UPDATE "Product" SET "embedding" = $1::vector WHERE "id" = $2`,
    vectorLiteral,
    productId
  );
}

async function runBackfill() {
  let offset = START_OFFSET;
  let processed = 0;
  let updated = 0;

  console.log('[Vector Backfill] Starting...');
  console.log(
    `[Vector Backfill] batch=${BATCH_SIZE} startOffset=${START_OFFSET} maxRows=${MAX_ROWS || 'all'}`
  );

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (MAX_ROWS > 0 && processed >= MAX_ROWS) break;

    const take = MAX_ROWS > 0 ? Math.min(BATCH_SIZE, MAX_ROWS - processed) : BATCH_SIZE;
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'asc' },
      skip: offset,
      take,
      select: {
        id: true,
        name: true,
        category: true,
        material: true,
        collection: true,
        productDetails: true,
        purity: true,
        gemStone1: true,
        gemStone2: true,
        metalColour: true,
        diamondCaratage: true,
        diamondClarity: true,
        diamondColour: true,
      },
    });

    if (products.length === 0) break;

    for (const product of products) {
      try {
        const text = buildProductEmbeddingText(product);
        const embedding = await generateEmbedding(text);
        await updateProductEmbedding(product.id, embedding);
        updated += 1;
      } catch (error) {
        console.error(`[Vector Backfill] Failed for product ${product.id}:`, error);
      } finally {
        processed += 1;
      }
    }

    offset += products.length;
    console.log(`[Vector Backfill] processed=${processed} updated=${updated} offset=${offset}`);
  }

  console.log(`[Vector Backfill] Done. processed=${processed} updated=${updated}`);
}

runBackfill()
  .catch((error) => {
    console.error('[Vector Backfill] Fatal error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
