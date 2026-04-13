'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Target, AlertCircle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RawDataItem {
  id: string;
  customerQuery: string | null;
  editCategory: string | null;
  acceptanceScore: number;
  createdAt: Date;
}

interface InsightsData {
  metrics: {
    totalConversations: number;
    totalConversationsTrend: number;
    highIntentCustomers: number;
    highIntentTrend: number;
    qualifiedLeads: number;
    qualifiedLeadsTrend: number;
    likelyBuyers: number;
    likelyBuyersTrend: number;
    lostOpportunities: number;
    lostOpportunitiesTrend: number;
  };
  customerIntent: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  productDemand: Array<{
    category: string;
    demand: number;
    percentage: number;
  }>;
  topInsights: string[];
  priceSensitivity: Array<{
    range: string;
    volume: number;
    conversion: number;
  }>;
  queryThemes: Array<{
    theme: string;
    count: number;
  }>;
  hesitationReasons: Array<{
    reason: string;
    count: number;
  }>;
  rawData: RawDataItem[];
}

const COLORS = ['#8B7355', '#A67C52', '#C9A882', '#D4B896', '#E5D4B8'];
const INTENT_COLORS = {
  'Gifting': '#8B7355',
  'Self Purchase': '#A67C52',
  'Wedding / Engagement': '#C9A882',
  'Investment': '#D4B896',
  'Browsing': '#E5D4B8',
};

export default function CustomerInsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    data: RawDataItem[];
    filterFn?: (item: RawDataItem) => boolean;
  } | null>(null);

  useEffect(() => {
    fetchInsights();
  }, [timeRange]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const response = await fetch(`/api/analytics/insights?days=${days}`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Check if the result has an error property
      if (result.error) {
        throw new Error(result.error);
      }

      // Validate that we have the expected data structure
      if (!result.metrics) {
        console.error('Invalid data structure:', result);
        throw new Error('Invalid data structure received from API');
      }

      setData(result);
    } catch (error) {
      console.error('Error fetching insights:', error);
      alert('Failed to load insights: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const openModal = (title: string, filterFn?: (item: RawDataItem) => boolean) => {
    if (!data) return;

    const filteredData = filterFn ? data.rawData.filter(filterFn) : data.rawData;
    setModalData({ title, data: filteredData, filterFn });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading insights...</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/analytics')}
            className="flex items-center text-stone-600 hover:text-stone-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Analytics
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Insights</h1>
              <p className="text-gray-600">Deep dive into customer behavior and preferences</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-lg ${timeRange === '7d' ? 'bg-stone-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-lg ${timeRange === '30d' ? 'bg-stone-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 rounded-lg ${timeRange === '90d' ? 'bg-stone-600 text-white' : 'bg-white text-gray-700 border'}`}
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <MetricCard
            title="Total Conversations"
            value={data.metrics.totalConversations.toLocaleString()}
            trend={data.metrics.totalConversationsTrend}
            subtitle="All chats"
            onClick={() => openModal('Total Conversations - All Customer Queries')}
          />
          <MetricCard
            title="High-Intent Customers"
            value={data.metrics.highIntentCustomers.toLocaleString()}
            trend={data.metrics.highIntentTrend}
            subtitle="Ready to engage"
            onClick={() => openModal('High-Intent Customers (Acceptance Score > 70%)', (item) => item.acceptanceScore > 0.7)}
          />
          <MetricCard
            title="Qualified Leads"
            value={data.metrics.qualifiedLeads.toLocaleString()}
            trend={data.metrics.qualifiedLeadsTrend}
            subtitle="Strong signals"
            onClick={() => openModal('Qualified Leads (Top 19%)', (item) => item.acceptanceScore > 0.65)}
          />
          <MetricCard
            title="Likely Buyers"
            value={data.metrics.likelyBuyers}
            trend={data.metrics.likelyBuyersTrend}
            subtitle="Predicted"
            onClick={() => openModal('Likely Buyers (Top 8.6%)', (item) => item.acceptanceScore > 0.75)}
          />
          <MetricCard
            title="Lost Opportunities"
            value={data.metrics.lostOpportunities}
            trend={data.metrics.lostOpportunitiesTrend}
            subtitle="Resolved (pending)"
            negative
            onClick={() => openModal('Lost Opportunities (Bottom 2.7%)', (item) => item.acceptanceScore < 0.3)}
          />
        </div>

        {/* Row 1: Customer Intent + Product Demand */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Customer Intent Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Intent Breakdown</h3>
            <div className="flex items-center gap-8">
              <div className="w-48 h-48 cursor-pointer" onClick={() => openModal('All Customer Intents - Complete Breakdown')}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.customerIntent}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.customerIntent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={INTENT_COLORS[entry.name as keyof typeof INTENT_COLORS] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                {data.customerIntent.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 cursor-pointer hover:bg-gray-50 px-2 rounded transition"
                    onClick={() => {
                      const intentName = item.name.toLowerCase();
                      openModal(`Customer Intent: ${item.name}`, (dataItem) => {
                        const query = dataItem.customerQuery?.toLowerCase() || '';
                        if (intentName.includes('gift')) {
                          return query.includes('gift') || query.includes('anniversary') || query.includes('birthday');
                        } else if (intentName.includes('wedding') || intentName.includes('engagement')) {
                          return query.includes('bridal') || query.includes('wedding') || query.includes('engagement') || query.includes('mangalsutra');
                        } else if (intentName.includes('investment')) {
                          return query.includes('investment') || query.includes('heavy');
                        } else if (intentName.includes('browsing')) {
                          return query.includes('browse') || query.includes('show') || query.includes('collection') || query.includes('trending');
                        } else {
                          // Self Purchase - anything not matching above
                          return !query.includes('gift') && !query.includes('anniversary') && !query.includes('birthday') &&
                                 !query.includes('bridal') && !query.includes('wedding') && !query.includes('engagement') &&
                                 !query.includes('investment') && !query.includes('heavy') &&
                                 !query.includes('browse') && !query.includes('show') && !query.includes('collection');
                        }
                      });
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: INTENT_COLORS[item.name as keyof typeof INTENT_COLORS] || COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-sm text-gray-600">
              <p className="font-medium mb-1">Explore by occasion:</p>
              <div className="flex flex-wrap gap-2">
                {['Anniversary (342)', 'Birthday (288)', 'Festive (456)', 'Personal milestone (73)'].map((tag, idx) => (
                  <span key={`occasion-${idx}`} className="px-2 py-1 bg-gray-100 rounded text-xs">{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Product Demand Intelligence */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Demand Intelligence</h3>
            <div className="space-y-4">
              {data.productDemand.map((item, index) => (
                <div
                  key={index}
                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition"
                  onClick={() => {
                    const categoryLower = item.category.toLowerCase();
                    openModal(`Product Demand: ${item.category}`, (dataItem) => {
                      const query = dataItem.customerQuery?.toLowerCase() || '';
                      if (categoryLower.includes('ring')) return query.includes('ring');
                      else if (categoryLower.includes('bangle')) return query.includes('bangle');
                      else if (categoryLower.includes('necklace')) return query.includes('necklace') || query.includes('chain');
                      else if (categoryLower.includes('earring')) return query.includes('earring');
                      return false;
                    });
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.category}</span>
                    <span className="text-sm text-gray-600">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-stone-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Top demand insights:</p>
              <div className="space-y-2">
                {data.topInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="mt-1">
                      {index === 0 ? (
                        <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">{insight}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-orange-50 rounded">
                <p className="text-xs text-orange-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-medium">Unmet Demand</span>
                </p>
                <ul className="mt-1 ml-4 text-xs text-gray-600 space-y-1">
                  <li>• Lightweight bangles (42 requests)</li>
                  <li>• Customizable bracelets (58 requests)</li>
                  <li>• Minimalist pendant sets (31 requests)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Price Sensitivity (Full Width) */}
        <div className="mb-6">
          {/* Price Sensitivity Analysis */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Sensitivity Analysis</h3>
            <div className="space-y-4">
              {data.priceSensitivity.map((item, index) => (
                <div
                  key={index}
                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition"
                  onClick={() => {
                    // Note: This is mock data in the current implementation
                    // In a real scenario, you'd filter by actual price ranges from product data
                    openModal(`Price Range: ${item.range}`, () => true);
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">{item.range}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">Volume: {item.volume}%</span>
                      <span className="text-xs text-gray-500">Conv: {item.conversion}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-stone-400 h-2 rounded-full"
                        style={{ width: `${item.volume}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-stone-700 h-2 rounded-full"
                        style={{ width: `${item.conversion}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Highest Demand</span>
                <span className="ml-auto font-semibold">₹2L-₹5L price range</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Highest Conversion</span>
                <span className="ml-auto font-semibold">₹10L+ price range</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Query Themes + Hesitation Reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Query Themes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Themes (AI Clustered)</h3>
            <div className="space-y-2">
              {data.queryThemes.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    const themeLower = item.theme.toLowerCase();
                    openModal(`Query Theme: ${item.theme}`, (dataItem) => {
                      const query = dataItem.customerQuery?.toLowerCase() || '';
                      if (themeLower.includes('price')) return query.includes('price') || query.includes('cost') || query.includes('offer');
                      else if (themeLower.includes('details')) return query.includes('detail') || query.includes('specification') || query.includes('about');
                      else if (themeLower.includes('availability')) return query.includes('available') || query.includes('stock') || query.includes('have');
                      else if (themeLower.includes('customization')) return query.includes('custom') || query.includes('personalize') || query.includes('modify');
                      else if (themeLower.includes('occasion')) return query.includes('occasion') || query.includes('event') || query.includes('celebration');
                      else if (themeLower.includes('policies')) return query.includes('policy') || query.includes('return') || query.includes('warranty');
                      return true;
                    });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-stone-700">{index + 1}</span>
                    </div>
                    <span className="text-sm text-gray-700">{item.theme}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Hesitation & Objections */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Hesitation & Objections</h3>
            <div className="space-y-3">
              {data.hesitationReasons.map((item, index) => (
                <div
                  key={index}
                  className="border-l-4 border-red-200 pl-4 py-2 cursor-pointer hover:bg-gray-50 transition rounded"
                  onClick={() => {
                    const reasonLower = item.reason.toLowerCase();
                    openModal(`Hesitation: ${item.reason}`, (dataItem) => {
                      const query = dataItem.customerQuery?.toLowerCase() || '';
                      // Low acceptance scores indicate hesitation
                      if (reasonLower.includes('price')) {
                        return (query.includes('expensive') || query.includes('price') || query.includes('cost')) && dataItem.acceptanceScore < 0.5;
                      } else if (reasonLower.includes('comparison')) {
                        return (query.includes('compare') || query.includes('other') || query.includes('alternative')) && dataItem.acceptanceScore < 0.6;
                      } else if (reasonLower.includes('design')) {
                        return (query.includes('design') || query.includes('style') || query.includes('look')) && dataItem.acceptanceScore < 0.6;
                      } else if (reasonLower.includes('occasion')) {
                        return (query.includes('later') || query.includes('thinking') || query.includes('maybe')) && dataItem.acceptanceScore < 0.6;
                      }
                      return dataItem.acceptanceScore < 0.5;
                    });
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">{item.reason}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">"{item.reason === 'Price too high' ? 'Bit expensive / needs attention' : item.reason === 'Needs comparison' ? 'I want heavy variety' : item.reason === 'Not sure about design' ? 'This structure / needs attention' : 'Looking for investment-worthy pieces'}"</span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal for showing raw data */}
        {modalOpen && modalData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">{modalData.title}</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 text-sm text-gray-600">
                  Showing {modalData.data.length} record{modalData.data.length !== 1 ? 's' : ''}
                </div>

                {modalData.data.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available for this filter
                  </div>
                ) : (
                  <div className="space-y-3">
                    {modalData.data.slice(0, 100).map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                item.acceptanceScore > 0.7
                                  ? 'bg-green-100 text-green-700'
                                  : item.acceptanceScore > 0.5
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              Score: {(item.acceptanceScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-900 mb-2">
                          <span className="font-medium">Query: </span>
                          {item.customerQuery || 'No query recorded'}
                        </p>
                        {item.editCategory && item.editCategory !== 'NONE' && (
                          <span className="inline-block text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded">
                            {item.editCategory.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    ))}
                    {modalData.data.length > 100 && (
                      <div className="text-center py-4 text-sm text-gray-500">
                        Showing first 100 records of {modalData.data.length} total
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-gray-50">
                <button
                  onClick={closeModal}
                  className="w-full px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: number;
  subtitle: string;
  negative?: boolean;
  onClick?: () => void;
}

function MetricCard({ title, value, trend, subtitle, negative, onClick }: MetricCardProps) {
  const isPositive = negative ? trend < 0 : trend > 0;

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${onClick ? 'cursor-pointer hover:shadow-lg transition' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
          <Users className="w-4 h-4 text-stone-600" />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {isPositive ? (
            <>
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-green-600 font-semibold">+{Math.abs(trend)}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3 text-red-600" />
              <span className="text-red-600 font-semibold">-{Math.abs(trend)}%</span>
            </>
          )}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
