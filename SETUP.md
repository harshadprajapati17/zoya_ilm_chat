# Quick Setup Guide

## Step-by-Step Setup

### 1. Environment Setup

Create your `.env` file:

```bash
cp .env.example .env
```

Add your API keys to `.env`:
- Get OpenAI API key from: https://platform.openai.com/api-keys
- Get Google Translate API key from: https://console.cloud.google.com/

### 2. Database Setup

Option A: **Use Docker (Recommended)**
```bash
# Run PostgreSQL with pgvector
docker run -d \
  --name zoya-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -e POSTGRES_DB=zoya_chat \
  -p 5432:5432 \
  ankane/pgvector

# Update your DATABASE_URL in .env
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/zoya_chat?schema=public"
```

Option B: **Use Local PostgreSQL**
```bash
# Install pgvector
brew install pgvector

# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE zoya_chat;

# Connect to the new database
\c zoya_chat

# Enable pgvector extension
CREATE EXTENSION vector;
```

### 3. Database Migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Import Products

```bash
npx tsx scripts/importProducts.ts /Users/sangeetha/Downloads/products_rows.csv
```

### 5. Create Test Data

Connect to your database:
```bash
psql postgresql://postgres:mysecretpassword@localhost:5432/zoya_chat
```

Run these SQL commands:
```sql
-- Create a lead manager
INSERT INTO "User" (id, name, email, role, language)
VALUES ('manager-123', 'Support Manager', 'manager@zoya.com', 'LEAD_MANAGER', 'en');

-- Create a test customer
INSERT INTO "User" (id, name, email, role, language)
VALUES ('customer-123', 'Test Customer', 'customer@example.com', 'CUSTOMER', 'hi');
```

### 6. Run the Application

```bash
npm run dev
```

Visit:
- http://localhost:3000 - Homepage
- http://localhost:3000/chat - Customer Chat
- http://localhost:3000/dashboard - Lead Management Dashboard

## Testing the Features

### Test Customer Chat
1. Go to http://localhost:3000/chat
2. Send a message: "मुझे सोने की अंगूठी चाहिए" (I want a gold ring in Hindi)
3. Wait for response from lead manager

### Test Lead Management Dashboard
1. Go to http://localhost:3000/dashboard
2. You'll see the customer conversation appear
3. Click on the conversation
4. Click "AI Suggest" to get an intelligent reply
5. Review the AI suggestion with product recommendations
6. Click translate icon to see the Hindi translation
7. Send the reply

### Expected Behavior
- Customer message is detected as Hindi
- Translated to English for the manager
- Manager gets AI suggestion with relevant gold ring products
- Manager's reply is translated back to Hindi
- Customer receives reply in Hindi

## Common Issues

### "Prisma Client not found"
```bash
npx prisma generate
```

### "pgvector extension not found"
Make sure pgvector is installed and enabled in your database.

### "OpenAI API error"
Check your API key and billing status at https://platform.openai.com/

### "Translation failed"
Ensure Google Translate API is enabled in your Google Cloud Console and your key is valid.

## Next Steps

1. **Add Authentication**: Integrate NextAuth.js for user authentication
2. **WebSocket**: Replace polling with WebSocket for real-time updates
3. **File Uploads**: Add support for image sharing
4. **Analytics**: Track conversation metrics
5. **Email Notifications**: Notify managers of new messages

## Support

For issues, check the main README.md or create an issue in the repository.
