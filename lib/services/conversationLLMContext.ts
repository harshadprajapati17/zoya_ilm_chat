/**
 * Contract for suggestion-time LLM context (Gemini: systemInstruction + contents history).
 * DB messages are the source of truth; SuggestedReply rows are never part of chat history.
 */

export type ChatHistoryRole = 'user' | 'assistant';

/** One turn in internal history (customer = user, staff/bot reply = assistant). */
export interface ChatHistoryTurn {
  role: ChatHistoryRole;
  content: string;
}

/** Payload passed into the Gemini suggestion path (types + optional note). */
export interface GeminiSuggestionContext {
  systemInstruction: string;
  historyTail: ChatHistoryTurn[];
  /** e.g. "No assistant reply has been sent after the latest customer message yet." */
  contextNote?: string;
}

/** Minimal DB row shape for building history (SuggestedReply is never included). */
export interface DbMessageForHistory {
  content: string;
  isFromCustomer: boolean;
  createdAt: Date;
}

function turnsEqual(a: ChatHistoryTurn, b: ChatHistoryTurn): boolean {
  return a.role === b.role && a.content === b.content;
}

/**
 * Map persisted messages to internal history.
 * - Customer → user; non-customer → assistant (saved staff text only).
 * - Sorted by createdAt ascending.
 * - Never reads SuggestedReply (those are not Message rows).
 */
export function messagesToHistory(messages: DbMessageForHistory[]): ChatHistoryTurn[] {
  const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return sorted.map((m) => ({
    role: m.isFromCustomer ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));
}

/**
 * Merge client-provided history with DB-built history when both exist.
 *
 * Rules:
 * - Walk from the start while DB[i] and client[i] match (same role + content).
 * - If client has extra turns after the full DB sequence (same prefix), append them (optimistic UI / not yet persisted).
 * - If sequences diverge at any index, **DB wins**: return DB history only (stale client state).
 * - If DB is longer than client but prefix matches, use DB.
 */
export function mergeConversationHistoryDbWins(
  dbHistory: ChatHistoryTurn[],
  clientHistory: ChatHistoryTurn[]
): ChatHistoryTurn[] {
  if (clientHistory.length === 0) return dbHistory;
  if (dbHistory.length === 0) return clientHistory;

  const max = Math.min(dbHistory.length, clientHistory.length);
  for (let i = 0; i < max; i++) {
    if (!turnsEqual(dbHistory[i], clientHistory[i])) {
      return dbHistory;
    }
  }

  if (clientHistory.length > dbHistory.length) {
    return [...dbHistory, ...clientHistory.slice(dbHistory.length)];
  }

  return dbHistory;
}

/**
 * Ensure the suggestion request ends with exactly one user turn for `customerMessage`
 * (callers may send history that already includes it — e.g. UI lists all messages).
 */
export function attachCustomerMessageToHistory(
  history: ChatHistoryTurn[],
  customerMessage: string
): ChatHistoryTurn[] {
  const trimmed = customerMessage.trim();
  const last = history[history.length - 1];
  if (last?.role === 'user' && last.content.trim() === trimmed) {
    return history;
  }
  return [...history, { role: 'user', content: customerMessage }];
}

const DEFAULT_MAX_HISTORY_TURNS = 40;

/** Collapse consecutive identical turns (same role + same trimmed content). */
export function dedupeAdjacentIdenticalTurns(history: ChatHistoryTurn[]): ChatHistoryTurn[] {
  const out: ChatHistoryTurn[] = [];
  for (const turn of history) {
    const prev = out[out.length - 1];
    const same =
      prev && prev.role === turn.role && prev.content.trim() === turn.content.trim();
    if (!same) out.push(turn);
  }
  return out;
}

/**
 * Drop later copies of the same long assistant message (e.g. repeated auto-welcome rows in DB/UI).
 * Assistant lines shorter than `minLen` are always kept.
 */
export function dedupeRepeatedLongAssistantTurns(
  history: ChatHistoryTurn[],
  minLen = 50
): ChatHistoryTurn[] {
  const seen = new Set<string>();
  const out: ChatHistoryTurn[] = [];
  for (const turn of history) {
    if (turn.role === 'assistant') {
      const key = turn.content.trim();
      if (key.length >= minLen && seen.has(key)) continue;
      if (key.length >= minLen) seen.add(key);
    }
    out.push(turn);
  }
  return out;
}

export function limitHistoryTail(history: ChatHistoryTurn[], maxTurns: number): ChatHistoryTurn[] {
  if (history.length <= maxTurns) return history;
  return history.slice(-maxTurns);
}

/**
 * Clean history before sending to the LLM: fewer duplicates, bounded length.
 */
export function sanitizeHistoryTailForSuggestion(
  history: ChatHistoryTurn[],
  options?: { maxTurns?: number }
): ChatHistoryTurn[] {
  const maxTurns = options?.maxTurns ?? DEFAULT_MAX_HISTORY_TURNS;
  let h = dedupeAdjacentIdenticalTurns(history);
  h = dedupeRepeatedLongAssistantTurns(h);
  h = limitHistoryTail(h, maxTurns);
  return h;
}

export type GeminiApiRole = 'user' | 'model';

export interface GeminiContentBlock {
  role: GeminiApiRole;
  parts: { text: string }[];
}

/**
 * Map internal history to Gemini `contents`.
 *
 * **Consecutive same role:** Gemini prefers alternating user/model. We **merge** consecutive
 * turns of the same role into a single block, joining texts with `\n\n---\n\n` so no turn is dropped.
 */
export function historyToGeminiContents(history: ChatHistoryTurn[]): GeminiContentBlock[] {
  if (history.length === 0) return [];

  const blocks: GeminiContentBlock[] = [];
  for (const turn of history) {
    const geminiRole: GeminiApiRole = turn.role === 'assistant' ? 'model' : 'user';
    const last = blocks[blocks.length - 1];
    if (last && last.role === geminiRole) {
      const prev = last.parts[0]?.text ?? '';
      last.parts = [{ text: `${prev}\n\n---\n\n${turn.content}` }];
    } else {
      blocks.push({ role: geminiRole, parts: [{ text: turn.content }] });
    }
  }
  return blocks;
}

export function isProvidedHistoryArray(value: unknown): value is ChatHistoryTurn[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      (item as ChatHistoryTurn).role !== undefined &&
      ((item as ChatHistoryTurn).role === 'user' || (item as ChatHistoryTurn).role === 'assistant') &&
      typeof (item as ChatHistoryTurn).content === 'string'
  );
}
