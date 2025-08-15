import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ObjectId } from 'mongodb'
import clientPromise from '../../../../lib/mongodb'
import { authOptions } from '../../../../lib/auth'
import { calculateMatchScore } from '../../../../lib/utils'

// This endpoint will be called by the Chrome extension
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

    const body = await request.json()
    const { url, jobData, content, type } = body

    // Handle both old format (jobData) and new format (raw content)
    if (content && type === 'job_posting') {
      // New AI-powered content analysis
      if (!userId) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
      }
      return await analyzeRawContent(userId, url, content)
    } else if (url && jobData) {
      // Original structured data analysis
      if (!userId) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
      }
      return await analyzeStructuredData(userId, url, jobData)
    } else {
      return NextResponse.json(
        { error: 'Missing url and jobData, or content and type' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Chrome extension API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// New function to analyze raw content with AI
async function analyzeRawContent(userId: string, url: string, content: string) {
  try {
    // Simple content analysis using regex patterns and keywords
    const analysis = await parseJobContent(content)
    
    const client = await clientPromise
    const profiles = client.db().collection('profiles')
    const jobMatches = client.db().collection('jobMatches')
    
    // Get user profile for matching
    const profile = await profiles.findOne({ userId })
    
    if (!profile) {
      return NextResponse.json(
        { 
          error: 'Profile not found',
          message: 'Please create a profile first',
          profileUrl: process.env.NEXTAUTH_URL + '/profile',
          authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
        },
        { status: 404 }
      )
    }
    
    // Extract user skills for matching
    const userSkills = [
      ...profile.skills.technical,
      ...profile.skills.soft,
      ...profile.skills.languages.map((lang: any) => lang.name),
      ...profile.customTags
    ]
    
    // Calculate match score
    const requirements = extractRequirements(content)
    const matchResult = calculateMatchScore(userSkills, requirements)
    
    // Store the analysis
    const jobMatch: any = {
      userId,
      url,
      jobTitle: analysis.title,
      company: analysis.company,
      jobDescription: analysis.description,
      requirements: requirements,
      location: analysis.location,
      salary: analysis.salary,
      rawContent: content.substring(0, 2000), // Store first 2000 chars
      matchScore: matchResult.score,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      status: 'pending',
      updatedAt: new Date()
    }
    
    // Check if match already exists
    const existingMatch = await jobMatches.findOne({ userId, url })
    
    if (existingMatch) {
      await jobMatches.updateOne(
        { _id: existingMatch._id },
        { $set: jobMatch }
      )
    } else {
      jobMatch.createdAt = new Date()
      await jobMatches.insertOne(jobMatch)
    }
    
    return NextResponse.json({
      success: true,
      analysis: analysis,
      matchScore: matchResult.score,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills
    })
    
  } catch (error) {
    console.error('Raw content analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    )
  }
}

// Function to parse job content using patterns
async function parseJobContent(content: string) {
  const text = content.toLowerCase()
  
  // Extract job title (look for common patterns)
  const titlePatterns = [
    /job title[:\s]+([^\n]+)/i,
    /position[:\s]+([^\n]+)/i,
    /role[:\s]+([^\n]+)/i,
    /^([^\n]+?)\s*(?:job|position|role|opportunity)/i
  ]
  
  let title = 'Not found'
  for (const pattern of titlePatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      title = match[1].trim()
      break
    }
  }
  
  // Extract company name
  const companyPatterns = [
    /company[:\s]+([^\n]+)/i,
    /employer[:\s]+([^\n]+)/i,
    /organization[:\s]+([^\n]+)/i
  ]
  
  let company = 'Not found'
  for (const pattern of companyPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      company = match[1].trim()
      break
    }
  }
  
  // Extract location
  const locationPatterns = [
    /location[:\s]+([^\n]+)/i,
    /based in[:\s]+([^\n]+)/i,
    /office[:\s]+([^\n]+)/i
  ]
  
  let location = 'Not specified'
  for (const pattern of locationPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      location = match[1].trim()
      break
    }
  }
  
  // Extract salary
  const salaryPatterns = [
    /salary[:\s]+([^\n]+)/i,
    /pay[:\s]+([^\n]+)/i,
    /compensation[:\s]+([^\n]+)/i,
    /\$[\d,]+-?\$?[\d,]*/g
  ]
  
  let salary = 'Not specified'
  for (const pattern of salaryPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      salary = match[1].trim()
      break
    }
  }
  
  // Extract description (take a reasonable chunk of content)
  const sentences = content.split(/[.!?]+/)
  const description = sentences.slice(0, 5).join('. ').substring(0, 500)
  
  return {
    title,
    company,
    location,
    salary,
    description: description || 'Not found',
    requirements: extractRequirements(content)
  }
}

// Function to extract requirements from content
function extractRequirements(content: string): string[] {
  const requirements: string[] = []
  const text = content.toLowerCase()
  
  // Common skill keywords
  const skillKeywords = [
    'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue',
    'sql', 'mongodb', 'mysql', 'postgresql', 'aws', 'azure', 'docker',
    'kubernetes', 'git', 'agile', 'scrum', 'typescript', 'html', 'css',
    'leadership', 'communication', 'teamwork', 'problem solving'
  ]
  
  // Extract mentioned skills
  skillKeywords.forEach(skill => {
    if (text.includes(skill.toLowerCase())) {
      requirements.push(skill)
    }
  })
  
  // Extract experience requirements
  const expPatterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /experience\s+(?:with|in)\s+([^\n,.]+)/gi
  ]
  
  expPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1]) {
        requirements.push(match[1].trim())
      }
    }
  })
  
  return [...new Set(requirements)] // Remove duplicates
}

// Original structured data analysis function
async function analyzeStructuredData(userId: string, url: string, jobData: any) {
  const { title, company, description, requirements } = jobData

  if (!title || !company || !description) {
    return NextResponse.json(
      { error: 'Missing required job data fields' },
      { status: 400 }
    )
  }

  const client = await clientPromise
  const profiles = client.db().collection('profiles')
  const jobMatches = client.db().collection('jobMatches')
  
  // Get user profile
  const profile = await profiles.findOne({ userId })
  
  if (!profile) {
    return NextResponse.json(
      { 
        error: 'Profile not found',
        message: 'Please create a profile first',
        profileUrl: process.env.NEXTAUTH_URL + '/profile',
        authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
      },
      { status: 404 }
    )
  }
  
  // Extract all user skills
  const userSkills = [
    ...profile.skills.technical,
    ...profile.skills.soft,
    ...profile.skills.languages.map((lang: any) => lang.name),
    ...profile.customTags
  ]
  
  // Parse requirements if it's a string
  let parsedRequirements = requirements
  if (typeof requirements === 'string') {
    parsedRequirements = requirements
      .split(/[,;.]/)
      .map((req: string) => req.trim())
      .filter((req: string) => req.length > 0)
  }
  
  // Calculate match score
  const matchResult = calculateMatchScore(userSkills, parsedRequirements || [])
  
  // Generate AI suggestions
  const suggestions = [
    `Consider highlighting your ${matchResult.matchedSkills.slice(0, 3).join(', ')} experience`,
    `You might want to learn: ${matchResult.missingSkills.slice(0, 3).join(', ')}`,
    'Tailor your CV summary to match the job description',
    'Update your profile with relevant project examples'
  ]
  
  // Check if we already have a match for this job (by URL)
  const existingMatch = await jobMatches.findOne({ userId, url })
  
  const jobMatch: any = {
    userId,
    url,
    jobTitle: title,
    company,
    jobDescription: description,
    requirements: parsedRequirements || [],
    matchScore: matchResult.score,
    matchedSkills: matchResult.matchedSkills,
    missingSkills: matchResult.missingSkills,
    suggestions,
    status: 'pending',
    updatedAt: new Date()
  }
  
  if (existingMatch) {
    // Update existing match
    await jobMatches.updateOne(
      { _id: existingMatch._id },
      { $set: jobMatch }
    )
  } else {
    // Create new match
    jobMatch.createdAt = new Date()
    await jobMatches.insertOne(jobMatch)
  }
  return NextResponse.json({
    success: true,
    matchScore: matchResult.score,
    matchedSkills: matchResult.matchedSkills,
    missingSkills: matchResult.missingSkills,
    suggestions: suggestions.slice(0, 3), // Return fewer suggestions for extension
    profileUrl: process.env.NEXTAUTH_URL + '/profile',
    dashboardUrl: process.env.NEXTAUTH_URL + '/dashboard'
  })
}

// GET endpoint to retrieve user's recent matches (for extension popup)
export async function GET(request: NextRequest) {
  try {
    // Check for token auth first, then session auth
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
        return NextResponse.json({ 
          error: 'Invalid token',
          authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
        }, { status: 401 })
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

    const client = await clientPromise
    const jobMatches = client.db().collection('jobMatches')
    
    const matches = await jobMatches
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()
    
    return NextResponse.json({
      matches: matches.map(match => ({
        id: match._id,
        jobTitle: match.jobTitle,
        company: match.company,
        matchScore: match.matchScore,
        url: match.url,
        createdAt: match.createdAt
      }))
    })
    
  } catch (error) {
    console.error('Get extension matches error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
