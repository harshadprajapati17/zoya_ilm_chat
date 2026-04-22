# Zoya AI-Powered Lead Management Chat System

A comprehensive chat system for Zoya jewelry brand with AI-powered reply suggestions and multi-lingual support. This system enables seamless communication between customers and lead management teams across different languages.

## Features

### 🤖 AI-Powered Reply Suggestions
- Intelligent reply suggestions based on customer queries
- Vector similarity search across product catalog
- Context-aware responses using conversation history
- Confidence scoring for suggested replies

### 🌍 Multi-Lingual Support
- Automatic language detection
- Real-time translation between customer and team languages
- Support for 10+ languages including Hindi, Spanish, French, German, Chinese, Arabic, and more
- Translation preview before sending messages

### 💎 Product Integration
- Vector search across 12MB+ product database
- Semantic product recommendations
- Product details in AI suggestions
- Direct links to products

### 💬 Real-Time Chat
- Live messaging between customers and lead management team
- Auto-refresh for new messages
- Conversation history tracking
- Message status tracking (sent, delivered, read)

### 📊 Lead Management Dashboard
- View all active conversations
- Assign conversations to managers
- Filter by status and manager
- Customer information at a glance

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM (PostgreSQL recommended for production)
- **Search**: Keyword-based product search (vector search available with PostgreSQL)
- **AI**: OpenAI GPT-4 for reply suggestions
- **Translation**: Google Translate API (with fallback mode)
- **UI Icons**: Lucide React

## Prerequisites

Before you begin, ensure you have installed:
- Node.js 18+
- npm or yarn

You'll also need:
- OpenAI API Key (required for AI suggestions)
- Google Translate API Key (optional - system has fallback mode)

## Current Setup Status

✅ **Already Configured:**
- Database setup complete (SQLite at `/Users/sangeetha/Projects/zoya_ilm/prisma/dev.db`)
- 327 Zoya products imported from CSV
- Environment variables configured in `.env`
- Prisma client generated
- Server running at http://localhost:3000

## Installation (if starting fresh)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

The `.env` file is already configured:

```env
DATABASE_URL="file:///Users/sangeetha/Projects/zoya_ilm/prisma/dev.db"
OPENAI_API_KEY="your-openai-key-here"
GOOGLE_TRANSLATE_API_KEY=""  # Optional
NODE_ENV="development"
```

### 3. Set up the database

Generate Prisma client and push schema:

```bash
npx prisma generate
npx prisma db push
```

### 4. Import product data

Products are already imported! To re-import:

```bash
npx tsx scripts/import-products.ts
```

The script automatically loads from `/Users/sangeetha/Downloads/products_rows.csv`

## Running the Application

### Development Mode

```bash
npm run dev
```

Visit:
- **Homepage**: http://localhost:3000
- **Customer Chat**: http://localhost:3000/chat
- **Lead Management Dashboard**: http://localhost:3000/dashboard

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
zoya_ilm/
├── app/
│   ├── api/                      # API routes
│   │   ├── chat/                 # Chat message endpoints
│   │   ├── conversations/        # Conversation management
│   │   ├── ai/                   # AI suggestion endpoints
│   │   └── translate/            # Translation endpoint
│   ├── chat/                     # Customer chat page
│   ├── dashboard/                # Lead management dashboard
│   └── page.tsx                  # Homepage
├── components/
│   └── chat/
│       ├── CustomerChat.tsx      # Customer chat UI
│       └── LeadManagementDashboard.tsx  # Dashboard UI
├── lib/
│   ├── prisma.ts                 # Prisma client
│   └── services/
│       ├── llm.ts                # Configurable LLM integration
│       ├── translation.ts        # Translation service
│       ├── productSearch.ts      # Vector search
│       └── aiSuggestions.ts      # AI reply generation
├── prisma/
│   └── schema.prisma             # Database schema
└── scripts/
    └── importProducts.ts         # Product import script
```

## API Endpoints

### Chat
- `POST /api/chat` - Send a message
- `GET /api/chat?conversationId=xxx` - Get conversation messages

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/[id]` - Get conversation details
- `PATCH /api/conversations/[id]` - Update conversation

### AI
- `POST /api/ai/suggestions` - Generate AI reply suggestion

### Translation
- `POST /api/translate` - Translate text

## Usage Guide

### For Customers

1. Navigate to `/chat`
2. Messages are automatically sent in your preferred language
3. Receive responses from the support team
4. Messages are auto-translated if needed

### For Lead Management Team

1. Navigate to `/dashboard`
2. View all active conversations in the sidebar
3. Click on a conversation to view details
4. Click "AI Suggest" to get intelligent reply suggestions
5. Edit the suggestion or write your own reply
6. Click translate icon to preview translation
7. Send message to customer

## Key Features Explained

### AI Reply Suggestions

When a customer sends a message:
1. System searches for relevant products using vector similarity
2. AI analyzes the query and conversation context
3. Generates a contextual reply mentioning relevant products
4. Returns confidence score and related product links
5. Manager can use, edit, or ignore the suggestion

### Multi-Lingual Flow

1. Customer types in their preferred language (e.g., Hindi)
2. Message is detected and translated to English for manager
3. Manager sees both original and translated text
4. Manager replies in English
5. Reply is automatically translated to customer's language
6. Customer receives message in their language

### Product Search

The system uses vector embeddings for semantic search:
1. Customer query is converted to embedding
2. PostgreSQL pgvector finds similar products
3. Results ranked by similarity score
4. Top matches included in AI suggestions

## Customization

### Adding More Languages

Edit `lib/services/translation.ts`:

```typescript
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  // Add more languages
  ta: 'Tamil',
  te: 'Telugu',
  // ...
};
```

### Changing AI Model

Edit `lib/services/llm.ts`:

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o', // Change to gpt-4, gpt-3.5-turbo, etc.
  // ...
});
```

## Troubleshooting

### Module not found: @/app/generated/prisma
Run these commands:
```bash
npx prisma generate
rm -rf .next
npm run dev
```

### Database connection errors
Ensure DATABASE_URL uses absolute path with three slashes:
```env
DATABASE_URL="file:///Users/sangeetha/Projects/zoya_ilm/prisma/dev.db"
```

### Translation not working
Without Google Translate API key, the system operates in fallback mode (returns original text). To enable full translation, add a valid API key to `.env`.

### AI suggestions failing
- Check your OpenAI API key is valid
- Ensure you have sufficient OpenAI credits
- Verify the key in `.env` file is correct

### Products not importing
- Verify the CSV file exists at `/Users/sangeetha/Downloads/products_rows.csv`
- Ensure the CSV format matches the expected schema
- Run with `npx tsx scripts/import-products.ts`

## Production Deployment

For production, it's recommended to:
1. **Switch to PostgreSQL** with pgvector for better performance and vector search
2. **Add proper authentication** (NextAuth.js, Auth0, etc.)
3. **Set up proper environment variables** on your hosting platform
4. **Configure rate limiting** for API endpoints
5. **Add monitoring** (Sentry, LogRocket, etc.)

## License

MIT
