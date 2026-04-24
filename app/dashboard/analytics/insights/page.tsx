'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnalyticsContentSkeleton } from '@/components/dashboard/AnalyticsContentSkeleton';
import { TrendingUp, TrendingDown, Users, Info, X, MapPin, Pencil } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { createPortal } from 'react-dom';
import 'react-day-picker/dist/style.css';

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
  allConversationsRawData?: RawDataItem[];
  highIntentRawData?: RawDataItem[];
  qualifiedLeadsRawData?: RawDataItem[];
  customerIntentRawData?: Record<string, RawDataItem[]>;
  hesitationRawData?: Record<string, RawDataItem[]>;
  priceSensitivityRawData?: Record<string, RawDataItem[]>;
}

type TimeRange = '7d' | '30d' | '90d' | 'custom';

const OCCASION_KEYWORDS = [
  'occasion',
  'festival',
  'festive',
  'wedding later',
  'next month',
  'not now',
  'later',
  'later on',
  'after some time',
  'when needed',
  'in future',
  'future purchase',
];

const QUALIFIED_LEAD_KEYWORDS = [
  'store',
  'location',
  'address',
  'available',
  'in stock',
  'have',
  'details',
  'specification',
  'customize',
  'custom',
  'next step',
  'how to buy',
  'book',
  'appointment',
  'visit',
];

const isQualifiedLead = (item: RawDataItem): boolean => {
  const query = item.customerQuery?.toLowerCase() || '';
  const hasBuyingSignal = QUALIFIED_LEAD_KEYWORDS.some((keyword) => query.includes(keyword));
  return hasBuyingSignal && item.acceptanceScore >= 0.6;
};

const isHesitationMatch = (reason: string, item: RawDataItem): boolean => {
  const query = item.customerQuery?.toLowerCase() || '';
  const lowAcceptance = item.acceptanceScore < 0.5;

  if (!lowAcceptance) return false;

  if (reason === 'Price too high') {
    return query.includes('expensive') || query.includes('price');
  }

  if (reason === 'Needs comparison') {
    return query.includes('compare') || query.includes('other');
  }

  if (reason === 'Not sure about design') {
    return query.includes('design') || query.includes('style');
  }

  if (reason === 'Waiting for occasion') {
    return OCCASION_KEYWORDS.some((keyword) => query.includes(keyword));
  }

  if (reason === 'Other objections') {
    return !(
      query.includes('expensive') ||
      query.includes('price') ||
      query.includes('compare') ||
      query.includes('other') ||
      query.includes('design') ||
      query.includes('style') ||
      OCCASION_KEYWORDS.some((keyword) => query.includes(keyword))
    );
  }

  return lowAcceptance;
};

const COLORS = ['#8B7355', '#A67C52', '#C9A882', '#D4B896', '#E5D4B8'];
const INTENT_COLORS = {
  'Gifting': '#8B7355',
  'Self Purchase': '#A67C52',
  'Wedding / Engagement': '#C9A882',
  'Investment': '#D4B896',
  'Browsing': '#E5D4B8',
};

const GEOGRAPHY_INSIGHTS = [
  { city: 'Mumbai', revenueInLakhs: 18.6, conversations: 248 },
  { city: 'Delhi', revenueInLakhs: 16.9, conversations: 231 },
  { city: 'Pune', revenueInLakhs: 12.7, conversations: 186 },
  { city: 'Bengaluru', revenueInLakhs: 14.8, conversations: 205 },
  { city: 'Chicago', revenueInLakhs: 11.9, conversations: 174 },
  { city: 'Dallas', revenueInLakhs: 13.4, conversations: 193 },
];

export default function CustomerInsightsPage() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>();
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customPickerPosition, setCustomPickerPosition] = useState({ top: 0, left: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    data: RawDataItem[];
    filterFn?: (item: RawDataItem) => boolean;
  } | null>(null);
  const customPickerRef = useRef<HTMLDivElement | null>(null);
  const customPickerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (timeRange === 'custom') {
        queryParams.set('startDate', customStartDate);
        queryParams.set('endDate', customEndDate);
      } else {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        queryParams.set('days', String(days));
      }

      const response = await fetch(`/api/analytics/insights?${queryParams.toString()}`);

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
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    fetchInsights();
  }, [timeRange, customStartDate, customEndDate, fetchInsights]);

  const updateCustomPickerPosition = useCallback(() => {
    if (!customPickerTriggerRef.current) return;
    const rect = customPickerTriggerRef.current.getBoundingClientRect();
    setCustomPickerPosition({
      top: rect.bottom + 8,
      left: rect.right,
    });
  }, []);

  useEffect(() => {
    if (!isCustomPickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (customPickerRef.current?.contains(targetNode)) return;
      if (customPickerTriggerRef.current?.contains(targetNode)) return;
      setIsCustomPickerOpen(false);
    };

    updateCustomPickerPosition();
    const handleViewportChange = () => updateCustomPickerPosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isCustomPickerOpen, updateCustomPickerPosition]);

  useEffect(() => {
    if (!isCustomPickerOpen) {
      return;
    }
    const timer = setTimeout(() => updateCustomPickerPosition(), 0);
    return () => clearTimeout(timer);
  }, [isCustomPickerOpen, updateCustomPickerPosition]);

  const handleCustomRangeClick = () => {
    setTimeRange('custom');
    setPendingRange({
      from: customStartDate ? parseISO(customStartDate) : undefined,
      to: customEndDate ? parseISO(customEndDate) : undefined,
    });
    setIsCustomPickerOpen(true);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setPendingRange(range);
  };

  const handleApplyCustomRange = () => {
    if (!pendingRange?.from || !pendingRange?.to) return;
    setCustomStartDate(format(pendingRange.from, 'yyyy-MM-dd'));
    setCustomEndDate(format(pendingRange.to, 'yyyy-MM-dd'));
    setIsCustomPickerOpen(false);
  };

  const openModal = (
    title: string,
    filterFn?: (item: RawDataItem) => boolean,
    sourceData?: RawDataItem[],
    maxRecords?: number
  ) => {
    if (!data) return;

    const baseData = sourceData ?? data.rawData;
    const filteredData = filterFn ? baseData.filter(filterFn) : baseData;
    const cappedData =
      typeof maxRecords === 'number' && maxRecords >= 0
        ? filteredData.slice(0, maxRecords)
        : filteredData;
    setModalData({ title, data: cappedData, filterFn });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const selectedPresetLabel = useMemo(() => {
    if (timeRange === 'custom') return null;
    const selectedDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (selectedDays - 1));
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }, [timeRange]);

  const renderMain = () => {
    if (loading) {
      return <AnalyticsContentSkeleton variant="insights" />;
    }
    if (!data) return null;

    const highestDemandRange = data.priceSensitivity.reduce<{ range: string; volume: number } | null>(
      (currentHighest, item) => {
        if (!currentHighest || item.volume > currentHighest.volume) {
          return { range: item.range, volume: item.volume };
        }
        return currentHighest;
      },
      null
    );

    return (
      <>
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <MetricCard
            title="Total Conversations"
            value={data.metrics.totalConversations.toLocaleString()}
            trend={data.metrics.totalConversationsTrend}
            subtitle="All chats"
            tooltipDescription="Total number of customer interactions (chat + calls) within the selected time period."
            onClick={() =>
              openModal(
                'Total Conversations - All Customer Queries',
                undefined,
                data.allConversationsRawData ?? data.rawData,
                data.metrics.totalConversations
              )
            }
          />
          <MetricCard
            title="High Intent Customers"
            value={data.metrics.highIntentCustomers.toLocaleString()}
            trend={data.metrics.highIntentTrend}
            subtitle="Ready to engage"
            tooltipDescription="Customers identified as having strong purchase intent based on conversation depth and intent signals."
            onClick={() =>
              openModal(
                'High-Intent Customers (Ready to engage)',
                data.highIntentRawData ? undefined : (item) => item.acceptanceScore >= 0.7,
                data.highIntentRawData ?? data.rawData,
                data.metrics.highIntentCustomers
              )
            }
          />
          <MetricCard
            title="Qualified Leads"
            value={data.metrics.qualifiedLeads.toLocaleString()}
            trend={data.metrics.qualifiedLeadsTrend}
            subtitle="Strong signals"
            tooltipDescription="Customers who showed clear buying interest (e.g., asked for store location, product details, or next steps)."
            onClick={() =>
              openModal(
                'Qualified Leads (Store location, product details, next steps)',
                data.qualifiedLeadsRawData ? undefined : isQualifiedLead,
                data.qualifiedLeadsRawData ?? data.rawData,
                data.metrics.qualifiedLeads
              )
            }
          />
        </div>

        {/* Row 1: Customer Intent + Product Demand */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Customer Intent Breakdown */}
          <div className="bg-white rounded-lg shadow p-6 border border-(--zoya-analytics-card-border)">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Customer Intent Breakdown</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Customer Intent Breakdown</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Classification of customer queries based on the underlying purchase intent inferred from conversation context.
                  </p>
                </div>
              </div>
            </div>
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
                      const staticIntentData = data.customerIntentRawData?.[item.name];
                      if (staticIntentData) {
                        openModal(`Customer Intent: ${item.name}`, undefined, staticIntentData);
                        return;
                      }
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
          </div>

          {/* Product Demand Intelligence */}
          <div className="bg-white rounded-lg shadow p-6 border border-(--zoya-analytics-card-border)">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Product Demand Intelligence</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Product Demand Intelligence</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Product categories receiving the highest customer interest based on query volume.
                  </p>
                </div>
              </div>
            </div>
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
            {/* <div className="mt-6 pt-4 border-t">
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
            </div> */}
          </div>
        </div>

        {/* Row 2: Price Sensitivity + Customer Hesitation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Price Sensitivity Analysis */}
          <div className="bg-white rounded-lg shadow p-6 border border-(--zoya-analytics-card-border)">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Price Sensitivity Analysis</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Price Sensitivity Analysis</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Distribution of customer queries across different price brackets based on mentioned or inferred budgets.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {data.priceSensitivity.map((item, index) => (
                <div
                  key={index}
                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition"
                  onClick={() => {
                    const staticPriceData = data.priceSensitivityRawData?.[item.range];
                    if (staticPriceData) {
                      openModal(`Price Range: ${item.range}`, undefined, staticPriceData);
                      return;
                    }
                    openModal(`Price Range: ${item.range}`, () => true);
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700">{item.range}</span>
                    <span className="text-xs text-gray-500">Volume: {item.volume}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-stone-700 h-2 rounded-full"
                      style={{ width: `${item.volume}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Highest Demand</span>
                <span className="ml-auto font-semibold">
                  {highestDemandRange ? `${highestDemandRange.range} price range` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border border-(--zoya-analytics-card-border)">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Customer Hesitation & Objections</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Customer Hesitation & Objections</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Common reasons customers delay or avoid purchase (e.g., design uncertainty, occasion mismatch).
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {data.hesitationReasons.map((item, index) => (
                <div
                  key={index}
                  className="border-l-4 border-red-200 pl-4 py-2 cursor-pointer hover:bg-gray-50 transition rounded"
                  onClick={() => {
                    const staticHesitationData = data.hesitationRawData?.[item.reason];
                    if (staticHesitationData) {
                      openModal(`Hesitation: ${item.reason}`, undefined, staticHesitationData);
                      return;
                    }
                    openModal(`Hesitation: ${item.reason}`, (dataItem) => isHesitationMatch(item.reason, dataItem));
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-gray-700">{item.reason}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">&quot;{item.reason === 'Price too high' ? 'Bit expensive / needs attention' : item.reason === 'Needs comparison' ? 'I want heavy variety' : item.reason === 'Not sure about design' ? 'This structure / needs attention' : item.reason === 'Waiting for occasion' ? 'Not buying now, waiting for the right moment' : 'Low intent but reason unclear'}&quot;</span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Geography Insights */}
        <div className="bg-white rounded-lg shadow p-6 border border-(--zoya-analytics-card-border) mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Geography Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GEOGRAPHY_INSIGHTS.map((item) => (
              <div
                key={item.city}
                className="rounded-lg border border-stone-200 bg-stone-50/60 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 text-stone-600 shrink-0" />
                    <span className="text-sm font-semibold text-gray-900 truncate">{item.city}</span>
                  </div>
                  <span className="text-sm font-bold text-stone-700 whitespace-nowrap">₹{item.revenueInLakhs.toFixed(1)}L</span>
                </div>
                <p className="mt-2 text-xs text-gray-600">{item.conversations.toLocaleString()} conversations</p>
              </div>
            ))}
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
      </>
    );
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">Customer Insights</h1>
              <p className="text-gray-600">Deep dive into customer behavior and preferences</p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div
                className={`inline-flex items-center rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm ${
                  loading ? 'pointer-events-none opacity-50' : ''
                }`}
              >
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setTimeRange('7d')}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
                    timeRange === '7d' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setTimeRange('30d')}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
                    timeRange === '30d' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setTimeRange('90d')}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
                    timeRange === '90d' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCustomRangeClick}
                  ref={customPickerTriggerRef}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
                    timeRange === 'custom' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {timeRange === 'custom' && customStartDate && customEndDate
                      ? `${format(parseISO(customStartDate), 'MMM d, yyyy')} - ${format(parseISO(customEndDate), 'MMM d, yyyy')}`
                      : 'Custom Range'}
                    {timeRange === 'custom' && customStartDate && customEndDate ? <Pencil className="h-3 w-3" /> : null}
                  </span>
                </button>
              </div>
              {selectedPresetLabel ? (
                <div className="whitespace-nowrap text-xs text-gray-500">
                  Date Range: <span className="font-normal text-gray-500">{selectedPresetLabel}</span>
                </div>
              ) : null}
              {isCustomPickerOpen && createPortal(
                <div
                  ref={customPickerRef}
                  className="fixed z-9999 rounded-lg border border-stone-200 bg-white p-3 shadow-xl"
                  style={{ top: customPickerPosition.top, left: customPickerPosition.left, transform: 'translateX(-100%)' }}
                >
                  <DayPicker
                    mode="range"
                    selected={pendingRange}
                    onSelect={handleRangeSelect}
                    min={1}
                    disabled={{ after: new Date() }}
                    captionLayout="dropdown"
                    fromYear={2020}
                    toYear={new Date().getFullYear()}
                    numberOfMonths={2}
                    pagedNavigation
                    className="text-sm"
                    classNames={{
                      months: 'flex flex-row gap-6',
                    }}
                  />
                  <div className="mt-3 border-t border-stone-200 pt-3">
                    <p className="text-xs text-stone-600">
                      Selected:{' '}
                      <span className="font-medium text-stone-800">
                        {pendingRange?.from
                          ? pendingRange?.to
                            ? `${format(pendingRange.from, 'MMM d, yyyy')} - ${format(pendingRange.to, 'MMM d, yyyy')}`
                            : `${format(pendingRange.from, 'MMM d, yyyy')} - Select end date`
                          : 'Select start and end dates'}
                      </span>
                    </p>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleApplyCustomRange}
                        disabled={!pendingRange?.from || !pendingRange?.to}
                        className="rounded-md bg-stone-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>
        {renderMain()}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend: number;
  subtitle: string;
  tooltipDescription?: string;
  negative?: boolean;
  onClick?: () => void;
}

function MetricCard({ title, value, trend, subtitle, tooltipDescription, negative, onClick }: MetricCardProps) {
  const roundedTrend = Math.round(trend);
  const isPositive = negative ? trend < 0 : trend > 0;
  const isNeutral = roundedTrend === 0;

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 border border-(--zoya-analytics-card-border) ${onClick ? 'cursor-pointer hover:shadow-lg transition' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center">
          <Users className="w-4 h-4 text-stone-600" />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {isNeutral ? (
            <span className="font-semibold text-gray-500">0%</span>
          ) : isPositive ? (
            <>
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span className="text-green-600 font-semibold">+{Math.abs(roundedTrend)}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3 text-red-600" />
              <span className="text-red-600 font-semibold">-{Math.abs(roundedTrend)}%</span>
            </>
          )}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        {tooltipDescription ? (
          <div
            className="relative group"
            onClick={(event) => event.stopPropagation()}
          >
            <Info className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
              <p className="text-xs font-semibold">{title}</p>
              <p className="mt-1 text-xs text-gray-200">{tooltipDescription}</p>
            </div>
          </div>
        ) : null}
      </div>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
