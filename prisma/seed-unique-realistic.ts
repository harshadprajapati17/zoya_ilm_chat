import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Query categories with baseline acceptance score ranges
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
  if (lowerQuery.includes('bridal') || lowerQuery.includes('wedding') || lowerQuery.includes('mangalsutra') || lowerQuery.includes('engagement')) return 'Bridal';
  if (lowerQuery.includes('available') || lowerQuery.includes('size') || lowerQuery.includes('customize') || lowerQuery.includes('white gold') || lowerQuery.includes('difference') || lowerQuery.includes('investment') || lowerQuery.includes('heavy') || lowerQuery.includes('offer')) return 'Product Info';
  return 'Product Info';
}

// Massive list of unique realistic queries
const uniqueQueries = {
  'Product Info': [
    "Show me bangles",
    "Is this available in my size?",
    "Can I customize this necklace?",
    "Can you make this in white gold?",
    "Do you have lightweight bangles?",
    "Difference between 18K and 22K gold?",
    "Is this good for investment?",
    "I want heavy gold jewelry",
    "Do you have any offers?",
    "What's the purity of this gold chain?",
    "Can I get this ring in rose gold?",
    "Do you have studs for sensitive ears?",
    "What's the weight of this bangle?",
    "Is the diamond certified?",
    "Can you resize this ring?",
    "Do you make custom designs?",
    "What's included in the making charges?",
    "Can I see the gemstone certificate?",
    "Is this piece hallmarked?",
    "Do you have matching earrings for this necklace?",
    "What's the carat of these diamonds?",
    "Can I get this without the pendant?",
    "Do you have bigger sizes in this design?",
    "Is this suitable for daily wear?",
    "What metals do you work with?",
    "Can I add more stones to this?",
    "Is platinum available?",
    "What's the difference between natural and lab-grown diamonds?",
    "Do you sell loose diamonds?",
    "Can I upgrade my old jewelry?",
  ],
  'Bridal': [
    "Show me bridal necklace sets",
    "I need a mangalsutra",
    "Bridal bangles with stones",
    "Wedding jewelry sets under 5 lakhs",
    "Traditional bridal jhumkas",
    "Temple jewelry for bride",
    "Antique finish bridal collection",
    "Ruby bridal necklace",
    "Pearl bridal sets",
    "Do you have bridal jewelry on rent?",
    "Can I customize a bridal set?",
    "Bridal jewelry for south Indian wedding",
    "North Indian bridal sets",
    "Contemporary bridal designs",
    "Complete bridal jewelry package",
    "Maang tikka designs",
    "Bridal nose rings",
    "Wedding toe rings",
    "Engagement ring for bride",
    "Minimalist bridal jewelry",
    "Royal bridal collection",
    "Emerald bridal necklace",
    "Polki bridal sets",
    "Kundan work for wedding",
    "Bridal jewelry with warranty",
  ],
  'Gifting': [
    "I'm looking for an anniversary gift",
    "Best ring for birthday gift under 50k?",
    "Jewelry for Diwali gifting",
    "Valentine's day gift ideas",
    "Mother's day jewelry",
    "Graduation gift for daughter",
    "Rakhi gift for sister",
    "Retirement gift ideas",
    "New baby gift jewelry",
    "Housewarming jewelry gift",
    "Gift for mother-in-law",
    "Corporate gifting options",
    "Something special for wife's birthday",
    "Gift wrap available?",
    "Can you add a gift message?",
    "Personalized jewelry gifts",
    "Lucky charm jewelry",
    "Friendship day gifts",
    "Teacher's day gift",
    "Gift sets under 25k",
    "Baby's first jewelry",
    "Zodiac sign pendants",
    "Name engraving on jewelry?",
    "Couple rings for anniversary",
    "Grandma's birthday present ideas",
  ],
  'Product Discovery': [
    "What are your new arrivals?",
    "Any trending designs?",
    "Show me traditional jhumkas",
    "Latest collection launch",
    "Minimalist jewelry designs",
    "Bohemian style jewelry",
    "Vintage inspired pieces",
    "Celebrity style jewelry",
    "Stackable rings collection",
    "Layered necklace sets",
    "Ear cuff designs",
    "Statement jewelry pieces",
    "Oxidized silver collection",
    "Temple jewelry range",
    "Contemporary fusion designs",
    "Handcrafted artisan pieces",
    "Floral motif jewelry",
    "Geometric pattern designs",
    "Nature inspired collection",
    "Royal heritage collection",
    "Color gemstone jewelry",
    "Everyday wear collection",
    "Party wear jewelry",
    "Office wear minimalist pieces",
    "Bestseller items",
  ],
  'Store Visit': [
    "Where is your Bengaluru store?",
    "Can I visit the store tomorrow?",
    "What are your store timings?",
    "Do I need an appointment?",
    "Is parking available?",
    "How many stores in Mumbai?",
    "Store address in Delhi",
    "Can I try jewelry at home?",
    "Do you have a store in Chennai?",
    "Weekend store hours?",
    "Can I book a private consultation?",
    "Virtual tour available?",
    "Store phone number?",
    "Is your showroom wheelchair accessible?",
    "Do you have a store in Hyderabad?",
    "Can I see the workshop?",
    "Store locations near me",
    "What's the closest metro station?",
    "Do you offer refreshments at store?",
    "Can my family accompany me?",
    "Store in Kolkata address?",
    "Pune showroom location?",
    "Ahmedabad store details",
    "Do you have trial rooms?",
    "Can I schedule a weekend visit?",
  ],
  'After-Sales': [
    "My necklace needs repair",
    "What's your return policy?",
    "Do you provide certificate?",
    "Do you do jewelry cleaning?",
    "How do I care for diamond jewelry?",
    "Warranty period?",
    "Free cleaning service?",
    "Chain broke, can you fix it?",
    "Stone fell out of ring",
    "Can you repolish old gold?",
    "Lifetime buyback guarantee?",
    "Exchange old jewelry?",
    "Resizing charges?",
    "How to clean pearls at home?",
    "Rhodium plating service?",
    "Scratches on my bangles",
    "Can you tighten earring backs?",
    "Lost a diamond, can you replace?",
    "Insurance certificate available?",
    "How to store gold jewelry?",
    "Color change in gold chain",
    "Clasp repair service?",
    "Can you restore antique jewelry?",
    "Appraisal service?",
    "How long does repair take?",
  ],
  'Pricing': [
    "Why is this so expensive?",
    "Do you have EMI options?",
    "Current gold rate?",
    "Any discounts available?",
    "Price range for diamond rings?",
    "Is GST extra?",
    "Making charges details?",
    "Price for 1 gram 22k gold today?",
    "Cheapest bangles you have?",
    "Festival discount offers?",
    "Price negotiable?",
    "What payment methods accepted?",
    "Credit card surcharge?",
    "Advance payment required?",
    "Exchange value for old gold?",
    "Hidden charges?",
    "Price includes box?",
    "Do prices change daily?",
    "Bank offers available?",
    "Cashback offers?",
    "Can I pay in installments?",
    "Price match guarantee?",
    "Member discount available?",
    "Bulk purchase discount?",
    "What's your price range for earrings?",
  ],
  'Complaint': [
    "Wrong item was delivered",
    "Size doesn't fit",
    "Stone color looks different",
    "Package arrived damaged",
    "Delivery delayed by 2 weeks",
    "Missing certificate in package",
    "Quality not as expected",
    "Website showed different price",
    "Customer service not responding",
    "Refund not processed",
    "Item looks fake",
    "Scratches on new jewelry",
    "Clasp broken on arrival",
    "Diamond seems cloudy",
    "Gold color fading already",
    "Received used item",
    "Billing amount is wrong",
    "Promised gift not included",
    "Customization not done as requested",
    "Manager was rude at store",
    "Long wait time at showroom",
    "Product description was misleading",
    "Gemstone certification is fake",
    "Weight mentioned is incorrect",
    "Very disappointed with purchase",
  ],
};

const managers = [
  "Rahul Sharma",
  "Priya Patel",
  "Sarah Johnson",
  "Amit Kumar",
  "Neha Reddy",
];

// Determine the appropriate edit category based on AI mistake
function determineEditCategory(query: string, aiResponse: string, month: number): string {
  const lowerQuery = query.toLowerCase();
  const lowerResponse = aiResponse.toLowerCase();

  // PRODUCT_CORRECTION: AI suggested wrong product type
  if (lowerQuery.includes('toe ring') && !lowerResponse.includes('toe')) return 'PRODUCT_CORRECTION';
  if (lowerQuery.includes('nose ring') && !lowerResponse.includes('nose')) return 'PRODUCT_CORRECTION';
  if (lowerQuery.includes('anklet') && !lowerResponse.includes('anklet')) return 'PRODUCT_CORRECTION';
  if (lowerQuery.includes('maang tikka') && !lowerResponse.includes('tikka')) return 'PRODUCT_CORRECTION';

  // ACCURACY_ISSUE: Wrong information or missing critical details
  if (month === 0) {
    // January: Often has accuracy issues
    if (lowerQuery.includes('certificate') && !lowerResponse.includes('certificate')) return 'ACCURACY_ISSUE';
    if (lowerQuery.includes('price') && !lowerResponse.includes('price')) return 'ACCURACY_ISSUE';
    if (lowerQuery.includes('warranty') && !lowerResponse.includes('warranty')) return 'ACCURACY_ISSUE';
    return Math.random() < 0.4 ? 'ACCURACY_ISSUE' : 'COMPLETE_REWRITE';
  }

  // COMPLETE_REWRITE: Response is completely off or unhelpful
  if (month === 0 && aiResponse.length < 50) return 'COMPLETE_REWRITE';
  if (aiResponse.includes('check our website') || aiResponse.includes('contact customer service')) {
    return 'COMPLETE_REWRITE';
  }

  // LENGTH_PROBLEM: Too short, missing details
  if (aiResponse.length < 100 && month <= 1) return 'LENGTH_PROBLEM';

  // TONE_ADJUSTMENT: Right info but wrong tone
  if (month === 1) {
    if (!aiResponse.includes('!') && !aiResponse.includes('?')) return 'TONE_ADJUSTMENT';
    return Math.random() < 0.6 ? 'TONE_ADJUSTMENT' : 'MINOR_EDIT';
  }

  // MINOR_EDIT: March - just small improvements
  if (month === 2) return Math.random() < 0.7 ? 'MINOR_EDIT' : 'TONE_ADJUSTMENT';

  return 'MINOR_EDIT';
}

// Generate contextual AI response based on query and month
function generateAIResponse(query: string, month: number, category: string): string {
  const lowerQuery = query.toLowerCase();

  // Month 0 = January (Poor), Month 1 = February (Better), Month 2+ = March/April (Good)

  // Product Info responses
  if (category === 'Product Info') {
    if (month === 0) {
      if (lowerQuery.includes('bangle')) return "We have bangles available in our store.";
      if (lowerQuery.includes('size')) return "Different sizes are available.";
      if (lowerQuery.includes('customize')) return "Customization is possible.";
      if (lowerQuery.includes('white gold')) return "Yes, white gold is available.";
      if (lowerQuery.includes('weight')) return "The weight varies by design.";
      return "Please check our website for more details.";
    } else if (month === 1) {
      if (lowerQuery.includes('bangle')) return "We have a beautiful collection of bangles in gold and diamond. What style interests you?";
      if (lowerQuery.includes('size')) return "Most of our jewelry can be customized to your size. Which piece are you interested in?";
      if (lowerQuery.includes('customize')) return "Yes, we offer customization services. What modifications would you like?";
      if (lowerQuery.includes('white gold')) return "Yes, we can make most designs in white gold. It takes 5-7 days for customization.";
      if (lowerQuery.includes('weight')) return "The weight depends on the specific design. Could you share which piece you're looking at?";
      return "I'd be happy to help! Could you tell me more about what you're looking for?";
    } else {
      if (lowerQuery.includes('bangle')) return "I'd love to show you our exquisite bangle collection! We have traditional Kundan bangles, contemporary diamond bangles, and elegant daily wear gold bangles. What style are you interested in?";
      if (lowerQuery.includes('size')) return "Yes, most of our rings and bangles can be customized to your perfect fit! Could you share which piece you're interested in and your size requirement? We typically deliver sized jewelry within 5-7 business days.";
      if (lowerQuery.includes('customize')) return "Absolutely! We offer customization for most pieces. You can modify the length, metal type (yellow/white/rose gold), or even gemstones. What customization are you considering?";
      if (lowerQuery.includes('white gold')) return "Absolutely! We can craft this in 18K white gold with rhodium plating for that perfect silvery-white finish. Customization takes 5-7 business days. Would you like me to share the pricing?";
      if (lowerQuery.includes('weight')) return "Great question! The exact weight varies by design. Could you share which piece you're interested in? I'll get you the precise weight in grams along with current pricing.";
      return "I'd be delighted to help you find exactly what you're looking for! Could you tell me more about your preferences?";
    }
  }

  // Bridal responses
  if (category === 'Bridal') {
    // Handle specific bridal items
    if (lowerQuery.includes('toe ring')) {
      if (month === 0) return "We have bridal jewelry available.";
      if (month === 1) return "We have bridal toe rings in silver and gold. Would you like to see traditional designs?";
      return "Congratulations! We have beautiful bridal toe rings in sterling silver and gold. Traditional designs start from ₹2,500. Would you like plain bands or ones with intricate carvings?";
    }
    if (lowerQuery.includes('nose ring') || lowerQuery.includes('nath')) {
      if (month === 0) return "Nose rings are available.";
      if (month === 1) return "We have traditional bridal nose rings. What style do you prefer - small stud or large nath?";
      return "Beautiful choice! We have bridal nose rings from delicate studs to elaborate naths. Traditional naths with pearls (₹15k-₹80k) or diamond studs (₹8k-₹45k)? Which style suits your bridal look?";
    }
    if (lowerQuery.includes('maang tikka') || lowerQuery.includes('tikka')) {
      if (month === 0) return "We have maang tikka designs.";
      if (month === 1) return "Our maang tikka collection has traditional and contemporary designs. What's your preference?";
      return "Stunning choice! Our maang tikka collection features traditional Kundan (₹25k-₹2L), diamond (₹40k-₹3L), and contemporary minimalist designs (₹15k-₹80k). Do you want it to match a specific bridal set?";
    }
    // General bridal
    if (month === 0) return "We have bridal jewelry. Visit our store to see.";
    if (month === 1) return "We have a beautiful bridal collection in traditional and contemporary styles. What type of wedding are you planning?";
    return "Congratulations on the upcoming wedding! ✨ Our bridal collection features stunning Kundan, Polki, and diamond designs. What's your wedding theme - traditional, contemporary, or fusion? I'd love to show you pieces that match your vision!";
  }

  // Gifting responses
  if (category === 'Gifting') {
    if (month === 0) return "We have many gift options available.";
    if (month === 1) return "We have lovely gift options! What's the occasion and your budget?";
    return "How thoughtful! I'd love to help you find the perfect gift. Could you share the occasion, recipient's style preference, and your budget range? This will help me suggest something truly special.";
  }

  // Product Discovery responses
  if (category === 'Product Discovery') {
    if (month === 0) return "Check our latest collection on the website.";
    if (month === 1) return "Our new collection features contemporary and traditional designs. What style interests you?";
    return "Our newest collection just launched! We have minimalist diamond pieces, contemporary gold sets, and fusion designs blending traditional with modern. What's your style preference - classic elegance or trendy statement pieces?";
  }

  // Store Visit responses
  if (category === 'Store Visit') {
    if (month === 0) return "Our stores are located in major cities.";
    if (month === 1) return "We have stores across India. Which city are you in? I can share the nearest location.";
    return "We'd love to welcome you to our showroom! Which city are you in? I'll share the exact address, timings, and can even help you book a personal consultation slot for a seamless experience.";
  }

  // After-Sales responses
  if (category === 'After-Sales') {
    if (month === 0) return "Contact customer service for assistance.";
    if (month === 1) return "We offer comprehensive after-sales services. Could you share more details about your requirement?";
    return "We're here to help! Our after-sales services include repairs, cleaning, certification, and lifetime maintenance. Could you tell me more about what you need? I'll guide you through the process.";
  }

  // Pricing responses
  if (category === 'Pricing') {
    if (month === 0) return "Prices are on the website.";
    if (month === 1) return "Pricing depends on gold weight, diamonds, and craftsmanship. What piece are you interested in?";
    return "I'd be happy to explain our pricing! It's based on current gold rates, certified diamond/gemstone quality, expert craftsmanship, and hallmark certification. Which piece are you interested in? I can provide a detailed breakdown.";
  }

  // Complaint responses
  if (category === 'Complaint') {
    if (month === 0) return "Please email us about your issue.";
    if (month === 1) return "I apologize for the inconvenience. Could you share your order number so I can help resolve this?";
    return "I sincerely apologize for this unacceptable experience! This isn't the standard we hold ourselves to. Could you please share your order number and details? I'll personally ensure this is resolved immediately with priority support.";
  }

  return "How can I assist you today?";
}

// Generate manager's improved response
function generateManagerResponse(query: string, aiResponse: string, category: string): string {
  const lowerQuery = query.toLowerCase();

  // Manager adds empathy, structure, specific details, and clear CTAs

  if (category === 'Product Info') {
    if (lowerQuery.includes('bangle')) {
      return "I'd love to show you our exquisite bangle collection! ✨\n\n**Our Range:**\n- Traditional Kundan bangles with intricate detailing (₹45k-₹3L)\n- Contemporary diamond bangles for special occasions (₹85k-₹5L)\n- Elegant daily wear gold bangles (₹15k-₹80k)\n- Designer gemstone bangles (₹35k-₹2L)\n\n**Sizes:** Available in all sizes, custom sizing in 5-7 days\n\nWhat style catches your eye, or would you like to know more about a specific type?";
    }
    if (lowerQuery.includes('size') || lowerQuery.includes('available')) {
      return "Yes, most of our rings and bangles can be customized to your perfect fit! 💍\n\n**Sizing Details:**\n- Standard sizes: 6-24 (rings), S/M/L (bangles)\n- Custom sizing: Any size you need\n- Turnaround time: 5-7 business days\n- Free sizing for Zoya members\n\nCould you share:\n1. Which piece you're interested in?\n2. Your size requirement?\n\nI'll confirm availability and exact delivery timeline!";
    }
    if (lowerQuery.includes('customize')) {
      return "Absolutely! We'd be delighted to customize this piece for you. 🎨\n\n**Popular Customizations:**\n- Adjust length/size\n- Change metal color (yellow/white/rose gold)\n- Swap gemstones (diamond, ruby, emerald, sapphire)\n- Add/remove design elements\n- Engrave personal message\n\n**Process:**\n- Our designer creates 3D preview\n- Your approval before crafting\n- 7-10 days creation time\n- Delivered with certificate\n\nWhat customization did you have in mind? Let's create something uniquely yours!";
    }
  }

  if (category === 'Bridal') {
    // Specific bridal items
    if (lowerQuery.includes('toe ring')) {
      return "Congratulations on your upcoming wedding! Beautiful choice - toe rings are an essential bridal tradition! 💍\n\n**Our Bridal Toe Ring Collection:**\n- *Sterling Silver Traditional* - Classic smooth bands (₹2,500-₹8,000/pair)\n- *Carved Silver Designs* - Intricate patterns & motifs (₹5,000-₹15,000/pair)\n- *Gold Toe Rings* - 22K yellow gold (₹12,000-₹35,000/pair)\n- *Diamond-studded* - Contemporary bride's choice (₹25,000-₹80,000/pair)\n\n**Styles Available:**\n✓ Plain bands (adjustable)\n✓ Floral carvings\n✓ Temple designs\n✓ Personalized engravings\n\n**Complimentary:**\n- Perfect sizing assistance\n- Complimentary cleaning kit\n- Traditional gift packaging\n\nWhich style resonates with your bridal look - traditional carved or contemporary diamond?";
    }
    if (lowerQuery.includes('nose ring') || lowerQuery.includes('nath')) {
      return "Congratulations! The bridal nose ring is such a beautiful tradition! ✨\n\n**Our Bridal Nose Ring Collection:**\n\n*Delicate Studs:*\n- Diamond studs (₹8k-₹45k)\n- Gold studs with pearl drop (₹6k-₹18k)\n- Gemstone studs (₹10k-₹30k)\n\n*Traditional Nath (Large):*\n- Pearl & gold nath (₹15k-₹80k)\n- Kundan nath with chain (₹25k-₹1.5L)\n- Diamond nath for royal look (₹50k-₹3L)\n\n**Features:**\n✓ Screw/clip backs for non-pierced\n✓ Lightweight designs for all-day comfort\n✓ Matching tikka & earrings available\n\n**Regional Styles:**\n- Bengali: Large nath with pearl strings\n- Maharashtrian: Big pearl nath\n- North Indian: Side nose pin with chain\n- Contemporary: Minimalist diamond stud\n\nWhich regional style or design do you prefer?";
    }
    if (lowerQuery.includes('maang tikka') || lowerQuery.includes('tikka')) {
      return "Stunning choice! The maang tikka is the crown jewel of bridal jewelry! 👑\n\n**Our Maang Tikka Collection:**\n\n*Traditional Kundan:*\n- Classic center-piece designs (₹25k-₹2L)\n- With side passa (₹40k-₹3L)\n- Full matha patti style (₹60k-₹5L)\n\n*Diamond Elegance:*\n- Solitaire drop tikka (₹40k-₹1.5L)\n- Contemporary geometric (₹50k-₹2L)\n- Vintage-inspired (₹70k-₹3L)\n\n*Minimalist Modern:*\n- Single-line delicate (₹15k-₹60k)\n- Rose gold contemporary (₹20k-₹80k)\n- White gold subtle (₹25k-₹1L)\n\n**Match with Your Bridal Set:**\n- Coordinated with necklace design\n- Complementary stone colors\n- Same metal finish\n\n**Customization:**\n✓ Adjustable chain length\n✓ Hook style preference\n✓ Stone color matching\n\nDo you want it to match a specific necklace set, or standalone statement piece?";
    }
    // General bridal sets
    return "Congratulations on the upcoming wedding! ✨ This is such an exciting time!\n\n**Our Bridal Collection:**\n- *Traditional Kundan Sets* - Timeless elegance with matching tikka & earrings (₹1.5L-₹8L)\n- *Regal Polki Collection* - Royal heritage pieces with intricate work (₹2L-₹10L)\n- *Contemporary Diamond Sets* - Modern bride, classic beauty (₹3L-₹15L)\n- *Temple Jewelry* - South Indian traditional (₹80k-₹5L)\n\n**Complimentary Services:**\n- Personal bridal consultant\n- Home trial for sets above ₹2L\n- Customization to match outfit\n\nCould you share:\n1. Your wedding theme?\n2. Budget range?\n3. Preferred metal & style?\n\nI'll curate a personalized selection for you!";
  }

  if (category === 'Gifting') {
    return "How thoughtful of you! Let me help you find the perfect gift. 🎁\n\n**Popular Gift Categories:**\n- *Solitaire Pendants* - Timeless & elegant (₹25k-₹1.2L)\n- *Diamond Studs* - Versatile for any occasion (₹18k-₹85k)\n- *Designer Bangles* - Statement pieces (₹35k-₹2L)\n- *Personalized Jewelry* - With name/initials (₹12k-₹60k)\n\n**Gift Services:**\n- Luxury gift packaging included\n- Personalized gift message card\n- Express delivery available\n- Easy gift exchange policy\n\nTo help me suggest the perfect piece:\n1. What's the occasion?\n2. Recipient's style (classic/modern/traditional)?\n3. Your budget range?\n\nLet's make this gift truly memorable!";
  }

  if (category === 'Product Discovery') {
    return "Exciting! Our newest collection just launched last week! ✨\n\n**Latest Arrivals:**\n- *Minimalist Diamond Collection* - Everyday elegance (₹15k-₹85k)\n- *Contemporary Gold Sets* - Statement pieces (₹45k-₹2L)\n- *Fusion Designs* - Traditional meets modern (₹35k-₹1.5L)\n- *Stackable Rings* - Mix & match (₹8k-₹25k each)\n- *Layered Necklaces* - On-trend & chic (₹12k-₹60k)\n\n**Trending Now:**\n🔥 Ear cuffs - No piercing needed\n🔥 Colored gemstones - Emeralds & sapphires\n🔥 Convertible jewelry - Multi-wear pieces\n\nWhat style resonates with you? I can show you pieces from our trending collection or new arrivals!";
  }

  if (category === 'Store Visit') {
    return "We'd absolutely love to welcome you to our showroom! 🏪\n\n**Store Details:**\n📍 Address: [Zoya Jewels location based on city]\n⏰ Timings: 10:00 AM - 8:00 PM (All days)\n📞 Phone: +91-[number]\n🅿️ Parking: Complimentary valet service\n\n**Visit Options:**\n1. *Walk-in:* Come anytime during business hours\n2. *Book Appointment:* Get dedicated expert assistance (Recommended)\n3. *Private Consultation:* Exclusive cabin for privacy\n\n**Complimentary Services:**\n- Expert jewelry consultation\n- Tea/coffee & refreshments\n- Home trial (for purchases above ₹1L)\n\nWhich city are you in? I'll share the exact details and can book an appointment if you'd like!";
  }

  if (category === 'After-Sales') {
    if (lowerQuery.includes('repair')) {
      return "I'm sorry to hear your jewelry needs attention! We're here to help. 🔧\n\n**To Assist You Better:**\n1. What's the issue? (broken chain, loose stone, clasp problem)\n2. Is it a Zoya piece? (Warranty may cover this)\n\n**Our Repair Services:**\n✓ Free assessment at any store\n✓ Complimentary repair for warranty items\n✓ 7-10 day turnaround for standard repairs\n✓ Free pickup & delivery (purchases above ₹50k)\n✓ 6-month guarantee on repairs\n\n**Next Steps:**\n- Visit any Zoya showroom with the piece\n- OR share photos on WhatsApp for estimate\n- OR book free pickup\n\nWhich option works best for you?";
    }
    if (lowerQuery.includes('return') || lowerQuery.includes('policy')) {
      return "Here's our return policy for your reference: 📋\n\n**Standard Items:**\n✓ 7-day return window from delivery\n✓ Item must be unused with original tags\n✓ Original invoice & packaging required\n✓ Full refund or exchange available\n\n**Non-Returnable Items:**\n✗ Customized/personalized jewelry\n✗ Earrings (hygiene reasons)\n✗ Sale/clearance items (marked final sale)\n\n**Easy Process:**\n1. Contact us within 7 days\n2. We arrange free pickup\n3. Quality check (1-2 days)\n4. Refund within 5-7 business days to original payment method\n\n**Exchange Anytime:**\nLifetime exchange available with current metal value adjustment\n\nDo you have a specific concern about an order?";
    }
    return "We're committed to your complete satisfaction even after purchase! 💚\n\n**After-Sales Services:**\n✓ Lifetime free cleaning & polishing\n✓ Complimentary quality check annually\n✓ Repair services with warranty\n✓ Resizing (nominal charges apply)\n✓ Certificate replacement if lost\n✓ Jewelry care guidance\n✓ Upgrade old jewelry program\n\n**How to Access:**\n- Visit any Zoya showroom\n- Book a service appointment\n- Home pickup available (₹50k+ purchases)\n\nWhat specific service do you need help with?";
  }

  if (category === 'Pricing') {
    if (lowerQuery.includes('emi')) {
      return "Yes, we offer flexible EMI options to make your purchase easier! 💳\n\n**Credit Card EMI:**\n- All major cards accepted (Visa, Mastercard, Amex)\n- Tenures: 3, 6, 9, 12 months\n- Minimal documentation needed\n- Instant approval\n\n**Bajaj Finserv EMI:**\n- Up to 24-month tenure\n- Quick approval process\n- Pre-approved customers get instant EMI\n\n**No Cost EMI Offers:**\n🎉 0% interest for 6 months on purchases above ₹50,000\n🎉 0% interest for 12 months on purchases above ₹2,00,000\n\n**Example:** ₹60,000 purchase\n- 6 months EMI = ₹10,000/month (0% interest)\n- 12 months EMI = ₹5,250/month (interest applicable)\n\nWhat purchase amount are you considering? I can calculate exact EMI for you!";
    }
    if (lowerQuery.includes('expensive') || lowerQuery.includes('why')) {
      return "I completely understand your concern about pricing! Let me break down what makes our pieces valuable: 💎\n\n**Pricing Components:**\n1. **Gold/Metal Cost** (60-70%)\n   - Current market rates for certified metals\n   - BIS hallmarked purity guarantee\n\n2. **Gemstones** (15-25%)\n   - Certified diamonds (IGI/GIA)\n   - Natural, ethically sourced stones\n   - Quality: Cut, Clarity, Color, Carat\n\n3. **Craftsmanship** (10-15%)\n   - Expert artisan work (50+ hours for intricate pieces)\n   - Handcrafted details\n   - Design uniqueness\n\n4. **Certification & Warranty** (2-5%)\n   - Quality certificates\n   - Lifetime service guarantee\n   - Brand authenticity\n\n**Value Additions:**\n✓ Lifetime buyback at fair price\n✓ Free lifetime maintenance\n✓ Exchange program\n\nWould you like me to:\n1. Break down a specific piece's pricing?\n2. Show similar designs at different price points?\n3. Explain our quality standards?";
    }
    return "I'd be happy to help with pricing information! 💰\n\n**Our Pricing:**\n- Based on live gold rates (updated daily)\n- Transparent breakdown provided\n- Certified diamond/gemstone costs\n- Reasonable making charges\n- GST extra as per government norms\n\n**Payment Options:**\n💳 All cards accepted\n🏦 Bank transfers\n💵 Cash (up to ₹2L)\n📱 UPI/Digital wallets\n🎯 EMI facilities available\n\n**Current Offers:**\n- Check ongoing festival discounts\n- Exchange bonus on old gold\n- Member loyalty benefits\n\nWhich piece are you interested in? I can share exact pricing with complete breakdown!";
  }

  if (category === 'Complaint') {
    return "I sincerely apologize for this completely unacceptable experience! This is absolutely not the standard we hold ourselves to. 🙏\n\n**Immediate Action Plan:**\n1. Please share your order number & photos\n2. I'm escalating this to our senior management RIGHT NOW\n3. We'll resolve this within 24 hours with priority attention\n\n**Resolution Options (Your Choice):**\n✓ Immediate replacement with express delivery\n✓ Full refund processed in 24-48 hours\n✓ Store credit with 20% bonus value\n✓ Complimentary upgrade to premium piece\n\n**Our Commitment:**\n- Free pickup of wrong/damaged item TODAY\n- No questions asked return\n- Direct line to customer care manager\n- Compensation for inconvenience\n\n**Next Step:**\nPlease share:\n- Order number: ___\n- Issue details: ___\n- Preferred resolution: ___\n\nI'm personally overseeing this and will ensure you're completely satisfied. You have my word. 💚";
  }

  // Default fallback
  return aiResponse + "\n\nIs there anything specific I can help you with?";
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

  let totalSuggestions = 0;
  let totalEdits = 0;

  // Flatten all queries into a single pool
  const allQueries: Array<{ query: string; category: string }> = [];
  for (const [category, queries] of Object.entries(uniqueQueries)) {
    for (const query of queries) {
      allQueries.push({ query, category });
    }
  }

  // Shuffle queries
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const shuffledQueries = shuffleArray(allQueries);

  // Helper to generate date
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

  const conversationsPerMonth = Math.floor(shuffledQueries.length / 3);
  const conversationsApril = 150;

  let queryIndex = 0;

  // Generate for 3 months
  for (let month = 0; month < 3; month++) {
    const monthName = ['January', 'February', 'March'][month];
    console.log(`\n📅 Processing ${monthName} 2026...`);

    const conversationsThisMonth = month === 2
      ? shuffledQueries.length - (conversationsPerMonth * 2)
      : conversationsPerMonth;

    for (let i = 0; i < conversationsThisMonth && queryIndex < shuffledQueries.length; i++, queryIndex++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const { query, category } = shuffledQueries[queryIndex];
      const createdAt = getDateInMonth(month);

      const categoryRange = categoryAcceptanceRanges[category];
      let acceptanceScore: number;
      let needsEdit: boolean;

      if (month === 0) {
        const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        acceptanceScore = Math.max(0.25, baseScore * 0.50);
        needsEdit = true;
      } else if (month === 1) {
        const baseScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        acceptanceScore = baseScore * 0.80;
        needsEdit = Math.random() < 0.85;
      } else {
        acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
        needsEdit = Math.random() < 0.25;
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

      const aiResponse = generateAIResponse(query, month, category);
      const managerResponse = generateManagerResponse(query, aiResponse, category);

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

      if (needsEdit) {
        const manager = managers[Math.floor(Math.random() * managers.length)];

        // Determine edit category based on actual AI mistake
        const editCategory = determineEditCategory(query, aiResponse, month);

        // Adjust edit percentage based on category severity
        let editPercentage: number;
        if (editCategory === 'COMPLETE_REWRITE' || editCategory === 'PRODUCT_CORRECTION') {
          editPercentage = Math.random() * 0.30 + 0.50; // 50-80% change
        } else if (editCategory === 'ACCURACY_ISSUE') {
          editPercentage = Math.random() * 0.25 + 0.35; // 35-60% change
        } else if (editCategory === 'LENGTH_PROBLEM') {
          editPercentage = Math.random() * 0.20 + 0.30; // 30-50% change
        } else if (editCategory === 'TONE_ADJUSTMENT') {
          editPercentage = Math.random() * 0.15 + 0.20; // 20-35% change
        } else { // MINOR_EDIT
          editPercentage = Math.random() * 0.15 + 0.10; // 10-25% change
        }

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
            keyChanges: JSON.stringify([`Improved ${category} response`]),
            improvementNeeded: JSON.stringify([`Better handling of ${category} queries`]),
            createdAt,
          },
        });

        totalEdits++;
      }

      if ((i + 1) % 50 === 0) {
        console.log(`  ✓ Created ${i + 1}/${conversationsThisMonth} conversations`);
      }
    }

    console.log(`✅ ${monthName}: ${conversationsThisMonth} conversations created`);
  }

  // Add April data (reuse some queries)
  console.log(`\n📅 Processing April 2026 (Last 7 days)...`);

  for (let i = 0; i < conversationsApril; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const randomQuery = shuffledQueries[Math.floor(Math.random() * shuffledQueries.length)];
    const { query, category } = randomQuery;
    const createdAt = getDateInLastWeek();

    const categoryRange = categoryAcceptanceRanges[category];
    const acceptanceScore = categoryRange.min + Math.random() * (categoryRange.max - categoryRange.min);
    const needsEdit = Math.random() < 0.20;

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

    const aiResponse = generateAIResponse(query, 2, category); // Use March-level AI
    const managerResponse = generateManagerResponse(query, aiResponse, category);

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

    if (needsEdit) {
      const manager = managers[Math.floor(Math.random() * managers.length)];

      // Determine edit category based on actual AI mistake
      const editCategory = determineEditCategory(query, aiResponse, 2); // April uses March-level (month 2)

      // Adjust edit percentage based on category severity
      let editPercentage: number;
      if (editCategory === 'COMPLETE_REWRITE' || editCategory === 'PRODUCT_CORRECTION') {
        editPercentage = Math.random() * 0.30 + 0.50;
      } else if (editCategory === 'ACCURACY_ISSUE') {
        editPercentage = Math.random() * 0.25 + 0.35;
      } else if (editCategory === 'LENGTH_PROBLEM') {
        editPercentage = Math.random() * 0.20 + 0.30;
      } else if (editCategory === 'TONE_ADJUSTMENT') {
        editPercentage = Math.random() * 0.15 + 0.20;
      } else { // MINOR_EDIT
        editPercentage = Math.random() * 0.15 + 0.10;
      }

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
          toneShift: JSON.stringify({ from: "helpful", to: "warm and consultative" }),
          sentimentAnalysis: JSON.stringify({ original: "positive", edited: "very positive" }),
          keyChanges: JSON.stringify([`Minor improvement to ${category} response`]),
          improvementNeeded: JSON.stringify([`Fine-tuning ${category} queries`]),
          createdAt,
        },
      });

      totalEdits++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  ✓ Created ${i + 1}/${conversationsApril} conversations`);
    }
  }

  console.log(`✅ April (Last 7 days): ${conversationsApril} conversations created`);

  console.log('\n📊 Category Distribution:');
  for (const [category, range] of Object.entries(categoryAcceptanceRanges)) {
    console.log(`   ${category}: ${range.min * 100}-${range.max * 100}%`);
  }

  const totalConversations = queryIndex + conversationsApril;
  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(50));
  console.log(`📊 Total Conversations: ${totalConversations}`);
  console.log(`💬 Total AI Suggestions: ${totalSuggestions}`);
  console.log(`✏️  Total Edits: ${totalEdits}`);
  console.log(`📈 Edit Rate: ${((totalEdits / totalSuggestions) * 100).toFixed(1)}%`);
  console.log(`🎯 Unique Queries Used: ${queryIndex} (No duplicates in Jan-Mar)`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
