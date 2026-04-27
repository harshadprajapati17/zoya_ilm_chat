import OpenAI from 'openai';
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import type { ChatHistoryTurn, GeminiContentBlock } from './conversationLLMContext';
import { historyToGeminiContents } from './conversationLLMContext';

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

interface EmbeddingOptions {
  dimensions?: number;
}

type LLMProvider = 'openai' | 'gemini';

const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase() as LLMProvider;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || undefined });

const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const GEMINI_EMBEDDING_DIMENSION = Number(process.env.GEMINI_EMBEDDING_DIMENSION || 3072);

function shortPreview(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}...`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function withHint(error: unknown, hint: string): Error {
  const baseMessage = getErrorMessage(error);
  const err = new Error(`${baseMessage} | hint=${hint}`);
  if (error instanceof Error && error.stack) {
    err.stack = error.stack;
  }
  return err;
}

function ensureProviderCredentials() {
  if (provider === 'gemini' && !process.env.GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required when LLM_PROVIDER=gemini');
  }
  if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  }
}

function getSystemInstruction(messages: LLMMessage[]) {
  const systemMessages = messages.filter((m) => m.role === 'system').map((m) => m.content);
  return systemMessages.length > 0 ? systemMessages.join('\n\n') : undefined;
}

const GEMINI_LOG_MAX_CHARS = Number(process.env.LLM_LOG_MAX_CHARS || 8000);
const GEMINI_LOG_FULL = process.env.LLM_LOG_FULL === '1' || process.env.LLM_LOG_FULL === 'true';

function truncateForLog(text: string, max = GEMINI_LOG_MAX_CHARS): string {
  if (GEMINI_LOG_FULL) return text;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [truncated ${text.length - max} chars]`;
}

function logGeminiRequest(
  source: string,
  payload: {
    model: string;
    systemInstruction: string;
    contents: GeminiContentBlock[];
    generationConfig: Record<string, unknown>;
  }
) {
  const contentsForLog = payload.contents.map((c, i) => ({
    index: i,
    role: c.role,
    textLength: c.parts[0]?.text?.length ?? 0,
    textPreview: truncateForLog(c.parts[0]?.text ?? ''),
  }));
  console.log(
    `[LLM][Gemini][request][${source}]`,
    JSON.stringify(
      {
        model: payload.model,
        systemInstructionLength: payload.systemInstruction.length,
        systemInstructionPreview: truncateForLog(payload.systemInstruction),
        contents: contentsForLog,
        generationConfig: payload.generationConfig,
      },
      null,
      2
    )
  );
}

function logGeminiResponse(source: string, text: string) {
  console.log(
    `[LLM][Gemini][response][${source}]`,
    JSON.stringify(
      {
        textLength: text.length,
        textPreview: truncateForLog(text),
      },
      null,
      2
    )
  );
}

function extractGeminiText(result: {
  text?: string;
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}): string {
  if (result.text && result.text.trim().length > 0) {
    return result.text;
  }
  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const joined = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return joined;
}

const HISTORY_TURN_LOG_MAX = Number(process.env.LLM_LOG_HISTORY_TURN_MAX || 1200);

/** Always-on logs for the reply-suggestion path (both providers): system + role-wise history. */
function logReplySuggestionInput(p: LLMProvider, systemInstruction: string, historyTail: ChatHistoryTurn[]) {
  const history = historyTail.map((t, i) => ({
    index: i,
    role: t.role,
    contentLength: t.content.length,
    contentPreview: truncateForLog(t.content, HISTORY_TURN_LOG_MAX),
  }));
  console.log(
    `[LLM][reply-suggestion][input][${p}]`,
    JSON.stringify(
      {
        systemInstructionLength: systemInstruction.length,
        systemInstructionPreview: truncateForLog(systemInstruction),
        historyTurnCount: historyTail.length,
        history,
      },
      null,
      2
    )
  );
}

function logReplySuggestionOutput(p: LLMProvider, text: string) {
  console.log(
    `[LLM][reply-suggestion][output][${p}]`,
    JSON.stringify(
      {
        textLength: text.length,
        textPreview: truncateForLog(text),
      },
      null,
      2
    )
  );
}

/**
 * Gemini chat with explicit system instruction and multi-turn `contents` (user/model).
 * Use for the suggestion pipeline; logs request/response for observability.
 */
export async function generateGeminiChatFromContents(
  systemInstruction: string,
  contents: GeminiContentBlock[],
  options: ChatCompletionOptions = {},
  logMeta: { source: string; skipGeminiDetailLogs?: boolean } = { source: 'gemini-contents' }
): Promise<string> {
  const modelName = options.model || GEMINI_CHAT_MODEL;
  const baseGenerationConfig = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 500,
  };

  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const generationConfig = {
      ...baseGenerationConfig,
      // Retry with lower temperature to reduce empty outputs.
      temperature: attempt === 1 ? baseGenerationConfig.temperature : 0.2,
    };

    if (!logMeta.skipGeminiDetailLogs) {
      logGeminiRequest(logMeta.source, {
        model: modelName,
        systemInstruction,
        contents,
        generationConfig,
      });
    }

    const result = await gemini.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemInstruction.trim() ? systemInstruction : undefined,
        ...generationConfig,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      },
    });

    const text = extractGeminiText(result);
    if (text) {
      if (!logMeta.skipGeminiDetailLogs) {
        logGeminiResponse(logMeta.source, text);
      }
      return text;
    }

    const candidateCount = result.candidates?.length ?? 0;
    console.error(
      `[LLM][Gemini][empty-response][${logMeta.source}]`,
      JSON.stringify(
        {
          attempt,
          candidateCount,
          firstCandidatePartCount: result.candidates?.[0]?.content?.parts?.length ?? 0,
        },
        null,
        2
      )
    );
  }

  throw new Error('Gemini returned empty response text');
}

async function generateOpenAIEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
  const dimensions = options.dimensions ?? Number(process.env.OPENAI_EMBEDDING_DIMENSION || 1536);
  const response = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: text,
    dimensions,
  });

  return response.data[0].embedding;
}

async function generateGeminiEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
  const targetDimensions = options.dimensions ?? GEMINI_EMBEDDING_DIMENSION;
  const response = await gemini.models.embedContent({
    model: GEMINI_EMBEDDING_MODEL,
    contents: text,
    config: {
      outputDimensionality: targetDimensions,
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error('Gemini embedding response did not contain vector values');
  }
  if (values.length !== targetDimensions) {
    throw new Error(
      `Gemini embedding dimension mismatch: expected ${targetDimensions}, got ${values.length}`
    );
  }
  return values;
}

export async function generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
  try {
    ensureProviderCredentials();
    if (provider === 'gemini') {
      return await generateGeminiEmbedding(text, options);
    }
    return await generateOpenAIEmbedding(text, options);
  } catch (error) {
    const hint = `provider=${provider};type=embedding;inputChars=${text.length};dimensions=${options.dimensions ?? 'default'}`;
    const wrappedError = withHint(error, hint);
    console.error('Error generating embedding:', wrappedError);
    throw wrappedError;
  }
}

function isGeminiOverloadedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('"status":"UNAVAILABLE"') ||
    error.message.includes('"code":503') ||
    error.message.includes('status: 503') ||
    error.message.includes('experiencing high demand')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const systemInstruction = getSystemInstruction(messages) ?? '';
  const historyTail: ChatHistoryTurn[] = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));
  return generateGeminiChatFromContents(
    systemInstruction,
    historyToGeminiContents(historyTail),
    options,
    { source: 'legacy-llm-messages' }
  );
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
    const requestedModel = options.model || (provider === 'gemini' ? GEMINI_CHAT_MODEL : OPENAI_CHAT_MODEL);
    const lastMessage = messages[messages.length - 1];
    const hint = [
      `provider=${provider}`,
      'type=chat',
      `model=${requestedModel}`,
      `messageCount=${messages.length}`,
      `lastRole=${lastMessage?.role || 'none'}`,
      `lastPreview="${shortPreview(lastMessage?.content || '')}"`,
    ].join(';');
    const wrappedError = withHint(error, hint);
    console.error('Error generating chat completion:', wrappedError);
    throw wrappedError;
  }
}

/**
 * Reply-suggestion pipeline: explicit system instruction + multi-turn history (no duplicate user turn).
 * Gemini: logs IO via {@link generateGeminiChatFromContents}. OpenAI: unchanged chat messages shape.
 */
export async function generateSuggestionChatCompletion(
  systemInstruction: string,
  historyTail: ChatHistoryTurn[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    ensureProviderCredentials();
    const suggestionOptions: ChatCompletionOptions = {
      maxTokens: 650,
      temperature: 0.78,
      ...options,
    };
    logReplySuggestionInput(provider, systemInstruction, historyTail);

    if (provider === 'gemini') {
      const geminiContents = historyToGeminiContents(historyTail);
      try {
        const text = await generateGeminiChatFromContents(
          systemInstruction,
          geminiContents,
          suggestionOptions,
          { source: 'reply-suggestion', skipGeminiDetailLogs: true }
        );
        logReplySuggestionOutput('gemini', text);
        return text;
      } catch (primaryError) {
        const fallbackModel = process.env.GEMINI_SUGGESTION_FALLBACK_MODEL || 'gemini-2.5-flash-lite';
        const primaryModel = suggestionOptions.model || GEMINI_CHAT_MODEL;
        const isEmptyError =
          primaryError instanceof Error && primaryError.message.includes('Gemini returned empty response text');
        const isOverloadedError = isGeminiOverloadedError(primaryError);

        if (isEmptyError && fallbackModel !== primaryModel) {
          console.warn(
            `[LLM][Gemini][reply-suggestion][fallback] primary model "${primaryModel}" returned empty output; retrying with "${fallbackModel}"`
          );
          const fallbackText = await generateGeminiChatFromContents(
            systemInstruction,
            geminiContents,
            { ...suggestionOptions, model: fallbackModel },
            { source: 'reply-suggestion-fallback', skipGeminiDetailLogs: true }
          );
          logReplySuggestionOutput('gemini', fallbackText);
          return fallbackText;
        }

        if (isOverloadedError) {
          const retryDelayMs = Number(process.env.GEMINI_RETRY_DELAY_MS || 900);
          console.warn(
            `[LLM][Gemini][reply-suggestion][retry] primary model "${primaryModel}" overloaded (503); retrying after ${retryDelayMs}ms`
          );
          await delay(retryDelayMs);

          const retryModel = fallbackModel || primaryModel;
          const retryText = await generateGeminiChatFromContents(
            systemInstruction,
            geminiContents,
            { ...suggestionOptions, model: retryModel },
            { source: 'reply-suggestion-retry', skipGeminiDetailLogs: true }
          );
          logReplySuggestionOutput('gemini', retryText);
          return retryText;
        }

        throw primaryError;
      }
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: systemInstruction },
      ...historyTail.map((t) => ({
        role: (t.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: t.content,
      })),
    ];
    const text = await generateOpenAIChatCompletion(messages, suggestionOptions);
    logReplySuggestionOutput('openai', text);
    return text;
  } catch (error) {
    const requestedModel = options.model || (provider === 'gemini' ? GEMINI_CHAT_MODEL : OPENAI_CHAT_MODEL);
    const lastTurn = historyTail[historyTail.length - 1];
    const hint = [
      `provider=${provider}`,
      'type=suggestion-chat',
      `model=${requestedModel}`,
      `systemChars=${systemInstruction.length}`,
      `historyTurns=${historyTail.length}`,
      `lastRole=${lastTurn?.role || 'none'}`,
      `lastPreview="${shortPreview(lastTurn?.content || '')}"`,
    ].join(';');
    const wrappedError = withHint(error, hint);
    console.error('Error generating suggestion chat completion:', wrappedError);
    throw wrappedError;
  }
}

export function getLLMProvider(): LLMProvider {
  return provider;
}
