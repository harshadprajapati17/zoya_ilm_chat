import { PrismaClient, EditCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Sample customer queries - carefully categorized
const queryByCategory = {
  offers: [
    'Are there any offers?',
    'Do you have any discounts?',
    'Any ongoing sales?',
    'Current promotions?',
  ],
  productInfo: [
    'What is the gold purity of this ring?',
    'Can you tell me about the diamond specifications?',
    'What material is this necklace made of?',
    'What are the features of this bracelet?',
  ],
  bridal: [
    'I need bridal jewelry sets',
    'Show me engagement rings',
    'What wedding jewelry do you have?',
    'Looking for mangalsutra designs',
  ],
  gifting: [
    'I need a gift for my wife',
    'Birthday gift suggestions?',
    'Anniversary jewelry recommendations',
    'What would be a good present?',
  ],
  storeVisit: [
    'Where is your nearest store?',
    'Store locations in Mumbai?',
    'What are your store timings?',
    'Can I visit your store today?',
  ],
  warranty: [
    'How do I return this product?',
    'What is your warranty policy?',
    'I need to resize my ring',
    'Exchange policy details?',
  ],
  pricing: [
    'What is the price of this ring?',
    'How much does this cost?',
    'Price range for gold chains?',
  ],
  complaint: [
    'I am not satisfied with the product',
    'There is an issue with my order',
    'Product quality is not good',
    'Wrong item was delivered',
  ],
  discovery: [
    'Show me your latest collection',
    'What new arrivals do you have?',
    'Browse gold necklaces',
    'Show me trending designs',
  ],
};

const managers = ['Sarah Johnson', 'Priya Sharma', 'Amit Patel', 'Lisa Chen', 'Rahul Kumar'];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Generate query-appropriate responses
function generateResponsePair(queryCategory: string, query: string, month: 'jan' | 'feb' | 'mar') {
  let poorAI = '';
  let goodManager = '';
  let editCategory: EditCategory = 'NONE';
  let acceptanceScore = 0.5;

  // Generate appropriate responses based on query category
  switch (queryCategory) {
    case 'offers':
      poorAI = 'Thank you for your inquiry. Our jewelry pieces are crafted with high-quality materials.';
      goodManager = 'Thank you for your interest! We currently have festive offers: 15% off on diamond jewelry, 10% off on gold pieces, plus exchange benefits and flexible payment options. Would you like details on any specific collection?';
      editCategory = 'ACCURACY_ISSUE';
      break;

    case 'productInfo':
      poorAI = 'The product specifications are available on our website.';
      goodManager = 'Excellent question! This piece features 18K gold (750 purity), VS1 clarity diamonds in G-H color grade, weighing 12.5 grams. It comes with BIS hallmark and IGI diamond certification. Would you like more details?';
      editCategory = 'ACCURACY_ISSUE';
      break;

    case 'bridal':
      poorAI = 'We have many beautiful pieces available.';
      goodManager = 'Congratulations on your upcoming wedding! Our Bridal Collection includes stunning necklace sets (from ₹2,50,000), chokers, mangalsutras, and earrings. Each piece is handcrafted with 22K gold and certified diamonds. Would you like to schedule a personal consultation?';
      editCategory = 'PRODUCT_CORRECTION';
      break;

    case 'gifting':
      poorAI = 'Our jewelry makes great gifts.';
      goodManager = 'How thoughtful! I\'d love to help you find the perfect gift. Could you share more about the recipient? We have daily-wear pieces (₹25,000+), statement necklaces (₹1,50,000+), and diamond earrings (₹75,000+). What\'s your budget range?';
      editCategory = 'LENGTH_PROBLEM';
      break;

    case 'storeVisit':
      poorAI = 'You can find store information on our website.';
      goodManager = 'I\'d be happy to help! We have stores in Mumbai (Bandra, Juhu), Bengaluru (Vittal Mallya Road, Leela Palace), Delhi (Connaught Place), and other major cities. Which city works best for you? I can share address, timings, and contact details.';
      editCategory = 'ACCURACY_ISSUE';
      break;

    case 'warranty':
      poorAI = 'Please contact customer service for warranty information.';
      goodManager = 'I\'m here to help! All Zoya jewelry comes with lifetime warranty on manufacturing defects. We offer free resizing (one-time), professional cleaning, and 30-day exchange (with receipt and tags). Visit any Zoya store with your invoice for immediate assistance.';
      editCategory = 'ACCURACY_ISSUE';
      break;

    case 'pricing':
      poorAI = 'This item features premium materials.';
      goodManager = 'Great choice! This piece is priced at ₹1,85,500, including 18K gold, VS1 clarity diamonds (0.75 carats), and intricate handwork. Price includes current gold rates, GST, certification, and beautiful packaging. We offer flexible payment options. Interested in similar pieces?';
      editCategory = 'ACCURACY_ISSUE';
      break;

    case 'complaint':
      poorAI = 'Thank you for contacting us.';
      goodManager = 'I sincerely apologize for this inconvenience. Your satisfaction is our priority. Please share more details so I can resolve this immediately. You can also visit any Zoya store or call 1800-XXX-XXXX for urgent assistance. We stand behind every piece we create.';
      editCategory = 'TONE_ADJUSTMENT';
      break;

    case 'discovery':
      poorAI = 'Please check our website for collections.';
      goodManager = 'I\'d love to show you our latest! The "Celestial Dreams" collection (contemporary designs with diamonds and gemstones, from ₹95,000) and "Heritage Revival" (traditional motifs in 22K gold, from ₹1,75,000) just launched. Which style resonates with you - modern or traditional?';
      editCategory = 'PRODUCT_CORRECTION';
      break;

    default:
      poorAI = 'Thank you for your inquiry.';
      goodManager = 'Thank you for reaching out! I\'m Aakriti, your personal jewelry consultant. I\'d be delighted to help you. Could you tell me more about what you\'re looking for?';
      editCategory = 'TONE_ADJUSTMENT';
  }

  // Apply month-based learning progression
  if (month === 'jan') {
    // January - poor AI, good manager edits
    acceptanceScore = 0.35 + Math.random() * 0.20; // 35-55%
  } else if (month === 'feb') {
    // February - improving AI (gets partial response right)
    poorAI = goodManager.split('.')[0] + '.'; // Just first sentence
    editCategory = 'LENGTH_PROBLEM';
    acceptanceScore = 0.58 + Math.random() * 0.15; // 58-73%
  } else {
    // March - AI is good, minor edits only
    poorAI = goodManager; // AI response is now correct
    editCategory = Math.random() < 0.8 ? 'NONE' : 'MINOR_EDIT';
    acceptanceScore = 0.75 + Math.random() * 0.20; // 75-95%
    if (editCategory === 'MINOR_EDIT') {
      goodManager = goodManager + ' Let me know if you have any questions!';
    }
  }

  return {
    originalSuggestion: poorAI,
    editedContent: goodManager,
    editCategory,
    acceptanceScore,
  };
}

async function main() {
  console.log('Starting to seed accurate 90-day analytics data...\n');

  // Clear existing analytics data
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

  const conversation = await prisma.conversation.create({
    data: {
      customerId: customer.id,
      assignedManagerId: manager.id,
      status: 'active',
    },
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  let totalSuggestions = 0;
  let totalEdits = 0;

  // Generate data for 90 days
  for (let day = 0; day < 90; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);

    const month = currentDate.getMonth();
    const monthName = month === 0 ? 'jan' : month === 1 ? 'feb' : 'mar';

    // More suggestions per day over time
    const suggestionsPerDay = 30 + Math.floor((day / 90) * 30) + Math.floor(Math.random() * 10);

    console.log(`Day ${day + 1}/90 (${currentDate.toDateString()}) - ${suggestionsPerDay} suggestions`);

    for (let i = 0; i < suggestionsPerDay; i++) {
      // Pick random category and query
      const categories = Object.keys(queryByCategory);
      const category = getRandomElement(categories);
      const query = getRandomElement(queryByCategory[category as keyof typeof queryByCategory]);

      const { originalSuggestion, editedContent, editCategory, acceptanceScore } =
        generateResponsePair(category, query, monthName);

      // Create message
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: customer.id,
          content: query,
          isFromCustomer: true,
          createdAt: currentDate,
        },
      });

      // Create suggested reply
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

      // Create edit feedback if edited
      if (editCategory !== 'NONE') {
        const improvementNeeded = [];
        if (editCategory === 'TONE_ADJUSTMENT') improvementNeeded.push('Tone', 'Empathy');
        else if (editCategory === 'PRODUCT_CORRECTION') improvementNeeded.push('Product Knowledge', 'Accuracy');
        else if (editCategory === 'ACCURACY_ISSUE') improvementNeeded.push('Accuracy', 'Detail');
        else if (editCategory === 'LENGTH_PROBLEM') improvementNeeded.push('Completeness', 'Detail');
        else if (editCategory === 'LANGUAGE_QUALITY') improvementNeeded.push('Grammar', 'Clarity');

        await prisma.aIEditFeedback.create({
          data: {
            suggestedReplyId: suggestedReply.id,
            originalSuggestion,
            editedContent,
            editedBy: getRandomElement(managers),
            editCategory,
            editPercentage: Math.random() * 30 + 10,
            similarityScore: 0.6 + Math.random() * 0.35,
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

  console.log('\n✅ Seed completed!');
  console.log(`📊 Generated ${totalSuggestions} AI suggestions`);
  console.log(`✏️  Generated ${totalEdits} edit feedback records`);
  console.log(`📈 Edit rate: ${((totalEdits / totalSuggestions) * 100).toFixed(1)}%`);
  console.log('\n🎯 Data shows AI learning progression:');
  console.log('   - January: Poor AI responses → Manager provides accurate corrections');
  console.log('   - February: AI improving → Partial responses, manager adds details');
  console.log('   - March: AI mastered → Accurate responses, minimal/no edits');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
