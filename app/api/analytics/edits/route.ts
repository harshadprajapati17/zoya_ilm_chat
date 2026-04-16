import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/analytics/edits - Get detailed edit records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const managerId = searchParams.get('managerId');
    const minAcceptance = searchParams.get('minAcceptance');
    const maxAcceptance = searchParams.get('maxAcceptance');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (category) {
      where.editCategory = category;
    }

    if (managerId) {
      where.editedBy = managerId;
    }

    if (minAcceptance || maxAcceptance) {
      where.acceptanceScore = {};
      if (minAcceptance) {
        where.acceptanceScore.gte = parseFloat(minAcceptance);
      }
      if (maxAcceptance) {
        where.acceptanceScore.lte = parseFloat(maxAcceptance);
      }
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        where.createdAt.lt = endDateTime;
      }
    }

    // Get total count
    const total = await prisma.aIEditFeedback.count({ where });

    // Get paginated records - ordered to show best quality examples first for demo
    // This prioritizes high acceptance scores (good AI responses) with diverse categories
    const edits = await prisma.aIEditFeedback.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { acceptanceScore: 'desc' }, // High quality AI responses first
        { editPercentage: 'asc' },   // Smaller edits (closer to manager's version)
        { createdAt: 'desc' },        // Recent examples
      ],
      select: {
        id: true,
        originalSuggestion: true,
        editedContent: true,
        editedBy: true,
        editCategory: true,
        editPercentage: true,
        similarityScore: true,
        acceptanceScore: true,
        toneShift: true,
        sentimentAnalysis: true,
        productChanges: true,
        keyChanges: true,
        improvementNeeded: true,
        customerQuery: true,
        createdAt: true,
      },
    });

    // Parse JSON fields
    const processedEdits = edits.map(edit => ({
      ...edit,
      toneShift: edit.toneShift ? JSON.parse(edit.toneShift) : null,
      sentimentAnalysis: edit.sentimentAnalysis ? JSON.parse(edit.sentimentAnalysis) : null,
      productChanges: edit.productChanges ? JSON.parse(edit.productChanges) : null,
      keyChanges: edit.keyChanges ? JSON.parse(edit.keyChanges) : [],
      improvementNeeded: edit.improvementNeeded ? JSON.parse(edit.improvementNeeded) : [],
    }));

    return NextResponse.json({
      edits: processedEdits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching edit records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch edit records' },
      { status: 500 }
    );
  }
}
