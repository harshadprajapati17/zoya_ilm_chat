'use client';

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Languages,
  Clock,
  User,
  RefreshCw,
  Loader2,
  Search,
  ChevronUp,
  ChevronDown,
  Check,
  Phone,
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
}

interface LeadManagementDashboardProps {
  managerId: string;
  managerName: string;
}

const EDIT_REASONS = [
  'Wrong Tone',
  'Wrong Product',
  'Inaccurate Info',
  'Missing Detail',
  'Too Long/Short',
];

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
  const [translatedInput, setTranslatedInput] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [lastSuggestedMessageId, setLastSuggestedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSuggestionCollapsed, setIsAiSuggestionCollapsed] = useState(false);
  const [isEditingAiSuggestion, setIsEditingAiSuggestion] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [showDraftMergeOptions, setShowDraftMergeOptions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const inputMessageRef = useRef('');

  useEffect(() => {
    inputMessageRef.current = inputMessage;
  }, [inputMessage]);

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

    setIsLoadingSuggestion(true);
    try {
      const lastCustomerMessage = messages
        .filter((m) => m.isFromCustomer)
        .pop();

      if (!lastCustomerMessage) return;

      const response = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          customerMessage: lastCustomerMessage.content,
          targetLanguage: selectedConversation.customerLanguage,
        }),
      });

      const data = await response.json();
      setAiSuggestion(data);
      setShowDraftMergeOptions(inputMessageRef.current.trim().length > 0);
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const translateMessage = async (textOverride?: string) => {
    const text = textOverride ?? inputMessage;
    if (!text.trim() || !selectedConversation) return;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLanguage: selectedConversation.customerLanguage,
          sourceLanguage: 'en',
        }),
      });

      const data = await response.json();
      setTranslatedInput(data.translatedText);
    } catch (error) {
      console.error('Error translating message:', error);
    }
  };

  const sendMessage = async (contentOverride?: string) => {
    const content = contentOverride || inputMessage;
    if (!content.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    shouldAutoScrollRef.current = true;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          senderId: managerId,
          content,
          isFromCustomer: false,
          targetLanguage: selectedConversation.customerLanguage,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      setInputMessage('');
      setTranslatedInput('');
      setAiSuggestion(null);
      setIsEditingAiSuggestion(false);
      setEditReason('');
      setShowDraftMergeOptions(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const acceptAndSend = () => {
    if (!aiSuggestion) return;
    sendMessage(aiSuggestion.suggestedReply);
  };

  const editSuggestion = () => {
    if (!aiSuggestion) return;
    setInputMessage(aiSuggestion.suggestedReply);
    setIsEditingAiSuggestion(true);
    setEditReason('');
    setShowDraftMergeOptions(false);
  };

  const replaceWithSuggestion = () => {
    if (!aiSuggestion) return;
    setInputMessage(aiSuggestion.suggestedReply);
    setAiSuggestion(null);
    setShowDraftMergeOptions(false);
  };

  const addSuggestionOnTop = () => {
    if (!aiSuggestion) return;
    setInputMessage((prev) => `${aiSuggestion.suggestedReply}\n\n${prev}`.trim());
    setAiSuggestion(null);
    setShowDraftMergeOptions(false);
  };

  const addSuggestionBelow = () => {
    if (!aiSuggestion) return;
    setInputMessage((prev) => `${prev}\n\n${aiSuggestion.suggestedReply}`.trim());
    setAiSuggestion(null);
    setShowDraftMergeOptions(false);
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
    const maxHeight = 200; // ~10 lines
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

  return (
    <div className="flex h-screen zoya-chat-surface">
      {/* Conversations Sidebar */}
      <div className="w-72 shrink-0 bg-white border-r flex flex-col overflow-hidden" style={{ borderColor: 'var(--zoya-border-light)' }}>
        <div className="px-4 border-b bg-white flex flex-col justify-center" style={{ borderColor: 'var(--zoya-border-light)', height: '72px' }}>
          <h2 className="text-xl zoya-heading text-[var(--foreground)]">Conversations</h2>
          <p className="text-xs mt-0.5 text-[var(--zoya-accent)]">{conversations.length} active</p>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--zoya-border-light)' }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--zoya-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 text-xs zoya-input"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
              className="flex gap-2.5 px-3 py-2.5 cursor-pointer transition-colors border-b"
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
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
                {isLoadingSuggestion && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--zoya-gold)' }}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                )}
                <button
                  onClick={() => fetchMessages(selectedConversation.id)}
                  className="p-2 rounded-lg transition-colors zoya-btn-icon"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 zoya-chat-surface">
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
                        className={`max-w-md px-4 py-3 rounded-[14px] shadow-sm ${
                          message.isFromCustomer
                            ? 'zoya-bubble-customer text-[var(--foreground)]'
                            : 'zoya-bubble-agent text-[var(--foreground)]'
                        }`}
                      >
                        <MessageContent
                          content={message.content}
                          className="text-sm whitespace-pre-wrap break-words"
                        />
                        {message.translatedContent && message.content !== message.translatedContent && (
                          <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--zoya-border-light)' }}>
                            <MessageContent
                              content={message.translatedContent}
                              className="text-xs opacity-75 italic"
                            />
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

            {/* AI Suggestion Panel */}
            {aiSuggestion && (
              <div className="zoya-ai-panel px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--zoya-gold)' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--zoya-gold)' }}>
                      AI Suggested Response
                    </span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: 'var(--zoya-gold)' }}>
                    {(aiSuggestion.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {isEditingAiSuggestion ? (
                  <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="w-full text-sm text-[var(--foreground)] leading-relaxed mb-3 p-3 rounded-lg border resize-none zoya-input"
                    style={{ borderColor: 'var(--zoya-gold)', minHeight: '80px', maxHeight: '200px' }}
                    disabled={isSending}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={editSuggestion}
                    title="Click to edit suggestion"
                    className="w-full text-left text-sm text-[var(--foreground)] leading-relaxed mb-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-black/5"
                    style={{ borderColor: 'var(--zoya-border-light)' }}
                  >
                    {aiSuggestion.suggestedReply}
                  </button>
                )}

                {(() => {
                  const hasActuallyEdited = isEditingAiSuggestion &&
                    inputMessage.trim() !== aiSuggestion.suggestedReply.trim();

                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {hasActuallyEdited ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3" style={{ color: 'var(--zoya-gold)' }} />
                              <span className="text-xs italic" style={{ color: 'var(--zoya-muted)' }}>
                                Your feedback improves suggestions
                              </span>
                            </div>
                            <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--zoya-accent)' }}>
                              Why did you edit?
                            </span>
                            <select
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              className="text-xs px-3 py-1.5 rounded-lg border zoya-input"
                              style={{ maxWidth: '200px' }}
                            >
                              <option value="">Select reason</option>
                              {EDIT_REASONS.map((reason) => (
                                <option key={reason} value={reason}>{reason}</option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {showDraftMergeOptions && !isEditingAiSuggestion ? (
                          <>
                            <button
                              onClick={replaceWithSuggestion}
                              className="px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-black/5"
                              style={{ borderColor: 'var(--zoya-border)', color: 'var(--foreground)' }}
                            >
                              Replace
                            </button>
                            <button
                              onClick={addSuggestionOnTop}
                              className="px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-black/5"
                              style={{ borderColor: 'var(--zoya-border)', color: 'var(--foreground)' }}
                            >
                              Add on Top
                            </button>
                            <button
                              onClick={addSuggestionBelow}
                              className="px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:bg-black/5"
                              style={{ borderColor: 'var(--zoya-border)', color: 'var(--foreground)' }}
                            >
                              Add Below
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                translateMessage(
                                  isEditingAiSuggestion ? undefined : aiSuggestion.suggestedReply
                                )
                              }
                              disabled={
                                isSending ||
                                (isEditingAiSuggestion
                                  ? !inputMessage.trim()
                                  : !aiSuggestion.suggestedReply.trim())
                              }
                              className="p-2.5 rounded-lg transition-colors zoya-btn-icon cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Preview Translation"
                            >
                              <Languages className="w-5 h-5" />
                            </button>
                            <button
                              onClick={hasActuallyEdited ? () => sendMessage() : acceptAndSend}
                              disabled={hasActuallyEdited ? (!inputMessage.trim() || !editReason || isSending) : isSending}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ background: 'var(--zoya-gold)' }}
                            >
                              {isSending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              {hasActuallyEdited ? 'Send Edited' : 'Accept & Send'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {translatedInput && (
                  <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--zoya-gold-bg)' }}>
                    <p className="text-xs font-semibold mb-1 text-[var(--zoya-gold)]">
                      Translation to {selectedConversation.customerLanguage.toUpperCase()}:
                    </p>
                    <p className="text-sm text-[var(--foreground)]">{translatedInput}</p>
                  </div>
                )}
              </div>
            )}

            {/* Manual input — shown when no AI suggestion is available */}
            {(!aiSuggestion || showDraftMergeOptions) && (
              <div className="border-t px-4 py-3" style={{ borderColor: 'var(--zoya-border-light)', background: 'var(--zoya-bg-soft)' }}>
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full text-sm text-[var(--foreground)] leading-relaxed mb-3 p-3 rounded-lg border resize-none zoya-input"
                  style={{ borderColor: 'var(--zoya-border-light)', minHeight: '80px', maxHeight: '200px' }}
                  disabled={isSending}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => translateMessage()}
                    disabled={!inputMessage.trim() || isSending}
                    className="p-2.5 rounded-lg transition-colors zoya-btn-icon cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Preview Translation"
                  >
                    <Languages className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!inputMessage.trim() || isSending}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--zoya-gold)' }}
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Send
                  </button>
                </div>
              </div>
            )}
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
