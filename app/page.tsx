import Link from 'next/link';
import { MessageSquare, LayoutDashboard, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Zoya AI-Powered Chat System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Multi-lingual customer support with intelligent AI assistance
          </p>
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Powered by OpenAI & Google Translate</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Customer Chat Card */}
          <Link href="/chat">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <MessageSquare className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Customer Chat</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Start a conversation with our support team. Ask questions about our jewelry products in your preferred language.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Multi-lingual support
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Real-time responses
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Product recommendations
                </li>
              </ul>
              <div className="mt-6">
                <button className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                  Start Chat
                </button>
              </div>
            </div>
          </Link>

          {/* Lead Management Dashboard Card */}
          <Link href="/dashboard/conversation">
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow cursor-pointer border-2 border-transparent hover:border-pink-500">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-pink-100 rounded-full">
                  <LayoutDashboard className="w-8 h-8 text-pink-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Lead Management</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Manage customer conversations with AI-powered reply suggestions and automatic translation tools.
              </p>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  AI reply suggestions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Product search integration
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Auto-translation tools
                </li>
              </ul>
              <div className="mt-6">
                <button className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors">
                  Open Dashboard
                </button>
              </div>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8 text-gray-900">Key Features</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4">🤖</div>
              <h4 className="font-bold text-lg mb-2">AI-Powered Suggestions</h4>
              <p className="text-sm text-gray-600">
                Get intelligent reply suggestions based on customer queries and product database
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4">🌍</div>
              <h4 className="font-bold text-lg mb-2">Multi-Lingual Support</h4>
              <p className="text-sm text-gray-600">
                Automatic translation between customer's language and team's language
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl mb-4">💎</div>
              <h4 className="font-bold text-lg mb-2">Product Integration</h4>
              <p className="text-sm text-gray-600">
                Vector search across 12MB+ product catalog for accurate recommendations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
