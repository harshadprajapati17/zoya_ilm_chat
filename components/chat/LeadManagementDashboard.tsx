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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);

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
      setInputMessage(data.suggestedReply);
    } catch (error) {
      console.error('Error getting AI suggestion:', error);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const translateMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation) return;

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
      setTranslatedInput(data.translatedText);
    } catch (error) {
      console.error('Error translating message:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    shouldAutoScrollRef.current = true; // Force scroll when admin sends message
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          senderId: managerId,
          content: inputMessage,
          isFromCustomer: false,
          targetLanguage: selectedConversation.customerLanguage,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
      setInputMessage('');
      setTranslatedInput('');
      setAiSuggestion(null);
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
    <div className="flex h-screen bg-gray-100">
      {/* Conversations Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Active Conversations</h2>
          <p className="text-sm text-gray-600">{conversations.length} active chats</p>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
            const isUnread = hasUnreadMessage(conv);
            const isSelected = selectedConversation?.id === conv.id;

            return (
            <div
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-stone-50 border-l-4 border-l-stone-600'
                  : isUnread
                    ? 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100'
                    : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">{conv.customer.name}</h3>
                    {isUnread && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {conv.messages[0]?.content || 'No messages yet'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Languages className="w-3 h-3" />
                    <span>{conv.customerLanguage.toUpperCase()}</span>
                    <Clock className="w-3 h-3 ml-2" />
                    <span>
                      {new Date(conv.updatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
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
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedConversation.customer.name}</h2>
                <p className="text-sm text-gray-600">{selectedConversation.customer.email}</p>
                {selectedConversation.customer.phone && (
                  <p className="text-sm text-gray-600">📱 {selectedConversation.customer.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isLoadingSuggestion && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                )}
                <button
                  onClick={() => fetchMessages(selectedConversation.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-4 py-1 text-xs text-gray-600 bg-gray-100 rounded-full border border-gray-300">
                          New Session - {new Date(message.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="flex-1 border-t border-gray-300"></div>
                      </div>
                    )}

                    {/* Message */}
                    <div
                      className={`flex ${
                        message.isFromCustomer ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <div
                        className={`max-w-md px-4 py-3 rounded-lg shadow-sm ${
                          message.isFromCustomer
                            ? 'bg-white text-gray-900 rounded-bl-none border border-gray-100'
                            : 'bg-stone-600 text-white rounded-br-none'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {message.sender.name}
                        </p>
                        <MessageContent
                          content={message.content}
                          className="text-sm whitespace-pre-wrap break-words"
                        />
                        {message.translatedContent && message.content !== message.translatedContent && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <MessageContent
                              content={message.translatedContent}
                              className="text-xs opacity-75 italic"
                            />
                          </div>
                        )}
                        <p className="text-xs mt-1 opacity-60">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestion Panel */}
            {aiSuggestion && (
              <div className="bg-amber-50 border-t border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800 mb-2">
                      AI Suggested Reply (Confidence: {(aiSuggestion.confidence * 100).toFixed(0)}%)
                    </p>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded-lg shadow-sm">
                      {aiSuggestion.suggestedReply}
                    </p>
                    {aiSuggestion.relatedProducts.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Related Products:</p>
                        <div className="space-y-2">
                          {aiSuggestion.relatedProducts.map((product, idx) => (
                            <div key={idx} className="text-xs bg-white p-2 rounded">
                              <span className="font-medium">{product.name}</span> -{' '}
                              {product.currency} {product.price}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="bg-white border-t p-4">
              <div className="flex gap-2">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={isSending}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={translateMessage}
                    className="p-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    title="Preview Translation"
                  >
                    <Languages className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isSending}
                    className="p-3 bg-stone-600 text-white rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              {translatedInput && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-900 font-semibold mb-1">
                    Translation to {selectedConversation.customerLanguage.toUpperCase()}:
                  </p>
                  <p className="text-sm text-blue-800">{translatedInput}</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
