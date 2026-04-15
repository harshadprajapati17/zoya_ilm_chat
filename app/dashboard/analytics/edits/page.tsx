'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EditRecord {
  id: string;
  originalSuggestion: string;
  editedContent: string;
  editedBy: string;
  editCategory: string;
  editPercentage: number;
  similarityScore: number;
  acceptanceScore: number;
  customerQuery: string;
  keyChanges: string[];
  improvementNeeded: string[];
  createdAt: string;
}

export default function EditsDetailPage() {
  const [edits, setEdits] = useState<EditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [improvementActions, setImprovementActions] = useState<Record<string, 'accepted' | 'rejected'>>({});
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const itemsPerPage = 20;

  useEffect(() => {
    fetchEdits();
  }, [categoryFilter, currentPage, startDate, endDate]);

  const fetchEdits = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      if (startDate) {
        params.append('startDate', startDate);
      }

      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/analytics/edits?${params.toString()}`);
      const data = await response.json();

      setEdits(data.edits || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching edits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilter = () => {
    setCurrentPage(1); // Reset to first page when filtering
    fetchEdits();
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleImprovementAction = (
    editId: string,
    areaIndex: number,
    action: 'accepted' | 'rejected'
  ) => {
    const actionKey = `${editId}-${areaIndex}`;
    setImprovementActions((prev) => ({
      ...prev,
      [actionKey]: action,
    }));
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      TONE_ADJUSTMENT: 'bg-blue-100 text-blue-800',
      PRODUCT_CORRECTION: 'bg-orange-100 text-orange-800',
      ACCURACY_ISSUE: 'bg-red-100 text-red-800',
      LENGTH_PROBLEM: 'bg-yellow-100 text-yellow-800',
      LANGUAGE_QUALITY: 'bg-green-100 text-green-800',
      COMPLETE_REWRITE: 'bg-purple-100 text-purple-800',
      MINOR_EDIT: 'bg-gray-100 text-gray-800',
      NONE: 'bg-teal-100 text-teal-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getAcceptanceColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-700">Loading edits...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Learning Journey</h1>
          <p className="text-gray-600">
            See how AI improved over 90 days by learning from manager corrections.
            <span className="block text-sm mt-1">
              <strong>January:</strong> Poor AI responses, heavy manager corrections →
              <strong> February:</strong> Improving →
              <strong> March:</strong> AI mastered, minimal edits needed
            </span>
          </p>

          {/* Filters */}
          <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border border-(--zoya-analytics-card-border)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="TONE_ADJUSTMENT">Tone Adjustment</option>
                  <option value="PRODUCT_CORRECTION">Product Correction</option>
                  <option value="ACCURACY_ISSUE">Accuracy Issue</option>
                  <option value="LENGTH_PROBLEM">Length Problem</option>
                  <option value="LANGUAGE_QUALITY">Language Quality</option>
                  <option value="COMPLETE_REWRITE">Complete Rewrite</option>
                  <option value="MINOR_EDIT">Minor Edit</option>
                  <option value="NONE">No Edit</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter Actions */}
            {(startDate || endDate) && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={clearDateFilter}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear Date Filter
                </button>
                <span className="text-sm text-gray-600 flex items-center">
                  {startDate && `From: ${new Date(startDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}`}
                  {startDate && endDate && ' - '}
                  {endDate && `To: ${new Date(endDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}`}
                </span>
              </div>
            )}

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {edits.length} of {totalCount} edits
            </div>
          </div>
        </div>

        {/* Edits List */}
        <div className="space-y-6">
          {edits.map((edit) => (
            <div key={edit.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-(--zoya-analytics-card-border)">
              {/* Header */}
              <div
                className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(edit.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Month indicator for learning progression */}
                      {(() => {
                        const month = new Date(edit.createdAt).getMonth();
                        const isJan = month === 0;
                        const isFeb = month === 1;
                        const isMar = month === 2;
                        return (
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            isJan ? 'bg-red-100 text-red-700' :
                            isFeb ? 'bg-yellow-100 text-yellow-700' :
                            isMar ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {isJan ? '📚 Jan: Learning' : isFeb ? '📈 Feb: Improving' : isMar ? '🎯 Mar: Mastered' : 'Unknown'}
                          </span>
                        );
                      })()}
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(edit.editCategory)}`}>
                        {edit.editCategory.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        Edited by {edit.editedBy}
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(edit.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Customer Query: "{edit.customerQuery}"
                    </p>
                    <div className="flex gap-4 text-sm">
                      <span>
                        Edit: <span className="font-semibold">{edit.editPercentage.toFixed(1)}%</span>
                      </span>
                      <span>
                        Acceptance: <span className={`font-semibold ${getAcceptanceColor(edit.acceptanceScore)}`}>
                          {(edit.acceptanceScore * 100).toFixed(1)}%
                        </span>
                      </span>
                      <span>
                        Similarity: <span className="font-semibold">{(edit.similarityScore * 100).toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>
                  <button className="ml-4">
                    {expandedIds.has(edit.id) ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedIds.has(edit.id) && (
                <div className="p-6 bg-gray-50">
                  {/* Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Original AI Suggestion (Before Learning) */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                        AI Response (Before Learning)
                      </h3>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{edit.originalSuggestion}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ❌ Poor quality - generic, unhelpful, or inaccurate
                      </p>
                    </div>

                    {/* Manager's Correction (What AI Should Learn) */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Manager's Correction (Target Response)
                      </h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{edit.editedContent}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ✅ High quality - specific, helpful, accurate. AI learns from this!
                      </p>
                    </div>
                  </div>

                  {/* Analysis */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Analysis</h3>

                    {/* Key Changes */}
                    {edit.keyChanges && edit.keyChanges.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-600 mb-2">Key Changes:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {edit.keyChanges.map((change, idx) => (
                            <li key={idx} className="text-sm text-gray-700">{change}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvement Areas */}
                    {edit.improvementNeeded && edit.improvementNeeded.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-2">AI Needs Improvement In:</h4>
                        <div className="space-y-2">
                          {edit.improvementNeeded.map((area, idx) => (
                            <div
                              key={idx}
                              className="flex flex-col gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <span className="text-sm text-yellow-900">{area}</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleImprovementAction(edit.id, idx, 'accepted')}
                                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    improvementActions[`${edit.id}-${idx}`] === 'accepted'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-green-100 text-green-800 hover:bg-green-200'
                                  }`}
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleImprovementAction(edit.id, idx, 'rejected')}
                                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                                    improvementActions[`${edit.id}-${idx}`] === 'rejected'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                                  }`}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {edits.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow border border-(--zoya-analytics-card-border)">
            <p className="text-gray-500">No edits found for the selected filters.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between bg-white p-4 rounded-lg shadow border border-(--zoya-analytics-card-border)">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>

              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-4 py-2 text-sm border rounded-lg ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>

            <div className="text-sm text-gray-700">
              Total: {totalCount} edits
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
