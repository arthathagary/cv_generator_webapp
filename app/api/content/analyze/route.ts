import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[Content Analysis API] Received content analysis request');
    console.log('[Content Analysis API] Request headers:', {
      origin: request.headers.get('origin'),
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type')
    });
    
    // Parse the request body
    const body = await request.json();
    console.log('[Content Analysis API] Request metadata:', {
      contentLength: body.content?.length || 0,
      extractionMethod: body.extractionMethod,
      url: body.url,
      requestType: body.requestType
    });

    // Validate required fields
    if (!body.content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // For now, provide a structured analysis without AI
    // You can integrate OpenAI later by adding OPENAI_API_KEY to your .env.local
    const analysis = analyzeContent(body.content, body.extractionMethod, body.url);

    // Prepare the final response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      input: {
        contentLength: body.content.length,
        extractionMethod: body.extractionMethod || 'cursor-selection',
        sourceUrl: body.url
      },
      analysis: analysis,
      processing: {
        method: 'rule-based-analysis',
        processingTime: Date.now() - (body.timestamp || Date.now())
      }
    };

    console.log('[Content Analysis API] Analysis completed successfully');
    console.log('[Content Analysis API] Analysis result:', {
      contentType: analysis.contentType,
      titleLength: analysis.title?.length || 0,
      cleanedContentLength: analysis.cleanedContent?.length || 0
    });

    return NextResponse.json(response, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('[Content Analysis API] Error processing content analysis:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze content',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Analyze content without AI (rule-based approach)
function analyzeContent(content: string, extractionMethod?: string, url?: string) {
  // Clean the content
  const cleanedContent = content
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/\n\s*\n/g, '\n\n') // Multiple newlines to double newlines
    .trim();

  // Detect content type based on keywords and patterns
  const contentType = detectContentType(content);
  
  // Extract title (first significant line)
  const title = extractTitle(content);
  
  // Create summary
  const summary = createSummary(content, contentType);
  
  // Extract structured data based on content type
  const structuredData = extractStructuredData(content, contentType);
  
  // Calculate metadata
  const metadata = {
    confidence: calculateConfidence(content, contentType),
    language: detectLanguage(content),
    readabilityScore: calculateReadabilityScore(content),
    recommendations: generateRecommendations(content, contentType)
  };

  return {
    contentType,
    title,
    summary,
    cleanedContent,
    structuredData,
    metadata,
    analysis: {
      wordCount: content.split(/\s+/).length,
      characterCount: content.length,
      paragraphs: content.split('\n\n').length,
      extractionMethod: extractionMethod || 'unknown',
      sourceUrl: url
    }
  };
}

// Detect content type based on keywords
function detectContentType(content: string): string {
  const lowerContent = content.toLowerCase();
  
  // Job posting indicators (enhanced)
  const jobKeywords = ['job', 'position', 'role', 'hiring', 'apply', 'salary', 'requirements', 'qualifications', 'responsibilities', 'benefits', 'developer', 'engineer', 'manager', 'looking for', 'we are seeking', 'join our team'];
  let jobScore = jobKeywords.filter(keyword => lowerContent.includes(keyword)).length;
  
  // Add bonus points for salary mentions
  if (lowerContent.includes('$') && (lowerContent.includes('salary') || lowerContent.includes('year') || lowerContent.includes('hour'))) {
    jobScore += 3;
  }
  
  // Profile indicators
  const profileKeywords = ['experience', 'skills', 'education', 'about', 'bio', 'portfolio', 'resume', 'cv'];
  const profileScore = profileKeywords.filter(keyword => lowerContent.includes(keyword)).length;
  
  // Article indicators
  const articleKeywords = ['article', 'blog', 'post', 'news', 'read more', 'author', 'published'];
  const articleScore = articleKeywords.filter(keyword => lowerContent.includes(keyword)).length;
  
  // Product indicators
  const productKeywords = ['price', 'buy', 'product', 'features', 'specifications', 'reviews', 'rating'];
  const productScore = productKeywords.filter(keyword => lowerContent.includes(keyword)).length;
  
  // Determine content type based on highest score
  const scores = [
    { type: 'job_posting', score: jobScore },
    { type: 'profile', score: profileScore },
    { type: 'article', score: articleScore },
    { type: 'product', score: productScore }
  ];
  
  const highestScore = scores.reduce((prev, current) => 
    (prev.score > current.score) ? prev : current
  );
  
  return highestScore.score > 0 ? highestScore.type : 'other';
}

// Extract title from content
function extractTitle(content: string): string {
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // Look for the first substantial line (likely the title)
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 200) {
      // Check if it looks like a title (not too long, not just punctuation)
      if (!/^[^\w]*$/.test(trimmed)) {
        return trimmed;
      }
    }
  }
  
  // Fallback to first line
  return lines[0]?.trim() || 'Untitled Content';
}

// Create summary
function createSummary(content: string, contentType: string): string {
  const words = content.split(/\s+/);
  const firstSentences = content.split(/[.!?]+/).slice(0, 2).join('. ').trim();
  
  if (firstSentences.length > 200) {
    return firstSentences.substring(0, 197) + '...';
  }
  
  return firstSentences || `${contentType.replace('_', ' ')} content with ${words.length} words.`;
}

// Extract structured data based on content type
function extractStructuredData(content: string, contentType: string): any {
  const structuredData: any = {};
  
  switch (contentType) {
    case 'job_posting':
      structuredData.jobTitle = extractJobTitle(content);
      structuredData.company = extractCompany(content);
      structuredData.location = extractLocation(content);
      structuredData.salary = extractSalary(content);
      structuredData.requirements = extractRequirements(content);
      structuredData.responsibilities = extractResponsibilities(content);
      break;
      
    case 'profile':
      structuredData.name = extractName(content);
      structuredData.title = extractProfessionalTitle(content);
      structuredData.skills = extractSkills(content);
      structuredData.experience = extractExperience(content);
      break;
      
    case 'article':
      structuredData.author = extractAuthor(content);
      structuredData.publishDate = extractPublishDate(content);
      structuredData.tags = extractTags(content);
      break;
      
    case 'product':
      structuredData.productName = extractProductName(content);
      structuredData.price = extractPrice(content);
      structuredData.features = extractFeatures(content);
      structuredData.rating = extractRating(content);
      break;
  }
  
  return structuredData;
}

// Helper functions for data extraction
function extractJobTitle(content: string): string {
  const jobTitlePatterns = [
    /job title:\s*([^\n]+)/i,
    /position:\s*([^\n]+)/i,
    /role:\s*([^\n]+)/i
  ];
  
  for (const pattern of jobTitlePatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  
  return extractTitle(content);
}

function extractCompany(content: string): string {
  const companyPatterns = [
    /company:\s*([^\n]+)/i,
    /employer:\s*([^\n]+)/i,
    /organization:\s*([^\n]+)/i
  ];
  
  for (const pattern of companyPatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

function extractLocation(content: string): string {
  const locationPatterns = [
    /location:\s*([^\n]+)/i,
    /based in:\s*([^\n]+)/i,
    /office:\s*([^\n]+)/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

function extractSalary(content: string): string {
  const salaryPatterns = [
    /salary:\s*([^\n]+)/i,
    /compensation:\s*([^\n]+)/i,
    /\$[\d,]+(\s*-\s*\$[\d,]+)?/g
  ];
  
  for (const pattern of salaryPatterns) {
    const match = content.match(pattern);
    if (match) return match[1]?.trim() || match[0].trim();
  }
  
  return '';
}

function extractRequirements(content: string): string[] {
  const requirementsSection = content.match(/requirements?:?\s*([\s\S]*?)(?=responsibilities?:|benefits?:|$)/i);
  if (requirementsSection) {
    return requirementsSection[1]
      .split(/\n|\•|\*/)
      .map(req => req.trim())
      .filter(req => req.length > 10)
      .slice(0, 10);
  }
  return [];
}

function extractResponsibilities(content: string): string[] {
  const responsibilitiesSection = content.match(/responsibilities?:?\s*([\s\S]*?)(?=requirements?:|benefits?:|$)/i);
  if (responsibilitiesSection) {
    return responsibilitiesSection[1]
      .split(/\n|\•|\*/)
      .map(resp => resp.trim())
      .filter(resp => resp.length > 10)
      .slice(0, 10);
  }
  return [];
}

// Additional extraction functions
function extractName(content: string): string { return ''; }
function extractProfessionalTitle(content: string): string { return ''; }
function extractSkills(content: string): string[] { return []; }
function extractExperience(content: string): string { return ''; }
function extractAuthor(content: string): string { return ''; }
function extractPublishDate(content: string): string { return ''; }
function extractTags(content: string): string[] { return []; }
function extractProductName(content: string): string { return ''; }
function extractPrice(content: string): string { return ''; }
function extractFeatures(content: string): string[] { return []; }
function extractRating(content: string): string { return ''; }

// Utility functions
function calculateConfidence(content: string, contentType: string): 'high' | 'medium' | 'low' {
  const words = content.split(/\s+/).length;
  if (words < 50) return 'low';
  if (words < 200) return 'medium';
  return 'high';
}

function detectLanguage(content: string): string {
  // Simple language detection (extend as needed)
  const englishWords = ['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were'];
  const englishCount = englishWords.filter(word => content.toLowerCase().includes(word)).length;
  return englishCount > 3 ? 'english' : 'unknown';
}

function calculateReadabilityScore(content: string): number {
  // Simple readability score based on sentence and word length
  const sentences = content.split(/[.!?]+/).length;
  const words = content.split(/\s+/).length;
  const avgWordsPerSentence = words / sentences;
  
  // Score from 1-10 (higher is more readable)
  if (avgWordsPerSentence < 15) return 8;
  if (avgWordsPerSentence < 25) return 6;
  if (avgWordsPerSentence < 35) return 4;
  return 2;
}

function generateRecommendations(content: string, contentType: string): string[] {
  const recommendations = [];
  
  if (content.length < 100) {
    recommendations.push('Content seems quite short - consider extracting more complete information');
  }
  
  if (contentType === 'other') {
    recommendations.push('Content type unclear - try selecting more specific content areas');
  }
  
  const sentences = content.split(/[.!?]+/).length;
  const words = content.split(/\s+/).length;
  if (words / sentences > 30) {
    recommendations.push('Content has very long sentences - may benefit from better formatting');
  }
  
  if (!content.match(/[.!?]$/)) {
    recommendations.push('Content may be incomplete - ensure complete sentences are captured');
  }
  
  return recommendations.slice(0, 3); // Limit to 3 recommendations
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
