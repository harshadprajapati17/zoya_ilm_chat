import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query categories with baseline acceptance score ranges (for March - when AI has mastered)
const categoryAcceptanceRanges: Record<string, { min: number; max: number }> = {
  'Product Info': { min: 0.82, max: 0.93 },      // Excellent (82-93%)
  'Bridal': { min: 0.76, max: 0.84 },            // Excellent (76-84%)
  'Gifting': { min: 0.71, max: 0.77 },           // Good (71-77%)
  'Product Discovery': { min: 0.70, max: 0.76 }, // Good (70-76%)
  'Store Visit': { min: 0.66, max: 0.74 },       // Good (66-74%)
  'After-Sales': { min: 0.61, max: 0.67 },       // Fair (61-67%)
  'Pricing': { min: 0.61, max: 0.66 },           // Fair (61-66%)
  'Complaint': { min: 0.42, max: 0.57 },         // Needs Work (42-57%)
};

// Function to categorize query
function categorizeQuery(query: string): string {
  const lowerQuery = query.toLowerCase();

  // Complaint (lowest performance)
  if (lowerQuery.includes('wrong') || lowerQuery.includes('complaint') || lowerQuery.includes('problem') || lowerQuery.includes('issue')) {
    return 'Complaint';
  }

  // Pricing (fair performance)
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('expensive') || lowerQuery.includes('emi')) {
    return 'Pricing';
  }

  // After-Sales (fair performance)
  if (lowerQuery.includes('repair') || lowerQuery.includes('clean') || lowerQuery.includes('maintain') || lowerQuery.includes('care') || lowerQuery.includes('return') || lowerQuery.includes('certificate')) {
    return 'After-Sales';
  }

  // Store Visit (good performance)
  if (lowerQuery.includes('store') || lowerQuery.includes('visit') || lowerQuery.includes('location') || lowerQuery.includes('appointment')) {
    return 'Store Visit';
  }

  // Product Discovery (good performance)
  if (lowerQuery.includes('show') || lowerQuery.includes('trending') || lowerQuery.includes('new') || lowerQuery.includes('arrival') || lowerQuery.includes('minimalist') || lowerQuery.includes('jhumka')) {
    return 'Product Discovery';
  }

  // Gifting (good performance)
  if (lowerQuery.includes('gift') || lowerQuery.includes('anniversary') || lowerQuery.includes('birthday') || lowerQuery.includes('diwali')) {
    return 'Gifting';
  }

  // Bridal (excellent performance)
  if (lowerQuery.includes('bridal') || lowerQuery.includes('wedding') || lowerQuery.includes('mangalsutra')) {
    return 'Bridal';
  }

  // Product Info (best performance)
  if (lowerQuery.includes('available') || lowerQuery.includes('size') || lowerQuery.includes('customize') || lowerQuery.includes('white gold') || lowerQuery.includes('difference') || lowerQuery.includes('investment') || lowerQuery.includes('heavy') || lowerQuery.includes('offer')) {
    return 'Product Info';
  }

  // Default to Product Info
  return 'Product Info';
}

// Realistic conversation scenarios (reusing from previous seed)
const conversationQueries = [
  // Product Info queries
  "Show me bangles",
  "What's the price of the Royal Heritage Necklace?",
  "Is this available in my size?",
  "Do you have any offers?",
  "Is the Emerald Ring available?",
  "Do you have lightweight bangles?",
  "Can I customize this necklace?",
  "Can you make this in white gold?",
  "What's the price of diamond earrings?",
  "Do you have minimalist rings?",
  "Difference between 18K and 22K gold?",
  "Is this good for investment?",
  "I want heavy gold jewelry",

  // Gifting queries
  "I'm looking for an anniversary gift",
  "Best ring for birthday gift under 50k?",
  "Jewelry for Diwali gifting",

  // Bridal queries
  "Show me bridal necklace sets",
  "I need a mangalsutra",

  // Pricing queries
  "Why is this so expensive?",
  "Do you have EMI options?",

  // Store Visit queries
  "Where is your Bengaluru store?",
  "Can I visit the store tomorrow?",

  // After-Sales queries
  "What's your return policy?",
  "Do you provide certificate?",
  "Do you do jewelry cleaning?",
  "My necklace needs repair",
  "How do I care for diamond jewelry?",

  // Product Discovery queries
  "What are your new arrivals?",
  "Any trending designs?",
  "Show me traditional jhumkas",

  // Complaint queries
  "Wrong item was delivered",
];

const managers = [
  "Rahul Sharma",
  "Priya Patel",
  "Sarah Johnson",
  "Amit Kumar",
  "Neha Reddy",
];

async function main() {
  console.log('🗑️  Clearing existing data...');

  await prisma.aIEditFeedback.deleteMany({});
  await prisma.suggestedReply.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});

  console.log('✅ Existing data cleared\n');

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.error('❌ No users found. Please seed users first.');
    return;
  }

  const totalConversations = 4343;
  const conversationsPerMonth = Math.floor(totalConversations / 3);
  const conversationsApril = 150; // Recent data for last 7 days

  let totalSuggestions = 0;
  let totalEdits = 0;

  // Helper to get random query
  const getRandomQuery = () => conversationQueries[Math.floor(Math.random() * conversationQueries.length)];

  // Helper to generate date in specific month
  const getDateInMonth = (monthOffset: number) => {
    const date = new Date('2026-01-01');
    date.setMonth(date.getMonth() + monthOffset);
    date.setDate(Math.floor(Math.random() * 28) + 1);
    date.setHours(Math.floor(Math.random() * 14) + 9);
    date.setMinutes(Math.floor(Math.random() * 60));
    return date;
  };

  // Helper to generate date in last 7 days (for April 2026)
  const getDateInLastWeek = () => {
    const today = new Date('2026-04-06'); // Current date
    const daysAgo = Math.floor(Math.random() * 7); // 0-6 days ago
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 14) + 9); // 9 AM - 11 PM
    date.setMinutes(Math.floor(Math.random() * 60));
    return date;
  };

  for (let month = 0; month < 3; month++) {
    const monthName = ['January', 'February', 'March'][month];
    console.log(`\n📅 Processing ${monthName} 2026...`);

    const conversationsThisMonth = month === 2
      ? totalConversations - (conversationsPerMonth * 2)
      : conversationsPerMonth;

    for (let i = 0; i < conversationsThisMonth; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const query = getRandomQuery();
      const queryCategory = categorizeQuery(query);
      const createdAt = getDateInMonth(month);

      // Get baseline acceptance range for this category (March performance)
      const categoryRange = categoryAcceptanceRanges[queryCategory];

      // Calculate acceptance score based on month
      let acceptanceScore: number;
      let needsEdit: boolean;

      if (month === 0) {
        // January: Reduce acceptance by 40-50%
        const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        acceptanceScore = Math.max(0.25, baseScore * 0.50); // 50% of March score
        needsEdit = true;
      } else if (month === 1) {
        // February: Reduce acceptance by 15-25%
        const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        acceptanceScore = baseScore * 0.80; // 80% of March score
        needsEdit = Math.random() < 0.85; // 85% need edits
      } else {
        // March: Use full range
        acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        needsEdit = Math.random() < 0.25; // 25% need edits
      }

      // Create conversation
      const conversation = await prisma.conversation.create({
        data: {
          customerId: user.id,
          createdAt,
          updatedAt: createdAt,
        },
      });

      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: user.id,
          content: query,
          isFromCustomer: true,
          createdAt,
        },
      });

      // Generate AI response
      const aiResponse = `AI response for: ${query}`;
      const goodResponse = `Improved response for: ${query}`;

      // Create AI suggestion
      const suggestion = await prisma.suggestedReply.create({
        data: {
          messageId: userMessage.id,
          content: aiResponse,
          confidence: acceptanceScore,
          productIds: JSON.stringify([]),
          wasUsed: true,
          createdAt,
        },
      });

      totalSuggestions++;

      // Create AI message
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: users[0].id,
          content: aiResponse,
          isFromCustomer: false,
          createdAt: new Date(createdAt.getTime() + 1000),
        },
      });

      // Create edit feedback if needed
      if (needsEdit) {
        const manager = managers[Math.floor(Math.random() * managers.length)];
        const editPercentage = Math.random() * 0.40 + 0.15;
        const similarityScore = 1 - editPercentage;

        const editCategories = ['TONE_ADJUSTMENT', 'MINOR_EDIT', 'ACCURACY_ISSUE', 'LENGTH_PROBLEM'];
        const editCategory = editCategories[Math.floor(Math.random() * editCategories.length)];

        await prisma.aIEditFeedback.create({
          data: {
            suggestedReplyId: suggestion.id,
            originalSuggestion: aiResponse,
            editedContent: goodResponse,
            editedBy: manager,
            customerQuery: query,
            editCategory,
            editPercentage,
            similarityScore,
            acceptanceScore,
            toneShift: JSON.stringify({
              from: month === 0 ? "robotic" : "helpful",
              to: "warm and consultative"
            }),
            sentimentAnalysis: JSON.stringify({
              original: month === 0 ? "neutral" : "positive",
              edited: "very positive"
            }),
            keyChanges: JSON.stringify([`Improved ${queryCategory} response`]),
            improvementNeeded: JSON.stringify([`Better handling of ${queryCategory} queries`]),
            createdAt,
          },
        });

        totalEdits++;
      }

      // Progress indicator
      if ((i + 1) % 200 === 0) {
        console.log(`  ✓ Created ${i + 1}/${conversationsThisMonth} conversations`);
      }
    }

    console.log(`✅ ${monthName}: ${conversationsThisMonth} conversations created`);
  }

  // Add April data (last 7 days)
  console.log(`\n📅 Processing April 2026 (Last 7 days)...`);

  for (let i = 0; i < conversationsApril; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const query = getRandomQuery();
    const queryCategory = categorizeQuery(query);
    const createdAt = getDateInLastWeek();

    // Get baseline acceptance range for this category
    const categoryRange = categoryAcceptanceRanges[queryCategory];

    // April: Slightly better than March (AI continues to improve)
    const acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min) * 1.02;
    const needsEdit = Math.random() < 0.20; // Only 20% need edits

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        customerId: user.id,
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        content: query,
        isFromCustomer: true,
        createdAt,
      },
    });

    // Generate AI response
    const aiResponse = `AI response for: ${query}`;
    const goodResponse = `Improved response for: ${query}`;

    // Create AI suggestion
    const suggestion = await prisma.suggestedReply.create({
      data: {
        messageId: userMessage.id,
        content: aiResponse,
        confidence: acceptanceScore,
        productIds: JSON.stringify([]),
        wasUsed: true,
        createdAt,
      },
    });

    totalSuggestions++;

    // Create AI message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: users[0].id,
        content: aiResponse,
        isFromCustomer: false,
        createdAt: new Date(createdAt.getTime() + 1000),
      },
    });

    // Create edit feedback if needed
    if (needsEdit) {
      const manager = managers[Math.floor(Math.random() * managers.length)];
      const editPercentage = Math.random() * 0.30 + 0.10; // Smaller edits
      const similarityScore = 1 - editPercentage;

      const editCategories = ['TONE_ADJUSTMENT', 'MINOR_EDIT', 'ACCURACY_ISSUE', 'LENGTH_PROBLEM'];
      const editCategory = editCategories[Math.floor(Math.random() * editCategories.length)];

      await prisma.aIEditFeedback.create({
        data: {
          suggestedReplyId: suggestion.id,
          originalSuggestion: aiResponse,
          editedContent: goodResponse,
          editedBy: manager,
          customerQuery: query,
          editCategory,
          editPercentage,
          similarityScore,
          acceptanceScore,
          toneShift: JSON.stringify({
            from: "helpful",
            to: "warm and consultative"
          }),
          sentimentAnalysis: JSON.stringify({
            original: "positive",
            edited: "very positive"
          }),
          keyChanges: JSON.stringify([`Minor improvement to ${queryCategory} response`]),
          improvementNeeded: JSON.stringify([`Fine-tuning ${queryCategory} queries`]),
          createdAt,
        },
      });

      totalEdits++;
    }

    // Progress indicator
    if ((i + 1) % 50 === 0) {
      console.log(`  ✓ Created ${i + 1}/${conversationsApril} conversations`);
    }
  }

  console.log(`✅ April (Last 7 days): ${conversationsApril} conversations created`);

  // Print category distribution
  console.log('\n📊 Category Distribution:');
  for (const category of Object.keys(categoryAcceptanceRanges)) {
    console.log(`   ${category}: ${categoryAcceptanceRanges[category].min * 100}-${categoryAcceptanceRanges[category].max * 100}%`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(50));
  console.log(`📊 Total Conversations: ${totalConversations + conversationsApril}`);
  console.log(`💬 Total AI Suggestions: ${totalSuggestions}`);
  console.log(`✏️  Total Edits: ${totalEdits}`);
  console.log(`📈 Edit Rate: ${((totalEdits / totalSuggestions) * 100).toFixed(1)}%`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
