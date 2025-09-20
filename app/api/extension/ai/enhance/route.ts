import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../lib/auth'

interface CVEnhancementRequest {
  content: string
  jobDescription: string
  section: 'summary' | 'experience' | 'skills' | 'projects' | 'general'
  userProfile?: any
}

export async function POST(request: NextRequest) {
  try {
    // Authentication (same as other endpoints)
    const authHeader = request.headers.get('authorization')
    let userId: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
        userId = decoded.userId
        if (Date.now() - decoded.timestamp > 24 * 60 * 60 * 1000) {
          return NextResponse.json({ 
            error: 'Token expired',
            authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
          }, { status: 401 })
        }
      } catch (error) {
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
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ 
          error: 'Unauthorized',
          authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
        }, { status: 401 })
      }
      userId = (session.user as any).id
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        error: 'AI service not configured on server'
      }, { status: 500 })
    }

    const body: CVEnhancementRequest = await request.json()
    const { content, jobDescription, section, userProfile } = body

    if (!content || !jobDescription) {
      return NextResponse.json({
        error: 'Content and job description are required'
      }, { status: 400 })
    }

    // Generate section-specific prompts
    let prompt = ''
    
    switch (section) {
      case 'summary':
        prompt = `Enhance this professional summary to better match the job description. Make it ATS-friendly and incorporate relevant keywords naturally.

Job Description:
${jobDescription}

Current Summary:
${content}

Instructions:
- Keep it concise (2-3 sentences)
- Include relevant keywords from the job description
- Highlight matching skills and experience
- Make it compelling and professional
- Return only the enhanced summary, no additional text`
        break

      case 'experience':
        prompt = `Enhance this work experience description to better align with the job requirements. Add relevant keywords and quantify achievements where possible.

Job Description:
${jobDescription}

Current Experience Description:
${content}

Instructions:
- Use action verbs and quantify achievements
- Include relevant keywords from the job description
- Highlight transferable skills
- Keep it professional and honest
- Return only the enhanced description, no additional text`
        break

      case 'skills':
        prompt = `Given this skills list and job description, suggest an optimized skills section that includes relevant keywords.

Job Description:
${jobDescription}

Current Skills:
${content}

Instructions:
- Prioritize skills mentioned in the job description
- Group similar skills together
- Add missing relevant skills if they're common in the field
- Remove less relevant skills if the list is too long
- Return as a comma-separated list, no additional text`
        break

      case 'projects':
        prompt = `Enhance this project description to better showcase relevant skills and technologies mentioned in the job description.

Job Description:
${jobDescription}

Current Project Description:
${content}

Instructions:
- Highlight technologies and skills that match the job requirements
- Quantify impact and results where possible
- Use technical keywords appropriately
- Keep it concise but impactful
- Return only the enhanced description, no additional text`
        break

      case 'general':
      default:
        prompt = `Enhance this CV content to be more ATS-friendly and better aligned with the job description.

Job Description:
${jobDescription}

Current Content:
${content}

Instructions:
- Incorporate relevant keywords naturally
- Improve clarity and impact
- Make it more professional
- Ensure ATS compatibility
- Return only the enhanced content, no additional text`
        break
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
            temperature: 0.4,
            maxOutputTokens: 1024,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json({
        error: 'Failed to enhance content',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      }, { status: 500 })
    }

    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({
        error: 'No response from AI service'
      }, { status: 500 })
    }

    const enhancedContent = geminiData.candidates[0].content.parts[0].text.trim()

    return NextResponse.json({
      success: true,
      original: content,
      enhanced: enhancedContent,
      section: section,
      user_id: userId
    })

  } catch (error) {
    console.error('CV enhancement error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, { status: 500 })
  }
}

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