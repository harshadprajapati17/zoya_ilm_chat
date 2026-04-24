import { NextRequest, NextResponse } from 'next/server';
import insightsData from '@/data/mock/analytics/insights/insights.json';
import qualifiedLeadsByRange from '@/data/mock/analytics/insights/qualified-leads-by-range.json';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hasCustomRange = Boolean(searchParams.get('startDate') && searchParams.get('endDate'));
    const days = parseInt(searchParams.get('days') || '30', 10);

    let rangeKey: '7d' | '30d' | '90d' | 'custom' = '30d';
    if (hasCustomRange) {
      rangeKey = 'custom';
    } else if (days === 7) {
      rangeKey = '7d';
    } else if (days === 90) {
      rangeKey = '90d';
    }

    const metricsByRange = (insightsData as {
      metricsByRange?: Record<string, Record<string, number>>;
      metrics: Record<string, number>;
    }).metricsByRange;

    const payload = {
      ...insightsData,
      metrics: metricsByRange?.[rangeKey] ?? insightsData.metrics,
      qualifiedLeadsRawData:
        (qualifiedLeadsByRange as Record<string, unknown[]>)[rangeKey] ??
        (insightsData as { qualifiedLeadsRawData?: unknown[] }).qualifiedLeadsRawData ??
        [],
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
