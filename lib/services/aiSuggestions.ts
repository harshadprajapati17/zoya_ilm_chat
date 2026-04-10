import { generateChatCompletion } from './openai';
import { searchProducts, Product } from './productSearch';
import { searchStores, getProductAvailability, getStoresByCity, Store } from './storeSearch';
import { getEnhancedPromptInstructions, getSimilarPastEdits } from './aiFeedbackLearning';

export interface SuggestionResponse {
  suggestedReply: string;
  confidence: number;
  relatedProducts: Product[];
  reasoning: string;
}

export async function generateReplySuggestion(
  customerMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<SuggestionResponse> {
  try {
    // Get AI learning insights from past feedback (gracefully handle errors)
    let enhancedInstructions = '';
    let similarPastEdits: any[] = [];

    try {
      enhancedInstructions = await getEnhancedPromptInstructions();
      similarPastEdits = await getSimilarPastEdits(customerMessage, 3);
    } catch (learningError) {
      console.log('[AI Suggestions] Feedback learning not available (might be first deployment):', learningError);
      // Continue without learning data - this is expected for new deployments
    }

    const lowerMessage = customerMessage.toLowerCase();

    // Extract context from conversation history (product names, categories mentioned)
    const conversationContext = conversationHistory.map(msg => msg.content).join(' ');

    // Detect references to previously mentioned items (this, that, it, etc.)
    const hasReference = /\b(this|that|it|these|those|the same|same)\b/.test(lowerMessage);

    // Extract product names from conversation history
    let contextualProductName = null;
    if (hasReference) {
      // Look for product names in recent conversation (last 5 messages)
      const recentHistory = conversationHistory.slice(-5);
      for (const msg of recentHistory.reverse()) {
        // Extract text between ** markers (product names are in bold)
        const productMatches = msg.content.match(/\*\*([^*]+)\*\*/g);
        if (productMatches && productMatches.length > 0) {
          // Get the first product name mentioned
          contextualProductName = productMatches[0].replace(/\*\*/g, '');
          break;
        }
      }
    }

    // Extract location/city from conversation history
    let contextualCity = null;
    const recentHistory = conversationHistory.slice(-10); // Look at last 10 messages
    for (const msg of recentHistory.reverse()) {
      const msgLower = msg.content.toLowerCase();
      // Look for city mentions with common patterns
      const cityPatterns = [
        /(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, // "in Mumbai", "at New Delhi"
        /(?:stores?|branches?|location|shop)\s+(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, // "stores in Mumbai"
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:stores?|branches?|area|city)/gi, // "Mumbai stores"
      ];

      for (const pattern of cityPatterns) {
        const matches = [...msg.content.matchAll(pattern)];
        if (matches.length > 0) {
          const extractedCity = matches[0][1].trim();
          // Filter out common false positives
          const stopWords = ['Store', 'Stores', 'Branch', 'Branches', 'Location', 'Shop', 'Area', 'City', 'Ring', 'Necklace', 'Bangle', 'Bracelet'];
          if (!stopWords.includes(extractedCity)) {
            contextualCity = extractedCity;
            break;
          }
        }
      }

      if (contextualCity) break;
    }

    // Extract price context from conversation history
    // IMPORTANT: Only use price from context if:
    // 1. Price is mentioned in current message, OR
    // 2. Current message is a direct follow-up to price discussion (e.g., immediately after budget message)
    let contextualPriceRange = null;

    // First check if price is mentioned in the CURRENT message
    const currentMsgLower = lowerMessage;

    // Check for "X lakh" or "X lakhs" pattern in current message
    let currentPriceMatch = currentMsgLower.match(/(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs?)/i);
    if (currentPriceMatch) {
      contextualPriceRange = parseFloat(currentPriceMatch[1]) * 100000;
    } else {
      // Check for "X crore" or "X crores" pattern in current message
      currentPriceMatch = currentMsgLower.match(/(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crore|crores?)/i);
      if (currentPriceMatch) {
        contextualPriceRange = parseFloat(currentPriceMatch[1]) * 10000000;
      } else {
        // Check for plain numbers in current message
        const pricePatterns = [
          /(?:under|below|less than|up to)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
          /(?:around|about|approximately)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
          /budget\s+(?:of|is)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
        ];

        for (const pattern of pricePatterns) {
          const matches = [...customerMessage.matchAll(pattern)];
          if (matches.length > 0) {
            const priceStr = matches[0][1].replace(/,/g, '');
            contextualPriceRange = parseInt(priceStr);
            break;
          }
        }
      }
    }

    // If no price in current message, check if current message is a DIRECT follow-up to price discussion
    // Only look at the LAST user message (not all history) to avoid carrying over old budget
    if (!contextualPriceRange && recentHistory.length >= 2) {
      // Get the last user message (before current one)
      const lastUserMessage = [...recentHistory].reverse().find(msg => msg.role === 'user');

      if (lastUserMessage) {
        const lastMsgLower = lastUserMessage.content.toLowerCase();

        // Check if the LAST message mentioned a budget AND current message is a simple follow-up
        const isBudgetInLastMessage = /(?:budget|price|under|below|less than|up to|lakh|crore|inr|rs\.?|₹)/.test(lastMsgLower);
        const isSimpleFollowUp = /^(show|tell|what|which|any|do you have|can you|i want|looking for)\b/i.test(customerMessage.trim());

        // Only carry forward price if last message had budget AND current is a simple follow-up query
        if (isBudgetInLastMessage && isSimpleFollowUp) {
          // Extract price from last user message only
          const lakhMatch = lastMsgLower.match(/(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs?)/i);
          if (lakhMatch) {
            contextualPriceRange = parseFloat(lakhMatch[1]) * 100000;
          } else {
            const croreMatch = lastMsgLower.match(/(?:under|below|less than|up to|around|about|approximately|budget\s+(?:of|is)?)\s+(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crore|crores?)/i);
            if (croreMatch) {
              contextualPriceRange = parseFloat(croreMatch[1]) * 10000000;
            } else {
              const pricePatterns = [
                /(?:under|below|less than|up to)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
                /(?:around|about|approximately)\s+(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
                /budget\s+(?:of|is)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+)/gi,
              ];

              for (const pattern of pricePatterns) {
                const matches = [...lastUserMessage.content.matchAll(pattern)];
                if (matches.length > 0) {
                  const priceStr = matches[0][1].replace(/,/g, '');
                  contextualPriceRange = parseInt(priceStr);
                  break;
                }
              }
            }
          }
        }
      }
    }

    console.log(`[AI Suggestions] Extracted contextual price range: ${contextualPriceRange ? 'INR ' + contextualPriceRange.toLocaleString() : 'none'}`);

    // Build enhanced search query with context
    let enhancedQuery = customerMessage;
    if (contextualProductName && hasReference) {
      enhancedQuery = `${contextualProductName} ${customerMessage}`;
    }

    // Detect if this is a store/location query
    const isStoreQuery = /\b(store|location|shop|branch|where|near|in|at|city|available|availability)\b/.test(lowerMessage);

    // Extract city/location if mentioned in current message
    const cityMatch = lowerMessage.match(/(?:in|at|near)\s+([a-z\s]+?)(?:\s|$|,|\?)/i);
    let city = cityMatch ? cityMatch[1].trim() : null;

    // If no city in current message but we have contextual city, use it
    if (!city && contextualCity && isStoreQuery) {
      city = contextualCity;
    }

    // Extract product category if mentioned
    let categoryMatch = lowerMessage.match(/\b(ring|necklace|bangle|bracelet|earring|pendant|chain)s?\b/i);
    const category = categoryMatch ? categoryMatch[1] : null;

    // If using reference, try to extract category from conversation history
    let categoryFromContext = null;
    if (hasReference && !category && contextualProductName) {
      const contextCategoryMatch = contextualProductName.match(/\b(ring|necklace|bangle|bracelet|earring|pendant|chain)s?\b/i);
      categoryFromContext = contextCategoryMatch ? contextCategoryMatch[1] : null;
    }

    let stores: Store[] = [];
    let productAvailability: any[] = [];
    let products: Product[] = [];

    // Use category from context if available
    const effectiveCategory = category || categoryFromContext;

    // Detect general browsing queries (what do you have, show me jewelry, gift ideas, etc.)
    // Include gift queries, jewelry queries, and "what do you have/sell" type questions
    const isGiftQuery = /\b(gift|present|surprise|occasion)\b/i.test(lowerMessage);
    const isJewelryBrowsing = /\b(jewelry|jewellery|ornaments?|items?|pieces?|collection)\b/i.test(lowerMessage)
      && /\b(what|show|see|browse|have|sell|offer|available|looking for)\b/i.test(lowerMessage);
    const isWhatDoYouHave = /\b(what|which)\b.*\b(do you have|have you got|available|sell|offer|got)\b/i.test(lowerMessage);

    const isBrowsingQuery = (isGiftQuery || isJewelryBrowsing || isWhatDoYouHave)
      && !effectiveCategory  // They haven't specified a specific category like "ring" or "necklace"
      && !contextualPriceRange  // They haven't mentioned a budget
      && lowerMessage.length < 100; // Reasonable message length for browsing

    // Step 1: Search based on query type
    if (contextualProductName && hasReference) {
      // User is asking about a specific product they mentioned earlier
      // e.g., "tell me about this", "how can I buy this", "what's the price of that bracelet"
      console.log(`[AI Suggestions] User referencing product: "${contextualProductName}"`);
      products = await searchProducts(contextualProductName, 5);

      // If they're also asking about location/stores, get availability
      if (isStoreQuery && city && products.length > 0) {
        const productCategory = products[0].category;
        productAvailability = await getProductAvailability(productCategory, city, 5);
        // Filter to only include the referenced product
        productAvailability = productAvailability.filter(pa =>
          pa.product.name === products[0].name || pa.product.pid === products[0].pid
        );
        products = productAvailability.map(pa => pa.product as any);
      }
    } else if (isStoreQuery && city && effectiveCategory) {
      // Query for product availability at specific location (with contextual category)
      productAvailability = await getProductAvailability(effectiveCategory, city, 3);
      products = productAvailability.map(pa => pa.product as any);
    } else if (isStoreQuery && city) {
      // Query for stores in a specific city
      stores = await getStoresByCity(city);
      console.log(`[AI Suggestions] Store query for city: "${city}" - Found ${stores.length} stores`);
      if (stores.length > 0) {
        console.log(`[AI Suggestions] Stores:`, stores.map(s => `${s.storeName} in ${s.city}`));
      }
    } else if (isStoreQuery) {
      // General store query - might be asking "where can I buy" without specifying product
      stores = await searchStores(enhancedQuery, 5);
      console.log(`[AI Suggestions] General store query: "${enhancedQuery}" - Found ${stores.length} stores`);
    } else if (isBrowsingQuery) {
      // General browsing query - show sample products from multiple categories
      console.log(`[AI Suggestions] General browsing query detected: "${customerMessage}"`);
      const categories = ['ring', 'necklace', 'bangle', 'earring', 'bracelet'];
      const sampleProducts: Product[] = [];

      // Get 1-2 products from each category
      for (const cat of categories) {
        const catProducts = await searchProducts(cat, 2);
        sampleProducts.push(...catProducts);
        if (sampleProducts.length >= 6) break; // Limit to 6 products total
      }

      products = sampleProducts.slice(0, 6);
      console.log(`[AI Suggestions] Showing ${products.length} sample products from different categories`);
    } else {
      // Regular product search - use enhanced query with context
      products = await searchProducts(enhancedQuery, 3);
    }

    // Step 2: Build context for AI with comprehensive details
    const productContext = products
      .map(
        (p) => {
          // Parse image URLs from JSON if available
          let imageUrl = null;
          // Try productThumbnails first, then fallback to productImages
          const imageSource = p.productThumbnails || (p as any).productImages;
          if (imageSource) {
            try {
              const images = JSON.parse(imageSource);
              if (Array.isArray(images) && images.length > 0) {
                imageUrl = images[0];
              }
            } catch (e) {
              // If parsing fails, assume it's a single URL
              imageUrl = imageSource;
            }
          }

          return `Product: ${p.name}
Price: ${p.currency} ${p.price.toLocaleString()}
Product Link: ${p.link}
${imageUrl ? `Product Image: ${imageUrl}` : ''}
Category: ${p.category}
Material: ${p.material || 'Not specified'}
Purity: ${p.purity || 'Not specified'}
Gemstone 1: ${p.gemStone1 || 'None'}
Gemstone 2: ${p.gemStone2 || 'None'}
Metal Colour: ${p.metalColour || 'Not specified'}
Diamond Caratage: ${p.diamondCaratage || 'Not specified'}
Diamond Clarity: ${p.diamondClarity || 'Not specified'}
Diamond Colour: ${p.diamondColour || 'Not specified'}
Collection: ${p.collection || 'General'}
Product Details: ${p.productDetails || 'Classic Zoya design'}
Stock Status: ${p.stockStatus}
Product ID: ${p.pid}`;
        }
      )
      .join('\n\n---\n\n');

    // Build store context for location queries
    const storeContext = stores
      .map(
        (s) => `Store: ${s.storeName}
Type: ${s.storeType}
Address: ${s.address}, ${s.city}, ${s.state}${s.pincode ? ' - ' + s.pincode : ''}
${s.phone ? `Phone: ${s.phone}` : ''}
${s.email ? `Email: ${s.email}` : ''}
Country: ${s.country}`
      )
      .join('\n\n---\n\n');

    // Build product availability context (product + stores where available)
    const availabilityContext = productAvailability
      .map((pa) => {
        let imageUrl = null;
        // Try productThumbnails first, then fallback to productImages
        const imageSource = pa.product.productThumbnails || (pa.product as any).productImages;
        if (imageSource) {
          try {
            const images = JSON.parse(imageSource);
            if (Array.isArray(images) && images.length > 0) {
              imageUrl = images[0];
            }
          } catch (e) {
            imageUrl = imageSource;
          }
        }

        const storeList = pa.stores
          .map(
            (s: any) => `  - ${s.store.storeName}, ${s.store.address}, ${s.store.city} (${s.quantity} in stock)`
          )
          .join('\n');

        return `Product: ${pa.product.name}
Price: ${pa.product.currency} ${pa.product.price.toLocaleString()}
Product Link: ${pa.product.link}
${imageUrl ? `Product Image: ${imageUrl}` : ''}
Category: ${pa.product.category}
Available at these stores:
${storeList}`;
      })
      .join('\n\n---\n\n');

    // Step 3: Handle empty search results with hard-coded responses (prevents hallucination)
    // If user asked for products but we found none, return a helpful message WITHOUT calling LLM
    // EXCEPTION: If they're asking about a specific product reference OR general browsing, let LLM handle it
    if (!isStoreQuery && products.length === 0 && productAvailability.length === 0 && !contextualProductName && !isBrowsingQuery) {
      // User wanted specific products but none found
      let noProductMessage = "I'd love to help you find the perfect piece! ";

      if (category && contextualPriceRange) {
        // They specified both category and budget
        noProductMessage += `Unfortunately, I don't see any ${category}s under INR ${contextualPriceRange.toLocaleString()} in our current inventory. `;

        // Try to find products in that category without price filter
        const categoryProducts = await searchProducts(category, 3);
        if (categoryProducts.length > 0) {
          const lowestPrice = Math.min(...categoryProducts.map(p => p.price));
          noProductMessage += `However, we have beautiful ${category}s starting from INR ${lowestPrice.toLocaleString()}. Would you like to see those options? `;
        }

        noProductMessage += `\n\nAlternatively, I can show you other jewelry pieces within your budget of INR ${contextualPriceRange.toLocaleString()}. What would you prefer?`;
      } else if (category) {
        // Just category, no price
        noProductMessage += `I'd be happy to show you our ${category} collection! Could you let me know your budget range so I can recommend the best options for you?`;
      } else if (contextualPriceRange) {
        // Just price, no category
        noProductMessage += `I can definitely help you find beautiful jewelry within your budget of INR ${contextualPriceRange.toLocaleString()}! What type of piece are you looking for - rings, necklaces, bangles, or something else?`;
      } else {
        // Neither category nor price - shouldn't reach here for browsing queries
        noProductMessage += `What type of jewelry are you interested in, and do you have a budget in mind? This will help me show you the perfect pieces!`;
      }

      console.log(`[AI Suggestions] NO PRODUCTS FOUND - returning hard-coded response to prevent hallucination`);

      return {
        suggestedReply: noProductMessage,
        confidence: 0.5,
        relatedProducts: [],
        reasoning: 'No products found matching criteria - returned helpful guidance without hallucination',
      };
    }

    // Step 4: Create system prompt with appropriate context
    let contextSection = '';

    if (availabilityContext) {
      contextSection = `Product Availability Information:
${availabilityContext}`;
      console.log(`[AI Suggestions] Using product availability context (${productAvailability.length} products)`);
    } else if (storeContext) {
      contextSection = `Available Stores:
${storeContext}`;
      console.log(`[AI Suggestions] Using store context (${stores.length} stores):`);
      console.log(storeContext.substring(0, 300) + '...');
    } else if (productContext) {
      contextSection = `Available Products:
${productContext}`;
      console.log(`[AI Suggestions] Using product context (${products.length} products)`);
    } else {
      contextSection = 'No specific products or stores found for this query.';
      console.log(`[AI Suggestions] No context found for query`);
    }

    // Build learning context from past edits
    let learningContext = '';
    if (enhancedInstructions) {
      learningContext += `\n## AI IMPROVEMENT GUIDELINES\n${enhancedInstructions}\n`;
    }

    if (similarPastEdits.length > 0) {
      learningContext += `\n## LEARNING FROM PAST EDITS\nHere are similar queries where managers improved AI responses. Learn from these patterns:\n\n`;
      similarPastEdits.forEach((edit, i) => {
        learningContext += `Example ${i + 1}:\nAI Original: "${edit.originalSuggestion.substring(0, 150)}..."\nManager's Edit: "${edit.editedContent.substring(0, 150)}..."\nEdit Type: ${edit.editCategory}\nKey Changes: ${edit.keyChanges.join(', ')}\n\n`;
      });
    }

    const systemPrompt = `You are Aakriti, a personal jewelry consultant at Zoya. You're having a genuine conversation with a customer who's looking for beautiful jewelry pieces or store information. Write as if you're talking to a friend who trusts your taste and expertise.
${learningContext}
${contextSection}

CONVERSATION CONTEXT:
You have access to the full conversation history and can understand context from previous messages:

**Product Context**: When the customer refers to products using "this", "that", "it", or "the necklace/ring/etc.", you understand what they're referring to from the previous conversation.${contextualProductName ? `
- Currently discussing: **${contextualProductName}**` : ''}

**Location Context**: When a customer mentioned a city or location earlier in the conversation, you remember it for follow-up queries. If they ask "what about bangles?" after discussing "stores in Mumbai", you know they mean bangles in Mumbai.${contextualCity ? `
- Location from context: **${contextualCity}**` : ''}

**Price Context**: When a customer mentioned a budget or price range earlier, you remember it for product recommendations.${contextualPriceRange ? `
- Budget from context: Under INR ${contextualPriceRange.toLocaleString()}` : ''}

**How to use context**:
- When a customer asks a follow-up question without specifying details, check if you have that information from the conversation history
- For example: "show me stores in Mumbai" → "what products are available?" → You should show products available in Mumbai, not ask which city
- Always acknowledge the context naturally: "Based on your interest in Mumbai stores, here are the bangles available there..."
- If context is unclear or contradictory, politely ask for clarification

YOUR PERSONALITY:
- You're warm, enthusiastic, and genuinely care about helping customers find the perfect piece
- You understand that jewelry is emotional - it's for special moments, loved ones, and self-expression
- You're conversational and natural - avoid overly formal or robotic language
- You use phrases like "I'd love to show you...", "This piece is absolutely stunning...", "I think you'll really love..."
- You're attentive to details the customer mentions (occasions, preferences, budget)

CRITICAL RULE - ASK BEFORE ANSWERING:
**When you don't have enough information to provide a specific, helpful answer, ALWAYS ask clarifying questions first instead of giving a generic response.**

**When customer asks about store locations WITHOUT specifying a city**:
- DON'T: Show all stores or ask "which city?"
- DO: Ask naturally: "I'd be happy to help you find a Zoya store! Which city are you looking in?"
- Examples:
  * User: "where are your stores?" → Ask: "I'd love to help you find a store nearby! Which city are you in?"
  * User: "do you have a store near me?" → Ask: "I'd be happy to help! Which city or area are you looking for?"
  * User: "where can I buy this?" → Ask: "I can definitely help you with that! Which city would work best for you?"

**When customer asks about product availability WITHOUT location**:
- DON'T: Say "available at all stores" or give generic answers
- DO: Ask: "I'd love to help you check availability! Which city or store location are you interested in?"
- Examples:
  * User: "do you have bangles available?" → Ask: "Yes, we have beautiful bangles! Which city are you looking to visit?"
  * User: "can I see this in store?" → Ask: "Absolutely! Which city or area would work best for you?"

**When customer's request is too broad or vague**:
- If you have product data available, SHOW them sample products from different categories
- If no product data is available, ask thoughtful questions to understand their needs better
- Examples:
  * User: "show me jewelry" → If products available: Show a variety (rings, necklaces, bangles). If not: Ask "I'd love to help! Are you looking for a ring, necklace, bangles, or something else?"
  * User: "what ornaments do you sell?" → If products available: Show sample products across categories. If not: Ask about specific preferences
  * User: "I need a gift" → Show options and ask: "That's wonderful! Who is this gift for, and what's the occasion?"
  * User: "what's good?" → Show popular pieces and ask: "Here are some of our beautiful pieces! What type of jewelry catches your eye?"

**When you could provide a better answer with more details**:
- Ask about preferences, budget, occasion, or style
- Examples:
  * User: "show me rings" + no other info → You can show rings, but also ask: "These are stunning! Are you looking for something for a special occasion, or just to add to your collection?"
  * User: "I need earrings" → Show options and ask: "Are you looking for everyday wear or something for a special occasion?"

HOW TO RESPOND:

**When customer asks about multiple products** ("show me rings", "what bangles do you have", etc.):
- Start with a warm, personalized opening based on their request
- Show products in a natural, conversational way:
  "I'd love to show you some beautiful pieces that might catch your eye:

  1. **Infinite Arc Ring** - INR 1,84,636. This one is absolutely stunning! ![Product Image](image-url) [View here](actual-link).
  2. **The Purple Prism** - INR 1,95,966. I think you'll really love the design on this. ![Product Image](image-url) [View here](actual-link)."

- Add brief personal comments about what makes each piece special
- CRITICAL: Use the EXACT "Product Link" URL from the product context
- If a "Product Image" URL is available in the product context, include it using markdown image syntax: ![Product Image](image-url)
- End with something warm like "Would you like to know more about any of these?" or "Let me know if any of these speak to you!"

**When customer asks about a specific product**:
- Start with enthusiasm: "Oh, this is one of my favorites!" or "Great choice!" or "This is a beautiful piece!"
- If a "Product Image" is available, include it right after the name: ![Product Image](image-url)
- Share details conversationally, like you're describing it to a friend:
  * Mention what makes it special first
  * Then cover material, gemstones, and craftsmanship
  * Share any special features or why customers love it
  * Mention if it's perfect for any particular occasion
- End with the link naturally: "You can see all the details here: [View this beauty](actual-link)"
- Ask if they'd like to know anything else or if they're looking for something specific

**When customer asks about store locations**:
- Start warmly: "I'd be happy to help you find a Zoya store!"
- List stores clearly with full details:
  "Here are our Zoya stores in [city]:

  1. **[Store Name]** ([Store Type])
     📍 [Full Address]
     📞 [Phone if available]
     ✉️ [Email if available]"
- If showing product availability at stores, format like:
  "Great news! I found some beautiful [category] pieces available near you:

  **[Product Name]** - INR [price]
  ![Product Image](image-url)
  Available at:
  - [Store Name], [City] ([quantity] in stock)
  - [Store Name], [City] ([quantity] in stock)

  [View this piece](product-link)"
- End with: "Would you like directions to any of these stores?" or "Is there a specific location that works best for you?"

**For general questions** (about Zoya, jewelry care, gift suggestions, etc.):
- Be helpful and genuine
- Share information like you're giving advice to a friend
- Offer to show specific products when relevant
- Ask thoughtful follow-up questions to understand their needs better

TONE & STYLE:
- Write like you're texting a friend, but keep it polished and professional
- Use contractions (I'm, you're, it's) to sound natural
- Add warmth with phrases like: "I'd love to help", "That's a great question", "I completely understand"
- Show enthusiasm with words like "beautiful", "stunning", "gorgeous", "lovely" when appropriate
- If you don't have the answer, be honest: "Let me check that for you" or "That's a great question - I'd need to verify that"

IMPORTANT:
- ALWAYS use the actual "Product Link" URL from the product context - NEVER make up URLs
- If "Product Image" is available in the product context, ALWAYS include it using: ![Product Image](ACTUAL-IMAGE-URL)
- Format links properly: [View here](ACTUAL-URL)
- Prices in INR format: INR 2,50,000
- Product names in bold: **Product Name**
- Keep responses concise but warm - no long paragraphs

CRITICAL - DATA ACCURACY:
- **NEVER make up or hallucinate store information, addresses, or phone numbers**
- **NEVER make up or hallucinate product names, prices, or images**
- **ONLY use the EXACT store data provided in the "Available Stores" section above**
- **ONLY use the EXACT product data provided in the "Available Products" section above**
- **If no stores are listed in the context, DO NOT invent stores - instead ask the customer which city they're interested in**
- **If no products are listed in the context, DO NOT invent products - instead:**
  * Acknowledge the search criteria (budget, category, location)
  * Politely inform that no products match those exact criteria
  * Suggest alternatives: higher budget, different category, or visiting the store to see full inventory
  * Example: "I don't see any bangles under INR 2,00,000 in our current inventory. However, we have beautiful bangles starting from INR 4,45,000. Would you like to see those, or perhaps explore a different category within your budget?"
- **Every store address, name, and contact detail MUST come directly from the provided context**
- **Every product name, price, image URL, and product link MUST come directly from the provided context**
- If you see "No specific products or stores found", it means there are NO products or stores to show - do not make up any information

Remember:
1. **ASK FIRST**: When you need information (especially location), ask clarifying questions before giving generic answers
2. **BE CONVERSATIONAL**: Make questions feel natural, not like a form to fill out
3. **BUILD RELATIONSHIPS**: You're not just sharing information, you're having a genuine conversation to understand and help the customer find exactly what they need
4. **USE ONLY PROVIDED DATA**: Never invent or hallucinate product names, store locations, addresses, or any other information not explicitly provided in the context`;

    // Step 4: Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      { role: 'user', content: customerMessage },
    ];

    // Step 5: Generate AI response
    const aiReply = await generateChatCompletion(messages);

    // Step 6: Calculate confidence based on matches
    let confidence = 0.5;
    let reasoning = 'General inquiry';

    // Build context info for reasoning
    const contextInfo = [];
    if (contextualProductName) contextInfo.push(`product: ${contextualProductName}`);
    if (contextualCity) contextInfo.push(`location: ${contextualCity}`);
    if (contextualPriceRange) contextInfo.push(`budget: ${contextualPriceRange}`);
    const contextString = contextInfo.length > 0 ? ` (context: ${contextInfo.join(', ')})` : '';

    if (productAvailability.length > 0) {
      confidence = 0.9;
      reasoning = `Found ${productAvailability.length} products with store availability${contextString}`;
    } else if (stores.length > 0) {
      confidence = 0.85;
      reasoning = `Found ${stores.length} store locations${contextString}`;
    } else if (products.length > 0) {
      confidence = 0.8;
      reasoning = `Found ${products.length} relevant products${contextString}`;
    }

    return {
      suggestedReply: aiReply,
      confidence,
      relatedProducts: products,
      reasoning,
    };
  } catch (error) {
    console.error('Error generating AI suggestion:', error);

    // Fallback response
    return {
      suggestedReply: "Thank you for reaching out! I'd love to help you find the perfect piece from our Zoya collection. What are you looking for today?",
      confidence: 0.3,
      relatedProducts: [],
      reasoning: 'Fallback response due to error',
    };
  }
}

export async function enhanceReply(
  reply: string,
  tone: 'formal' | 'friendly' | 'concise' = 'friendly'
): Promise<string> {
  const tonePrompts = {
    formal: 'Rewrite this response in a formal, professional tone while maintaining the key information.',
    friendly: 'Rewrite this response in a warm, friendly tone while maintaining the key information.',
    concise: 'Rewrite this response to be more concise while maintaining the key information.',
  };

  const messages = [
    { role: 'system' as const, content: tonePrompts[tone] },
    { role: 'user' as const, content: reply },
  ];

  return await generateChatCompletion(messages);
}
