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

// Realistic conversation scenarios with actual AI responses
const conversationScenarios = [
  // Product Info queries (EXCELLENT performance)
  {
    query: "Show me bangles",
    januaryAI: "Here are bangles from our collection.",
    februaryAI: "I'd be happy to show you our bangle collection. We have traditional and contemporary designs.",
    marchAI: "I'd love to show you our exquisite bangle collection! We have traditional Kundan bangles, contemporary diamond bangles, and daily wear gold bangles. What style are you interested in?",
    managerEdit: "I'd love to show you our exquisite bangle collection! We have:\n- Traditional Kundan bangles with intricate detailing\n- Contemporary diamond bangles for special occasions\n- Elegant daily wear gold bangles\n\nWhat style catches your eye, or would you like to know more about a specific type?",
  },
  {
    query: "Is this available in my size?",
    januaryAI: "Yes, we have different sizes available.",
    februaryAI: "Most of our jewelry can be resized. What size are you looking for?",
    marchAI: "Yes, most of our rings and bangles can be customized to your size! Could you share which piece you're interested in and your size requirement?",
    managerEdit: "Yes, most of our rings and bangles can be customized to your perfect fit! Could you share which piece has caught your eye and your size requirement? We typically deliver sized jewelry within 5-7 business days.",
  },
  {
    query: "Can I customize this necklace?",
    januaryAI: "Customization options are available.",
    februaryAI: "Yes, we offer customization services. What changes would you like?",
    marchAI: "Absolutely! We offer customization for most of our necklaces. You can modify the length, metal type, or even gemstones. What customization are you considering?",
    managerEdit: "Absolutely! We'd be delighted to customize this necklace for you. Popular modifications include:\n- Adjusting the chain length\n- Changing gold color (yellow/white/rose)\n- Swapping gemstones\n- Adding/removing elements\n\nWhat customization did you have in mind? Our design team can create something uniquely yours!",
  },

  // Gifting queries (GOOD performance)
  {
    query: "I'm looking for an anniversary gift",
    januaryAI: "We have many options for gifts.",
    februaryAI: "Congratulations on your anniversary! What type of jewelry does your partner prefer?",
    marchAI: "How wonderful! Congratulations on your anniversary! Could you tell me a bit about your partner's style and your budget range? This will help me suggest the perfect piece.",
    managerEdit: "How wonderful! Congratulations on your anniversary! 💝\n\nTo help me find the perfect piece for your partner, could you share:\n- Their jewelry style (classic, modern, or traditional)\n- Preferred metal (gold/platinum)\n- Your budget range\n\nOur popular anniversary gifts include solitaire pendants, diamond earrings, and personalized bangles.",
  },
  {
    query: "Best ring for birthday gift under 50k?",
    januaryAI: "We have rings under 50k.",
    februaryAI: "We have beautiful rings under 50,000. Are you looking for gold or diamond rings?",
    marchAI: "Great choice! For ₹50,000, we have stunning options like solitaire rings, designer gold bands, and gemstone rings. What's the recipient's style preference?",
    managerEdit: "Great choice! Within ₹50,000, I can show you some beautiful options:\n\n- Elegant solitaire diamond rings (₹35k-₹48k)\n- Designer 18K gold bands with intricate work (₹28k-₹45k)\n- Gemstone rings with rubies or emeralds (₹32k-₹50k)\n\nWhat style does the birthday person usually wear - classic, modern, or traditional?",
  },

  // Bridal queries (EXCELLENT performance)
  {
    query: "Show me bridal necklace sets",
    januaryAI: "Here are our bridal necklaces.",
    februaryAI: "We have beautiful bridal necklace sets. Are you looking for traditional or contemporary designs?",
    marchAI: "Congratulations on the upcoming wedding! Our bridal collection features stunning sets in Kundan, Polki, and diamond designs. What's your wedding theme - traditional, contemporary, or a fusion?",
    managerEdit: "Congratulations on the upcoming wedding! ✨\n\nOur bridal necklace collection features:\n- Traditional Kundan sets with matching earrings (₹1.5L-₹8L)\n- Regal Polki sets with intricate work (₹2L-₹10L)\n- Contemporary diamond sets for modern brides (₹3L-₹15L)\n\nWhat's your wedding theme, and do you have a budget in mind? I'd love to show you pieces that match your vision!",
  },
  {
    query: "I need a mangalsutra",
    januaryAI: "We have mangalsutra designs available.",
    februaryAI: "We have traditional and modern mangalsutra designs. What style do you prefer?",
    marchAI: "Wonderful! We have both traditional black bead mangalsutras and contemporary diamond designs. Are you looking for daily wear or something more elaborate?",
    managerEdit: "Wonderful! We have beautiful mangalsutra designs:\n\n**Traditional Style:**\n- Classic black bead with gold pendant (₹25k-₹80k)\n- Temple work designs (₹45k-₹1.2L)\n\n**Contemporary Style:**\n- Diamond mangalsutras for daily wear (₹35k-₹95k)\n- Convertible designs (wear as bracelet too) (₹60k-₹1.5L)\n\nAre you looking for daily wear or something more elaborate for special occasions?",
  },

  // Pricing queries (FAIR performance)
  {
    query: "Why is this so expensive?",
    januaryAI: "The price reflects the quality and craftsmanship.",
    februaryAI: "The price includes the gold weight, gemstone quality, and intricate craftsmanship involved in creating this piece.",
    marchAI: "I understand! The pricing reflects several factors: gold/platinum weight, certified diamond/gemstone quality, expert craftsmanship hours, and hallmark certification. Would you like me to break down the costs for you?",
    managerEdit: "I completely understand your concern! Let me break down what goes into the pricing:\n\n- **Gold/Platinum weight** at current market rates\n- **Certified diamonds/gemstones** with quality certificates\n- **Expert craftsmanship** - hours of skilled artisan work\n- **Hallmark certification** ensuring purity\n- **Brand warranty** and lifetime service\n\nWould you like me to show you similar designs at different price points, or explain the breakdown for this specific piece?",
  },
  {
    query: "Do you have EMI options?",
    januaryAI: "Yes, EMI is available.",
    februaryAI: "Yes, we offer EMI options on credit cards and with Bajaj Finserv. What amount are you looking at?",
    marchAI: "Yes, we offer flexible EMI options! We partner with major credit cards and Bajaj Finserv for 3, 6, 9, and 12-month EMIs. For purchases above ₹50,000, we also have 0% EMI offers. What's your preferred payment method?",
    managerEdit: "Yes, we offer flexible EMI options to make your purchase easier! 💳\n\n**Credit Card EMI:**\n- All major cards accepted\n- 3, 6, 9, 12-month tenures\n- Minimal documentation\n\n**Bajaj Finserv:**\n- Up to 24-month EMI\n- Quick approval\n\n**Special Offer:** 0% EMI on purchases above ₹50,000 for 6 months!\n\nWhat purchase amount are you considering? I can calculate the exact EMI for you.",
  },

  // Store Visit queries (GOOD performance)
  {
    query: "Where is your Bengaluru store?",
    januaryAI: "Our store is located in Bengaluru.",
    februaryAI: "Our Bengaluru store is in Jayanagar. Would you like the exact address?",
    marchAI: "Our Bengaluru showroom is located in Jayanagar 4th Block. We're open 10 AM - 8 PM daily. Would you like the complete address and directions?",
    managerEdit: "Our Bengaluru showroom is conveniently located in Jayanagar! 📍\n\n**Address:**\nZoya Jewels, #234, 11th Main Road,\n4th Block, Jayanagar,\nBengaluru - 560011\n\n**Timings:** 10:00 AM - 8:00 PM (All days)\n**Phone:** +91-80-12345678\n\nWe're near the Jayanagar Shopping Complex. Would you like me to share a Google Maps link or help you schedule a visit?",
  },
  {
    query: "Can I visit the store tomorrow?",
    januaryAI: "Yes, you can visit anytime.",
    februaryAI: "Yes, we're open tomorrow from 10 AM to 8 PM. Would you like to book an appointment?",
    marchAI: "Absolutely! We're open tomorrow from 10 AM - 8 PM. Would you like me to schedule a personal consultation so our expert can assist you without any wait time?",
    managerEdit: "Absolutely! We'd love to see you tomorrow! 🌟\n\nWe're open from 10:00 AM - 8:00 PM. To ensure you get personalized attention without waiting, would you like to book a consultation slot?\n\n**Available tomorrow:**\n- Morning slots: 10 AM, 11 AM\n- Afternoon slots: 2 PM, 3 PM, 4 PM\n- Evening slots: 6 PM, 7 PM\n\nWhich time works best for you? I can reserve a slot with our jewelry expert.",
  },

  // After-Sales queries (FAIR performance)
  {
    query: "My necklace needs repair",
    januaryAI: "You can bring it to our store for repair.",
    februaryAI: "We offer repair services. Please bring your necklace to any of our stores, and we'll assess the repair needed.",
    marchAI: "I'm sorry to hear that! We offer complete repair services. Could you describe the issue? You can visit any of our stores, or we can arrange a pickup if you prefer.",
    managerEdit: "I'm sorry to hear your necklace needs repair! We're here to help. 🔧\n\nTo assist you better:\n1. Could you describe the issue (broken chain, loose stone, clasp problem)?\n2. Is it a Zoya piece (warranty may cover this)?\n\n**Our Services:**\n- Free assessment\n- Complimentary repair for warranty items\n- 7-10 day turnaround for most repairs\n- Free pickup & delivery for purchases above ₹50k\n\nWould you like to visit our store or prefer a pickup from your location?",
  },
  {
    query: "What's your return policy?",
    januaryAI: "We have a return policy. Check our website for details.",
    februaryAI: "We offer returns within 7 days with the original invoice and packaging. Customized items are non-returnable.",
    marchAI: "We have a 7-day return policy from the date of delivery. The jewelry must be unused with original packaging and invoice. Customized pieces are non-returnable. Would you like more details?",
    managerEdit: "Here's our return policy for your reference: 📋\n\n**Standard Items:**\n- 7-day return window from delivery date\n- Item must be unused with original tags\n- Original invoice and packaging required\n- Full refund or exchange available\n\n**Non-Returnable:**\n- Customized/personalized jewelry\n- Earrings (hygiene reasons)\n- Sale/clearance items\n\n**Easy Process:**\n1. Contact us within 7 days\n2. We arrange free pickup\n3. Refund within 5-7 business days\n\nDo you have a specific concern about an order?",
  },
  {
    query: "Do you provide certificate?",
    januaryAI: "Yes, certificates are provided.",
    februaryAI: "Yes, all our diamond jewelry comes with certification. Gold items have hallmark certificates.",
    marchAI: "Absolutely! All diamond jewelry comes with IGI/GIA certification, and gold items have BIS hallmark certificates. Would you like to know about a specific piece?",
    managerEdit: "Absolutely! We provide complete certification for authenticity and quality: ✓\n\n**Diamond Jewelry:**\n- IGI/GIA diamond certificates\n- Details: Cut, Clarity, Color, Carat\n- Laser inscription for verification\n\n**Gold Jewelry:**\n- BIS Hallmark certification\n- Purity guarantee (18K/22K/24K)\n- Unique hallmark number\n\n**Additional Documents:**\n- Purchase invoice\n- Warranty card\n- Care instructions\n\nAll certificates are provided at the time of purchase. Are you inquiring about a specific piece?",
  },

  // Product Discovery queries (GOOD performance)
  {
    query: "What are your new arrivals?",
    januaryAI: "We have new arrivals. Check our website.",
    februaryAI: "Our latest collection features contemporary designs in diamond and gold. What type of jewelry interests you?",
    marchAI: "Our newest collection just launched! We have minimalist diamond jewelry, contemporary gold sets, and fusion designs blending traditional and modern aesthetics. What's your style preference?",
    managerEdit: "Our newest collection just launched last week! ✨\n\n**Latest Arrivals:**\n- *Minimalist Diamond Collection* - Daily wear elegance (₹15k-₹85k)\n- *Contemporary Gold Sets* - Statement pieces (₹45k-₹2L)\n- *Fusion Designs* - Traditional meets modern (₹35k-₹1.5L)\n- *Stackable Rings* - Mix & match fun (₹8k-₹25k)\n\nWhat type of jewelry are you looking for? I can show you pieces from the collection that match your style!",
  },
  {
    query: "Any trending designs?",
    januaryAI: "We follow latest trends.",
    februaryAI: "Currently, layered necklaces and ear cuffs are very popular. We also have minimalist designs trending.",
    marchAI: "Yes! Right now, layered necklaces, ear cuffs, and minimalist geometric designs are trending. We also see high demand for convertible jewelry. What catches your interest?",
    managerEdit: "Yes! Here are the hottest trends right now: 🔥\n\n**Trending Now:**\n1. *Layered Necklaces* - Stack 2-3 delicate chains\n2. *Ear Cuffs* - No piercing needed, instant glam\n3. *Minimalist Geometric* - Clean lines, modern aesthetic\n4. *Convertible Jewelry* - Necklace becomes bracelet\n5. *Colored Gemstones* - Emeralds & sapphires making a comeback\n\nWhich trend resonates with your style? I'd love to show you our curated trending collection!",
  },

  // Complaint queries (NEEDS WORK performance)
  {
    query: "Wrong item was delivered",
    januaryAI: "Please contact our customer service.",
    februaryAI: "I apologize for the error. Please share your order number, and we'll resolve this immediately.",
    marchAI: "I sincerely apologize for this mistake! This shouldn't have happened. Could you please share your order number and a photo of the item received? I'll arrange an immediate replacement and pickup of the wrong item.",
    managerEdit: "I sincerely apologize for this unacceptable error! This is not the experience we want for our customers. 🙏\n\n**Immediate Action Plan:**\n1. Share your order number & photo of wrong item\n2. I'll arrange free pickup TODAY\n3. Correct item will be shipped on priority (24-48 hrs delivery)\n4. You'll receive a special discount voucher as an apology\n\n**Your Order Number:** [Waiting for your response]\n\nPlease be assured, I'm personally overseeing this resolution. Is there anything specific you need urgently?",
  },
];

const managers = [
  "Rahul Sharma",
  "Priya Patel",
  "Sarah Johnson",
  "Amit Kumar",
  "Neha Reddy",
];

// Helper to select appropriate response based on month
function getAIResponse(scenario: typeof conversationScenarios[0], month: number): string {
  if (month === 0) return scenario.januaryAI;
  if (month === 1) return scenario.februaryAI;
  return scenario.marchAI;
}

// Helper to determine if edit is needed and get edit category
function getEditInfo(month: number, category: string) {
  let needsEdit: boolean;
  let editCategoryOptions: string[];

  if (month === 0) {
    // January: Almost all need edits
    needsEdit = true;
    editCategoryOptions = ['TONE_ADJUSTMENT', 'LENGTH_PROBLEM', 'ACCURACY_ISSUE', 'COMPLETE_REWRITE'];
  } else if (month === 1) {
    // February: Most need edits
    needsEdit = Math.random() < 0.85;
    editCategoryOptions = ['TONE_ADJUSTMENT', 'MINOR_EDIT', 'LENGTH_PROBLEM'];
  } else {
    // March: Few need edits
    needsEdit = Math.random() < 0.25;
    editCategoryOptions = ['TONE_ADJUSTMENT', 'MINOR_EDIT'];
  }

  const editCategory = editCategoryOptions[Math.floor(Math.random() * editCategoryOptions.length)];
  return { needsEdit, editCategory };
}

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

  // Helper to get random scenario
  const getRandomScenario = () => conversationScenarios[Math.floor(Math.random() * conversationScenarios.length)];

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
      const scenario = getRandomScenario();
      const query = scenario.query;
      const queryCategory = categorizeQuery(query);
      const createdAt = getDateInMonth(month);

      // Get baseline acceptance range for this category (March performance)
      const categoryRange = categoryAcceptanceRanges[queryCategory];

      // Calculate acceptance score based on month
      let acceptanceScore: number;
      if (month === 0) {
        const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        acceptanceScore = Math.max(0.25, baseScore * 0.50); // 50% of March score
      } else if (month === 1) {
        const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        acceptanceScore = baseScore * 0.80; // 80% of March score
      } else {
        acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
      }

      const { needsEdit, editCategory } = getEditInfo(month, queryCategory);

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

      // Generate AI response based on month
      const aiResponse = getAIResponse(scenario, month);
      const managerResponse = scenario.managerEdit;

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

        await prisma.aIEditFeedback.create({
          data: {
            suggestedReplyId: suggestion.id,
            originalSuggestion: aiResponse,
            editedContent: managerResponse,
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
    const scenario = getRandomScenario();
    const query = scenario.query;
    const queryCategory = categorizeQuery(query);
    const createdAt = getDateInLastWeek();

    // Get baseline acceptance range for this category
    const categoryRange = categoryAcceptanceRanges[queryCategory];

    // April: Use March performance (AI is mature)
    const acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
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

    // Use March-level AI response
    const aiResponse = scenario.marchAI;
    const managerResponse = scenario.managerEdit;

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

      const editCategories = ['TONE_ADJUSTMENT', 'MINOR_EDIT'];
      const editCategory = editCategories[Math.floor(Math.random() * editCategories.length)];

      await prisma.aIEditFeedback.create({
        data: {
          suggestedReplyId: suggestion.id,
          originalSuggestion: aiResponse,
          editedContent: managerResponse,
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
