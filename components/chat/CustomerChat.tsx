'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import MessageContent from './MessageContent';

interface Message {
  id: string;
  content: string;
  translatedContent?: string | null;
  isFromCustomer: boolean;
  createdAt: string;
  sessionId?: string | null;
  deliveryStatus?: 'pending' | 'failed';
  sender: {
    id: string;
    name: string;
    role: string;
  };
}

interface CustomerChatProps {
  customerLanguage?: string;
}

const supabaseClient = getSupabaseBrowserClient();

export default function CustomerChat({
  customerLanguage = 'en',
}: CustomerChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreChatForm, setShowPreChatForm] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const shouldAutoScrollRef = useRef(true);
  const fetchInFlightRef = useRef(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Error fetching messages:', data?.error ?? response.status);
        return;
      }
      if (typeof data.currentSessionId === 'string' && data.currentSessionId) {
        setSessionId(data.currentSessionId);
      }
      const incoming = Array.isArray(data.messages) ? data.messages : [];
      setMessages((prev) => {
        const localPendingOrFailed = prev.filter(
          (msg) => msg.id.startsWith('temp-') && msg.isFromCustomer
        );
        return [...incoming, ...localPendingOrFailed];
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      fetchInFlightRef.current = false;
    }
  }, [conversationId]);

  // Scroll only the messages pane — avoid scrollIntoView (it scrolls the document on
  // mobile and fights the keyboard, making the input feel inactive).
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    const newMessageAdded = messages.length > prevMessageCountRef.current;

    if (shouldAutoScrollRef.current || isAtBottom || newMessageAdded) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      shouldAutoScrollRef.current = false;
    }

    prevMessageCountRef.current = messages.length;
  }, [messages]);

  // Load initial messages and subscribe to realtime changes on Message for this conversation.
  useEffect(() => {
    if (!conversationId) return;

    void fetchMessages();

    if (!supabaseClient) {
      console.warn(
        'Supabase realtime is disabled. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
      return;
    }

    const channel = supabaseClient
      .channel(`chat-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Message',
        },
        (payload) => {
          const row = payload.new ?? payload.old;
          const rowData = row && typeof row === 'object' ? (row as Record<string, unknown>) : null;
          const nextConversationId = rowData
            ? String(
                rowData.conversationId ??
                  rowData.conversation_id ??
                  rowData.conversationid ??
                  rowData.conversationID ??
                  ''
              ) || null
            : null;
          const shouldFetch =
            nextConversationId === conversationId ||
            // Some Supabase payloads can omit/rename the field depending on schema/history.
            // For single-conversation customer chat, safe fallback is to fetch.
            nextConversationId === null;

          if (shouldFetch) {
            console.log('[CustomerChat:realtime] Message change matched conversation', {
              conversationId,
              eventType: payload.eventType,
              rowConversationId: nextConversationId,
              rowKeys: rowData ? Object.keys(rowData) : [],
            });
            void fetchMessages();
          } else {
            console.log('[CustomerChat:realtime] Message change ignored', {
              conversationId,
              eventType: payload.eventType,
              rowConversationId: nextConversationId,
              rowKeys: rowData ? Object.keys(rowData) : [],
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[CustomerChat:realtime] Channel status', {
          conversationId,
          status,
        });
        // Self-heal after websocket reconnects or transient subscription failures.
        if (status === 'SUBSCRIBED') {
          void fetchMessages();
        }
      });

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  // One-shot catch-up when tab/network state changes.
  useEffect(() => {
    if (showPreChatForm || !conversationId) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchMessages();
      }
    };
    const onFocus = () => {
      void fetchMessages();
    };
    const onOnline = () => {
      void fetchMessages();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
    };
  }, [showPreChatForm, conversationId, fetchMessages]);

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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId || !customerId) return;

    const messageContent = inputMessage;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setInputMessage('');
    shouldAutoScrollRef.current = true; // Force scroll when user sends message
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      translatedContent: null,
      isFromCustomer: true,
      createdAt: new Date().toISOString(),
      sessionId,
      deliveryStatus: 'pending',
      sender: {
        id: customerId,
        name: formData.name || 'You',
        role: 'CUSTOMER',
      },
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          senderId: customerId,
          content: messageContent,
          isFromCustomer: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      const data = await response.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? data.message : msg))
      );
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, deliveryStatus: 'failed' } : msg
        )
      );
    }
  };

  // Show pre-chat form
  if (showPreChatForm) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-50 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]">
        {/* Header with brand */}
        <div className="mb-8 text-center">
          <img
            src="https://www.zoya.in/on/demandware.static/-/Sites-Zoya-Library/default/dw3635170c/images/zoya-header-logo.png"
            alt="Zoya"
            className="mx-auto mb-4 h-16 w-auto object-contain sm:h-20"
          />
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
          Powered by Thence
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] flex-col bg-gray-50 pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      <header className="shrink-0 border-b border-gray-200/80 bg-white px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] shadow-sm sm:px-5 sm:pb-3 sm:pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src="https://www.zoya.in/on/demandware.static/-/Sites-Zoya-Library/default/dw3635170c/images/zoya-header-logo.png"
            alt="Zoya"
            className="h-8 w-auto max-w-[min(100%,11rem)] shrink-0 object-contain object-left sm:h-10 sm:max-w-none"
          />
          <div className="hidden h-8 w-px shrink-0 bg-stone-200 sm:block" aria-hidden />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight text-gray-900 sm:text-xl">
              Zoya Concierge
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-gray-600 sm:text-sm">
              Expert assistance for your jewelry needs
            </p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-lg">Welcome to Zoya Support!</p>
            <p className="text-sm mt-2">How can we help you today?</p>
          </div>
        )}

        {/* Filter messages to only show current session for customers */}
        {messages
          .filter((msg) => {
            if (!msg?.id) return false;
            if (msg.id.startsWith('temp-')) return true;
            // Match server session when set; include untagged rows (legacy / partial writes)
            // so manager replies are not hidden when sessionId is missing on the row.
            if (!sessionId) return true;
            return !msg.sessionId || msg.sessionId === sessionId;
          })
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
                {message.deliveryStatus === 'pending' && (
                  <span className="ml-2 inline-flex items-center gap-1 align-middle">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                  </span>
                )}
                {message.deliveryStatus === 'failed' && (
                  <span className="ml-2 text-red-500">Failed to send</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="bg-stone-600 text-white px-6 py-3 rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Type in your preferred language - we&apos;ll translate for you!
        </p>
      </div>
    </div>
  );
}
