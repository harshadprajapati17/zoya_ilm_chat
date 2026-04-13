import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFeedbackInsights } from '@/lib/services/aiFeedbackLearning';

// GET /api/analytics - Get comprehensive AI performance analytics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const managerId = searchParams.get('managerId');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
      },
    };

    if (managerId) {
      where.editedBy = managerId;
    }

    // Get all feedback records
    const feedbackRecords = await prisma.aIEditFeedback.findMany({
      where,
      select: {
        id: true,
        editCategory: true,
        editPercentage: true,
        acceptanceScore: true,
        similarityScore: true,
        editedBy: true,
        createdAt: true,
        improvementNeeded: true,
        keyChanges: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total AI suggestions made (including those not edited)
    const totalSuggestions = await prisma.suggestedReply.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Calculate metrics
    const totalEdits = feedbackRecords.length;
    const editRate = totalSuggestions > 0 ? (totalEdits / totalSuggestions) * 100 : 0;

    const averageAcceptanceScore =
      totalEdits > 0
        ? feedbackRecords.reduce((sum, record) => sum + (record.acceptanceScore || 0), 0) / totalEdits
        : 0;

    const averageEditPercentage =
      totalEdits > 0
        ? feedbackRecords.reduce((sum, record) => sum + record.editPercentage, 0) / totalEdits
        : 0;

    const averageSimilarityScore =
      totalEdits > 0
        ? feedbackRecords.reduce((sum, record) => sum + (record.similarityScore || 0), 0) / totalEdits
        : 0;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    feedbackRecords.forEach(record => {
      categoryBreakdown[record.editCategory] = (categoryBreakdown[record.editCategory] || 0) + 1;
    });

    // Top editors
    const editorStats: Record<string, { count: number; avgAcceptance: number }> = {};
    feedbackRecords.forEach(record => {
      if (!editorStats[record.editedBy]) {
        editorStats[record.editedBy] = { count: 0, avgAcceptance: 0 };
      }
      editorStats[record.editedBy].count++;
      editorStats[record.editedBy].avgAcceptance += record.acceptanceScore || 0;
    });

    Object.keys(editorStats).forEach(editor => {
      editorStats[editor].avgAcceptance /= editorStats[editor].count;
    });

    // Improvement areas aggregation
    const improvementAreas: Record<string, number> = {};
    feedbackRecords.forEach(record => {
      try {
        const areas = JSON.parse(record.improvementNeeded || '[]');
        areas.forEach((area: string) => {
          improvementAreas[area] = (improvementAreas[area] || 0) + 1;
        });
      } catch (e) {
        // Skip invalid JSON
      }
    });

    const topImprovementAreas = Object.entries(improvementAreas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([area, count]) => ({ area, count }));

    // Time series data (daily)
    const timeSeriesData = await generateTimeSeriesData(feedbackRecords, days);

    // Get detailed feedback insights
    const insights = await getFeedbackInsights(days);

    return NextResponse.json({
      summary: {
        totalSuggestions,
        totalEdits,
        editRate: parseFloat(editRate.toFixed(2)),
        averageAcceptanceScore: parseFloat(averageAcceptanceScore.toFixed(3)),
        averageEditPercentage: parseFloat(averageEditPercentage.toFixed(2)),
        averageSimilarityScore: parseFloat(averageSimilarityScore.toFixed(3)),
      },
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, count]) => ({
        category,
        count,
        percentage: parseFloat(((count / totalEdits) * 100).toFixed(2)),
      })),
      editorStats: Object.entries(editorStats)
        .map(([editor, stats]) => ({
          editor,
          editCount: stats.count,
          averageAcceptanceScore: parseFloat(stats.avgAcceptance.toFixed(3)),
        }))
        .sort((a, b) => b.editCount - a.editCount),
      topImprovementAreas,
      timeSeriesData,
      insights,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper function to generate time series data
function generateTimeSeriesData(
  feedbackRecords: Array<{
    createdAt: Date;
    acceptanceScore: number | null;
    editPercentage: number;
  }>,
  days: number
) {
  const dailyData: Record<string, {
    date: string;
    edits: number;
    avgAcceptance: number;
    avgEditPercentage: number;
    acceptanceSum: number;
    editPercentageSum: number;
  }> = {};

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    dailyData[dateKey] = {
      date: dateKey,
      edits: 0,
      avgAcceptance: 0,
      avgEditPercentage: 0,
      acceptanceSum: 0,
      editPercentageSum: 0,
    };
  }

  // Populate with actual data
  feedbackRecords.forEach(record => {
    const dateKey = record.createdAt.toISOString().split('T')[0];
    if (dailyData[dateKey]) {
      dailyData[dateKey].edits++;
      dailyData[dateKey].acceptanceSum += record.acceptanceScore || 0;
      dailyData[dateKey].editPercentageSum += record.editPercentage;
    }
  });

  // Calculate averages
  Object.values(dailyData).forEach(day => {
    if (day.edits > 0) {
      day.avgAcceptance = day.acceptanceSum / day.edits;
      day.avgEditPercentage = day.editPercentageSum / day.edits;
    }
  });

  return Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(day => ({
      date: day.date,
      edits: day.edits,
      avgAcceptanceScore: parseFloat(day.avgAcceptance.toFixed(3)),
      avgEditPercentage: parseFloat(day.avgEditPercentage.toFixed(2)),
    }));
}
