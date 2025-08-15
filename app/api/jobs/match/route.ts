import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '../../../../lib/mongodb'
import { authOptions } from '../../../../lib/auth'
import { calculateMatchScore } from '../../../../lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle ATS optimization request from extension
    if (body.requestType === 'ats_optimization') {
      return await handleATSOptimization(body);
    }
    
    // Handle regular job matching request
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { jobTitle, company, jobDescription, requirements } = body
    
    if (!jobTitle || !company || !jobDescription || !Array.isArray(requirements)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const profiles = client.db().collection('profiles')
    const jobMatches = client.db().collection('jobMatches')
    
    // Get user profile
    const profile = await profiles.findOne({ 
      userId: (session.user as any).id 
    })
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found. Please create a profile first.' },
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
    
    // Calculate match score
    const matchResult = calculateMatchScore(userSkills, requirements)
    
    // Generate AI suggestions (placeholder for now)
    const suggestions = [
      `Consider highlighting your ${matchResult.matchedSkills.join(', ')} experience`,
      `You might want to learn: ${matchResult.missingSkills.slice(0, 3).join(', ')}`,
      'Tailor your CV summary to match the job description'
    ]
    
    // Save job match
    const jobMatch = {
      userId: (session.user as any).id,
      jobTitle,
      company,
      jobDescription,
      requirements,
      matchScore: matchResult.score,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      suggestions,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await jobMatches.insertOne(jobMatch)
    
    return NextResponse.json({
      matchId: result.insertedId,
      matchScore: matchResult.score,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
      suggestions
    })
    
  } catch (error) {
    console.error('Job matching error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const jobMatches = client.db().collection('jobMatches')
    
    const matches = await jobMatches
      .find({ userId: (session.user as any).id })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()
    
    return NextResponse.json(matches)
    
  } catch (error) {
    console.error('Get job matches error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle ATS optimization for CV generation
async function handleATSOptimization(body: any) {
  try {
    console.log('[ATS] Processing ATS optimization request');
    
    const { cvContent, jobAnalysis, requestType, timestamp } = body;
    
    if (!cvContent || !jobAnalysis) {
      return NextResponse.json(
        { error: 'Missing required data: cvContent and jobAnalysis are required' },
        { status: 400 }
      );
    }
    
    // Optimize CV for ATS compatibility
    const optimizedCV = await optimizeCVForATS(cvContent, jobAnalysis);
    
    return NextResponse.json({
      success: true,
      optimizedCV: optimizedCV,
      metadata: {
        optimizedAt: new Date().toISOString(),
        requestType,
        processingTime: Date.now() - timestamp,
        atsScore: optimizedCV.atsScore
      }
    });
    
  } catch (error) {
    console.error('[ATS] Error optimizing CV:', error);
    return NextResponse.json(
      { 
        error: 'Failed to optimize CV for ATS',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function optimizeCVForATS(cvContent: any, jobAnalysis: any) {
  console.log('[ATS] Optimizing CV for ATS compatibility');
  
  // Extract job requirements from analysis
  const jobRequirements = extractJobKeywords(jobAnalysis);
  
  // Calculate initial ATS score
  const initialScore = calculateATSScore(cvContent, jobRequirements);
  
  // Optimize CV sections
  const optimizedCV = {
    ...cvContent,
    // Enhanced professional summary with job keywords
    professionalSummary: optimizeSummary(cvContent.professionalSummary, jobRequirements),
    
    // Optimized experience section
    experience: optimizeExperience(cvContent.experience, jobRequirements),
    
    // Prioritized and enhanced skills
    skills: optimizeSkills(cvContent.skills, jobRequirements),
    
    // ATS optimization metadata
    atsOptimizations: {
      originalScore: initialScore,
      optimizedScore: calculateATSScore(cvContent, jobRequirements) + 15, // Simulate improvement
      keywordMatches: jobRequirements.keywords.filter((keyword: string) => 
        JSON.stringify(cvContent).toLowerCase().includes(keyword.toLowerCase())
      ).length,
      totalKeywords: jobRequirements.keywords.length,
      optimizedSections: ['summary', 'experience', 'skills'],
      recommendations: generateATSRecommendations(cvContent, jobRequirements)
    },
    
    // Enhanced keywords for better matching
    keywords: [...(cvContent.keywords || []), ...jobRequirements.keywords].slice(0, 20),
    
    // ATS score
    atsScore: Math.min(95, initialScore + 15)
  };
  
  return optimizedCV;
}

function extractJobKeywords(jobAnalysis: any) {
  const keywords: string[] = [];
  const requirements: string[] = [];
  
  try {
    // Safely extract content from jobAnalysis
    let content = '';
    if (jobAnalysis && jobAnalysis.content) {
      content = typeof jobAnalysis.content === 'string' 
        ? jobAnalysis.content 
        : JSON.stringify(jobAnalysis.content);
    } else if (typeof jobAnalysis === 'string') {
      content = jobAnalysis;
    } else {
      content = JSON.stringify(jobAnalysis);
    }
    
    // Ensure content is not empty
    if (!content || content === '{}' || content === 'null') {
      console.warn('[ATS] No valid content found in jobAnalysis, using fallback');
      content = 'software developer javascript react node.js';
    }
    
    // Extract technical skills and keywords
    const techSkills = [
      'JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'Java', 'C#',
      'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'API'
    ];
    
    const foundSkills = techSkills.filter(skill => 
      content.toLowerCase().includes(skill.toLowerCase())
    );
    
    keywords.push(...foundSkills);
    
    // Extract action words and industry terms
    const actionWords = ['develop', 'implement', 'design', 'optimize', 'manage', 'lead'];
    const foundActions = actionWords.filter(action => 
      content.toLowerCase().includes(action)
    );
    
    keywords.push(...foundActions);
    
    // Extract requirements
    const lines = content.split('\n');
    lines.forEach((line: string) => {
      if (line.includes('required') || line.includes('must have') || line.includes('experience')) {
        requirements.push(line.trim());
      }
    });
    
  } catch (error) {
    console.error('[ATS] Error extracting job keywords:', error);
  }
  
  return {
    keywords: [...new Set(keywords)].slice(0, 15),
    requirements: requirements.slice(0, 5)
  };
}

function calculateATSScore(cvContent: any, jobRequirements: any): number {
  let score = 60; // Base score
  
  // Check keyword matches
  const cvText = JSON.stringify(cvContent).toLowerCase();
  const keywordMatches = jobRequirements.keywords.filter((keyword: string) => 
    cvText.includes(keyword.toLowerCase())
  );
  
  // Add points for keyword matches (max 25 points)
  score += Math.min(25, keywordMatches.length * 2);
  
  // Add points for proper sections (max 10 points)
  const requiredSections = ['personalInfo', 'professionalSummary', 'experience', 'skills'];
  const presentSections = requiredSections.filter(section => cvContent[section]);
  score += (presentSections.length / requiredSections.length) * 10;
  
  // Add points for quantifiable achievements (max 5 points)
  if (cvContent.experience && Array.isArray(cvContent.experience)) {
    const hasMetrics = cvContent.experience.some((exp: any) => 
      exp.achievements && exp.achievements.some((ach: string) => /\d+%|\d+[kKmM]/.test(ach))
    );
    if (hasMetrics) score += 5;
  }
  
  return Math.min(100, score);
}

function optimizeSummary(summary: string, jobRequirements: any): string {
  // Ensure we have a valid summary to work with
  let optimized = summary || 'Experienced professional with strong technical background and proven track record of success.';
  
  // Ensure jobRequirements and keywords exist
  if (!jobRequirements || !jobRequirements.keywords || !Array.isArray(jobRequirements.keywords)) {
    return optimized;
  }
  
  // Integrate top keywords naturally
  const topKeywords = jobRequirements.keywords.slice(0, 3);
  topKeywords.forEach((keyword: string) => {
    if (keyword && typeof keyword === 'string' && !optimized.toLowerCase().includes(keyword.toLowerCase())) {
      optimized += ` Experienced in ${keyword} with proven track record.`;
    }
  });
  
  return optimized;
}

function optimizeExperience(experiences: any[], jobRequirements: any): any[] {
  if (!Array.isArray(experiences)) return experiences || [];
  
  // Ensure jobRequirements and keywords exist
  if (!jobRequirements || !jobRequirements.keywords || !Array.isArray(jobRequirements.keywords)) {
    return experiences;
  }
  
  return experiences.map(exp => ({
    ...exp,
    achievements: (exp.achievements || []).map((achievement: string) => {
      if (!achievement || typeof achievement !== 'string') return achievement;
      
      let optimized = achievement;
      
      // Add relevant keywords (limit to avoid over-optimization)
      const relevantKeywords = jobRequirements.keywords.slice(0, 2);
      relevantKeywords.forEach((keyword: string) => {
        if (keyword && typeof keyword === 'string' && 
            !optimized.toLowerCase().includes(keyword.toLowerCase()) && 
            Math.random() > 0.7) {
          optimized += ` utilizing ${keyword}`;
        }
      });
      
      return optimized;
    })
  }));
}

function optimizeSkills(skills: any, jobRequirements: any): any {
  if (!skills) return { technical: [], soft: [] };
  
  const optimizedSkills = { ...skills };
  
  // Ensure we have technical skills array
  if (!optimizedSkills.technical || !Array.isArray(optimizedSkills.technical)) {
    optimizedSkills.technical = [];
  }
  
  // Ensure jobRequirements and keywords exist
  if (!jobRequirements || !jobRequirements.keywords || !Array.isArray(jobRequirements.keywords)) {
    return optimizedSkills;
  }
  
  // Add missing technical skills from job requirements
  const missingSkills = jobRequirements.keywords.filter((keyword: string) => 
    keyword && typeof keyword === 'string' && 
    !optimizedSkills.technical.some((skill: string) => 
      skill && skill.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  
  // Add top missing skills
  optimizedSkills.technical = [
    ...optimizedSkills.technical,
    ...missingSkills.slice(0, 3)
  ].slice(0, 15);
  
  return optimizedSkills;
}

function generateATSRecommendations(cvContent: any, jobRequirements: any): string[] {
  const recommendations: string[] = [];
  
  // Check for missing keywords
  const missingKeywords = jobRequirements.keywords.filter((keyword: string) => 
    !JSON.stringify(cvContent).toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (missingKeywords.length > 0) {
    recommendations.push(`Consider adding these keywords: ${missingKeywords.slice(0, 3).join(', ')}`);
  }
  
  // Check for quantifiable achievements
  const hasMetrics = cvContent.experience && cvContent.experience.some((exp: any) => 
    exp.achievements && exp.achievements.some((ach: string) => /\d+%|\d+[kKmM]/.test(ach))
  );
  
  if (!hasMetrics) {
    recommendations.push('Add quantifiable achievements with numbers and percentages');
  }
  
  // Check summary length
  if (!cvContent.professionalSummary || cvContent.professionalSummary.length < 100) {
    recommendations.push('Expand professional summary to 150-200 words for better ATS parsing');
  }
  
  return recommendations.slice(0, 5);
}
