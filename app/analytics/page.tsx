'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface AnalyticsData {
  summary: {
    totalSuggestions: number;
    totalEdits: number;
    editRate: number;
    averageAcceptanceScore: number;
    averageEditPercentage: number;
    averageSimilarityScore: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  editorStats: Array<{
    editor: string;
    editCount: number;
    averageAcceptanceScore: number;
  }>;
  topImprovementAreas: Array<{
    area: string;
    count: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    edits: number;
    avgAcceptanceScore: number;
    avgEditPercentage: number;
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/analytics?days=${days}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!data || !data.summary) {
        throw new Error('Invalid data structure received from API');
      }

      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-xl text-red-600 mb-2">Failed to load analytics</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData || !analyticsData.summary) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-2">No analytics data available</div>
          <p className="text-sm text-gray-500">Try running the seed script to generate sample data:</p>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
            npx tsx prisma/seed-analytics.ts
          </code>
        </div>
      </div>
    );
  }

  const { summary, categoryBreakdown, editorStats, topImprovementAreas, timeSeriesData } = analyticsData;

  // Additional safety checks for arrays
  const safeTimeSeriesData = timeSeriesData || [];
  const safeCategoryBreakdown = categoryBreakdown || [];
  const safeEditorStats = editorStats || [];
  const safeTopImprovementAreas = topImprovementAreas || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Performance Analytics</h1>
              <p className="text-gray-600">Track AI suggestion quality and identify areas for improvement</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = '/dashboard/analytics/insights')}
                className="px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition"
              >
                Customer Insights
              </button>
              <button
                onClick={() => (window.location.href = '/dashboard/analytics/roi')}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition"
              >
                ROI Dashboard
              </button>
              <button
                onClick={() => (window.location.href = '/dashboard/analytics/edits')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                View Detailed Edits
              </button>
            </div>
          </div>

          {/* Time range selector */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setDays(7)}
              className={`px-4 py-2 rounded ${days === 7 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-4 py-2 rounded ${days === 30 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDays(90)}
              className={`px-4 py-2 rounded ${days === 90 ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              90 Days
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Suggestions</h3>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary.totalSuggestions || 0}</p>
            <p className="text-sm text-gray-500 mt-1">{summary.totalEdits || 0} edited</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Edit Rate</h3>
              {(summary.editRate || 0) < 50 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900">{summary.editRate?.toFixed(1) || 0}%</p>
            <p className="text-sm text-gray-500 mt-1">
              {(summary.editRate || 0) < 50 ? 'Good performance' : 'Needs improvement'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">AI Acceptance</h3>
              {(summary.averageAcceptanceScore || 0) > 0.7 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {((summary.averageAcceptanceScore || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">Original quality score</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Edit Size</h3>
              <Activity className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{(summary.averageEditPercentage || 0).toFixed(1)}%</p>
            <p className="text-sm text-gray-500 mt-1">Content changed</p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Edit Trend Over Time */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={safeTimeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="edits" stroke="#8884d8" name="Daily Edits" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Acceptance Score Trend */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Acceptance Score Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={safeTimeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgAcceptanceScore"
                  stroke="#82ca9d"
                  name="Acceptance Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Edit Category Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Category Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={safeCategoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload }) => {
                    const categoryData = payload as AnalyticsData['categoryBreakdown'][number] | undefined;
                    return categoryData ? `${categoryData.category}: ${categoryData.percentage}%` : '';
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {safeCategoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Improvement Areas */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Improvement Areas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeTopImprovementAreas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#FF8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Details Table */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Category Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeCategoryBreakdown.map((category, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.percentage > 20 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          High Priority
                        </span>
                      ) : category.percentage > 10 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Medium Priority
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Low Priority
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Editor Performance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Editor Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Editor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Edits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg AI Quality Before Edit
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeEditorStats.map((editor, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editor.editor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editor.editCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(editor.averageAcceptanceScore * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
