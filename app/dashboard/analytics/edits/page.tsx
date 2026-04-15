'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { createPortal } from 'react-dom';
import 'react-day-picker/dist/style.css';

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

interface ToastState {
  message: string;
  type: 'success' | 'error';
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
  const [pageSize, setPageSize] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerPosition, setDatePickerPosition] = useState({ top: 0, left: 0 });
  const [toast, setToast] = useState<ToastState | null>(null);
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const datePickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fetchEdits = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
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
  }, [categoryFilter, currentPage, endDate, pageSize, startDate]);

  useEffect(() => {
    fetchEdits();
  }, [fetchEdits]);

  const updateDatePickerPosition = () => {
    if (!datePickerTriggerRef.current) return;
    const rect = datePickerTriggerRef.current.getBoundingClientRect();
    setDatePickerPosition({
      top: rect.bottom + 8,
      left: rect.right,
    });
  };

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (datePickerRef.current?.contains(targetNode)) return;
      if (datePickerTriggerRef.current?.contains(targetNode)) return;
      setIsDatePickerOpen(false);
    };

    updateDatePickerPosition();
    const handleViewportChange = () => updateDatePickerPosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const timer = setTimeout(() => updateDatePickerPosition(), 0);
    return () => clearTimeout(timer);
  }, [isDatePickerOpen]);

  const handleDateRangeClick = () => {
    setPendingRange({
      from: startDate ? parseISO(startDate) : undefined,
      to: endDate ? parseISO(endDate) : undefined,
    });
    setIsDatePickerOpen(true);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setPendingRange(range);
  };

  const handleApplyDateRange = () => {
    if (!pendingRange?.from || !pendingRange?.to) return;
    setStartDate(format(pendingRange.from, 'yyyy-MM-dd'));
    setEndDate(format(pendingRange.to, 'yyyy-MM-dd'));
    setCurrentPage(1);
    setIsDatePickerOpen(false);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setPendingRange(undefined);
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
    setToast({
      message: action === 'accepted' ? 'Improvement marked as accepted' : 'Improvement marked as rejected',
      type: action === 'accepted' ? 'success' : 'error',
    });
    setTimeout(() => setToast(null), 2200);
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
      {toast && (
        <div className="fixed right-6 top-6 z-50">
          <div
            className={`rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Learning Journey</h1>
            <p className="text-gray-600 max-w-4xl">
              See how AI improved over 90 days by learning from manager corrections.
              <span className="block text-sm mt-1">
                <strong>January:</strong> Poor AI responses, heavy manager corrections →
                <strong> February:</strong> Improving →
                <strong> March:</strong> AI mastered, minimal edits needed
              </span>
            </p>
          </div>

          {/* Filters */}
          <div className="mt-4">
            <div className="w-full">
              <div className="flex flex-col gap-1.5 lg:flex-row lg:items-end lg:justify-between">
                <div className="w-full sm:w-36 lg:w-auto">
                  <p className="mt-5 flex h-7.5 items-center px-1 text-xs text-gray-700 sm:mt-0">
                    <span className="font-medium">Total Edits:</span>
                    <span className="ml-1 font-semibold text-gray-800">{totalCount.toLocaleString()}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end lg:justify-end">
                  {/* Category Filter */}
                  <div className="w-full sm:w-36">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="h-7.5 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <div className="w-full sm:w-[210px] md:w-[220px] lg:w-[230px]">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Date Range
                    </label>
                    <button
                      type="button"
                      onClick={handleDateRangeClick}
                      ref={datePickerTriggerRef}
                      className="flex h-7.5 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className="truncate text-xs text-gray-700">
                        {startDate && endDate
                          ? `${format(parseISO(startDate), 'MMM d, yyyy')} - ${format(parseISO(endDate), 'MMM d, yyyy')}`
                          : 'Select start and end dates'}
                      </span>
                      {startDate && endDate ? (
                        <Pencil className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {/* Page Size Filter */}
                  <div className="w-full sm:w-24">
                    <label className="mb-1 block text-xs font-medium text-gray-700">
                      Page Size
                    </label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-7.5 w-full rounded-md border border-gray-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>

              {isDatePickerOpen && createPortal(
                <div
                  ref={datePickerRef}
                  className="fixed z-9999 rounded-lg border border-stone-200 bg-white p-3 shadow-xl"
                  style={{ top: datePickerPosition.top, left: datePickerPosition.left, transform: 'translateX(-100%)' }}
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
                        onClick={handleApplyDateRange}
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

              {/* Filter Actions */}
              {(startDate || endDate) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={clearDateFilter}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Clear Date Filter
                  </button>
                  <span className="flex items-center text-xs text-gray-600">
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

          </div>
          </div>
        </div>

        {/* Edits List */}
        <div className="space-y-6">
          {edits.map((edit) => (
            <div key={edit.id} className="overflow-hidden rounded-lg border border-(--zoya-analytics-card-border) bg-white shadow-sm transition hover:shadow">
              {/* Header */}
              <div
                className="cursor-pointer border-b border-gray-200 p-4 hover:bg-gray-50"
                onClick={() => toggleExpand(edit.id)}
              >
                <div className="flex items-center justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-end gap-3">
                      <div>
                        {(() => {
                          const month = new Date(edit.createdAt).getMonth();
                          const status = month === 0 ? 'Jan: Learning' : month === 1 ? 'Feb: Improving' : month === 2 ? 'Mar: Mastered' : 'Unknown';
                          const statusClassName =
                            month === 0 ? 'text-red-700' :
                            month === 1 ? 'text-yellow-700' :
                            month === 2 ? 'text-green-700' :
                            'text-gray-700';

                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                Category
                              </span>
                              <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getCategoryColor(edit.editCategory)}`}>
                                {edit.editCategory.replace(/_/g, ' ')}
                              </span>
                              <p className="text-xs text-gray-600">
                                {edit.editedBy} • {new Date(edit.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })} • <span className={`font-semibold ${statusClassName}`}>{status}</span>
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    <p className=" truncate text-xl font-medium leading-tight text-gray-900">
                      &quot;{edit.customerQuery}&quot;
                    </p>
                  </div>

                  <div className="flex min-w-[300px] shrink-0 flex-col items-end justify-center gap-2 pl-6">
                    <div className="grid grid-cols-[auto_auto_auto] items-start gap-6">
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Acceptance</p>
                        <p className={`text-xl font-bold leading-none ${getAcceptanceColor(edit.acceptanceScore)}`}>
                          {(edit.acceptanceScore * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Similarity</p>
                        <p className="text-xl font-bold leading-none text-gray-900">{(edit.similarityScore * 100).toFixed(1)}%</p>
                      </div>
                      <button className="self-start pt-1">
                        {expandedIds.has(edit.id) ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </div>
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
                    </div>

                    {/* Manager's Correction (What AI Should Learn) */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Manager&apos;s Correction (Target Response)
                      </h3>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{edit.editedContent}</p>
                      </div>
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
