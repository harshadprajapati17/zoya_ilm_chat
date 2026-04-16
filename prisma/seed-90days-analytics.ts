import { PrismaClient, EditCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Sample customer queries by category
const queryTemplates = {
  productInfo: [
    'What is the gold purity of this ring?',
    'Can you tell me about the diamond specifications?',
    'What material is this necklace made of?',
    'Show me details about product {id}',
    'What are the features of this bracelet?',
  ],
  bridal: [
    'I need bridal jewelry sets',
    'Show me engagement rings',
    'What wedding jewelry do you have?',
    'Looking for mangalsutra designs',
    'Bridal necklace collections?',
  ],
  gifting: [
    'I need a gift for my wife',
    'Birthday gift suggestions?',
    'Anniversary jewelry recommendations',
    'What would be a good present?',
    'Gift options under 50000?',
  ],
  discovery: [
    'Show me your latest collection',
    'What new arrivals do you have?',
    'Browse gold necklaces',
    'Show me trending designs',
    'Explore diamond jewelry',
  ],
  storeVisit: [
    'Where is your nearest store?',
    'Store locations in Mumbai?',
    'What are your store timings?',
    'Address of your showroom?',
    'Can I visit your store today?',
  ],
  afterSales: [
    'How do I return this product?',
    'What is your warranty policy?',
    'I need to resize my ring',
    'Product maintenance service?',
    'Exchange policy details?',
  ],
  pricing: [
    'What is the price of this ring?',
    'Do you have any discounts?',
    'How much does this cost?',
    'Are there any offers?',
    'Price range for gold chains?',
  ],
  complaint: [
    'I am not satisfied with the product',
    'There is an issue with my order',
    'Product quality is not good',
    'Wrong item was delivered',
    'I have a complaint about service',
  ],
};

const managers = ['Sarah Johnson', 'Priya Sharma', 'Amit Patel', 'Lisa Chen', 'Rahul Kumar'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomQuery(): string {
  const categories = Object.values(queryTemplates);
  const allQueries = categories.flat();
  return getRandomElement(allQueries).replace('{id}', `ZY${Math.floor(Math.random() * 10000)}`);
}

// Generate AI suggestion and edited version based on query category
function generateSuggestionPair(query: string, day: number) {
  const isJanuary = day <= 31;
  const isFebruary = day > 31 && day <= 59;
  const isMarch = day > 59;

  const lowerQuery = query.toLowerCase();

  // Determine query category and generate appropriate responses
  let originalSuggestion = '';
  let editedContent = '';
  let editCategory: EditCategory = 'NONE';
  let acceptanceScore = 0.95;

  // Generate query-specific responses
  if (lowerQuery.includes('offer') || lowerQuery.includes('discount')) {
    // Offers/Pricing query
    originalSuggestion = 'Great question! Here\'s what I can tell you. Our jewelry pieces are crafted with high-quality materials.';
    editedContent = 'Thank you for your interest! We currently have a festive offer - get 15% off on all diamond jewelry and 10% off on gold pieces. Additionally, we offer exchange benefits and special financing options. Would you like to know more about any specific collection?';
  } else if (lowerQuery.includes('purity') || lowerQuery.includes('material') || lowerQuery.includes('specification')) {
    // Product info query
    originalSuggestion = 'Thank you for your inquiry. The product specifications are available on our website.';
    editedContent = 'Excellent question! This piece features 18K gold with a purity of 750 (75% pure gold). The diamonds are VS1 clarity, G-H color grade, and the piece weighs approximately 12.5 grams. Each piece comes with a BIS hallmark certificate and IGI diamond certification. Would you like to know more details?';
  } else if (lowerQuery.includes('store') || lowerQuery.includes('location') || lowerQuery.includes('address')) {
    // Store query
    originalSuggestion = 'I appreciate your interest. You can find store information on our website.';
    editedContent = 'I\'d be happy to help you find a Zoya store! We have stores in Mumbai (Bandra & Juhu), Bengaluru (Vittal Mallya Road & Leela Palace), Delhi (Connaught Place), and other major cities. Which city would work best for you? I can share the exact address, timings, and contact details.';
  } else if (lowerQuery.includes('bridal') || lowerQuery.includes('wedding') || lowerQuery.includes('engagement')) {
    // Bridal query
    originalSuggestion = 'Thank you for reaching out. We have many beautiful pieces available.';
    editedContent = 'Congratulations on your upcoming wedding! Our Bridal Collection features exquisite pieces crafted for your special day. We have stunning necklace sets starting from ₹2,50,000, elegant chokers, traditional mangalsutras, and beautiful earring sets. Each piece is handcrafted with certified diamonds and 22K gold. Would you like to schedule a personalized consultation at our store?';
  } else if (lowerQuery.includes('gift') || lowerQuery.includes('present')) {
    // Gifting query
    originalSuggestion = 'Great question! Our jewelry pieces are crafted with high-quality materials.';
    editedContent = 'How thoughtful! I\'d love to help you find the perfect gift. Could you share a bit more about the recipient and the occasion? For instance, we have elegant daily-wear pieces starting at ₹25,000, statement necklaces for special occasions (₹1,50,000+), and timeless diamond earrings (₹75,000+). What\'s your budget range?';
  } else if (lowerQuery.includes('warranty') || lowerQuery.includes('return') || lowerQuery.includes('exchange') || lowerQuery.includes('resize')) {
    // After-sales query
    originalSuggestion = 'Thank you for your inquiry. Let me help you with that.';
    editedContent = 'I\'m here to help! All Zoya jewelry comes with a lifetime warranty covering manufacturing defects. We offer free resizing (one time), professional cleaning services, and a 30-day exchange policy (with original receipt and tags). For specific concerns, please visit any Zoya store with your purchase invoice, and our team will assist you immediately.';
  } else if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
    // Pricing query
    originalSuggestion = 'I appreciate your interest. This item features premium gold/diamonds.';
    editedContent = 'Great choice! This piece is priced at ₹1,85,500, which includes 18K gold, VS1 clarity diamonds (0.75 carats), and intricate handcrafted work. The price is based on current gold rates and includes GST, certification, and a beautiful Zoya gift box. We also offer flexible payment options and exchange benefits. Would you like to see similar pieces in a different price range?';
  } else if (lowerQuery.includes('complaint') || lowerQuery.includes('issue') || lowerQuery.includes('not satisfied')) {
    // Complaint query
    originalSuggestion = 'Thank you for reaching out to us. Our jewelry pieces are crafted with high-quality materials.';
    editedContent = 'I sincerely apologize for the inconvenience you\'ve experienced. Your satisfaction is extremely important to us. Could you please share more details about the issue? I\'ll ensure this is resolved immediately. You can also visit any Zoya store or call our customer care at 1800-XXX-XXXX for immediate assistance. We stand behind the quality of every piece we create.';
  } else if (lowerQuery.includes('collection') || lowerQuery.includes('new arrival') || lowerQuery.includes('trending')) {
    // Discovery query
    originalSuggestion = 'Thank you for your inquiry. You can find detailed information in the product description.';
    editedContent = 'I\'d love to show you our latest collections! Our "Celestial Dreams" collection just launched last month, featuring contemporary designs with diamonds and colored gemstones (starting ₹95,000). We also have the "Heritage Revival" collection with traditional motifs in 22K gold (starting ₹1,75,000). Which style resonates more with you - modern or traditional?';
  } else {
    // Default/generic query
    originalSuggestion = 'Thank you for your inquiry. Let me help you with that. Our jewelry pieces are crafted with high-quality materials.';
    editedContent = 'Thank you for reaching out! I\'m Aakriti, your personal jewelry consultant at Zoya. I\'d be delighted to help you find the perfect piece. Could you tell me a bit more about what you\'re looking for? Are you interested in rings, necklaces, earrings, or something else?';
  }

  // January - High error rate, AI gives poor/generic responses, manager makes major corrections
  if (isJanuary) {
    const errorChance = Math.random();

    if (errorChance < 0.75) {
      // In January, AI often gives generic/unhelpful responses regardless of query
      // Manager has to completely rewrite with accurate, helpful information
      // The editedContent is already set above with good responses

      // Make AI response worse for January
      if (lowerQuery.includes('offer') || lowerQuery.includes('discount')) {
        originalSuggestion = 'Great question! Here\'s what I can tell you. Our jewelry pieces are crafted with high-quality materials.';
        editCategory = 'ACCURACY_ISSUE';
        acceptanceScore = 0.40 + Math.random() * 0.15; // 40-55%
      } else if (lowerQuery.includes('store') || lowerQuery.includes('location')) {
        originalSuggestion = 'I appreciate your interest. You can find store information on our website.';
        editCategory = 'ACCURACY_ISSUE';
        acceptanceScore = 0.42 + Math.random() * 0.13; // 42-55%
      } else if (lowerQuery.includes('complaint') || lowerQuery.includes('issue')) {
        originalSuggestion = 'Thank you for reaching out to us. Our jewelry pieces are crafted with high-quality materials.';
        editCategory = 'TONE_ADJUSTMENT';
        acceptanceScore = 0.35 + Math.random() * 0.15; // 35-50%
      } else if (lowerQuery.includes('price') || lowerQuery.includes('cost')) {
        originalSuggestion = 'I appreciate your interest. This item features premium gold/diamonds.';
        editCategory = 'ACCURACY_ISSUE';
        acceptanceScore = 0.38 + Math.random() * 0.17; // 38-55%
      } else if (lowerQuery.includes('purity') || lowerQuery.includes('specification')) {
        originalSuggestion = 'Thank you for your inquiry. The product specifications are available on our website.';
        editCategory = 'LENGTH_PROBLEM';
        acceptanceScore = 0.45 + Math.random() * 0.12; // 45-57%
      } else if (lowerQuery.includes('bridal') || lowerQuery.includes('wedding')) {
        originalSuggestion = 'Thank you for reaching out. We have many beautiful pieces available.';
        editCategory = 'PRODUCT_CORRECTION';
        acceptanceScore = 0.40 + Math.random() * 0.18; // 40-58%
      } else if (lowerQuery.includes('gift')) {
        originalSuggestion = 'Great question! Our jewelry pieces are crafted with high-quality materials.';
        editCategory = 'LENGTH_PROBLEM';
        acceptanceScore = 0.43 + Math.random() * 0.15; // 43-58%
      } else if (lowerQuery.includes('warranty') || lowerQuery.includes('return')) {
        originalSuggestion = 'Thank you for your inquiry. Let me help you with that.';
        editCategory = 'ACCURACY_ISSUE';
        acceptanceScore = 0.40 + Math.random() * 0.15; // 40-55%
      } else {
        originalSuggestion = 'Thank you for your inquiry. Our jewelry pieces are crafted with high-quality materials.';
        editCategory = 'COMPLETE_REWRITE';
        acceptanceScore = 0.35 + Math.random() * 0.20; // 35-55%
      }
    } else if (errorChance < 0.85) {
      // Wrong tone - too cold/formal
      editCategory = 'TONE_ADJUSTMENT';
      acceptanceScore = 0.50 + Math.random() * 0.12; // 50-62%
      originalSuggestion = 'Check the website.';
    } else {
      // Language/grammar issues
      editCategory = 'LANGUAGE_QUALITY';
      acceptanceScore = 0.52 + Math.random() * 0.13; // 52-65%
      originalSuggestion = originalSuggestion.replace('help you', 'can help');
    }
  }
  // February - Medium error rate, AI improving but still needs guidance
  else if (isFebruary) {
    const errorChance = Math.random();

    if (errorChance < 0.45) {
      // AI provides partial info but manager adds crucial details
      editCategory = 'LENGTH_PROBLEM';
      acceptanceScore = 0.58 + Math.random() * 0.15; // 58-73%
      // Keep the good editedContent, make originalSuggestion less detailed
      originalSuggestion = editedContent.split('.')[0] + '.'; // Just first sentence
    } else if (errorChance < 0.60) {
      // Minor tone adjustments needed
      editCategory = 'TONE_ADJUSTMENT';
      acceptanceScore = 0.62 + Math.random() * 0.12; // 62-74%
      originalSuggestion = editedContent.replace(/!|I\'d|I\'m|We truly/g, (match) => {
        if (match === '!') return '.';
        if (match === 'I\'d') return 'We can';
        if (match === 'I\'m') return 'I am';
        if (match === 'We truly') return 'We';
        return match;
      });
    } else if (errorChance < 0.68) {
      // Minor accuracy tweaks
      editCategory = 'MINOR_EDIT';
      acceptanceScore = 0.65 + Math.random() * 0.12; // 65-77%
      // Keep most of the good response
    }
  }
  // March - Low error rate, AI mostly good with minor tweaks
  else if (isMarch) {
    const errorChance = Math.random();

    if (errorChance < 0.20) {
      // Very minor improvements
      editCategory = 'MINOR_EDIT';
      acceptanceScore = 0.72 + Math.random() * 0.13; // 72-85%
      // AI response is already good, manager makes tiny tweaks
    } else {
      // No edit needed - AI response is perfect
      editCategory = 'NONE';
      acceptanceScore = 0.75 + Math.random() * 0.20; // 75-95%
      editedContent = originalSuggestion; // No change
    }
  }

  return {
    originalSuggestion,
    editedContent,
    editCategory,
    acceptanceScore,
  };
}

async function main() {
  console.log('Starting to seed 90 days of AI analytics data...');

  // Clear existing data
  console.log('Clearing existing AI feedback data...');
  await prisma.aIEditFeedback.deleteMany({});
  await prisma.suggestedReply.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['customer@test.com', 'manager@test.com']
      }
    }
  });

  // Create test users
  console.log('Creating test users...');
  const customer = await prisma.user.create({
    data: {
      name: 'Test Customer',
      email: 'customer@test.com',
      role: 'CUSTOMER',
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: 'Test Manager',
      email: 'manager@test.com',
      role: 'LEAD_MANAGER',
    },
  });

  // Create a conversation
  console.log('Creating test conversation...');
  const conversation = await prisma.conversation.create({
    data: {
      customerId: customer.id,
      assignedManagerId: manager.id,
      status: 'active',
    },
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // 90 days ago

  let totalSuggestions = 0;
  let totalEdits = 0;

  // Generate data for each day
  for (let day = 0; day < 90; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);

    // Suggestions per day increases over time (AI helping more)
    const suggestionsPerDay = 30 + Math.floor((day / 90) * 30) + Math.floor(Math.random() * 10);

    console.log(`Generating day ${day + 1}/90 (${currentDate.toDateString()}) - ${suggestionsPerDay} suggestions`);

    for (let i = 0; i < suggestionsPerDay; i++) {
      const query = getRandomQuery();
      const { originalSuggestion, editedContent, editCategory, acceptanceScore } = generateSuggestionPair(query, day + 1);

      // Create a message for this suggestion
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: customer.id,
          content: query,
          isFromCustomer: true,
          createdAt: currentDate,
        },
      });

      // Create suggested reply (all suggestions are stored)
      const suggestedReply = await prisma.suggestedReply.create({
        data: {
          messageId: message.id,
          content: originalSuggestion,
          confidence: acceptanceScore,
          productIds: JSON.stringify([]),
          wasUsed: editCategory !== 'NONE' || Math.random() > 0.3,
          createdAt: currentDate,
        },
      });

      totalSuggestions++;

      // Only create edit feedback if there was an edit (not NONE)
      if (editCategory !== 'NONE') {
        // Determine improvement areas based on edit category
        const improvementNeeded = [];
        if (editCategory === 'TONE_ADJUSTMENT') {
          improvementNeeded.push('Tone', 'Empathy');
        } else if (editCategory === 'PRODUCT_CORRECTION') {
          improvementNeeded.push('Product Knowledge', 'Accuracy');
        } else if (editCategory === 'ACCURACY_ISSUE') {
          improvementNeeded.push('Accuracy', 'Detail');
        } else if (editCategory === 'LENGTH_PROBLEM') {
          improvementNeeded.push('Completeness', 'Detail');
        } else if (editCategory === 'LANGUAGE_QUALITY') {
          improvementNeeded.push('Grammar', 'Clarity');
        }

        await prisma.aIEditFeedback.create({
          data: {
            suggestedReplyId: suggestedReply.id,
            originalSuggestion,
            editedContent,
            editedBy: getRandomElement(managers),
            editCategory,
            editPercentage: Math.random() * 30 + 10, // 10-40% changed
            similarityScore: 0.6 + Math.random() * 0.35, // 60-95% similar
            acceptanceScore,
            improvementNeeded: JSON.stringify(improvementNeeded),
            customerQuery: query,
            conversationContext: JSON.stringify({
              previousMessages: 2,
              sessionDuration: Math.floor(Math.random() * 300) + 60,
            }),
            createdAt: currentDate,
            updatedAt: currentDate,
          },
        });

        totalEdits++;
      }
    }
  }

  console.log('\n✅ Seed completed successfully!');
  console.log(`📊 Generated ${totalSuggestions} AI suggestions`);
  console.log(`✏️  Generated ${totalEdits} edit feedback records`);
  console.log(`📈 Edit rate: ${((totalEdits / totalSuggestions) * 100).toFixed(1)}%`);
  console.log('\n🎯 Data spans 90 days showing clear AI learning progression:');
  console.log('   - January: High edit rate (AI learning)');
  console.log('   - February: Medium edit rate (AI improving)');
  console.log('   - March: Low edit rate (AI mastered)');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
