import { EditCategory } from '@prisma/client';
import { generateChatCompletion, generateEmbedding } from './llm';

export interface EditAnalysisResult {
  editCategory: EditCategory;
  editPercentage: number;
  similarityScore: number;
  toneShift: {
    from: string;
    to: string;
    description: string;
  } | null;
  sentimentAnalysis: {
    originalTone: string;
    editedTone: string;
    formalityChange: number; // -1 to 1 (less formal to more formal)
    empathyChange: number; // -1 to 1 (less empathetic to more empathetic)
    professionalismChange: number; // -1 to 1
    clarityImprovement: number; // 0 to 1
  };
  productChanges: {
    added: string[];
    removed: string[];
    modified: string[];
  };
  keyChanges: string[];
  acceptanceScore: number; // 0-1, how good was the original
  improvementNeeded: string[];
}

/**
 * Calculate edit percentage using Levenshtein distance-like comparison
 */
function calculateEditPercentage(original: string, edited: string): number {
  const originalWords = original.toLowerCase().split(/\s+/);
  const editedWords = edited.toLowerCase().split(/\s+/);

  const maxLength = Math.max(originalWords.length, editedWords.length);
  let differences = Math.abs(originalWords.length - editedWords.length);

  const minLength = Math.min(originalWords.length, editedWords.length);
  for (let i = 0; i < minLength; i++) {
    if (originalWords[i] !== editedWords[i]) {
      differences++;
    }
  }

  return (differences / maxLength) * 100;
}

/**
 * Detect product mentions in text
 */
function extractProductMentions(text: string): string[] {
  // Look for product IDs, names, or links
  const productPatterns = [
    /product[:\s]+([A-Z0-9-]+)/gi,
    /item[:\s]+([A-Z0-9-]+)/gi,
    /\b([A-Z]{2,}\d+)\b/g, // Product codes like AB123
    /ring|necklace|bracelet|earring|pendant|chain|bangle/gi,
  ];

  const mentions: Set<string> = new Set();

  productPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      mentions.add(match[0].toLowerCase());
    }
  });

  return Array.from(mentions);
}

/**
 * Analyze product changes between original and edited text
 */
function analyzeProductChanges(original: string, edited: string) {
  const originalProducts = extractProductMentions(original);
  const editedProducts = extractProductMentions(edited);

  const added = editedProducts.filter(p => !originalProducts.includes(p));
  const removed = originalProducts.filter(p => !editedProducts.includes(p));
  const modified = originalProducts.filter(p => editedProducts.includes(p));

  return { added, removed, modified };
}

/**
 * Use configured LLM to perform deep sentiment and tone analysis
 */
async function performDeepAnalysis(
  original: string,
  edited: string,
  customerQuery: string
): Promise<{
  toneShift: EditAnalysisResult['toneShift'];
  sentimentAnalysis: EditAnalysisResult['sentimentAnalysis'];
  keyChanges: string[];
  improvementNeeded: string[];
  acceptanceScore: number;
}> {
  const prompt = `You are an AI assistant analyzing edits made by a human manager to an AI-generated customer service response.

Customer Query: "${customerQuery}"

Original AI Response: "${original}"

Edited Response by Manager: "${edited}"

Analyze the differences and provide a detailed JSON response with the following structure:
{
  "toneShift": {
    "from": "formal/casual/neutral",
    "to": "formal/casual/neutral",
    "description": "Brief description of tone change"
  },
  "sentimentAnalysis": {
    "originalTone": "description of original tone",
    "editedTone": "description of edited tone",
    "formalityChange": -1 to 1 (negative = less formal, positive = more formal),
    "empathyChange": -1 to 1 (negative = less empathetic, positive = more empathetic),
    "professionalismChange": -1 to 1,
    "clarityImprovement": 0 to 1
  },
  "keyChanges": ["list of key differences"],
  "improvementNeeded": ["areas where AI needs improvement"],
  "acceptanceScore": 0 to 1 (how acceptable was the original AI response)
}

Be specific and actionable in your analysis.`;

  try {
    const rawResponse = await generateChatCompletion(
      [{ role: 'user', content: `${prompt}\n\nReturn valid JSON only. No markdown fences.` }],
      {
        temperature: 0.3,
        maxTokens: 1200,
      }
    );

    const analysis = JSON.parse(rawResponse || '{}');

    return {
      toneShift: analysis.toneShift || null,
      sentimentAnalysis: analysis.sentimentAnalysis || {
        originalTone: 'neutral',
        editedTone: 'neutral',
        formalityChange: 0,
        empathyChange: 0,
        professionalismChange: 0,
        clarityImprovement: 0,
      },
      keyChanges: analysis.keyChanges || [],
      improvementNeeded: analysis.improvementNeeded || [],
      acceptanceScore: analysis.acceptanceScore || 0.5,
    };
  } catch (error) {
    console.error('Error performing deep analysis:', error);
    return {
      toneShift: null,
      sentimentAnalysis: {
        originalTone: 'neutral',
        editedTone: 'neutral',
        formalityChange: 0,
        empathyChange: 0,
        professionalismChange: 0,
        clarityImprovement: 0,
      },
      keyChanges: [],
      improvementNeeded: ['Analysis failed'],
      acceptanceScore: 0.5,
    };
  }
}

/**
 * Determine edit category based on analysis
 */
function determineEditCategory(
  editPercentage: number,
  productChanges: { added: string[]; removed: string[]; modified: string[] },
  sentimentAnalysis: EditAnalysisResult['sentimentAnalysis'],
  keyChanges: string[]
): EditCategory {
  // Complete rewrite if >70% changed
  if (editPercentage > 70) {
    return 'COMPLETE_REWRITE';
  }

  // Product correction if products were changed
  if (productChanges.added.length > 0 || productChanges.removed.length > 0) {
    return 'PRODUCT_CORRECTION';
  }

  // Tone adjustment if significant formality or empathy change
  if (Math.abs(sentimentAnalysis.formalityChange) > 0.3 ||
      Math.abs(sentimentAnalysis.empathyChange) > 0.3) {
    return 'TONE_ADJUSTMENT';
  }

  // Language quality if clarity was improved
  if (sentimentAnalysis.clarityImprovement > 0.5) {
    return 'LANGUAGE_QUALITY';
  }

  // Length problem if significant length change
  if (editPercentage > 30 && editPercentage <= 70) {
    return 'LENGTH_PROBLEM';
  }

  // Check for accuracy issues in key changes
  const accuracyKeywords = ['incorrect', 'wrong', 'error', 'mistake', 'inaccurate'];
  const hasAccuracyIssue = keyChanges.some(change =>
    accuracyKeywords.some(keyword => change.toLowerCase().includes(keyword))
  );

  if (hasAccuracyIssue) {
    return 'ACCURACY_ISSUE';
  }

  // Minor edit if small percentage change
  if (editPercentage < 30 && editPercentage > 5) {
    return 'MINOR_EDIT';
  }

  // No edit if very small change
  if (editPercentage <= 5) {
    return 'NONE';
  }

  return 'MINOR_EDIT';
}

/**
 * Calculate semantic similarity using configured provider embeddings
 */
async function calculateSemanticSimilarity(
  text1: string,
  text2: string
): Promise<number> {
  try {
    const [embedding1, embedding2] = await Promise.all([
      generateEmbedding(text1),
      generateEmbedding(text2),
    ]);

    // Calculate cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return similarity;
  } catch (error) {
    console.error('Error calculating semantic similarity:', error);
    return 0.5; // Default fallback
  }
}

/**
 * Main function to analyze edits made to AI suggestions
 */
export async function analyzeAIEdit(
  originalSuggestion: string,
  editedContent: string,
  customerQuery: string
): Promise<EditAnalysisResult> {
  // Calculate basic metrics
  const editPercentage = calculateEditPercentage(originalSuggestion, editedContent);
  const productChanges = analyzeProductChanges(originalSuggestion, editedContent);

  // Perform deep AI analysis
  const deepAnalysis = await performDeepAnalysis(
    originalSuggestion,
    editedContent,
    customerQuery
  );

  // Calculate semantic similarity
  const similarityScore = await calculateSemanticSimilarity(
    originalSuggestion,
    editedContent
  );

  // Determine edit category
  const editCategory = determineEditCategory(
    editPercentage,
    productChanges,
    deepAnalysis.sentimentAnalysis,
    deepAnalysis.keyChanges
  );

  return {
    editCategory,
    editPercentage,
    similarityScore,
    toneShift: deepAnalysis.toneShift,
    sentimentAnalysis: deepAnalysis.sentimentAnalysis,
    productChanges,
    keyChanges: deepAnalysis.keyChanges,
    acceptanceScore: deepAnalysis.acceptanceScore,
    improvementNeeded: deepAnalysis.improvementNeeded,
  };
}

/**
 * Store edit feedback in database
 */
export async function storeEditFeedback(
  suggestedReplyId: string,
  originalSuggestion: string,
  editedContent: string,
  editedBy: string,
  customerQuery: string,
  conversationContext: unknown
) {
  const { prisma } = await import('../prisma');

  // Analyze the edit
  const analysis = await analyzeAIEdit(
    originalSuggestion,
    editedContent,
    customerQuery
  );

  // Store in database
  const feedback = await prisma.aIEditFeedback.create({
    data: {
      suggestedReplyId,
      originalSuggestion,
      editedContent,
      editedBy,
      editCategory: analysis.editCategory,
      editPercentage: analysis.editPercentage,
      similarityScore: analysis.similarityScore,
      toneShift: JSON.stringify(analysis.toneShift),
      sentimentAnalysis: JSON.stringify(analysis.sentimentAnalysis),
      productChanges: JSON.stringify(analysis.productChanges),
      keyChanges: JSON.stringify(analysis.keyChanges),
      acceptanceScore: analysis.acceptanceScore,
      improvementNeeded: JSON.stringify(analysis.improvementNeeded),
      conversationContext: JSON.stringify(conversationContext),
      customerQuery,
    },
  });

  return feedback;
}
