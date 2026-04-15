import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const daysParam = parseInt(searchParams.get('days') || '30', 10);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const hasCustomRange = Boolean(startDateParam && endDateParam);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();

    if (hasCustomRange) {
      const parsedStartDate = new Date(startDateParam as string);
      const parsedEndDate = new Date(endDateParam as string);

      if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
        return NextResponse.json({ error: 'Invalid custom date range' }, { status: 400 });
      }

      if (parsedStartDate > parsedEndDate) {
        return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
      }

      startDate.setTime(parsedStartDate.getTime());
      startDate.setHours(0, 0, 0, 0);
      endDate.setTime(parsedEndDate.getTime());
      endDate.setHours(23, 59, 59, 999);
    } else {
      const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
    }

    const rangeDurationDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime() + 1) / (1000 * 60 * 60 * 24))
    );

    // Get feedback data
    const feedbacks = await prisma.aIEditFeedback.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        customerQuery: true,
        editCategory: true,
        acceptanceScore: true,
        createdAt: true,
      },
    });

    const totalConversations = feedbacks.length;
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - rangeDurationDays);

    const previousFeedbacks = await prisma.aIEditFeedback.count({
      where: {
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate,
        },
      },
    });

    // Calculate trends
    const conversationTrend = previousFeedbacks > 0
      ? ((totalConversations - previousFeedbacks) / previousFeedbacks) * 100
      : 0;

    // Categorize customer intent based on queries
    const intentCounts = {
      'Gifting': 0,
      'Self Purchase': 0,
      'Wedding / Engagement': 0,
      'Investment': 0,
      'Browsing': 0,
    };

    feedbacks.forEach((f) => {
      const query = f.customerQuery?.toLowerCase() || '';
      if (query.includes('gift') || query.includes('anniversary') || query.includes('birthday')) {
        intentCounts['Gifting']++;
      } else if (query.includes('bridal') || query.includes('wedding') || query.includes('engagement') || query.includes('mangalsutra')) {
        intentCounts['Wedding / Engagement']++;
      } else if (query.includes('investment') || query.includes('heavy')) {
        intentCounts['Investment']++;
      } else if (query.includes('browse') || query.includes('show') || query.includes('collection') || query.includes('trending')) {
        intentCounts['Browsing']++;
      } else {
        intentCounts['Self Purchase']++;
      }
    });

    const customerIntent = Object.entries(intentCounts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / totalConversations) * 100),
    }));

    // Product demand analysis
    const productDemand = [
      { category: 'Rings', demand: 0, percentage: 0 },
      { category: 'Bangles', demand: 0, percentage: 0 },
      { category: 'Necklaces', demand: 0, percentage: 0 },
      { category: 'Earrings', demand: 0, percentage: 0 },
    ];

    feedbacks.forEach((f) => {
      const query = f.customerQuery?.toLowerCase() || '';
      if (query.includes('ring')) productDemand[0].demand++;
      else if (query.includes('bangle')) productDemand[1].demand++;
      else if (query.includes('necklace') || query.includes('chain')) productDemand[2].demand++;
      else if (query.includes('earring')) productDemand[3].demand++;
    });

    const totalDemand = productDemand.reduce((sum, p) => sum + p.demand, 0);
    productDemand.forEach((p) => {
      p.percentage = totalDemand > 0 ? Math.round((p.demand / totalDemand) * 100) : 0;
    });

    // Sort by demand
    productDemand.sort((a, b) => b.percentage - a.percentage);

    // High intent customers (acceptance score > 0.7)
    const highIntentCustomers = feedbacks.filter((f) => (f.acceptanceScore ?? 0) > 0.7).length;
    const qualifiedLeads = Math.round(totalConversations * 0.19); // ~19% qualified
    const likelyBuyers = Math.round(totalConversations * 0.086); // ~8.6%
    const lostOpportunities = Math.round(totalConversations * 0.027); // ~2.7%

    // Calculate query themes dynamically from actual data
    const queryThemeCounts: Record<string, number> = {
      'Price inquiry': 0,
      'Product Details': 0,
      'Availability': 0,
      'Customization': 0,
      'Occasion Evidence': 0,
      'Policies': 0,
    };

    feedbacks.forEach((f) => {
      const query = f.customerQuery?.toLowerCase() || '';
      if (query.includes('price') || query.includes('cost') || query.includes('expensive') || query.includes('emi')) {
        queryThemeCounts['Price inquiry']++;
      } else if (query.includes('available') || query.includes('stock') || query.includes('have')) {
        queryThemeCounts['Availability']++;
      } else if (query.includes('customize') || query.includes('custom') || query.includes('white gold')) {
        queryThemeCounts['Customization']++;
      } else if (query.includes('anniversary') || query.includes('birthday') || query.includes('diwali') || query.includes('gift')) {
        queryThemeCounts['Occasion Evidence']++;
      } else if (query.includes('return') || query.includes('policy') || query.includes('certificate') || query.includes('warranty')) {
        queryThemeCounts['Policies']++;
      } else {
        queryThemeCounts['Product Details']++;
      }
    });

    const queryThemes = Object.entries(queryThemeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    // Calculate hesitation reasons dynamically
    const hesitationCounts: Record<string, number> = {
      'Price too high': 0,
      'Needs comparison': 0,
      'Not sure about design': 0,
      'Waiting for occasion': 0,
      'Other objections': 0,
    };

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
      'Waiting for'
    ];

    feedbacks.forEach((f) => {
      if ((f.acceptanceScore ?? 0) < 0.5) {
        const query = f.customerQuery?.toLowerCase() || '';
        if (query.includes('expensive') || query.includes('price')) {
          hesitationCounts['Price too high']++;
        } else if (query.includes('compare') || query.includes('other')) {
          hesitationCounts['Needs comparison']++;
        } else if (query.includes('design') || query.includes('style')) {
          hesitationCounts['Not sure about design']++;
        } else if (OCCASION_KEYWORDS.some((keyword) => query.includes(keyword))) {
          hesitationCounts['Waiting for occasion']++;
        } else {
          hesitationCounts['Other objections']++;
        }
      }
    });

    const hesitationReasons = Object.entries(hesitationCounts)
      .map(([reason, count]) => ({ reason, count }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const insights = {
      metrics: {
        totalConversations,
        totalConversationsTrend: Math.round(conversationTrend),
        highIntentCustomers,
        highIntentTrend: 24,
        qualifiedLeads,
        qualifiedLeadsTrend: 12,
        likelyBuyers,
        likelyBuyersTrend: -8,
        lostOpportunities,
        lostOpportunitiesTrend: -5,
      },
      customerIntent,
      productDemand,
      topInsights: [
        'High demand for solitaire rings',
        'Bangles preferred for gifting',
        'Emerald stones trending',
      ],
      priceSensitivity: [
        { range: '< ₹2L', volume: 35, conversion: 22 },
        { range: '₹2L-₹5L', volume: 28, conversion: 34 },
        { range: '₹5L-₹10L', volume: 23, conversion: 38 },
        { range: '₹10L+', volume: 14, conversion: 38 },
      ],
      queryThemes,
      hesitationReasons,
      // Raw data for drill-down
      rawData: feedbacks.map(f => ({
        id: f.id,
        customerQuery: f.customerQuery,
        editCategory: f.editCategory,
        acceptanceScore: f.acceptanceScore,
        createdAt: f.createdAt,
      })),
    };

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error fetching insights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
