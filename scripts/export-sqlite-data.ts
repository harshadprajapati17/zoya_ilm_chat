import { prisma } from '../lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function exportData() {
  try {
    console.log('Exporting data from SQLite...');

    // Export Products
    console.log('Exporting products...');
    const products = await prisma.product.findMany();
    console.log(`Found ${products.length} products`);

    // Export Users
    console.log('Exporting users...');
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);

    // Export Conversations
    console.log('Exporting conversations...');
    const conversations = await prisma.conversation.findMany();
    console.log(`Found ${conversations.length} conversations`);

    // Export Messages
    console.log('Exporting messages...');
    const messages = await prisma.message.findMany();
    console.log(`Found ${messages.length} messages`);

    // Export SuggestedReplies
    console.log('Exporting suggested replies...');
    const suggestedReplies = await prisma.suggestedReply.findMany();
    console.log(`Found ${suggestedReplies.length} suggested replies`);

    // Save to JSON file
    const exportData = {
      products,
      users,
      conversations,
      messages,
      suggestedReplies,
    };

    const exportPath = path.join(__dirname, '..', 'sqlite-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ Data exported successfully to ${exportPath}`);
    console.log(`\nSummary:`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Users: ${users.length}`);
    console.log(`- Conversations: ${conversations.length}`);
    console.log(`- Messages: ${messages.length}`);
    console.log(`- Suggested Replies: ${suggestedReplies.length}`);

  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
