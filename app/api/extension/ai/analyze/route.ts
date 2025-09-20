import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'

interface GeminiRequest {
  jobDescription: string
  userProfile?: any
  analysisType: 'job_analysis' | 'keyword_extraction' | 'cv_enhancement' | 'skills_matching'
  context?: string
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Check for API key authentication (for Chrome extension)
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      // Chrome extension authentication with API token
      const token = authHeader.substring(7)
      
      try {
        // Decode the token (simple base64 for now, use JWT in production)
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
        userId = decoded.userId
        
        // Verify token is not too old (24 hours)
        if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) {
          return NextResponse.json({ 
            error: 'Token expired',
            authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
          }, { status: 401 })
        }
      } catch (error) {
        // If token decode fails, fall back to session auth
        const session = await getServerSession(authOptions)
        if (!session?.user) {
          return NextResponse.json({ 
            error: 'Unauthorized',
            authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
          }, { status: 401 })
        }
        userId = (session.user as any).id
      }
    } else {
      // Regular session-based authentication
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ 
          error: 'Unauthorized',
          authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
        }, { status: 401 })
      }
      userId = (session.user as any).id
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'Gemini API not configured on server'
      }, { status: 500 })
    }

    const body: GeminiRequest = await request.json()
    const { jobDescription, userProfile, analysisType, context } = body

    if (!jobDescription) {
      return NextResponse.json({
        error: 'Job description is required'
      }, { status: 400 })
    }

    // Generate appropriate prompt based on analysis type
    let prompt = ''
    
    switch (analysisType) {
      case 'job_analysis':
        prompt = `Analyze this job description and extract key information in JSON format:

Job Description:
${jobDescription}

Please provide a JSON response with the following structure:
{
  "title": "extracted job title",
  "company": "company name if mentioned",
  "location": "location if mentioned",
  "type": "employment type (full-time, part-time, contract, etc.)",
  "requirements": {
    "required_skills": ["skill1", "skill2"],
    "preferred_skills": ["skill1", "skill2"],
    "experience_years": "number or range",
    "education": "education requirements",
    "certifications": ["cert1", "cert2"]
  },
  "responsibilities": ["responsibility1", "responsibility2"],
  "keywords": ["keyword1", "keyword2"],
  "ats_keywords": ["important keyword1", "important keyword2"],
  "salary_range": "if mentioned",
  "benefits": ["benefit1", "benefit2"]
}`
        break

      case 'keyword_extraction':
        prompt = `Extract ATS-friendly keywords from this job description that should be included in a resume:

Job Description:
${jobDescription}

Provide a JSON response with categorized keywords:
{
  "high_priority": ["critical keywords that must be included"],
  "medium_priority": ["important keywords that should be included"],
  "technical_skills": ["specific technical skills mentioned"],
  "soft_skills": ["soft skills and competencies"],
  "industry_terms": ["industry-specific terminology"],
  "action_verbs": ["action verbs used in the description"]
}`
        break

      case 'cv_enhancement':
        prompt = `Based on this job description and user profile, suggest improvements for a CV/resume:

Job Description:
${jobDescription}

${userProfile ? `User Profile:
${JSON.stringify(userProfile, null, 2)}` : ''}

Provide specific suggestions in JSON format:
{
  "summary_suggestions": "suggested professional summary",
  "skills_to_emphasize": ["skills to highlight"],
  "missing_keywords": ["keywords to add"],
  "experience_enhancements": [
    {
      "section": "which experience section",
      "suggestion": "how to improve it",
      "keywords_to_add": ["relevant keywords"]
    }
  ],
  "additional_sections": ["suggestions for new sections"],
  "formatting_tips": ["formatting improvements"]
}`
        break

      case 'skills_matching':
        prompt = `Compare the user's skills with job requirements and provide a match analysis:

Job Description:
${jobDescription}

${userProfile ? `User Skills:
Technical: ${userProfile.skills?.technical?.join(', ') || 'Not provided'}
Soft Skills: ${userProfile.skills?.soft?.join(', ') || 'Not provided'}
Languages: ${userProfile.skills?.languages?.map((l: any) => `${l.name} (${l.level})`).join(', ') || 'Not provided'}` : ''}

Provide a matching analysis in JSON format:
{
  "overall_match_percentage": 85,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "skill_gaps": [
    {
      "skill": "skill name",
      "importance": "high/medium/low",
      "suggestion": "how to acquire or demonstrate this skill"
    }
  ],
  "recommendations": ["actionable recommendations"]
}`
        break

      default:
        return NextResponse.json({
          error: 'Invalid analysis type'
        }, { status: 400 })
    }

    // Add context if provided
    if (context) {
      prompt += `\n\nAdditional Context: ${context}`
    }

    // Call Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json({
        error: 'Failed to analyze with AI',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 })
    }

    const geminiData: GeminiResponse = await geminiResponse.json()
    
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({
        error: 'No response from AI'
      }, { status: 500 })
    }

    const aiResponse = geminiData.candidates[0].content.parts[0].text
    
    // Try to parse as JSON, fallback to plain text if it fails
    let parsedResponse
    try {
      // Remove code blocks if present
      const cleanedResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      parsedResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      // If JSON parsing fails, return as plain text
      parsedResponse = {
        raw_response: aiResponse,
        analysis_type: analysisType,
        note: 'Response could not be parsed as JSON'
      }
    }

    return NextResponse.json({
      success: true,
      analysis_type: analysisType,
      result: parsedResponse,
      user_id: userId
    })

  } catch (error) {
    console.error('AI analysis error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}