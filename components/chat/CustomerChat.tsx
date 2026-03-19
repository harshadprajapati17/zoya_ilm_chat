'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle, User as UserIcon } from 'lucide-react';
import MessageContent from './MessageContent';

interface Message {
  id: string;
  content: string;
  translatedContent?: string | null;
  isFromCustomer: boolean;
  createdAt: string;
  sessionId?: string | null;
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface CustomerChatProps {
  customerLanguage?: string;
}

export default function CustomerChat({
  customerLanguage = 'en',
}: CustomerChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showPreChatForm, setShowPreChatForm] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
  });
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

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);

  const initializeConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.name,
          customerEmail: `${formData.mobile}@customer.zoya.in`, // Generate email from mobile
          customerPhone: formData.mobile,
          customerLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error:', data);
        alert('Error starting chat: ' + (data.error || 'Unknown error'));
        return;
      }

      if (!data.conversation || !data.conversation.id) {
        console.error('Invalid response data:', data);
        alert('Error: Invalid response from server');
        return;
      }

      setConversationId(data.conversation.id);
      setCustomerId(data.conversation.customer.id);
      setSessionId(data.sessionId);
      setShowPreChatForm(false);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      alert('Error starting chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) return;
    initializeConversation();
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`);
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId || !customerId || isSending) return;

    setIsSending(true);
    const messageContent = inputMessage;
    setInputMessage('');
    shouldAutoScrollRef.current = true; // Force scroll when user sends message

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          senderId: customerId,
          content: messageContent,
          isFromCustomer: true,
          targetLanguage: 'en', // Translate to English for managers
        }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, data.message]);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputMessage(messageContent);
    } finally {
      setIsSending(false);
    }
  };

  // Show pre-chat form
  if (showPreChatForm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        {/* Header with Agent Info */}
        <div className="mb-8 text-center">
          <div className="relative inline-block mb-4">
            <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center">
              <MessageCircle className="w-10 h-10 text-stone-600" />
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Zoya Concierge</h2>
          <p className="text-gray-600">Product Expert</p>
        </div>

        {/* Pre-chat Form */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handlePreChatSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-gray-900 font-medium mb-2">
                Name: <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                placeholder="Enter your name"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="mobile" className="block text-gray-900 font-medium mb-2">
                Mobile: <span className="text-red-500">*</span>
              </label>
              <input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
                placeholder="Enter your mobile number"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.mobile.trim()}
              className="w-full bg-stone-500 hover:bg-stone-600 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting chat...
                </>
              ) : (
                'Start the chat'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Powered by Zoya ILM
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Zoya Concierge</h1>
            <p className="text-sm text-gray-600">Expert assistance for your jewelry needs</p>
          </div>
          <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
            WhatsApp
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-lg">Welcome to Zoya Support!</p>
            <p className="text-sm mt-2">How can we help you today?</p>
          </div>
        )}

        {/* Filter messages to only show current session for customers */}
        {messages
          .filter((msg) => msg && msg.id && msg.sessionId === sessionId)
          .map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isFromCustomer ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-lg shadow-sm ${
                message.isFromCustomer
                  ? 'bg-green-50 text-gray-900 rounded-br-none border border-green-100'
                  : 'bg-stone-600 text-white rounded-bl-none'
              }`}
            >
              {!message.isFromCustomer && (
                <p className="text-xs font-semibold mb-1 opacity-70">
                  {message.sender.name}
                </p>
              )}
              <MessageContent
                content={message.content}
                className="text-sm whitespace-pre-wrap break-words"
              />
              {message.translatedContent && (
                <MessageContent
                  content={message.translatedContent}
                  className="text-xs mt-2 opacity-75 italic"
                />
              )}
              <p className="text-xs mt-1 opacity-60">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="bg-stone-600 text-white px-6 py-3 rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Type in your preferred language - we'll translate for you!
        </p>
      </div>
    </div>
  );
}
