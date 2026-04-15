'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Languages,
  RefreshCw,
  Loader2,
  Search,
  Phone,
  Pencil,
  ChevronDown,
  Copy,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import MessageContent from './MessageContent';

interface Conversation {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    language: string;
  };
  customerLanguage: string;
  status: string;
  messages: Array<{
    content: string;
    createdAt: string;
    isFromCustomer: boolean;
  }>;
  updatedAt: string;
}

interface Message {
  id: string;
  content: string;
  translatedContent?: string | null;
  originalLanguage: string;
  isFromCustomer: boolean;
  createdAt: string;
  sessionId?: string | null;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface AISuggestion {
  suggestedReply: string;
  translatedReply: string;
  confidence: number;
  relatedProducts: Array<{
    name: string;
    price: number;
    currency: string;
    link: string;
  }>;
  suggestedReplyId?: string; // ID from database for feedback tracking
}

interface LeadManagementDashboardProps {
  managerId: string;
  managerName: string;
}

// TODO: Re-enable "edit reason" feedback UI in a future iteration.
/*
const EDIT_REASONS = [
  'Wrong Tone',
  'Wrong Product',
  'Inaccurate Info',
  'Missing Detail',
  'Too Long/Short',
];
*/

export default function LeadManagementDashboard({
  managerId,
  managerName,
}: LeadManagementDashboardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [lastSuggestedMessageId, setLastSuggestedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  const [showTranslations, setShowTranslations] = useState<Set<string>>(new Set());
  const [translatingInput, setTranslatingInput] = useState(false);
  const [aiReplyEditMode, setAiReplyEditMode] = useState(false);
  const [aiReplyComposerTab, setAiReplyComposerTab] = useState<'edit' | 'preview'>('edit');
  const [relatedProductsOpen, setRelatedProductsOpen] = useState(true);
  /** `inline` = AI owns composer; `overlay` = user had a draft when AI arrived — show suggestion above input with Copy / Insert */
  const [aiComposerLayout, setAiComposerLayout] = useState<'inline' | 'overlay'>('inline');
  /** Expanded = taller max-height on the AI reply panel; scroll stays inside the panel (not the page). */
  const [aiSuggestionExpanded, setAiSuggestionExpanded] = useState(false);

  // Feedback tracking state
  const [usedAISuggestion, setUsedAISuggestion] = useState<{
    suggestedReplyId: string | null;
    originalSuggestion: string;
    customerQuery: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const inputMessageRef = useRef('');
  /** Ignore AI fetch results if the user switched conversations before the request finished. */
  const activeConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    inputMessageRef.current = inputMessage;
  }, [inputMessage]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // When a new AI suggestion arrives: keep user draft + overlay, or replace input (inline)
  useEffect(() => {
    if (!aiSuggestion) return;
    const hadDraft = inputMessageRef.current.trim().length > 0;
    setAiReplyEditMode(false);
    setAiReplyComposerTab('edit');
    setRelatedProductsOpen(true);

    setAiSuggestionExpanded(false);
    if (hadDraft) {
      setAiComposerLayout('overlay');
      setUsedAISuggestion(null);
    } else {
      setAiComposerLayout('inline');
      setInputMessage(aiSuggestion.suggestedReply);
      const lastCustomerMessage = messagesRef.current.filter((m) => m.isFromCustomer).pop();
      setUsedAISuggestion({
        suggestedReplyId: aiSuggestion.suggestedReplyId || null,
        originalSuggestion: aiSuggestion.suggestedReply,
        customerQuery: lastCustomerMessage?.content || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only when suggestion id/text changes
  }, [aiSuggestion?.suggestedReplyId, aiSuggestion?.suggestedReply]);

  useEffect(() => {
    if (!aiSuggestion) {
      setAiReplyEditMode(false);
      setAiReplyComposerTab('edit');
      setAiComposerLayout('inline');
      setAiSuggestionExpanded(false);
    }
  }, [aiSuggestion]);

  useEffect(() => {
    const id = selectedConversation?.id ?? null;
    activeConversationIdRef.current = id;

    setInputMessage('');
    setAiSuggestion(null);
    setLastSuggestedMessageId(null);
    setUsedAISuggestion(null);
    setIsLoadingSuggestion(false);
    setTranslatingInput(false);
    setAiReplyEditMode(false);
    setAiReplyComposerTab('edit');
    setRelatedProductsOpen(true);
    setAiComposerLayout('inline');
    setAiSuggestionExpanded(false);
    setMessages([]);
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (aiReplyEditMode && aiReplyComposerTab === 'edit') {
      textareaRef.current?.focus();
    }
  }, [aiReplyEditMode, aiReplyComposerTab]);

  // Smart auto-scroll - only scroll if user is at bottom or new message added
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    const newMessageAdded = messages.length > prevMessageCountRef.current;

    // Auto-scroll if user is near bottom OR a new message was added
    if (shouldAutoScrollRef.current || isAtBottom || newMessageAdded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      shouldAutoScrollRef.current = false;
    }

    prevMessageCountRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => fetchMessages(selectedConversation.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // Automatically get AI suggestion when a new customer message arrives
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Only trigger AI suggestion if:
    // 1. Last message is from customer
    // 2. We haven't already generated suggestion for this message
    // 3. There's no existing AI suggestion (or it was cleared after sending)
    // 4. Not currently loading a suggestion
    if (
      lastMessage &&
      lastMessage.isFromCustomer &&
      lastMessage.id !== lastSuggestedMessageId &&
      !aiSuggestion &&
      !isLoadingSuggestion
    ) {
      setLastSuggestedMessageId(lastMessage.id);
      getAISuggestion();
    }
  }, [messages, lastSuggestedMessageId, aiSuggestion, isLoadingSuggestion]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations?status=active');
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`);
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const getAISuggestion = async () => {
    if (!selectedConversation) return;

    const conversationId = selectedConversation.id;
    setIsLoadingSuggestion(true);
    try {
      const lastCustomerMessage = messages
        .filter((m) => m.isFromCustomer)
        .pop();

      if (!lastCustomerMessage) return;

      // Build conversation history from current UI state (not database)
      // This ensures we use the messages visible in the UI, not deleted ones
      const conversationHistory = messages.map(msg => ({
        role: msg.isFromCustomer ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: lastCustomerMessage.id, // Pass messageId to save suggestion to database
          customerMessage: lastCustomerMessage.content,
          targetLanguage: selectedConversation.customerLanguage,
          conversationHistory: conversationHistory, // Send UI state instead
        }),
      });

      const data = await response.json();
      if (activeConversationIdRef.current !== conversationId) return;
      setAiSuggestion(data);
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
    } finally {
      if (activeConversationIdRef.current === conversationId) {
        setIsLoadingSuggestion(false);
      }
    }
  };

  const toggleMessageTranslation = async (messageId: string) => {
    console.log('[Translation] Toggle called for message:', messageId);

    // If already showing translation, just hide it
    if (showTranslations.has(messageId)) {
      console.log('[Translation] Hiding translation');
      const newSet = new Set(showTranslations);
      newSet.delete(messageId);
      setShowTranslations(newSet);
      return;
    }

    // Find the message
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.error('[Translation] Message not found:', messageId);
      return;
    }

    console.log('[Translation] Message found:', {
      id: message.id,
      hasTranslation: !!message.translatedContent,
      originalLang: message.originalLanguage,
      content: message.content.substring(0, 50)
    });

    // If message already has translation, just show it
    if (message.translatedContent && message.originalLanguage !== 'en') {
      console.log('[Translation] Showing existing translation:', message.translatedContent.substring(0, 50));
      const newSet = new Set(showTranslations);
      newSet.add(messageId);
      setShowTranslations(newSet);
      return;
    }

    // Otherwise, fetch translation
    console.log('[Translation] Fetching new translation...');
    setTranslatingMessageId(messageId);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.content,
          targetLanguage: 'en',
          sourceLanguage: message.originalLanguage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Translation] API Error:', errorData);
        alert('Translation failed: ' + (errorData.error || 'Unknown error'));
        return;
      }

      const data = await response.json();
      console.log('[Translation] Translation received:', data);

      // Update message with translation
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, translatedContent: data.translatedText }
          : m
      ));

      // Show translation
      const newSet = new Set(showTranslations);
      newSet.add(messageId);
      setShowTranslations(newSet);
      console.log('[Translation] Translation displayed');
    } catch (error) {
      console.error('[Translation] Error:', error);
      alert('Failed to translate message. Please check console for details.');
    } finally {
      setTranslatingMessageId(null);
    }
  };

  const translateInputToCustomerLanguage = async () => {
    if (!selectedConversation || !inputMessage.trim()) return;

    setTranslatingInput(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputMessage,
          targetLanguage: selectedConversation.customerLanguage,
          sourceLanguage: 'en',
        }),
      });

      const data = await response.json();
      setInputMessage(data.translatedText);
    } catch (error) {
      console.error('Error translating input:', error);
    } finally {
      setTranslatingInput(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!selectedConversation) return;

    // Immediately remove from UI (optimistic update)
    setMessages((prev) => prev.filter(m => m.id !== messageId));

    // Clear AI suggestion and reset tracking to regenerate with new context
    setAiSuggestion(null);
    setLastSuggestedMessageId(null);

    // Also delete from database (fire and forget - UI already updated)
    try {
      await fetch(`/api/chat?messageId=${messageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting message from database:', error);
      // Note: We don't revert the UI change even if DB delete fails
      // This ensures the regenerate feature works immediately
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    shouldAutoScrollRef.current = true; // Force scroll when admin sends message

    // Capture current values before clearing state
    const messageContent = inputMessage;
    const feedbackData = usedAISuggestion;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          senderId: managerId,
          content: messageContent,
          isFromCustomer: false,
          targetLanguage: selectedConversation.customerLanguage,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      setInputMessage('');
      setAiSuggestion(null);
      setUsedAISuggestion(null); // Clear tracking state

      // Check if we need to capture feedback (AI suggestion was used and edited)
      if (feedbackData && feedbackData.suggestedReplyId) {
        const originalSuggestion = feedbackData.originalSuggestion.trim();
        const editedContent = messageContent.trim();

        // Detect if edit was made (content changed)
        if (originalSuggestion !== editedContent) {
          console.log('[Feedback] Edit detected, submitting feedback...');

          // Submit feedback for analysis (fire and forget - don't block UI)
          try {
            await fetch('/api/ai/feedback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                suggestedReplyId: feedbackData.suggestedReplyId,
                originalSuggestion,
                editedContent,
                editedBy: managerId,
                customerQuery: feedbackData.customerQuery,
                conversationContext: {
                  messages: messages.slice(-5).map(m => ({
                    role: m.isFromCustomer ? 'user' : 'assistant',
                    content: m.content
                  }))
                },
              }),
            });
            console.log('[Feedback] Feedback submitted successfully');
          } catch (error) {
            console.error('[Feedback] Error submitting feedback:', error);
            // Don't block UI on feedback submission failure
          }
        } else {
          console.log('[Feedback] No edit detected - suggestion used as-is');
        }
      }

      // Reset the suggestion tracking so new customer messages can trigger suggestions
      // But keep lastSuggestedMessageId so we don't re-suggest for old messages
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };


  // Helper function to check if conversation has unread customer message
  const hasUnreadMessage = (conv: Conversation) => {
    if (!conv.messages || conv.messages.length === 0) return false;
    const lastMessage = conv.messages[0]; // First message in array is the latest (DESC order)
    return lastMessage.isFromCustomer;
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const vhCap =
      typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.32) : 240;
    const maxHeight = Math.min(240, Math.max(100, vhCap));
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [inputMessage]);

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.customer.name.toLowerCase().includes(query) ||
      conv.customer.email?.toLowerCase().includes(query) ||
      conv.customer.phone?.toLowerCase().includes(query)
    );
  });

  const copyAiSuggestion = async () => {
    if (!aiSuggestion) return;
    try {
      await navigator.clipboard.writeText(aiSuggestion.suggestedReply);
    } catch {
      console.error('Clipboard copy failed');
    }
  };

  const insertAiSuggestionOverDraft = () => {
    if (!aiSuggestion) return;
    setInputMessage(aiSuggestion.suggestedReply);
    setAiComposerLayout('inline');
    setAiReplyEditMode(false);
    setAiReplyComposerTab('edit');
    setAiSuggestionExpanded(false);
    setRelatedProductsOpen(true);
    const lastCustomerMessage = messagesRef.current.filter((m) => m.isFromCustomer).pop();
    setUsedAISuggestion({
      suggestedReplyId: aiSuggestion.suggestedReplyId || null,
      originalSuggestion: aiSuggestion.suggestedReply,
      customerQuery: lastCustomerMessage?.content || '',
    });
  };

  const relatedProductsCollapsibleBlock =
    aiSuggestion && aiSuggestion.relatedProducts.length > 0 ? (
      <div className="overflow-hidden rounded-lg border border-[#E8E4DF] bg-white/60">
        <button
          type="button"
          onClick={() => setRelatedProductsOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-[var(--zoya-accent)] transition-colors hover:bg-[#f3efe9]"
          aria-expanded={relatedProductsOpen}
          aria-controls="related-products-panel"
          id="related-products-toggle"
        >
          <span>
            Related products
            <span className="font-normal text-[var(--zoya-muted)]">
              {' '}
              ({aiSuggestion.relatedProducts.length})
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[var(--zoya-muted)] transition-transform duration-200 ${
              relatedProductsOpen ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </button>
        {relatedProductsOpen && (
          <div
            id="related-products-panel"
            role="region"
            aria-labelledby="related-products-toggle"
            className="border-t border-[#E8E4DF] px-3 pb-3 pt-2"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {aiSuggestion.relatedProducts.map((product, idx) => (
                <div
                  key={idx}
                  className="min-w-0 rounded border border-[#E0D9D2] bg-white px-2 py-1.5 text-xs leading-snug text-[var(--zoya-accent)]"
                >
                  <span className="font-medium">{product.name}</span>
                  <span className="text-[var(--zoya-muted)]">
                    {' '}
                    — {product.currency} {product.price.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="flex h-screen zoya-chat-surface">
      {/* Conversations Sidebar */}
      <div
        className="flex w-72 shrink-0 flex-col overflow-hidden border-r bg-[var(--zoya-sidebar-bg)]"
        style={{
          borderColor: 'var(--zoya-border-light)',
        }}
      >
        {/* Title + search share one surface (aligned with main app sidebar) */}
        <header
          className="shrink-0 border-b px-4 pt-4 pb-4"
          style={{
            borderColor: 'var(--zoya-border-light)',
          }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="zoya-heading text-xl font-semibold leading-tight tracking-tight text-[var(--foreground)]">
              Conversations
            </h2>
            <span
              className="shrink-0 tabular-nums rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{
                background: 'var(--zoya-gold-bg)',
                color: 'var(--zoya-gold)',
              }}
            >
              {conversations.length} active
            </span>
          </div>
          <label htmlFor="conv-sidebar-search" className="sr-only">
            Search conversations
          </label>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-[var(--zoya-rail-search-muted)]"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              id="conv-sidebar-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="box-border h-10 w-full rounded-[4px] border border-[var(--zoya-rail-search-border)] bg-white py-0 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--zoya-rail-search-muted)] focus:border-[var(--zoya-gold)] focus:outline-none focus:ring-2 focus:ring-[var(--zoya-gold-bg)]"
            />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-[var(--zoya-accent)] text-sm">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
            const isUnread = hasUnreadMessage(conv);
            const isSelected = selectedConversation?.id === conv.id;
            const initials = conv.customer.name
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className="flex gap-2.5 px-4 py-2.5 cursor-pointer transition-colors border-b"
              style={{
                borderColor: 'var(--zoya-border-light)',
                borderLeft: isSelected
                  ? '3px solid var(--zoya-gold)'
                  : isUnread
                    ? '3px solid var(--zoya-ok)'
                    : '3px solid transparent',
                background: isSelected
                  ? 'rgba(139, 115, 85, 0.12)'
                  : isUnread
                    ? 'rgba(91, 140, 90, 0.10)'
                    : 'transparent',
              }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold"
                style={{
                  background: isSelected
                    ? 'var(--zoya-gold-bg)'
                    : isUnread
                      ? 'rgba(91, 140, 90, 0.12)'
                      : 'var(--zoya-bg-soft)',
                  color: isSelected
                    ? 'var(--zoya-gold)'
                    : isUnread
                      ? 'var(--zoya-ok)'
                      : 'var(--zoya-gold)',
                  border: isSelected
                    ? '1.5px solid var(--zoya-gold-pale)'
                    : isUnread
                      ? '1.5px solid rgba(91, 140, 90, 0.3)'
                      : '1.5px solid var(--zoya-border-light)',
                }}
              >
                {initials}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Row 1: Name + Time */}
                <div className="flex items-center justify-between gap-1">
                  <h3
                    className="text-[13px] truncate"
                    style={{
                      fontWeight: isUnread ? 700 : 600,
                      color: isUnread ? 'var(--foreground)' : 'var(--foreground)',
                    }}
                  >
                    {conv.customer.name}
                  </h3>
                  <span
                    className="text-[10px] whitespace-nowrap shrink-0"
                    style={{ color: isUnread ? 'var(--zoya-ok)' : 'var(--zoya-muted)', fontWeight: isUnread ? 600 : 400 }}
                  >
                    {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Row 2: Message preview + unread badge */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p
                    className="text-xs truncate flex-1"
                    style={{
                      color: isUnread ? 'var(--foreground)' : 'var(--zoya-accent)',
                      fontWeight: isUnread ? 500 : 400,
                    }}
                  >
                    {conv.messages[0]?.content || 'No messages yet'}
                  </p>
                  {isUnread && (
                    <span
                      className="shrink-0 w-[18px] h-[18px] rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                      style={{ background: 'var(--zoya-ok)' }}
                    >
                      ●
                    </span>
                  )}
                </div>

                {/* Row 3: Language badge */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className="text-[9px] font-semibold px-1.5 py-px rounded"
                    style={{ background: 'var(--zoya-bg-soft)', color: 'var(--zoya-accent)' }}
                  >
                    {conv.customerLanguage.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            );
          })
          )}
        </div>
      </div>

      {/* Chat Area — min-h-0 so messages + composer stay within h-screen */}
      <div className="flex min-h-0 flex-1 flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b px-4 flex items-center justify-between" style={{ borderColor: 'var(--zoya-border-light)', height: '72px' }}>
              <div>
                <h2 className="text-[22px] leading-tight font-semibold tracking-tight zoya-heading text-[var(--foreground)]">
                  {selectedConversation.customer.name}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-[var(--zoya-accent)] whitespace-nowrap overflow-hidden">
                  <span className="truncate">{selectedConversation.customer.email}</span>
                  {selectedConversation.customer.phone && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span className="truncate inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedConversation.customer.phone}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Regenerate: discard manager draft so the new suggestion uses inline
                    // layout (AI reply in composer) instead of overlay + separate input.
                    inputMessageRef.current = '';
                    setInputMessage('');
                    setUsedAISuggestion(null);
                    setAiSuggestion(null);
                    setLastSuggestedMessageId(null);
                    getAISuggestion();
                  }}
                  disabled={isLoadingSuggestion || messages.filter(m => m.isFromCustomer).length === 0}
                  className="p-2 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate AI suggestion"
                >
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={messagesContainerRef}
              className="zoya-chat-surface min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
            >
              {messages.filter(m => m && m.id).map((message, index) => {
                // Check if this is the start of a new session (different sessionId from previous message)
                const isNewSession = index > 0 &&
                  message.sessionId &&
                  messages[index - 1].sessionId &&
                  message.sessionId !== messages[index - 1].sessionId;

                return (
                  <div key={message.id}>
                    {/* Session Divider */}
                    {isNewSession && (
                      <div className="flex items-center justify-center my-6">
                        <div className="flex-1 border-t" style={{ borderColor: 'var(--zoya-border)' }}></div>
                        <span className="px-4 py-1 text-xs rounded-full border" style={{ color: 'var(--zoya-muted)', background: 'var(--zoya-bg-soft)', borderColor: 'var(--zoya-border)' }}>
                          New Session - {new Date(message.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="flex-1 border-t" style={{ borderColor: 'var(--zoya-border)' }}></div>
                      </div>
                    )}

                    {/* Message */}
                    <div
                      className={`flex flex-col ${
                        message.isFromCustomer ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div
                        className={`max-w-[min(85%,42rem)] px-4 py-3 ${
                          message.isFromCustomer
                            ? 'zoya-bubble-customer text-[var(--foreground)]'
                            : 'zoya-bubble-agent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold mb-1 opacity-70">
                            {message.sender.name}
                            {message.isFromCustomer && message.originalLanguage !== 'en' && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {message.originalLanguage.toUpperCase()}
                              </span>
                            )}
                          </p>
                          {/* Translate button for customer messages in non-English */}
                          {message.isFromCustomer && message.originalLanguage !== 'en' && (
                            <button
                              onClick={() => toggleMessageTranslation(message.id)}
                              disabled={translatingMessageId === message.id}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 flex items-center gap-1"
                              title={showTranslations.has(message.id) ? "Hide translation" : "Show English translation"}
                            >
                              {translatingMessageId === message.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Translating...
                                </>
                              ) : (
                                <>
                                  <Languages className="w-3 h-3" />
                                  {showTranslations.has(message.id) ? 'Hide' : 'Translate'}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        <MessageContent
                          content={message.content}
                          className="text-sm whitespace-pre-wrap break-words"
                        />
                        {/* Show translation if toggled */}
                        {showTranslations.has(message.id) && (
                          <div className="mt-2 pt-2 border-t border-blue-100 bg-blue-50 px-3 py-2 -mx-4 -mb-3 rounded-b-lg">
                            <p className="text-xs font-semibold text-blue-700 mb-1">English Translation:</p>
                            {message.translatedContent ? (
                              <MessageContent
                                content={message.translatedContent}
                                className="text-sm text-gray-800"
                              />
                            ) : (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="text-xs">Translating...</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] mt-1 px-1 text-[var(--zoya-muted)]">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply composer: normal input while AI loads; AI suggestion replaces input when ready */}
            <div
              className="shrink-0 p-4"
              style={{
                background: 'var(--zoya-chat-footer-bg)',
                borderTop: '2px solid var(--zoya-gold)',
              }}
            >
              {selectedConversation.customerLanguage !== 'en' && inputMessage.trim() && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-800">
                      Customer speaks <strong>{selectedConversation.customerLanguage.toUpperCase()}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={translateInputToCustomerLanguage}
                    disabled={translatingInput}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs font-medium"
                  >
                    {translatingInput ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Languages className="w-3 h-3" />
                        Translate to {selectedConversation.customerLanguage.toUpperCase()}
                      </>
                    )}
                  </button>
                </div>
              )}

              {isLoadingSuggestion && !aiSuggestion && (
                <div className="mb-3 flex items-center gap-2 text-sm text-amber-900/80">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                  <span>Generating AI suggestion…</span>
                </div>
              )}

              {aiSuggestion && aiComposerLayout === 'overlay' && (
                <div className="mb-3 flex flex-col gap-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--zoya-accent)]">
                            AI suggested reply
                            <span className="font-normal text-[var(--zoya-muted)]">
                              {' '}
                              ({(aiSuggestion.confidence * 100).toFixed(0)}% confidence)
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--zoya-muted)]">
                            Copy to paste after your message, or Insert to replace your draft.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiSuggestionExpanded((e) => !e)}
                        className="shrink-0 rounded-md p-1.5 text-[var(--zoya-muted)] transition-colors hover:bg-amber-100/80 hover:text-[var(--zoya-accent)] focus:outline-none focus:ring-2 focus:ring-[#C4B5A5]/35"
                        aria-expanded={aiSuggestionExpanded}
                        title={aiSuggestionExpanded ? 'Use smaller reply panel' : 'Use larger reply panel'}
                      >
                        {aiSuggestionExpanded ? (
                          <Minimize2 className="h-4 w-4" aria-hidden />
                        ) : (
                          <Maximize2 className="h-4 w-4" aria-hidden />
                        )}
                      </button>
                    </div>
                    <div
                      className={`mb-3 overflow-y-auto overscroll-contain rounded-md border border-[#E8E4DF] bg-white px-3 py-2 ${
                        aiSuggestionExpanded
                          ? 'max-h-[min(55dvh,28rem)]'
                          : 'max-h-[min(12rem,28dvh)]'
                      }`}
                    >
                      <MessageContent
                        content={aiSuggestion.suggestedReply}
                        className="text-sm whitespace-pre-wrap break-words text-[var(--zoya-accent)]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={copyAiSuggestion}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#C4B5A5] bg-white px-3 py-2 text-xs font-medium text-[var(--zoya-accent)] transition-colors hover:bg-[#faf8f6]"
                      >
                        <Copy className="h-3.5 w-3.5 shrink-0" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={insertAiSuggestionOverDraft}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#C4B5A5] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#b8a899]"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                  {relatedProductsCollapsibleBlock}
                </div>
              )}

              {aiSuggestion && aiComposerLayout === 'inline' ? (
                <div className="flex flex-col gap-3">
                  {aiReplyEditMode ? (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="flex w-fit gap-1 rounded-lg border border-[#E0D9D2] bg-white/90 p-1"
                          role="tablist"
                          aria-label="Reply composer"
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected={aiReplyComposerTab === 'edit'}
                            onClick={() => setAiReplyComposerTab('edit')}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              aiReplyComposerTab === 'edit'
                                ? 'bg-[#C4B5A5] text-white'
                                : 'text-[var(--zoya-accent)] hover:bg-[var(--zoya-chat-footer-bg)]'
                            }`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={aiReplyComposerTab === 'preview'}
                            onClick={() => setAiReplyComposerTab('preview')}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              aiReplyComposerTab === 'preview'
                                ? 'bg-[#C4B5A5] text-white'
                                : 'text-[var(--zoya-accent)] hover:bg-[var(--zoya-chat-footer-bg)]'
                            }`}
                          >
                            Preview
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiSuggestionExpanded((e) => !e)}
                          className="shrink-0 rounded-md p-1.5 text-[var(--zoya-muted)] transition-colors hover:bg-[#f0ebe4] hover:text-[var(--zoya-accent)] focus:outline-none focus:ring-2 focus:ring-[#C4B5A5]/35"
                          aria-expanded={aiSuggestionExpanded}
                          title={aiSuggestionExpanded ? 'Use smaller reply panel' : 'Use larger reply panel'}
                        >
                          {aiSuggestionExpanded ? (
                            <Minimize2 className="h-4 w-4" aria-hidden />
                          ) : (
                            <Maximize2 className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                      </div>
                      {aiReplyComposerTab === 'edit' ? (
                        <textarea
                          ref={textareaRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          placeholder="Type your reply..."
                          className={`box-border min-h-[100px] w-full resize-none overflow-y-auto rounded-[10px] border border-[#E0D9D2] bg-white px-4 py-3 text-[var(--zoya-accent)] placeholder:text-[#A9A9A9] focus:border-[#C4B5A5] focus:outline-none focus:ring-2 focus:ring-[#C4B5A5]/35 ${
                            aiSuggestionExpanded
                              ? 'h-[min(55dvh,28rem)]'
                              : 'h-[min(15rem,32dvh)]'
                          }`}
                          rows={1}
                          disabled={isSending}
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={`box-border min-h-[100px] overflow-y-auto rounded-[10px] border border-[#E0D9D2] bg-white px-4 py-3 ${
                            aiSuggestionExpanded
                              ? 'h-[min(55dvh,28rem)]'
                              : 'h-[min(15rem,32dvh)]'
                          }`}
                        >
                          {inputMessage.trim() ? (
                            <MessageContent
                              content={inputMessage}
                              className="text-sm whitespace-pre-wrap break-words text-[var(--zoya-accent)]"
                            />
                          ) : (
                            <p className="text-sm text-[#A9A9A9]">Nothing to preview yet.</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--zoya-accent)]">
                              AI suggested reply
                              <span className="font-normal text-[var(--zoya-muted)]">
                                {' '}
                                ({(aiSuggestion.confidence * 100).toFixed(0)}% confidence)
                              </span>
                            </p>
                            <p className="mt-0.5 text-xs text-[var(--zoya-muted)]">
                              Click the reply below to edit, or send as-is.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiSuggestionExpanded((e) => !e)}
                          className="shrink-0 rounded-md p-1.5 text-[var(--zoya-muted)] transition-colors hover:bg-[#f0ebe4] hover:text-[var(--zoya-accent)] focus:outline-none focus:ring-2 focus:ring-[#C4B5A5]/35"
                          aria-expanded={aiSuggestionExpanded}
                          title={aiSuggestionExpanded ? 'Use smaller reply panel' : 'Use larger reply panel'}
                        >
                          {aiSuggestionExpanded ? (
                            <Minimize2 className="h-4 w-4" aria-hidden />
                          ) : (
                            <Maximize2 className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiReplyEditMode(true);
                          setAiReplyComposerTab('edit');
                        }}
                        className={`group grid min-h-[100px] w-full grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[10px] border border-[#E0D9D2] bg-white text-left transition-colors hover:border-[#C4B5A5] hover:bg-[#faf8f6] focus:outline-none focus:ring-2 focus:ring-[#C4B5A5]/35 ${
                          aiSuggestionExpanded
                            ? 'max-h-[min(55dvh,28rem)]'
                            : 'max-h-[min(15rem,32dvh)]'
                        }`}
                      >
                        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-3 text-left">
                          <MessageContent
                            content={inputMessage}
                            className="text-sm whitespace-pre-wrap break-words text-[var(--zoya-accent)]"
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 border-t border-[#E8E4DF] bg-[#faf8f6] px-4 py-2 text-xs font-medium text-[#C4B5A5]">
                          <Pencil className="h-3.5 w-3.5" />
                          Click to edit
                        </div>
                      </button>
                    </>
                  )}

                  {relatedProductsCollapsibleBlock}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isSending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--zoya-gold)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[colors,box-shadow] hover:bg-[var(--zoya-gold-light)] hover:shadow disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 shrink-0" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="max-h-[min(15rem,32dvh)] min-h-[100px] w-full resize-none overflow-y-auto rounded-[10px] border border-[#E0D9D2] bg-white px-4 py-3 text-[var(--zoya-accent)] placeholder:text-[#A9A9A9] focus:border-[#C4B5A5] focus:outline-none focus:ring-2 focus:ring-[#C4B5A5]/35"
                    rows={3}
                    disabled={isSending}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isSending}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--zoya-gold)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-[colors,box-shadow] hover:bg-[var(--zoya-gold-light)] hover:shadow disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 shrink-0" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--zoya-accent)]">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-[22px] zoya-heading text-[var(--zoya-gold)]">Select a conversation to start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
