import { PrismaClient, EditCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Sample customer queries and AI responses
const sampleInteractions = [
  {
    query: "I'm looking for a gold necklace for my wedding",
    aiSuggestion: "We have some gold necklaces available. Would you like to see them?",
    editedResponse: "Congratulations on your upcoming wedding! I'd love to help you find the perfect gold necklace for your special day. We have a stunning collection of bridal necklaces. Are you looking for something traditional or contemporary?",
    category: 'TONE_ADJUSTMENT' as EditCategory,
    editPercentage: 85,
    acceptanceScore: 0.3,
    improvementAreas: ['Be more enthusiastic', 'Show empathy for special occasions', 'Ask about style preferences']
  },
  {
    query: "Show me diamond rings under 50000",
    aiSuggestion: "Here are some diamond rings:\n1. Ring A - INR 45,000\n2. Ring B - INR 48,000\n3. Ring C - INR 52,000",
    editedResponse: "Here are some beautiful diamond rings within your budget:\n1. Ring A - INR 45,000\n2. Ring B - INR 48,000\n\nThese pieces are absolutely stunning and perfect for everyday elegance!",
    category: 'PRODUCT_CORRECTION' as EditCategory,
    editPercentage: 45,
    acceptanceScore: 0.6,
    improvementAreas: ['Respect budget constraints', 'Remove products outside budget range']
  },
  {
    query: "Do you have stores in Mumbai?",
    aiSuggestion: "Yes, we have stores in Mumbai. Please check our website for locations.",
    editedResponse: "Yes! We have several Zoya stores in Mumbai:\n\n1. **Zoya Mumbai Flagship** (Boutique)\n📍 123 Marine Drive, Mumbai - 400001\n📞 +91 22 1234 5678\n\n2. **Zoya BKC** (Boutique)\n📍 456 Bandra Kurla Complex, Mumbai - 400051\n📞 +91 22 8765 4321\n\nWould you like directions to any of these stores?",
    category: 'ACCURACY_ISSUE' as EditCategory,
    editPercentage: 90,
    acceptanceScore: 0.2,
    improvementAreas: ['Provide specific store details', 'Include addresses and contact info', 'Avoid referring to external websites']
  },
  {
    query: "What's the price of the Royal Heritage Necklace?",
    aiSuggestion: "The Royal Heritage Necklace is priced at INR 2,50,000. It's a beautiful piece featuring 22K gold with intricate traditional designs. This necklace is part of our Heritage collection and showcases exquisite craftsmanship with detailed filigree work. The piece weighs approximately 45 grams and comes with a certificate of authenticity. It's perfect for weddings and special occasions.",
    editedResponse: "The Royal Heritage Necklace is priced at INR 2,50,000. It's a beautiful piece featuring 22K gold with intricate traditional designs, perfect for weddings and special occasions!",
    category: 'LENGTH_PROBLEM' as EditCategory,
    editPercentage: 65,
    acceptanceScore: 0.55,
    improvementAreas: ['Keep responses concise', 'Avoid over-explaining unless asked']
  },
  {
    query: "Can I see this in gold color?",
    aiSuggestion: "The piece is available in multiple gold colors including yellow gold and rose gold. Would you like to see them?",
    editedResponse: "Yes! This piece is available in yellow gold and rose gold. Which one would you prefer to see?",
    category: 'LANGUAGE_QUALITY' as EditCategory,
    editPercentage: 35,
    acceptanceScore: 0.7,
    improvementAreas: ['Use simpler language', 'More conversational tone']
  },
  {
    query: "I need earrings for daily wear",
    aiSuggestion: "I'd love to show you our daily wear earring collection! Here are some elegant pieces perfect for everyday elegance:\n\n1. **Classic Diamond Studs** - INR 35,000\n2. **Pearl Drop Earrings** - INR 28,000\n3. **Gold Hoop Earrings** - INR 22,000\n\nThese are all lightweight and comfortable for all-day wear. Would you like to know more about any of these?",
    editedResponse: "I'd love to show you our daily wear earring collection! Here are some elegant pieces perfect for everyday elegance:\n\n1. **Classic Diamond Studs** - INR 35,000\n2. **Pearl Drop Earrings** - INR 28,000\n3. **Gold Hoop Earrings** - INR 22,000\n\nThese are all lightweight and comfortable for all-day wear. Would you like to know more about any of these?",
    category: 'NONE' as EditCategory,
    editPercentage: 2,
    acceptanceScore: 0.95,
    improvementAreas: []
  },
  {
    query: "What's your return policy?",
    aiSuggestion: "We offer returns within 30 days of purchase with original receipt.",
    editedResponse: "We offer a 30-day return policy on most items, provided they're in original condition with tags and receipt. However, customized or engraved pieces are not eligible for return. Would you like to know more about our exchange options as well?",
    category: 'ACCURACY_ISSUE' as EditCategory,
    editPercentage: 70,
    acceptanceScore: 0.4,
    improvementAreas: ['Include important exceptions', 'Be more detailed about policies', 'Offer related information']
  },
  {
    query: "Show me bangles",
    aiSuggestion: "Sure! Here are some beautiful bangles from our collection:\n\n1. **Traditional Gold Bangles** - INR 45,000\n2. **Diamond Studded Bangles** - INR 85,000\n3. **Floral Design Bangles** - INR 52,000",
    editedResponse: "I'd love to show you some beautiful bangles! To help me find the perfect ones for you, what style are you looking for - traditional gold, diamond studded, or something more contemporary?",
    category: 'TONE_ADJUSTMENT' as EditCategory,
    editPercentage: 55,
    acceptanceScore: 0.65,
    improvementAreas: ['Ask qualifying questions first', 'Understand preferences before showing products']
  },
  {
    query: "Is this available in my size?",
    aiSuggestion: "Most of our jewelry pieces are adjustable or can be customized to your size. Which item are you interested in?",
    editedResponse: "I'd be happy to check the sizing for you! Which piece are you interested in? Also, do you know your ring size, or would you like guidance on measuring it?",
    category: 'MINOR_EDIT' as EditCategory,
    editPercentage: 25,
    acceptanceScore: 0.75,
    improvementAreas: ['Offer sizing help proactively']
  },
  {
    query: "What materials do you use?",
    aiSuggestion: "We use gold, diamonds, and precious gemstones in our jewelry.",
    editedResponse: "We work with the finest materials including:\n- 18K and 22K gold (yellow, white, and rose gold)\n- Certified diamonds in various clarity grades\n- Precious gemstones like emeralds, rubies, and sapphires\n- Cultured pearls\n\nAll our pieces come with certificates of authenticity. Are you looking for a specific material or gemstone?",
    category: 'COMPLETE_REWRITE' as EditCategory,
    editPercentage: 92,
    acceptanceScore: 0.25,
    improvementAreas: ['Provide comprehensive information', 'Include certifications', 'Be specific about types and grades']
  }
];

// Manager names for demo
const managers = ['Sarah Johnson', 'Rahul Sharma', 'Priya Patel', 'Michael Chen'];

async function main() {
  console.log('Starting to seed AI analytics data...');

  // Get or create test users
  let customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        id: 'customer-demo-1',
        name: 'Demo Customer',
        email: 'customer@demo.com',
        role: 'CUSTOMER',
        language: 'en',
      },
    });
  }

  let manager = await prisma.user.findFirst({ where: { role: 'LEAD_MANAGER' } });
  if (!manager) {
    manager = await prisma.user.create({
      data: {
        id: 'manager-demo-1',
        name: 'Demo Manager',
        email: 'manager@demo.com',
        role: 'LEAD_MANAGER',
        language: 'en',
      },
    });
  }

  // Create a demo conversation
  let conversation = await prisma.conversation.findFirst({
    where: { customerId: customer.id },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        customerId: customer.id,
        status: 'active',
        customerLanguage: 'en',
      },
    });
  }

  console.log('Created/found test users and conversation');

  // Generate data spread over the last 30 days
  const interactions = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    // Randomly select a sample interaction
    const sample = sampleInteractions[Math.floor(Math.random() * sampleInteractions.length)];
    const randomManager = managers[Math.floor(Math.random() * managers.length)];

    // Create date spread over last 30 days (more recent = more data)
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(Math.floor(Math.random() * 24));
    createdAt.setMinutes(Math.floor(Math.random() * 60));

    interactions.push({
      ...sample,
      manager: randomManager,
      createdAt,
    });
  }

  // Sort by date
  interactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  console.log(`Creating ${interactions.length} sample interactions...`);

  for (const interaction of interactions) {
    try {
      // Create customer message
      const customerMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: customer.id,
          content: interaction.query,
          isFromCustomer: true,
          status: 'READ',
          createdAt: interaction.createdAt,
        },
      });

      // Create AI suggested reply
      const suggestedReply = await prisma.suggestedReply.create({
        data: {
          messageId: customerMessage.id,
          content: interaction.aiSuggestion,
          confidence: 0.5 + Math.random() * 0.4, // Random confidence 0.5-0.9
          productIds: JSON.stringify([]),
          wasUsed: true,
          createdAt: interaction.createdAt,
        },
      });

      // Create manager's actual response
      const managerResponseTime = new Date(interaction.createdAt);
      managerResponseTime.setMinutes(managerResponseTime.getMinutes() + Math.floor(Math.random() * 10) + 2);

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: manager.id,
          content: interaction.editedResponse,
          isFromCustomer: false,
          status: 'DELIVERED',
          createdAt: managerResponseTime,
        },
      });

      // Create edit feedback record
      const feedbackTime = new Date(managerResponseTime);
      feedbackTime.setSeconds(feedbackTime.getSeconds() + 1);

      // Add some variation to the metrics
      const editPercentage = interaction.editPercentage + (Math.random() * 10 - 5); // +/- 5%
      const acceptanceScore = Math.max(0, Math.min(1, interaction.acceptanceScore + (Math.random() * 0.2 - 0.1))); // +/- 0.1
      const similarityScore = 1 - (editPercentage / 100) * 0.8; // Inverse relationship with edit %

      await prisma.aIEditFeedback.create({
        data: {
          suggestedReplyId: suggestedReply.id,
          originalSuggestion: interaction.aiSuggestion,
          editedContent: interaction.editedResponse,
          editedBy: interaction.manager,
          editCategory: interaction.category,
          editPercentage: Math.max(0, Math.min(100, editPercentage)),
          similarityScore: Math.max(0, Math.min(1, similarityScore)),
          acceptanceScore: acceptanceScore,
          toneShift: JSON.stringify(
            interaction.category === 'TONE_ADJUSTMENT'
              ? {
                  from: 'neutral',
                  to: 'friendly',
                  description: 'Changed to more warm and conversational tone',
                }
              : null
          ),
          sentimentAnalysis: JSON.stringify({
            originalTone: 'neutral',
            editedTone: 'friendly',
            formalityChange: interaction.category === 'TONE_ADJUSTMENT' ? -0.3 : 0,
            empathyChange: interaction.category === 'TONE_ADJUSTMENT' ? 0.5 : 0.1,
            professionalismChange: 0.2,
            clarityImprovement: interaction.category === 'LANGUAGE_QUALITY' ? 0.6 : 0.2,
          }),
          productChanges: JSON.stringify({
            added: [],
            removed: interaction.category === 'PRODUCT_CORRECTION' ? ['Product C'] : [],
            modified: [],
          }),
          keyChanges: JSON.stringify(interaction.improvementAreas),
          improvementNeeded: JSON.stringify(interaction.improvementAreas),
          conversationContext: JSON.stringify({
            conversationId: conversation.id,
            messageCount: 2,
          }),
          customerQuery: interaction.query,
          createdAt: feedbackTime,
        },
      });

      console.log(`✓ Created interaction: "${interaction.query.substring(0, 50)}..."`);
    } catch (error) {
      console.error(`Error creating interaction: ${error}`);
    }
  }

  // Create some additional feedback records without full messages for variety
  console.log('\nCreating additional standalone feedback records...');

  const additionalCategories: EditCategory[] = [
    'TONE_ADJUSTMENT',
    'PRODUCT_CORRECTION',
    'ACCURACY_ISSUE',
    'LENGTH_PROBLEM',
    'LANGUAGE_QUALITY',
    'MINOR_EDIT',
  ];

  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(now);
    createdAt.setDate(createdAt.getDate() - daysAgo);

    const category = additionalCategories[Math.floor(Math.random() * additionalCategories.length)];

    // Create a minimal message and suggestion
    const msg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: customer.id,
        content: 'Sample query',
        isFromCustomer: true,
        status: 'READ',
        createdAt,
      },
    });

    const suggestion = await prisma.suggestedReply.create({
      data: {
        messageId: msg.id,
        content: 'Sample AI suggestion',
        confidence: Math.random(),
        productIds: JSON.stringify([]),
        wasUsed: true,
        createdAt,
      },
    });

    const editPercentage = 10 + Math.random() * 80;
    const acceptanceScore = Math.random();

    await prisma.aIEditFeedback.create({
      data: {
        suggestedReplyId: suggestion.id,
        originalSuggestion: 'Sample AI suggestion',
        editedContent: 'Sample edited content',
        editedBy: managers[Math.floor(Math.random() * managers.length)],
        editCategory: category,
        editPercentage,
        similarityScore: 1 - editPercentage / 100,
        acceptanceScore,
        toneShift: JSON.stringify(null),
        sentimentAnalysis: JSON.stringify({
          originalTone: 'neutral',
          editedTone: 'friendly',
          formalityChange: 0,
          empathyChange: 0.2,
          professionalismChange: 0.1,
          clarityImprovement: 0.3,
        }),
        productChanges: JSON.stringify({ added: [], removed: [], modified: [] }),
        keyChanges: JSON.stringify(['Sample improvement']),
        improvementNeeded: JSON.stringify(['Sample area']),
        conversationContext: JSON.stringify({}),
        customerQuery: 'Sample query',
        createdAt,
      },
    });
  }

  console.log('\n✅ Successfully seeded AI analytics data!');
  console.log('\nSummary:');
  const totalFeedback = await prisma.aIEditFeedback.count();
  const totalSuggestions = await prisma.suggestedReply.count();
  console.log(`- Total AI suggestions: ${totalSuggestions}`);
  console.log(`- Total edit feedback records: ${totalFeedback}`);
  console.log(`- Time range: Last 30 days`);
  console.log(`- Managers: ${managers.join(', ')}`);
  console.log('\nYou can now view the analytics at: http://localhost:3000/analytics');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
