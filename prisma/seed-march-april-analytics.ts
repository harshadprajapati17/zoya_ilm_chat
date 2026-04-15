import { PrismaClient, EditCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Seed March and April 2026 analytics data
// This extends the existing Jan-Feb data to make charts look current

async function main() {
  console.log('🌱 Seeding March and April 2026 analytics data...\n');

  // Get existing suggested replies from March-April timeframe to link feedback to
  const marchAprilMessages = await prisma.message.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-03-01'),
        lte: new Date('2026-04-15'),
      },
      isFromCustomer: true,
    },
    orderBy: { createdAt: 'asc' },
    take: 500, // Get up to 500 messages
  });

  console.log(`📊 Found ${marchAprilMessages.length} customer messages from March-April`);

  if (marchAprilMessages.length === 0) {
    console.log('⚠️  No messages found in March-April. Creating synthetic data...\n');
  }

  // Create suggested replies for messages that don't have them yet
  const messagesNeedingSuggestions = [];
  for (const message of marchAprilMessages) {
    const existingSuggestion = await prisma.suggestedReply.findFirst({
      where: { messageId: message.id },
    });
    if (!existingSuggestion) {
      messagesNeedingSuggestions.push(message);
    }
  }

  console.log(`📝 Creating ${messagesNeedingSuggestions.length} suggested replies...\n`);

  const suggestedReplies = [];
  for (const message of messagesNeedingSuggestions) {
    const suggestion = await prisma.suggestedReply.create({
      data: {
        messageId: message.id,
        content: generateRealisticSuggestion(message.content),
        confidence: 0.7 + Math.random() * 0.25, // 0.7-0.95
        productIds: '[]',
        wasUsed: Math.random() > 0.3, // 70% used
      },
    });
    suggestedReplies.push(suggestion);
  }

  // Get all suggested replies from March-April
  const allMarchAprilSuggestions = await prisma.suggestedReply.findMany({
    where: {
      createdAt: {
        gte: new Date('2026-03-01'),
        lte: new Date('2026-04-15'),
      },
    },
    include: {
      message: true,
    },
  });

  console.log(`📊 Found ${allMarchAprilSuggestions.length} total suggestions in March-April`);

  // Only create feedback for suggestions that were edited (about 30% in March, 20% in April - showing improvement)
  const feedbackToCreate = allMarchAprilSuggestions.filter((suggestion) => {
    const messageDate = new Date(suggestion.createdAt);
    const editRate = messageDate.getMonth() === 2 ? 0.30 : 0.20; // March=2, April=3 (0-indexed)
    return Math.random() < editRate;
  });

  console.log(`📝 Creating ${feedbackToCreate.length} AI edit feedback records...\n`);

  let created = 0;
  for (const suggestion of feedbackToCreate) {
    // Check if feedback already exists
    const existing = await prisma.aIEditFeedback.findUnique({
      where: { suggestedReplyId: suggestion.id },
    });

    if (existing) {
      continue; // Skip if already exists
    }

    const messageDate = new Date(suggestion.createdAt);
    const isApril = messageDate.getMonth() === 3; // April = month 3 (0-indexed)

    // AI is improving over time - better acceptance scores in April
    const baseAcceptance = isApril ? 0.78 : 0.72; // April: 78%, March: 72%
    const acceptanceScore = Math.min(0.95, Math.max(0.50, baseAcceptance + (Math.random() - 0.5) * 0.15));

    // Lower edit percentage in April (AI improving)
    const baseEditPercentage = isApril ? 18 : 25; // April: 18%, March: 25%
    const editPercentage = Math.max(5, Math.min(60, baseEditPercentage + (Math.random() - 0.5) * 15));

    // Category distribution - fewer tone/product issues in April
    const categories: EditCategory[] = isApril
      ? ['MINOR_EDIT', 'MINOR_EDIT', 'TONE_ADJUSTMENT', 'PRODUCT_CORRECTION', 'LENGTH_PROBLEM', 'ACCURACY_ISSUE']
      : ['TONE_ADJUSTMENT', 'PRODUCT_CORRECTION', 'MINOR_EDIT', 'LENGTH_PROBLEM', 'ACCURACY_ISSUE', 'LANGUAGE_QUALITY'];

    const editCategory = categories[Math.floor(Math.random() * categories.length)];

    const originalSuggestion = suggestion.content;
    const editedContent = applyRealisticEdit(originalSuggestion, editCategory, editPercentage);

    try {
      await prisma.aIEditFeedback.create({
        data: {
          suggestedReplyId: suggestion.id,
          originalSuggestion,
          editedContent,
          editedBy: 'manager-' + (1 + Math.floor(Math.random() * 3)), // 3 different managers
          editCategory,
          editPercentage,
          similarityScore: 1 - (editPercentage / 100),
          acceptanceScore,
          toneShift: JSON.stringify({
            from: editCategory === 'TONE_ADJUSTMENT' ? 'formal' : 'neutral',
            to: editCategory === 'TONE_ADJUSTMENT' ? 'warm' : 'neutral',
          }),
          sentimentAnalysis: JSON.stringify({
            original: 'professional',
            edited: editCategory === 'TONE_ADJUSTMENT' ? 'empathetic' : 'professional',
          }),
          productChanges: JSON.stringify({
            added: editCategory === 'PRODUCT_CORRECTION' ? ['Product A'] : [],
            removed: editCategory === 'PRODUCT_CORRECTION' ? ['Product B'] : [],
          }),
          keyChanges: JSON.stringify(generateKeyChanges(editCategory)),
          improvementNeeded: JSON.stringify(generateImprovementAreas(editCategory)),
          conversationContext: JSON.stringify({
            messageCount: 3 + Math.floor(Math.random() * 5),
            customerLanguage: 'en',
          }),
          customerQuery: suggestion.message.content,
          createdAt: messageDate,
        },
      });
      created++;
    } catch (error: any) {
      if (error.code !== 'P2002') { // Ignore unique constraint violations
        console.error('Error creating feedback:', error);
      }
    }
  }

  console.log(`\n✅ Created ${created} new AI edit feedback records for March-April`);
  console.log('✅ Analytics data now extends through April 15, 2026');
}

function generateRealisticSuggestion(customerMessage: string): string {
  const templates = [
    `Thank you for your interest! I'd be happy to help you find the perfect piece. ${customerMessage.includes('ring') ? 'We have beautiful rings in our collection.' : 'Let me show you some options.'} Would you like to see products in a specific price range?`,
    `I appreciate you reaching out! Based on your query, I can suggest some stunning pieces from our Zoya collection. What's your budget for this purchase?`,
    `That's a great question! Our collection includes many options that might interest you. Would you prefer gold or diamond jewelry?`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function applyRealisticEdit(original: string, category: EditCategory, percentage: number): string {
  switch (category) {
    case 'TONE_ADJUSTMENT':
      return original.replace('Thank you', 'Thank you so much')
        .replace('I' + String.fromCharCode(39) + 'd be happy', 'I would be absolutely delighted')
        .replace('Let me', 'I' + String.fromCharCode(39) + 'd love to');

    case 'PRODUCT_CORRECTION':
      return original + ' We have a special solitaire collection that would be perfect for you.';

    case 'LENGTH_PROBLEM':
      return original.split('.')[0] + '. Would you like to see some options?';

    case 'MINOR_EDIT':
      return original.replace('!', '.');

    case 'ACCURACY_ISSUE':
      return original.replace('collection', 'Zoya heritage collection');

    default:
      return original + ' Please let me know if you have any questions.';
  }
}

function generateKeyChanges(category: EditCategory): string[] {
  const changes: Record<EditCategory, string[]> = {
    TONE_ADJUSTMENT: ['Made tone more warm and personal', 'Added empathetic language'],
    PRODUCT_CORRECTION: ['Added specific product recommendation', 'Corrected product category'],
    ACCURACY_ISSUE: ['Fixed product information', 'Corrected pricing details'],
    LENGTH_PROBLEM: ['Made response more concise', 'Removed unnecessary details'],
    LANGUAGE_QUALITY: ['Improved grammar', 'Enhanced clarity'],
    COMPLETE_REWRITE: ['Completely restructured response', 'Changed approach'],
    MINOR_EDIT: ['Small formatting fix', 'Minor punctuation change'],
    NONE: [],
  };
  return changes[category] || [];
}

function generateImprovementAreas(category: EditCategory): string[] {
  const areas: Record<EditCategory, string[]> = {
    TONE_ADJUSTMENT: ['Use warmer greeting', 'Add personal touch', 'Show more enthusiasm'],
    PRODUCT_CORRECTION: ['Verify product availability', 'Suggest specific items', 'Include product details'],
    ACCURACY_ISSUE: ['Double-check pricing', 'Verify product specifications', 'Confirm availability'],
    LENGTH_PROBLEM: ['Be more concise', 'Remove redundancy', 'Focus on key points'],
    LANGUAGE_QUALITY: ['Improve sentence structure', 'Use simpler language', 'Fix grammar'],
    COMPLETE_REWRITE: ['Better understand context', 'Improve relevance', 'Match customer intent'],
    MINOR_EDIT: ['Minor formatting improvements'],
    NONE: [],
  };
  return areas[category] || [];
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
