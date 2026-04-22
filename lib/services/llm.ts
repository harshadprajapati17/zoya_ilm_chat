import OpenAI from 'openai';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

type LLMRole = 'system' | 'user' | 'assistant';

interface LLMMessage {
  role: LLMRole;
  content: string;
}

interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

type LLMProvider = 'openai' | 'gemini';

const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase() as LLMProvider;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash';
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

function ensureProviderCredentials() {
  if (provider === 'gemini' && !process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required when LLM_PROVIDER=gemini');
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  }
}

function toGeminiContents(messages: LLMMessage[]) {
  return messages
    .filter((m) => m.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));
}

function getSystemInstruction(messages: LLMMessage[]) {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
  return systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined;
}

async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

async function generateGeminiEmbedding(text: string): Promise<number[]> {
  const model = gemini.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const response = await model.embedContent(text);
  return response.embedding.values;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    ensureProviderCredentials();
    if (provider === 'gemini') {
      return await generateGeminiEmbedding(text);
    }
    return await generateOpenAIEmbedding(text);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function generateOpenAIChatCompletion(
  messages: LLMMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: options.model || OPENAI_CHAT_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 500,
  });

  return response.choices[0].message.content || '';
}

async function generateGeminiChatCompletion(
  messages: LLMMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  const model = gemini.getGenerativeModel({
    model: options.model || GEMINI_CHAT_MODEL,
    systemInstruction: getSystemInstruction(messages),
  });

  const result = await model.generateContent({
    contents: toGeminiContents(messages),
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 500,
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  return result.response.text();
}

export async function generateChatCompletion(
  messages: LLMMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    ensureProviderCredentials();
    if (provider === 'gemini') {
      return await generateGeminiChatCompletion(messages, options);
    }
    return await generateOpenAIChatCompletion(messages, options);
  } catch (error) {
    console.error('Error generating chat completion:', error);
    throw error;
  }
}

export function getLLMProvider(): LLMProvider {
  return provider;
}
