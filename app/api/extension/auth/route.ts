import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import clientPromise from '../../../../lib/mongodb'

// GET endpoint to check extension authentication status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          authenticated: false,
          authUrl: process.env.NEXTAUTH_URL + '/auth/chrome-extension'
        },
        { status: 401 }
      )
    }

    const client = await clientPromise
    const profiles = client.db().collection('profiles')
    
    // Get user profile to check if it exists
    const profile = await profiles.findOne({ userId: (session.user as any).id })
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name
      },
      hasProfile: !!profile,
      profileUrl: process.env.NEXTAUTH_URL + '/profile',
      dashboardUrl: process.env.NEXTAUTH_URL + '/dashboard',
      apiUrl: process.env.NEXTAUTH_URL
    })
    
  } catch (error) {
    console.error('Extension auth check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint to generate extension API token (optional for future use)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate a simple token for the extension (in production, use JWT or similar)
    const token = Buffer.from(
      JSON.stringify({
        userId: (session.user as any).id,
        email: session.user.email,
        timestamp: Date.now()
      })
    ).toString('base64')

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name
      },
      apiUrl: process.env.NEXTAUTH_URL
    })
    
  } catch (error) {
    console.error('Extension token generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
