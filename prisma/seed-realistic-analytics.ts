import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query categories with acceptance score ranges
const categoryAcceptanceRanges: Record<string, { min: number; max: number }> = {
  'Product Info': { min: 0.80, max: 0.95 },      // Excellent (80%+)
  'Bridal': { min: 0.75, max: 0.85 },            // Excellent (75-85%)
  'Gifting': { min: 0.70, max: 0.78 },           // Good (70-78%)
  'Product Discovery': { min: 0.70, max: 0.77 }, // Good (70-77%)
  'Store Visit': { min: 0.65, max: 0.75 },       // Good (65-75%)
  'After-Sales': { min: 0.60, max: 0.68 },       // Fair (60-68%)
  'Pricing': { min: 0.60, max: 0.67 },           // Fair (60-67%)
  'Complaint': { min: 0.40, max: 0.58 },         // Needs Work (<60%)
};

// Realistic customer queries with proper AI responses
const conversationScenarios = [
  // Product Information Queries (Excellent: 80-95%)
  {
    query: "Show me bangles",
    queryCategory: "Product Info",
    januaryAI: "Sure! Here are some beautiful bangles from our collection:\n\n1. **Traditional Gold Bangles** - INR 45,000\n2. **Diamond Studded Bangles** - INR 85,000\n3. **Floral Design Bangles** - INR 52,000",
    goodResponse: "I'd love to show you some beautiful bangles! To help me find the perfect ones for you, what style are you looking for - traditional gold, diamond studded, or something more contemporary?",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Ask qualifying questions first", "Understand preferences before showing products"],
  },
  {
    query: "What's the price of the Royal Heritage Necklace?",
    januaryAI: "The Royal Heritage Necklace is priced at INR 2,50,000. It's a beautiful piece featuring 22K gold with intricate traditional designs. This necklace is part of our Heritage collection and showcases exquisite craftsmanship with detailed filigree work. The piece weighs approximately 45 grams and comes with a certificate of authenticity. It's perfect for weddings and special occasions.",
    goodResponse: "The Royal Heritage Necklace is priced at INR 2,50,000. It's a beautiful piece featuring 22K gold with intricate traditional designs, perfect for weddings and special occasions!",
    category: "LENGTH_PROBLEM",
    improvementNeeded: ["Keep responses concise", "Avoid over-explaining unless asked"],
  },
  {
    query: "Is this available in my size?",
    januaryAI: "Most of our jewelry pieces are adjustable or can be customized to your size. Which item are you interested in?",
    goodResponse: "I'd be happy to check the sizing for you! Which piece are you interested in? Also, do you know your ring size, or would you like guidance on measuring it?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Offer sizing help proactively"],
  },
  {
    query: "Do you have any offers?",
    januaryAI: "Thank you for your inquiry. You can find detailed information in the product description.",
    goodResponse: "Thank you for your interest! We currently have festive offers: 15% off on diamond jewelry, 10% off on gold pieces over ₹1L, plus special exchange benefits and flexible payment options. Would you like details on any specific collection?",
    category: "ACCURACY_ISSUE",
    improvementNeeded: ["Provide accurate offer information", "Answer the question directly"],
  },

  // Availability Queries
  {
    query: "Is the Emerald Ring available?",
    januaryAI: "Yes, the Emerald Ring is currently available. Would you like to know more about it?",
    goodResponse: "Yes, the Emerald Ring is available! I can check stock at your preferred store location. Which city are you in, or would you prefer home delivery?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Offer next steps", "Ask about location preference"],
  },
  {
    query: "Do you have lightweight bangles?",
    januaryAI: "Yes, we have a range of lightweight bangles. Our collection includes delicate designs starting from 15 grams.",
    goodResponse: "Yes! We have beautiful lightweight bangles starting from 15 grams. Are you looking for daily wear pieces or something for special occasions? I can show you options based on your preference!",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["More engaging tone", "Ask qualifying questions"],
  },

  // Customization Queries
  {
    query: "Can I customize this necklace?",
    januaryAI: "Yes, we offer customization services for most of our pieces. What specific changes would you like to make?",
    goodResponse: "Absolutely! We can customize the design, length, and even add or remove stones. What modifications did you have in mind? Our design team can help bring your vision to life!",
    category: "MINOR_EDIT",
    improvementNeeded: ["More enthusiastic tone", "Mention design team support"],
  },
  {
    query: "Can you make this in white gold?",
    januaryAI: "Yes, we can create this design in white gold. The customization typically takes 2-3 weeks.",
    goodResponse: "Yes, absolutely! We can craft this in 18K white gold. The customization takes about 2-3 weeks, and our craftsmen will ensure it matches the original design perfectly. Would you like to see similar pieces in white gold?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Add more details", "Offer alternatives"],
  },

  // Gifting Queries
  {
    query: "I'm looking for an anniversary gift",
    januaryAI: "Congratulations on your anniversary! We have a beautiful collection perfect for this occasion. What type of jewelry does she prefer - rings, necklaces, or earrings?",
    goodResponse: "How wonderful! Congratulations on your anniversary! I'd love to help you find the perfect piece. What type of jewelry does she usually wear - classic gold, contemporary diamond pieces, or something with colored stones? Also, what's your budget range?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Ask about budget", "More personalized approach"],
  },
  {
    query: "Best ring for birthday gift under 50k?",
    januaryAI: "For birthday gifts under ₹50,000, we have several beautiful options:\n\n1. Diamond Solitaire Ring - ₹42,000\n2. Ruby Gold Ring - ₹38,000\n3. Pearl Cluster Ring - ₹28,000",
    goodResponse: "Great choice! For a birthday gift under ₹50K, I'd recommend knowing a bit more: Is this for someone who prefers classic or modern designs? Also, do you know their ring size? I can then show you our best options including diamond, ruby, and pearl rings!",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Gather more context first", "Personalize recommendations"],
  },

  // Wedding/Bridal Queries
  {
    query: "Show me bridal necklace sets",
    januaryAI: "Here are our popular bridal necklace sets:\n\n1. Royal Heritage Set - ₹3,50,000\n2. Diamond Elegance Set - ₹4,20,000\n3. Traditional Kundan Set - ₹2,80,000",
    goodResponse: "Beautiful! Bridal jewelry is so special! To help you find the perfect set, could you tell me: Are you looking for traditional gold, diamond, or temple jewelry? What's your budget range? And is this for a South Indian or North Indian wedding style?",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Ask about wedding style", "Understand budget first", "More consultative approach"],
  },
  {
    query: "I need a mangalsutra",
    januaryAI: "We have a beautiful collection of mangalsutras. Would you prefer traditional black beads or modern diamond designs?",
    goodResponse: "Congratulations! We have a lovely mangalsutra collection. Are you looking for a traditional black bead design or a more contemporary diamond style? Also, what length do you prefer - short or long?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Add congratulations", "Ask about length"],
  },

  // Price Inquiries
  {
    query: "What's the price of diamond earrings?",
    januaryAI: "Our diamond earrings range from ₹35,000 to ₹2,50,000 depending on the design and carat weight. Which style interests you?",
    goodResponse: "Our diamond earrings start from ₹35,000 and go up to ₹2,50,000 depending on the carat weight and design. Are you looking for studs, drops, or chandbalis? I can show you options in your preferred price range!",
    category: "MINOR_EDIT",
    improvementNeeded: ["Mention specific styles", "More engaging"],
  },
  {
    query: "Why is this so expensive?",
    januaryAI: "The price reflects the quality of materials used - 22K gold, certified diamonds, and expert craftsmanship. Each piece comes with certification.",
    goodResponse: "Great question! This piece features certified VVS diamonds, 22K hallmarked gold, and intricate handcrafted work by our master artisans. It also comes with full certification and lifetime warranty. The pricing reflects these premium materials and craftsmanship. Would you like to see similar designs at different price points?",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["More empathetic", "Offer alternatives", "Explain value better"],
  },

  // Store/Visit Queries
  {
    query: "Where is your Bengaluru store?",
    januaryAI: "Our Bengaluru store is located at 123 MG Road, Bengaluru - 560001. We're open from 10 AM to 8 PM.",
    goodResponse: "We have our Zoya boutique in Bengaluru at UB City, Vittal Mallya Road! We're open 11 AM to 8 PM. Would you like me to book an appointment for a personalized consultation? Our jewelry experts can show you our exclusive collection!",
    category: "ACCURACY_ISSUE",
    improvementNeeded: ["Use correct store location", "Offer appointment booking"],
  },
  {
    query: "Can I visit the store tomorrow?",
    januaryAI: "Yes, you can visit us anytime during store hours: 10 AM to 8 PM. Our address is available on our website.",
    goodResponse: "Absolutely! We'd love to see you tomorrow! Would you like me to book a personal appointment with one of our jewelry consultants? They can prepare a curated selection based on what you're looking for. Which time works best for you?",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Offer appointment", "More welcoming tone", "Ask preferred time"],
  },

  // Policy Queries
  {
    query: "What's your return policy?",
    januaryAI: "We offer a 30-day return policy for unused jewelry with original packaging and certificate. Custom pieces are non-returnable.",
    goodResponse: "We have a 30-day return policy for unworn pieces with original packaging and certificates. Customized jewelry has different terms. Are you concerned about a specific purchase? I can also tell you about our lifetime exchange program and buyback guarantee!",
    category: "MINOR_EDIT",
    improvementNeeded: ["Mention exchange program", "Ask if they have concerns"],
  },
  {
    query: "Do you provide certificate?",
    januaryAI: "Yes, all our diamond and gold jewelry comes with proper certification - IGI/GIA for diamonds and BIS hallmark for gold.",
    goodResponse: "Absolutely! Every piece comes with proper certification: IGI/GIA certificates for diamonds, BIS hallmark for gold purity, and our own authenticity certificate. You'll receive all documentation in a luxury certificate portfolio!",
    category: "MINOR_EDIT",
    improvementNeeded: ["More detailed", "Mention portfolio"],
  },

  // Investment Queries
  {
    query: "Is this good for investment?",
    januaryAI: "Our jewelry is crafted with high-quality gold and certified diamonds, which holds good value. However, please note that making charges apply.",
    goodResponse: "While our pieces are crafted with 22K/18K hallmarked gold and certified diamonds which hold intrinsic value, jewelry is best viewed as an heirloom rather than pure investment. We do offer excellent buyback and exchange programs. Are you looking for something specific for investment purposes?",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Set right expectations", "More nuanced explanation"],
  },
  {
    query: "I want heavy gold jewelry",
    januaryAI: "We have a range of heavy gold jewelry starting from 50 grams. Our Heritage collection features traditional designs in 22K gold.",
    goodResponse: "Perfect! Our Heritage collection has stunning heavy gold pieces starting from 50 grams in 22K gold. Are you looking for necklaces, bangles, or a complete set? Also, what's your preferred style - South Indian temple jewelry or North Indian traditional designs?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Ask about style preference", "Specify jewelry type"],
  },

  // New Arrivals
  {
    query: "What are your new arrivals?",
    januaryAI: "Thank you for your inquiry. You can find detailed information in the product description.",
    goodResponse: "We just launched our Spring Collection featuring contemporary diamond pieces and lightweight gold jewelry! We have minimalist studs, delicate chains, and modern bangles. What type of jewelry are you most interested in? I can show you the latest in that category!",
    category: "ACCURACY_ISSUE",
    improvementNeeded: ["Give specific collection information", "Don't use generic responses"],
  },
  {
    query: "Any trending designs?",
    januaryAI: "Currently, minimalist designs and geometric patterns are very popular. Our Contemporary collection has several trending pieces.",
    goodResponse: "Yes! Right now, layered delicate necklaces, geometric studs, and convertible jewelry pieces are trending! Also, colored stone accents and mixed-metal designs are very popular. Which style resonates with you? I can show you our trending pieces!",
    category: "MINOR_EDIT",
    improvementNeeded: ["More specific examples", "More engaging"],
  },

  // Comparison Queries
  {
    query: "Difference between 18K and 22K gold?",
    januaryAI: "22K gold has 91.6% purity and is softer, ideal for plain jewelry. 18K has 75% purity, is more durable, and better for diamond settings.",
    goodResponse: "Great question! 22K gold (91.6% pure) is softer and richer in color - perfect for traditional plain gold jewelry. 18K (75% pure) is more durable and better for diamond settings as it holds stones securely. Which are you considering?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Ask follow-up question"],
  },

  // Design Queries
  {
    query: "Do you have minimalist rings?",
    januaryAI: "Yes, our Contemporary collection has minimalist rings starting from ₹18,000.",
    goodResponse: "Yes! We have a beautiful range of minimalist rings in our Contemporary collection, starting from ₹18,000. Are you looking for simple bands, delicate solitaires, or geometric designs? Daily wear or special occasions?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Ask about specific style", "Occasion"],
  },
  {
    query: "Show me traditional jhumkas",
    januaryAI: "Here are our traditional jhumka designs:\n\n1. Temple Gold Jhumkas - ₹28,000\n2. Antique Finish Jhumkas - ₹35,000\n3. Ruby Jhumkas - ₹42,000",
    goodResponse: "Beautiful choice! Before I show you options, what size jhumkas do you prefer - small/medium/large? And are you looking for plain gold, antique finish, or ones with stones like rubies or emeralds? This will help me show you the perfect pieces!",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Gather preferences first", "Don't list products immediately"],
  },

  // Occasion Specific
  {
    query: "Jewelry for Diwali gifting",
    januaryAI: "For Diwali, we recommend gold coins, Lakshmi pendants, or traditional bangles. These are auspicious and make perfect gifts.",
    goodResponse: "Perfect timing for Diwali shopping! We have special festive pieces - gold coins with Lakshmi motifs, traditional bangles, and auspicious pendants. Who are you gifting to - family elders, spouse, or colleagues? Budget range? This will help me suggest the perfect Diwali gift!",
    category: "MINOR_EDIT",
    improvementNeeded: ["Ask about recipient", "Budget"],
  },

  // Service Queries
  {
    query: "Do you do jewelry cleaning?",
    januaryAI: "Yes, we provide complimentary cleaning and maintenance services for all jewelry purchased from us.",
    goodResponse: "Yes, absolutely! We offer lifetime complimentary cleaning and maintenance for all Zoya jewelry. You can visit any of our stores anytime - no appointment needed! We'll also do a quality check and polish it for you!",
    category: "MINOR_EDIT",
    improvementNeeded: ["Mention lifetime service", "No appointment needed"],
  },
  {
    query: "My necklace needs repair",
    januaryAI: "Please bring it to our nearest store and our craftsmen will assess the repair needed.",
    goodResponse: "I'm sorry to hear that! Please bring it to any Zoya store and our expert craftsmen will assess it right away. If it's under warranty, repairs are complimentary. Otherwise, we'll give you a quote before proceeding. Which store is convenient for you?",
    category: "TONE_ADJUSTMENT",
    improvementNeeded: ["Show empathy", "Mention warranty", "Ask about location"],
  },

  // Payment Queries
  {
    query: "Do you have EMI options?",
    januaryAI: "Yes, we offer 0% EMI options on purchases above ₹50,000 for 3-12 months.",
    goodResponse: "Yes! We offer 0% EMI on purchases above ₹50,000 for 3, 6, 9, or 12 months on all major credit cards. We also have special financing options and gold exchange programs. Which piece are you interested in?",
    category: "MINOR_EDIT",
    improvementNeeded: ["Mention card brands", "Gold exchange"],
  },

  // Complaint/Issue
  {
    query: "Wrong item was delivered",
    januaryAI: "Thank you for your inquiry. Let me help you with that. Our jewelry pieces are crafted with high-quality materials.",
    goodResponse: "I sincerely apologize for this error! This shouldn't have happened. Let me help resolve this immediately. Could you please share your order number? We'll arrange to pick up the wrong item and deliver the correct piece to you right away, with express shipping at no cost!",
    category: "ACCURACY_ISSUE",
    improvementNeeded: ["Apologize sincerely", "Offer immediate solution", "Don't give generic responses"],
  },

  // Care Instructions
  {
    query: "How do I care for diamond jewelry?",
    januaryAI: "Store diamond jewelry separately in soft pouches. Clean with mild soap and water. Avoid harsh chemicals.",
    goodResponse: "Great question! For diamond jewelry: Store separately in soft pouches to prevent scratching, clean weekly with mild soap and warm water using a soft brush, avoid chlorine and harsh chemicals, and remove before exercising. We also offer complimentary professional cleaning anytime at our stores!",
    category: "MINOR_EDIT",
    improvementNeeded: ["More detailed", "Mention free cleaning service"],
  },
];

// Manager names for rotation
const managers = [
  "Rahul Sharma",
  "Priya Patel",
  "Sarah Johnson",
  "Amit Kumar",
  "Neha Reddy",
];

async function main() {
  console.log('🗑️  Clearing existing data...');

  // Delete existing data
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

  // Generate conversations across 3 months
  const totalConversations = 4343; // Match the expected total from insights
  const conversationsPerMonth = Math.floor(totalConversations / 3);

  let totalSuggestions = 0;
  let totalEdits = 0;

  // Helper to get random scenario
  const getRandomScenario = () => conversationScenarios[Math.floor(Math.random() * conversationScenarios.length)];

  // Helper to generate date in specific month
  const getDateInMonth = (monthOffset: number) => {
    const date = new Date('2026-01-01');
    date.setMonth(date.getMonth() + monthOffset);
    date.setDate(Math.floor(Math.random() * 28) + 1);
    date.setHours(Math.floor(Math.random() * 14) + 9); // 9 AM to 11 PM
    date.setMinutes(Math.floor(Math.random() * 60));
    return date;
  };

  for (let month = 0; month < 3; month++) {
    const monthName = ['January', 'February', 'March'][month];
    console.log(`\n📅 Processing ${monthName} 2026...`);

    const conversationsThisMonth = month === 2
      ? totalConversations - (conversationsPerMonth * 2) // Remainder in last month
      : conversationsPerMonth;

    for (let i = 0; i < conversationsThisMonth; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const scenario = getRandomScenario();
      const createdAt = getDateInMonth(month);

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
          content: scenario.query,
          isFromCustomer: true,
          createdAt,
        },
      });

      // Determine AI response and acceptance based on month
      let aiResponse: string;
      let acceptanceScore: number;
      let editCategory: string;
      let needsEdit: boolean;

      if (month === 0) {
        // January: Poor AI responses (35-55% acceptance)
        aiResponse = scenario.januaryAI;
        acceptanceScore = 0.35 + Math.random() * 0.20;
        editCategory = scenario.category;
        needsEdit = true;
      } else if (month === 1) {
        // February: Improving (58-73% acceptance), partial responses
        const improvementLevel = Math.random();
        if (improvementLevel < 0.7) {
          // 70% are getting better
          aiResponse = scenario.goodResponse.split('.').slice(0, 2).join('.') + '.';
          acceptanceScore = 0.58 + Math.random() * 0.15;
          editCategory = 'MINOR_EDIT';
          needsEdit = true;
        } else {
          // 30% still have issues
          aiResponse = scenario.januaryAI;
          acceptanceScore = 0.40 + Math.random() * 0.15;
          editCategory = scenario.category;
          needsEdit = true;
        }
      } else {
        // March: AI learned well (75-95% acceptance)
        const masteryLevel = Math.random();
        if (masteryLevel < 0.85) {
          // 85% are now good
          aiResponse = scenario.goodResponse;
          acceptanceScore = 0.75 + Math.random() * 0.20;
          editCategory = Math.random() < 0.7 ? 'NONE' : 'MINOR_EDIT';
          needsEdit = Math.random() < 0.3; // Only 30% need edits
        } else {
          // 15% still need minor improvements
          aiResponse = scenario.goodResponse.split('!')[0] + '.';
          acceptanceScore = 0.65 + Math.random() * 0.10;
          editCategory = 'MINOR_EDIT';
          needsEdit = true;
        }
      }

      // Create AI suggestion
      const suggestion = await prisma.suggestedReply.create({
        data: {
          messageId: userMessage.id,
          content: aiResponse,
          confidence: acceptanceScore,
          productIds: JSON.stringify([]), // Empty for now
          wasUsed: true,
          createdAt,
        },
      });

      totalSuggestions++;

      // Create AI message (using first user as bot for now)
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: users[0].id, // Using first user as system/bot
          content: aiResponse,
          isFromCustomer: false,
          createdAt: new Date(createdAt.getTime() + 1000),
        },
      });

      // Create edit feedback if needed
      if (needsEdit) {
        const manager = managers[Math.floor(Math.random() * managers.length)];
        const editPercentage = Math.random() * 0.40 + 0.15; // 15-55% edit
        const similarityScore = 1 - editPercentage;

        await prisma.aIEditFeedback.create({
          data: {
            suggestedReplyId: suggestion.id,
            originalSuggestion: aiResponse,
            editedContent: scenario.goodResponse,
            editedBy: manager,
            customerQuery: scenario.query,
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
            keyChanges: JSON.stringify(scenario.improvementNeeded),
            improvementNeeded: JSON.stringify(scenario.improvementNeeded),
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

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(50));
  console.log(`📊 Total Conversations: ${totalConversations}`);
  console.log(`💬 Total AI Suggestions: ${totalSuggestions}`);
  console.log(`✏️  Total Edits: ${totalEdits}`);
  console.log(`📈 Edit Rate: ${((totalEdits / totalSuggestions) * 100).toFixed(1)}%`);
  console.log('\n🎯 Acceptance Score Progression:');
  console.log('   January:  35-55% (Learning Phase)');
  console.log('   February: 58-73% (Improving)');
  console.log('   March:    75-95% (Mastered)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
