import { EditCategory } from '@prisma/client';
import { prisma } from '../prisma';

export interface FeedbackInsights {
  commonIssues: Array<{
    category: EditCategory;
    count: number;
    percentage: number;
  }>;
  averageAcceptanceScore: number;
  topImprovementAreas: string[];
  recentTrends: Array<{
    date: string;
    editRate: number;
    acceptanceScore: number;
  }>;
  promptEnhancements: string[];
}

/**
 * Get feedback insights for the past N days
 */
export async function getFeedbackInsights(days: number = 30): Promise<FeedbackInsights> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all feedback from the past N days
  const feedbackRecords = await prisma.aIEditFeedback.findMany({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    select: {
      editCategory: true,
      acceptanceScore: true,
      improvementNeeded: true,
      createdAt: true,
    },
  });

  if (feedbackRecords.length === 0) {
    return {
      commonIssues: [],
      averageAcceptanceScore: 0,
      topImprovementAreas: [],
      recentTrends: [],
      promptEnhancements: [],
    };
  }

  // Calculate common issues
  const categoryCount: Record<string, number> = {};
  feedbackRecords.forEach(record => {
    categoryCount[record.editCategory] = (categoryCount[record.editCategory] || 0) + 1;
  });

  const commonIssues = Object.entries(categoryCount)
    .map(([category, count]) => ({
      category: category as EditCategory,
      count,
      percentage: (count / feedbackRecords.length) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate average acceptance score
  const totalScore = feedbackRecords.reduce(
    (sum, record) => sum + (record.acceptanceScore || 0),
    0
  );
  const averageAcceptanceScore = totalScore / feedbackRecords.length;

  // Aggregate improvement areas
  const improvementAreas: Record<string, number> = {};
  feedbackRecords.forEach(record => {
    try {
      const improvements = JSON.parse(record.improvementNeeded || '[]');
      improvements.forEach((area: string) => {
        improvementAreas[area] = (improvementAreas[area] || 0) + 1;
      });
    } catch (e) {
      // Skip invalid JSON
    }
  });

  const topImprovementAreas = Object.entries(improvementAreas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([area]) => area);

  // Calculate recent trends (weekly)
  const recentTrends = calculateWeeklyTrends(feedbackRecords);

  // Generate prompt enhancements
  const promptEnhancements = generatePromptEnhancements(commonIssues, topImprovementAreas);

  return {
    commonIssues,
    averageAcceptanceScore,
    topImprovementAreas,
    recentTrends,
    promptEnhancements,
  };
}

/**
 * Calculate weekly trends
 */
function calculateWeeklyTrends(
  feedbackRecords: Array<{
    createdAt: Date;
    acceptanceScore: number | null;
  }>
) {
  const weeks: Record<string, { total: number; scoreSum: number }> = {};

  feedbackRecords.forEach(record => {
    const weekStart = new Date(record.createdAt);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = { total: 0, scoreSum: 0 };
    }

    weeks[weekKey].total++;
    weeks[weekKey].scoreSum += record.acceptanceScore || 0;
  });

  return Object.entries(weeks)
    .map(([date, data]) => ({
      date,
      editRate: data.total,
      acceptanceScore: data.scoreSum / data.total,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate prompt enhancements based on feedback
 */
function generatePromptEnhancements(
  commonIssues: Array<{ category: EditCategory; count: number; percentage: number }>,
  topImprovementAreas: string[]
): string[] {
  const enhancements: string[] = [];

  commonIssues.forEach(issue => {
    if (issue.percentage > 20) {
      switch (issue.category) {
        case 'TONE_ADJUSTMENT':
          enhancements.push(
            'Adjust tone to be more empathetic and professional. Match the customer\'s communication style.'
          );
          break;
        case 'PRODUCT_CORRECTION':
          enhancements.push(
            'Verify product recommendations are highly relevant to the customer query. Double-check product availability and details.'
          );
          break;
        case 'ACCURACY_ISSUE':
          enhancements.push(
            'Ensure all information provided is factually accurate. Avoid making assumptions about product specifications.'
          );
          break;
        case 'LENGTH_PROBLEM':
          enhancements.push(
            'Keep responses concise and to the point. Avoid over-explaining unless specifically asked.'
          );
          break;
        case 'LANGUAGE_QUALITY':
          enhancements.push(
            'Use clear, grammatically correct language. Avoid jargon and ensure the message is easy to understand.'
          );
          break;
      }
    }
  });

  // Add enhancements based on improvement areas
  if (topImprovementAreas.length > 0) {
    enhancements.push(
      `Focus on improving: ${topImprovementAreas.slice(0, 3).join(', ')}`
    );
  }

  return enhancements;
}

/**
 * Get enhanced prompt instructions based on feedback
 */
export async function getEnhancedPromptInstructions(): Promise<string> {
  const insights = await getFeedbackInsights(30);

  if (insights.promptEnhancements.length === 0) {
    return '';
  }

  return `
Based on recent feedback from managers, please pay special attention to:
${insights.promptEnhancements.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Current AI acceptance rate: ${(insights.averageAcceptanceScore * 100).toFixed(1)}%
`;
}

/**
 * Get similar past edits for learning
 */
export async function getSimilarPastEdits(
  customerQuery: string,
  limit: number = 5
): Promise<Array<{
  originalSuggestion: string;
  editedContent: string;
  editCategory: EditCategory;
  keyChanges: string[];
}>> {
  // Get recent high-quality edits (high acceptance score after edit)
  const pastEdits = await prisma.aIEditFeedback.findMany({
    where: {
      acceptanceScore: {
        lt: 0.7, // Low acceptance means significant improvement was needed
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit * 2,
    select: {
      originalSuggestion: true,
      editedContent: true,
      editCategory: true,
      keyChanges: true,
      customerQuery: true,
    },
  });

  // Filter for similar queries (simple keyword matching for now)
  const queryWords = customerQuery.toLowerCase().split(/\s+/);

  const scoredEdits = pastEdits.map(edit => {
    const editQueryWords = (edit.customerQuery || '').toLowerCase().split(/\s+/);
    const commonWords = queryWords.filter(word => editQueryWords.includes(word));
    const similarity = commonWords.length / Math.max(queryWords.length, editQueryWords.length);

    return {
      ...edit,
      similarity,
    };
  });

  // Return top similar edits
  return scoredEdits
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
    .map(edit => ({
      originalSuggestion: edit.originalSuggestion,
      editedContent: edit.editedContent,
      editCategory: edit.editCategory,
      keyChanges: JSON.parse(edit.keyChanges || '[]'),
    }));
}

// Prisma cleanup is handled by the shared instance in lib/prisma.ts
