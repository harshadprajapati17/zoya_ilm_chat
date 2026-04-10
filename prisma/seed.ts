import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create lead manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@zoya.com' },
    update: {},
    create: {
      id: 'manager-123',
      name: 'Support Manager',
      email: 'manager@zoya.com',
      role: 'LEAD_MANAGER',
      language: 'en',
    },
  });

  console.log('Created manager:', manager);

  // Create test customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      id: 'customer-123',
      name: 'Test Customer',
      email: 'customer@example.com',
      role: 'CUSTOMER',
      language: 'hi',
    },
  });

  console.log('Created customer:', customer);

  // Create some sample products
  const product1 = await prisma.product.upsert({
    where: { pid: 'sample-ring-001' },
    update: {},
    create: {
      pid: 'sample-ring-001',
      name: 'Diamond Elegance Ring',
      price: 85000,
      currency: 'INR',
      category: 'Rings',
      material: 'Gold',
      stockStatus: 'in stock',
      link: 'https://www.zoya.in/product/sample-ring-001',
      purity: '18K',
      diamondCaratage: '0.50',
      diamondClarity: 'VS',
      diamondColour: 'F',
      productDetails: 'Beautiful 18K gold ring with VS quality diamonds',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { pid: 'sample-necklace-001' },
    update: {},
    create: {
      pid: 'sample-necklace-001',
      name: 'Golden Heritage Necklace',
      price: 125000,
      currency: 'INR',
      category: 'Necklaces',
      material: 'Gold',
      stockStatus: 'in stock',
      link: 'https://www.zoya.in/product/sample-necklace-001',
      purity: '22K',
      productDetails: 'Exquisite 22K gold necklace with traditional design',
      metalColour: 'Yellow Gold',
    },
  });

  const product3 = await prisma.product.upsert({
    where: { pid: 'sample-earrings-001' },
    update: {},
    create: {
      pid: 'sample-earrings-001',
      name: 'Ruby Blossom Earrings',
      price: 55000,
      currency: 'INR',
      category: 'Earrings',
      material: 'Gold',
      stockStatus: 'in stock',
      link: 'https://www.zoya.in/product/sample-earrings-001',
      purity: '18K',
      gemStone1: 'Ruby',
      productDetails: 'Stunning 18K gold earrings with natural rubies',
      metalColour: 'Rose Gold',
    },
  });

  console.log('Created products:', product1, product2, product3);
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
