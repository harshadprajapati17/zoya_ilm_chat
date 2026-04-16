import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categoryAcceptanceRanges: Record<string, { min: number; max: number }> = {
  'Product Info': { min: 0.82, max: 0.93 },
  'Bridal': { min: 0.76, max: 0.84 },
  'Gifting': { min: 0.71, max: 0.77 },
  'Product Discovery': { min: 0.70, max: 0.76 },
  'Store Visit': { min: 0.66, max: 0.74 },
  'After-Sales': { min: 0.61, max: 0.67 },
  'Pricing': { min: 0.61, max: 0.66 },
  'Complaint': { min: 0.42, max: 0.57 },
};

function categorizeQuery(query: string): string {
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('wrong') || lowerQuery.includes('complaint') || lowerQuery.includes('problem') || lowerQuery.includes('issue') || lowerQuery.includes('damaged')) return 'Complaint';
  if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('expensive') || lowerQuery.includes('emi') || lowerQuery.includes('discount')) return 'Pricing';
  if (lowerQuery.includes('repair') || lowerQuery.includes('clean') || lowerQuery.includes('maintain') || lowerQuery.includes('care') || lowerQuery.includes('return') || lowerQuery.includes('certificate') || lowerQuery.includes('warranty') || lowerQuery.includes('polish')) return 'After-Sales';
  if (lowerQuery.includes('store') || lowerQuery.includes('visit') || lowerQuery.includes('location') || lowerQuery.includes('appointment') || lowerQuery.includes('showroom')) return 'Store Visit';
  if (lowerQuery.includes('show') || lowerQuery.includes('trending') || lowerQuery.includes('new') || lowerQuery.includes('arrival') || lowerQuery.includes('minimalist') || lowerQuery.includes('jhumka') || lowerQuery.includes('collection') || lowerQuery.includes('latest')) return 'Product Discovery';
  if (lowerQuery.includes('gift') || lowerQuery.includes('anniversary') || lowerQuery.includes('birthday') || lowerQuery.includes('diwali') || lowerQuery.includes('valentine')) return 'Gifting';
  if (lowerQuery.includes('bridal') || lowerQuery.includes('wedding') || lowerQuery.includes('mangalsutra') || lowerQuery.includes('engagement') || lowerQuery.includes('toe ring') || lowerQuery.includes('nose ring')) return 'Bridal';
  if (lowerQuery.includes('available') || lowerQuery.includes('size') || lowerQuery.includes('customize') || lowerQuery.includes('white gold') || lowerQuery.includes('difference') || lowerQuery.includes('investment') || lowerQuery.includes('heavy') || lowerQuery.includes('offer')) return 'Product Info';
  return 'Product Info';
}

// Define the "ideal" manager response for each query type
// This represents what the AI should eventually learn
const managerTemplates: Record<string, string> = {
  'repair_necklace': "I'm sorry to hear your jewelry needs attention! We're here to help. 🔧\n\n**To Assist You Better:**\n1. What's the issue? (broken chain, loose stone, clasp problem)\n2. Is it a Zoya piece? (Warranty may cover this)\n\n**Our Repair Services:**\n✓ Free assessment at any store\n✓ Complimentary repair for warranty items\n✓ 7-10 day turnaround for standard repairs\n✓ Free pickup & delivery (purchases above ₹50k)\n✓ 6-month guarantee on repairs\n\n**Next Steps:**\n- Visit any Zoya showroom with the piece\n- OR share photos on WhatsApp for estimate\n- OR book free pickup\n\nWhich option works best for you?",

  'emi_options': "Yes, we offer flexible EMI options to make your purchase easier! 💳\n\n**Credit Card EMI:**\n- All major cards accepted (Visa, Mastercard, Amex)\n- Tenures: 3, 6, 9, 12 months\n- Minimal documentation needed\n- Instant approval\n\n**Bajaj Finserv EMI:**\n- Up to 24-month tenure\n- Quick approval process\n- Pre-approved customers get instant EMI\n\n**No Cost EMI Offers:**\n🎉 0% interest for 6 months on purchases above ₹50,000\n🎉 0% interest for 12 months on purchases above ₹2,00,000\n\n**Example:** ₹60,000 purchase\n- 6 months EMI = ₹10,000/month (0% interest)\n- 12 months EMI = ₹5,250/month (interest applicable)\n\nWhat purchase amount are you considering? I can calculate exact EMI for you!",

  'store_location': "We'd absolutely love to welcome you to our showroom! 🏪\n\n**Store Details:**\n📍 Address: Zoya Jewels, #234, 11th Main Road, 4th Block, Jayanagar, Bengaluru - 560011\n⏰ Timings: 10:00 AM - 8:00 PM (All days)\n📞 Phone: +91-80-12345678\n🅿️ Parking: Complimentary valet service\n\n**Visit Options:**\n1. *Walk-in:* Come anytime during business hours\n2. *Book Appointment:* Get dedicated expert assistance (Recommended)\n3. *Private Consultation:* Exclusive cabin for privacy\n\n**Complimentary Services:**\n- Expert jewelry consultation\n- Tea/coffee & refreshments\n- Home trial (for purchases above ₹1L)\n\nWould you like me to book an appointment slot for you?",

  'bridal_toe_rings': "Congratulations on your upcoming wedding! Beautiful choice - toe rings are an essential bridal tradition! 💍\n\n**Our Bridal Toe Ring Collection:**\n- *Sterling Silver Traditional* - Classic smooth bands (₹2,500-₹8,000/pair)\n- *Carved Silver Designs* - Intricate patterns & motifs (₹5,000-₹15,000/pair)\n- *Gold Toe Rings* - 22K yellow gold (₹12,000-₹35,000/pair)\n- *Diamond-studded* - Contemporary bride's choice (₹25,000-₹80,000/pair)\n\n**Styles Available:**\n✓ Plain bands (adjustable)\n✓ Floral carvings\n✓ Temple designs\n✓ Personalized engravings\n\n**Complimentary:**\n- Perfect sizing assistance\n- Complimentary cleaning kit\n- Traditional gift packaging\n\nWhich style resonates with your bridal look - traditional carved or contemporary diamond?",

  'new_arrivals': "Exciting! Our newest collection just launched last week!\n\n**Latest Arrivals:**\n- *Minimalist Diamond Collection* - Everyday elegance (₹15k-₹85k)\n- *Contemporary Gold Sets* - Statement pieces (₹45k-₹2L)\n- *Fusion Designs* - Traditional meets modern (₹35k-₹1.5L)\n- *Stackable Rings* - Mix & match (₹8k-₹25k each)\n- *Layered Necklaces* - On-trend & chic (₹12k-₹60k)\n\n**Trending Now:**\n- Ear cuffs - No piercing needed\n- Colored gemstones - Emeralds & sapphires\n- Convertible jewelry - Multi-wear pieces\n\nWhat style resonates with you? I can show you pieces from our trending collection or new arrivals!",

  'wrong_delivery': "I sincerely apologize for this completely unacceptable experience! This is absolutely not the standard we hold ourselves to. 🙏\n\n**Immediate Action Plan:**\n1. Please share your order number & photos\n2. I'm escalating this to our senior management RIGHT NOW\n3. We'll resolve this within 24 hours with priority attention\n\n**Resolution Options (Your Choice):**\n✓ Immediate replacement with express delivery\n✓ Full refund processed in 24-48 hours\n✓ Store credit with 20% bonus value\n✓ Complimentary upgrade to premium piece\n\n**Our Commitment:**\n- Free pickup of wrong item TODAY\n- No questions asked return\n- Direct line to customer care manager\n- Compensation for inconvenience\n\n**Next Step:**\nPlease share:\n- Order number: ___\n- Issue details: ___\n- Preferred resolution: ___\n\nI'm personally overseeing this and will ensure you're completely satisfied. You have my word. 💚",
};

// Queries grouped by similarity - AI should learn to respond similarly to similar questions
const queryGroups = [
  {
    templateKey: 'repair_necklace',
    queries: [
      "My necklace needs repair",
      "Chain broke, can you fix it?",
      "Stone fell out of ring",
      "Can you tighten earring backs?",
      "Clasp repair service?",
    ]
  },
  {
    templateKey: 'emi_options',
    queries: [
      "Do you have EMI options?",
      "Can I pay in installments?",
      "Credit card surcharge?",
      "Bank offers available?",
    ]
  },
  {
    templateKey: 'store_location',
    queries: [
      "Where is your Bengaluru store?",
      "Can I visit the store tomorrow?",
      "What are your store timings?",
      "Store phone number?",
      "Pune showroom location?",
    ]
  },
  {
    templateKey: 'bridal_toe_rings',
    queries: [
      "Wedding toe rings",
      "Bridal toe rings",
    ]
  },
  {
    templateKey: 'new_arrivals',
    queries: [
      "What are your new arrivals?",
      "Any trending designs?",
      "Latest collection launch",
      "Bestseller items",
    ]
  },
  {
    templateKey: 'wrong_delivery',
    queries: [
      "Wrong item was delivered",
      "Package arrived damaged",
      "Received used item",
      "Customization not done as requested",
    ]
  },
];

// Generate AI response based on learning progression
function generateAIResponse(query: string, month: number, templateKey: string): string {
  const targetResponse = managerTemplates[templateKey];

  if (month === 0) {
    // January: Very poor, generic responses
    if (templateKey === 'repair_necklace') return "You can bring it to our store for repair.";
    if (templateKey === 'emi_options') return "Yes, EMI is available.";
    if (templateKey === 'store_location') return "Our store is located in Bengaluru.";
    if (templateKey === 'bridal_toe_rings') return "We have bridal jewelry available.";
    if (templateKey === 'new_arrivals') return "Check our latest collection on the website.";
    if (templateKey === 'wrong_delivery') return "Please email us about your issue.";
    return "Please check our website for more details.";
  }

  if (month === 1) {
    // February: Improving - AI starts learning from manager feedback
    // Response is 50-60% similar to target (manager's edit)
    if (templateKey === 'repair_necklace') {
      return "We offer repair services. Please bring your necklace to any of our stores, and we'll assess the repair needed. Most repairs take 7-10 days.";
    }
    if (templateKey === 'emi_options') {
      return "Yes, we offer EMI options on credit cards and with Bajaj Finserv for 3, 6, 9, and 12-month tenures. For purchases above ₹50,000, we also have 0% EMI offers. What amount are you looking at?";
    }
    if (templateKey === 'store_location') {
      return "Our Bengaluru showroom is located in Jayanagar 4th Block, open 10 AM - 8 PM daily. We're at #234, 11th Main Road. Would you like directions or to book an appointment?";
    }
    if (templateKey === 'bridal_toe_rings') {
      return "We have bridal toe rings in silver and gold. Traditional designs start from ₹2,500. Would you like to see plain bands or ones with carvings?";
    }
    if (templateKey === 'new_arrivals') {
      return "Our new collection features minimalist diamond jewelry, contemporary gold sets, and fusion designs. We also have trending pieces like ear cuffs and layered necklaces. What style interests you?";
    }
    if (templateKey === 'wrong_delivery') {
      return "I apologize for this error. Please share your order number and photos. We'll arrange immediate pickup and send the correct item with express delivery, or process a full refund if you prefer.";
    }
    return "I'd be happy to help! Could you tell me more about what you're looking for?";
  }

  // March/April: Excellent - AI has learned, responses are 95%+ similar to manager's template
  // Almost identical, maybe missing just emojis or minor formatting
  if (templateKey === 'repair_necklace') {
    return "I'm sorry to hear your jewelry needs attention! We're here to help. 🔧\n\n**To Assist You Better:**\n1. What's the issue? (broken chain, loose stone, clasp problem)\n2. Is it a Zoya piece? (Warranty may cover this)\n\n**Our Repair Services:**\n✓ Free assessment at any store\n✓ Complimentary repair for warranty items\n✓ 7-10 day turnaround for standard repairs\n✓ Free pickup & delivery (purchases above ₹50k)\n✓ 6-month guarantee on repairs\n\n**Next Steps:**\n- Visit any Zoya showroom with the piece\n- OR share photos on WhatsApp for estimate\n- OR book free pickup\n\nWhich option works best for you?";
  }
  // For all other templates in March, just return the exact manager template
  // This shows AI has fully learned (95%+ similarity = no edit needed)
  return managerTemplates[templateKey] || "I'd be delighted to help you find exactly what you're looking for! Could you tell me more about your preferences?";
}

// Calculate similarity between AI and manager response
function calculateSimilarity(aiResponse: string, managerResponse: string): number {
  // More accurate similarity based on content overlap
  const aiWords = new Set(aiResponse.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const managerWords = new Set(managerResponse.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  // Count overlapping meaningful words
  let commonCount = 0;
  for (const word of aiWords) {
    if (managerWords.has(word)) commonCount++;
  }

  const totalUniqueWords = new Set([...aiWords, ...managerWords]).size;
  const similarity = totalUniqueWords > 0 ? commonCount / totalUniqueWords : 0;

  // Also consider length similarity
  const lengthRatio = Math.min(aiResponse.length, managerResponse.length) /
                      Math.max(aiResponse.length, managerResponse.length);

  // Combine word similarity (70%) and length similarity (30%)
  const combinedSimilarity = (similarity * 0.7) + (lengthRatio * 0.3);

  return Math.min(0.95, Math.max(0.05, combinedSimilarity));
}

// Determine edit category based on similarity
function determineEditCategory(similarity: number, month: number): string {
  // Note: This function only gets called if similarity < 0.90
  // So we don't need to handle the >90% case

  if (month === 0) {
    // January: AI is terrible
    if (similarity < 0.15) return 'COMPLETE_REWRITE';  // Completely different response
    if (similarity < 0.30) return 'ACCURACY_ISSUE';    // Wrong information
    if (similarity < 0.45) return 'LENGTH_PROBLEM';    // Too short, missing details
    return 'TONE_ADJUSTMENT';                           // Has info but wrong tone
  }

  if (month === 1) {
    // February: AI is learning
    if (similarity < 0.35) return 'ACCURACY_ISSUE';    // Still has wrong info
    if (similarity < 0.55) return 'LENGTH_PROBLEM';    // Missing details
    if (similarity < 0.70) return 'TONE_ADJUSTMENT';   // Good info, needs better tone
    return 'MINOR_EDIT';                                // Almost there, small tweaks
  }

  // March/April: AI has learned
  if (similarity < 0.60) return 'TONE_ADJUSTMENT';     // Rare: tone needs adjustment
  if (similarity < 0.75) return 'MINOR_EDIT';          // Small improvements
  if (similarity < 0.90) return 'MINOR_EDIT';          // Very small tweaks

  // This should never happen since we check similarity < 0.90 before calling
  return 'MINOR_EDIT';
}

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

  let totalSuggestions = 0;
  let totalEdits = 0;

  const getDateInMonth = (monthOffset: number) => {
    const date = new Date('2026-01-01');
    date.setMonth(date.getMonth() + monthOffset);
    date.setDate(Math.floor(Math.random() * 28) + 1);
    date.setHours(Math.floor(Math.random() * 14) + 9);
    date.setMinutes(Math.floor(Math.random() * 60));
    return date;
  };

  const getDateInLastWeek = () => {
    const today = new Date('2026-04-06');
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 14) + 9);
    date.setMinutes(Math.floor(Math.random() * 60));
    return date;
  };

  // Generate conversations for each query group across 3 months
  for (let month = 0; month < 3; month++) {
    const monthName = ['January', 'February', 'March'][month];
    console.log(`\n📅 Processing ${monthName} 2026...`);

    let conversationsThisMonth = 0;

    for (const group of queryGroups) {
      for (const query of group.queries) {
        // Each query appears 20-30 times per month (realistic volume)
        const repetitions = Math.floor(Math.random() * 11) + 20; // 20-30

        for (let rep = 0; rep < repetitions; rep++) {
          const user = users[Math.floor(Math.random() * users.length)];
          const category = categorizeQuery(query);
          const createdAt = getDateInMonth(month);

          const categoryRange = categoryAcceptanceRanges[category];
          let acceptanceScore: number;

          if (month === 0) {
            const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
            acceptanceScore = Math.max(0.25, baseScore * 0.50);
          } else if (month === 1) {
            const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
            acceptanceScore = baseScore * 0.80;
          } else {
            acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
          }

          const conversation = await prisma.conversation.create({
            data: { customerId: user.id, createdAt, updatedAt: createdAt },
          });

          const userMessage = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: user.id,
              content: query,
              isFromCustomer: true,
              createdAt,
            },
          });

          // Generate AI response (showing learning progression)
          const aiResponse = generateAIResponse(query, month, group.templateKey);
          const managerResponse = managerTemplates[group.templateKey];

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

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: users[0].id,
              content: aiResponse,
              isFromCustomer: false,
              createdAt: new Date(createdAt.getTime() + 1000),
            },
          });

          // Calculate actual similarity
          const similarity = calculateSimilarity(aiResponse, managerResponse);
          const editPercentage = 1 - similarity;

          // Determine if edit is needed based on ACTUAL similarity
          // If responses are very similar (>90%), no edit needed!
          const needsEdit = similarity < 0.90;

          if (needsEdit) {
            const manager = managers[Math.floor(Math.random() * managers.length)];
            const editCategory = determineEditCategory(similarity, month);

            await prisma.aIEditFeedback.create({
              data: {
                suggestedReplyId: suggestion.id,
                originalSuggestion: aiResponse,
                editedContent: managerResponse,
                editedBy: manager,
                customerQuery: query,
                editCategory,
                editPercentage,
                similarityScore: similarity,
                acceptanceScore,
                toneShift: JSON.stringify({
                  from: month === 0 ? "robotic" : month === 1 ? "helpful" : "warm",
                  to: "warm and consultative"
                }),
                sentimentAnalysis: JSON.stringify({
                  original: month === 0 ? "neutral" : "positive",
                  edited: "very positive"
                }),
                keyChanges: JSON.stringify([`Improved ${category} response with learning from feedback`]),
                improvementNeeded: JSON.stringify([`AI learning from manager corrections for ${category}`]),
                createdAt,
              },
            });

            totalEdits++;
          }

          conversationsThisMonth++;
        }
      }

      if (conversationsThisMonth % 100 === 0) {
        console.log(`  ✓ Created ${conversationsThisMonth} conversations`);
      }
    }

    console.log(`✅ ${monthName}: ${conversationsThisMonth} conversations created`);
  }

  // April data
  console.log(`\n📅 Processing April 2026 (Last 7 days)...`);

  let aprilCount = 0;
  for (const group of queryGroups) {
    for (const query of group.queries) {
      const repetitions = Math.floor(Math.random() * 6) + 5; // 5-10 per query

      for (let rep = 0; rep < repetitions; rep++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const category = categorizeQuery(query);
        const createdAt = getDateInLastWeek();

        const categoryRange = categoryAcceptanceRanges[category];
        const acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);

        const conversation = await prisma.conversation.create({
          data: { customerId: user.id, createdAt, updatedAt: createdAt },
        });

        const userMessage = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: user.id,
            content: query,
            isFromCustomer: true,
            createdAt,
          },
        });

        const aiResponse = generateAIResponse(query, 2, group.templateKey);
        const managerResponse = managerTemplates[group.templateKey];

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

        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            senderId: users[0].id,
            content: aiResponse,
            isFromCustomer: false,
            createdAt: new Date(createdAt.getTime() + 1000),
          },
        });

        const similarity = calculateSimilarity(aiResponse, managerResponse);

        // April: Only create edit if similarity < 90%
        const needsEdit = similarity < 0.90;

        if (needsEdit) {
          const manager = managers[Math.floor(Math.random() * managers.length)];
          const editPercentage = 1 - similarity;
          const editCategory = determineEditCategory(similarity, 2);

          await prisma.aIEditFeedback.create({
            data: {
              suggestedReplyId: suggestion.id,
              originalSuggestion: aiResponse,
              editedContent: managerResponse,
              editedBy: manager,
              customerQuery: query,
              editCategory,
              editPercentage,
              similarityScore: similarity,
              acceptanceScore,
              toneShift: JSON.stringify({ from: "warm", to: "warm and consultative" }),
              sentimentAnalysis: JSON.stringify({ original: "positive", edited: "very positive" }),
              keyChanges: JSON.stringify([`Minor refinement to ${category} response`]),
              improvementNeeded: JSON.stringify([`Fine-tuning ${category} queries`]),
              createdAt,
            },
          });

          totalEdits++;
        }

        aprilCount++;
      }
    }
  }

  console.log(`✅ April (Last 7 days): ${aprilCount} conversations created`);

  console.log('\n📊 Category Distribution:');
  for (const [category, range] of Object.entries(categoryAcceptanceRanges)) {
    console.log(`   ${category}: ${range.min * 100}-${range.max * 100}%`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(50));
  console.log(`📊 Total Conversations: ${totalSuggestions}`);
  console.log(`💬 Total AI Suggestions: ${totalSuggestions}`);
  console.log(`✏️  Total Edits: ${totalEdits}`);
  console.log(`📈 Edit Rate: ${((totalEdits / totalSuggestions) * 100).toFixed(1)}%`);
  console.log(`\n🎓 AI Learning Journey:`);
  console.log(`   January: Poor responses, 100% edit rate`);
  console.log(`   February: Learning, ~85% edit rate`);
  console.log(`   March: Mastered, ~25% edit rate`);
  console.log(`   April: Excellent, ~20% edit rate`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
