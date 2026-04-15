'use client';

import { useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, MessageSquare, Info, X, CalendarDays, Pencil } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { createPortal } from 'react-dom';
import 'react-day-picker/dist/style.css';

interface FeedbackDetail {
  id: string;
  originalSuggestion: string;
  editedContent: string;
  editCategory: string;
  acceptanceScore: number;
  customerQuery: string;
  queryCategory: string;
  createdAt: string;
  editedBy: string;
}

interface ROIData {
  summary: {
    acceptanceRateCurrent: number;
    acceptanceRatePrevious: number;
    acceptanceRateChange: number;
    editRateCurrent: number;
    editRatePrevious: number;
    editRateChange: number;
    chatsPerRepCurrent: number;
    chatsPerRepPrevious: number;
    chatsPerRepChange: number;
    timeSavedPerDay: number;
  };
  acceptanceOverTime: Array<{
    day: number;
    dateLabel: string;
    rate: number;
  }>;
  editReasonTrends: Array<{
    day: number;
    dateLabel: string;
    wrongTone: number;
    wrongProduct: number;
    missingDetails: number;
    inaccurateInfo: number;
  }>;
  confidenceScore: {
    current: number;
    history: Array<{
      day: number;
      dateLabel: string;
      score: number;
    }>;
    autoSuggestThreshold: number;
    autoSendThreshold: number;
    afterHoursThreshold: number;
  };
  editFrequencyByCategory: Array<{
    category: string;
    acceptanceRate: number;
    status: 'excellent' | 'good' | 'fair' | 'needs-work';
    count: number;
  }>;
  rawFeedback: Array<FeedbackDetail>;
}

type TimeRange = '7d' | '30d' | '90d' | 'custom';

export default function ROIAnalyticsPage() {
  const [data, setData] = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('90d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>();
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customPickerPosition, setCustomPickerPosition] = useState({ top: 0, left: 0 });
  const [modalData, setModalData] = useState<{
    title: string;
    data: Array<FeedbackDetail>;
    filter?: string;
  } | null>(null);
  const customPickerRef = useRef<HTMLDivElement | null>(null);
  const customPickerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const getSelectedDateRangeLabel = () => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (timeRange === 'custom') {
      if (!customStartDate || !customEndDate) {
        return 'Select custom range';
      }

      return `${formatter.format(new Date(customStartDate))} - ${formatter.format(new Date(customEndDate))}`;
    }

    const selectedDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (selectedDays - 1));

    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  };

  useEffect(() => {
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    fetchROIData();
  }, [timeRange, customStartDate, customEndDate]);

  const updateCustomPickerPosition = () => {
    if (!customPickerTriggerRef.current) return;
    const rect = customPickerTriggerRef.current.getBoundingClientRect();
    setCustomPickerPosition({
      top: rect.bottom + 8,
      left: rect.right,
    });
  };

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
  }, [isCustomPickerOpen]);

  useEffect(() => {
    if (!isCustomPickerOpen) return;
    const timer = setTimeout(() => updateCustomPickerPosition(), 0);
    return () => clearTimeout(timer);
  }, [isCustomPickerOpen]);

  const fetchROIData = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();

      if (timeRange === 'custom') {
        queryParams.set('startDate', customStartDate);
        queryParams.set('endDate', customEndDate);
      } else {
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        queryParams.set('days', String(days));
      }

      const response = await fetch(`/api/analytics/roi?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch ROI data: ${response.status}`);
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (err) {
      console.error('Error fetching ROI data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ROI analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading ROI analytics...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-xl text-red-600 mb-2">Failed to load ROI analytics</div>
          <div className="text-sm text-gray-600 mb-4">{error || 'No data available'}</div>
          <button
            onClick={() => fetchROIData()}
            className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, acceptanceOverTime, editReasonTrends, confidenceScore, editFrequencyByCategory, rawFeedback } = data;
  const selectedDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : acceptanceOverTime.length;
  const selectedPresetLabel = (() => {
    if (timeRange === 'custom') return null;
    const daysForLabel = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (daysForLabel - 1));
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  })();

  // Handler functions for chart clicks
  const handleCategoryClick = (category: string) => {
    if (!rawFeedback) return;

    // Filter by the computed queryCategory field from the backend
    const filtered = rawFeedback.filter(f => f.queryCategory === category);

    setModalData({
      title: `${category} - Detailed Feedback Data`,
      data: filtered,
      filter: category,
    });
  };

  const handleDayClick = (day: number) => {
    if (!rawFeedback) return;

    const startDate = new Date();
    if (timeRange === 'custom' && customStartDate) {
      startDate.setTime(new Date(customStartDate).getTime());
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(startDate.getDate() + day - 1);
    } else {
      startDate.setDate(startDate.getDate() - selectedDays + day - 1);
    }
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const filtered = rawFeedback.filter(f => {
      const feedbackDate = new Date(f.createdAt);
      return feedbackDate >= startDate && feedbackDate < endDate;
    });

    setModalData({
      title: `Day ${day} - Detailed Feedback Data`,
      data: filtered,
      filter: `Day ${day}`,
    });
  };

  const handleEditCategoryClick = (editType: string) => {
    if (!rawFeedback) return;

    const categoryMap: Record<string, string[]> = {
      'Wrong Tone': ['TONE_ADJUSTMENT'],
      'Wrong Product': ['PRODUCT_CORRECTION'],
      'Missing Details': ['LENGTH_PROBLEM', 'MINOR_EDIT'],
      'Inaccurate Info': ['ACCURACY_ISSUE', 'LANGUAGE_QUALITY', 'COMPLETE_REWRITE'],
    };

    const filtered = rawFeedback.filter(f =>
      categoryMap[editType]?.includes(f.editCategory)
    );

    setModalData({
      title: `${editType} - Detailed Feedback Data`,
      data: filtered,
      filter: editType,
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Performance & ROI</h1>
              <p className="text-gray-600">Investment impact analysis and trend insights</p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white p-0.5 shadow-sm">
                <button
                  onClick={() => setTimeRange('7d')}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition ${
                    timeRange === '7d' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setTimeRange('30d')}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition ${
                    timeRange === '30d' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setTimeRange('90d')}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition ${
                    timeRange === '90d' ? 'bg-stone-600 text-white shadow-sm' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={handleCustomRangeClick}
                  ref={customPickerTriggerRef}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-xs font-medium transition ${
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
                <div className="text-xs text-gray-500 whitespace-nowrap">
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

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Acceptance Rate Growth */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border) flex flex-col">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Acceptance Rate Growth
              </h3>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Acceptance Rate Growth</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Percentage of AI-generated responses accepted by agents with minimal or no changes.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {summary.acceptanceRatePrevious}%
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-2xl font-bold text-gray-900">
                {summary.acceptanceRateCurrent}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-medium">
                +{summary.acceptanceRateChange.toFixed(1)}% improvement
              </span>
            </div>
          </div>

          {/* Edit Rate Decline */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Edit Rate Decline
              </h3>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Edit Rate Decline</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Percentage of AI responses that required significant modification by agents before sending.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {summary.editRatePrevious}%
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-2xl font-bold text-gray-900">
                {summary.editRateCurrent}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingDown className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-medium">
                {summary.editRateChange.toFixed(1)}% fewer edits
              </span>
            </div>
          </div>

          {/* Avg Chats per Rep per Day */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Avg Chats per Rep per Day
              </h3>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Avg Chats per Rep per Day</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Average number of customer conversations handled per agent per day.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {summary.chatsPerRepPrevious}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-2xl font-bold text-gray-900">
                {summary.chatsPerRepCurrent}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-green-600 font-medium">
                +{summary.chatsPerRepChange.toFixed(1)}% increase
              </span>
            </div>
          </div>

          {/* Estimated Time Saved */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Estimated Time Saved
              </h3>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-72 max-w-[calc(100vw-2rem)] rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Estimated Time Saved</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Approximate reduction in agent effort due to AI-assisted responses.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {summary.timeSavedPerDay.toFixed(1)}
              </span>
              <span className="text-lg text-gray-600">hours</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-500">From reduced editing time</span>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Acceptance Rate Over Time */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Acceptance Rate Over Time</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Acceptance Rate Over Time</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Trend showing how AI response quality (acceptance) has improved across the selected time period.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Clear upward trajectory with key improvement milestones</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={acceptanceOverTime}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4a574" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d4a574" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  domain={[50, 85]}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Acceptance Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#a67c52"
                  strokeWidth={2}
                  fill="url(#colorRate)"
                  onClick={(_, index) => {
                    const dataPoint = typeof index === 'number' ? acceptanceOverTime[index] : undefined;
                    if (dataPoint) {
                      handleDayClick(dataPoint.day);
                    }
                  }}
                  cursor="pointer"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
              <span>Key milestones</span>
            </div>
          </div>

          {/* Edit Reason Trends */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Edit Reason Trends</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Edit Reason Trends</p>
                  <p className="mt-1 text-xs text-gray-200">
                    Breakdown of common types of edits made by agents (e.g., tone, accuracy, completeness).
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">All categories declining — AI learning across dimensions</p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={editReasonTrends}>
                <defs>
                  <linearGradient id="colorWrongTone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e8b4b4" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#e8b4b4" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="colorWrongProduct" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f4d4a0" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f4d4a0" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="colorMissingDetails" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c9b8a0" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#c9b8a0" stopOpacity={0.3} />
                  </linearGradient>
                  <linearGradient id="colorInaccurateInfo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#b8b8b8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#b8b8b8" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  domain={[0, 100]}
                  allowDataOverflow
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Edit Frequency (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="inaccurateInfo"
                  stackId="1"
                  stroke="#808080"
                  fill="url(#colorInaccurateInfo)"
                  name="Inaccurate Info"
                />
                <Area
                  type="monotone"
                  dataKey="missingDetails"
                  stackId="1"
                  stroke="#8b7355"
                  fill="url(#colorMissingDetails)"
                  name="Missing Details"
                />
                <Area
                  type="monotone"
                  dataKey="wrongProduct"
                  stackId="1"
                  stroke="#d4a574"
                  fill="url(#colorWrongProduct)"
                  name="Wrong Product"
                />
                <Area
                  type="monotone"
                  dataKey="wrongTone"
                  stackId="1"
                  stroke="#c77c7c"
                  fill="url(#colorWrongTone)"
                  name="Wrong Tone"
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <button
                onClick={() => handleEditCategoryClick('Wrong Tone')}
                className="flex items-center gap-1 hover:opacity-75 transition cursor-pointer"
              >
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#c77c7c' }}></span>
                <span className="text-gray-600">Wrong Tone</span>
              </button>
              <button
                onClick={() => handleEditCategoryClick('Wrong Product')}
                className="flex items-center gap-1 hover:opacity-75 transition cursor-pointer"
              >
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#d4a574' }}></span>
                <span className="text-gray-600">Wrong Product</span>
              </button>
              <button
                onClick={() => handleEditCategoryClick('Missing Details')}
                className="flex items-center gap-1 hover:opacity-75 transition cursor-pointer"
              >
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#8b7355' }}></span>
                <span className="text-gray-600">Missing Details</span>
              </button>
              <button
                onClick={() => handleEditCategoryClick('Inaccurate Info')}
                className="flex items-center gap-1 hover:opacity-75 transition cursor-pointer"
              >
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#808080' }}></span>
                <span className="text-gray-600">Inaccurate Info</span>
              </button>
            </div>
          </div>

          {/* Confidence Score Progression */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Confidence Score Progression</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Confidence Score Progression</p>
                  <p className="mt-1 text-xs text-gray-200">
                    AI&apos;s self-assessed confidence trend in its responses over time.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Journey toward autonomous AI capabilities</p>

            {/* Gauge Chart */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-full max-w-[214px] h-[168px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="80%"
                    innerRadius="60%"
                    outerRadius="100%"
                    startAngle={180}
                    endAngle={0}
                    data={[{ value: confidenceScore.current }]}
                  >
                    <PolarAngleAxis
                      type="number"
                      domain={[0, 100]}
                      angleAxisId={0}
                      tick={false}
                    />
                    <RadialBar
                      background
                      dataKey="value"
                      cornerRadius={10}
                      fill="#a67c52"
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '40%' }}>
                  <div className="text-3xl font-bold text-gray-900">{confidenceScore.current}%</div>
                  <div className="text-xs text-gray-600">Current Score</div>
                </div>
              </div>
            </div>

            {/* Line Chart */}
            <ResponsiveContainer width="100%" height={214}>
              <LineChart data={confidenceScore.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#9ca3af"
                  style={{ fontSize: '10px' }}
                />
                <YAxis
                  domain={[40, 100]}
                  stroke="#9ca3af"
                  style={{ fontSize: '10px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#8b6f47"
                  strokeWidth={2}
                  dot={{ fill: '#8b6f47', r: 2 }}
                />
                {/* Reference lines for thresholds */}
                <Line
                  type="monotone"
                  dataKey={() => confidenceScore.afterHoursThreshold}
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey={() => confidenceScore.autoSendThreshold}
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* <div className="mt-3 space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-block w-8 h-0.5 bg-gray-300 border-dashed"></span>
                <span>85% Auto-suggest</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-8 h-0.5 bg-gray-300 border-dashed"></span>
                <span>95% Auto-send</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-8 h-0.5 bg-gray-300 border-dashed"></span>
                <span>98% After-hours</span>
              </div>
            </div> */}
          </div>

          {/* Acceptance Rate by Query Category */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Acceptance Rate by Query Category</h3>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
                <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-80 -translate-x-1/2 rounded-md bg-gray-900 p-3 text-left text-white shadow-lg group-hover:block">
                  <p className="text-xs font-semibold">Acceptance Rate by Query Category</p>
                  <p className="mt-1 text-xs text-gray-200">
                    How well AI performs across different types of customer queries (e.g., pricing, product info, availability).
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">AI excels at product info, needs work on complaints</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={editFrequencyByCategory}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Acceptance Rate (%)', position: 'insideBottom', offset: -5, style: { fontSize: '12px' } }}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Bar
                  dataKey="acceptanceRate"
                  radius={[0, 4, 4, 0]}
                  fill="#8b7355"
                  onClick={(_, index) => {
                    const dataPoint = typeof index === 'number' ? editFrequencyByCategory[index] : undefined;
                    if (dataPoint) {
                      handleCategoryClick(dataPoint.category);
                    }
                  }}
                  cursor="pointer"
                >
                  {editFrequencyByCategory.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.status === 'excellent' ? '#6b9b7f' :
                        entry.status === 'good' ? '#8b9b6b' :
                        entry.status === 'fair' ? '#d4a574' :
                        '#b77c7c'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#6b9b7f' }}></span>
                <span className="text-gray-600">Excellent (80%+)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#8b9b6b' }}></span>
                <span className="text-gray-600">Good (70-79%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#d4a574' }}></span>
                <span className="text-gray-600">Fair (60-69%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: '#b77c7c' }}></span>
                <span className="text-gray-600">Needs Work (&lt;60%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Modal */}
        {modalData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
               onClick={() => setModalData(null)}>
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
                 onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{modalData.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {modalData.data.length} feedback {modalData.data.length === 1 ? 'record' : 'records'} found
                  </p>
                </div>
                <button
                  onClick={() => setModalData(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                {modalData.data.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No feedback data found for this selection
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modalData.data.map((feedback, index) => (
                      <div key={feedback.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold text-gray-500">#{index + 1}</span>
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                                feedback.editCategory === 'TONE_ADJUSTMENT' ? 'bg-pink-100 text-pink-800' :
                                feedback.editCategory === 'PRODUCT_CORRECTION' ? 'bg-orange-100 text-orange-800' :
                                feedback.editCategory === 'ACCURACY_ISSUE' ? 'bg-red-100 text-red-800' :
                                feedback.editCategory === 'LENGTH_PROBLEM' ? 'bg-yellow-100 text-yellow-800' :
                                feedback.editCategory === 'LANGUAGE_QUALITY' ? 'bg-blue-100 text-blue-800' :
                                feedback.editCategory === 'COMPLETE_REWRITE' ? 'bg-purple-100 text-purple-800' :
                                feedback.editCategory === 'MINOR_EDIT' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {feedback.editCategory.replace(/_/g, ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                Acceptance: {(feedback.acceptanceScore * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mb-2">
                              Edited by: <span className="font-medium text-gray-700">{feedback.editedBy}</span> •
                              {' '}{new Date(feedback.createdAt).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {feedback.customerQuery && (
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Customer Query:</div>
                              <div className="text-sm text-gray-600 bg-white p-2 rounded border border-gray-200">
                                {feedback.customerQuery}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">AI Suggestion:</div>
                              <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded border border-blue-200 max-h-32 overflow-y-auto">
                                {feedback.originalSuggestion}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-700 mb-1">Edited Content:</div>
                              <div className="text-sm text-gray-600 bg-green-50 p-2 rounded border border-green-200 max-h-32 overflow-y-auto">
                                {feedback.editedContent}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setModalData(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
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
