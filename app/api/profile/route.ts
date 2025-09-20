import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { ObjectId } from 'mongodb'
import clientPromise from '../../../lib/mongodb'
import { authOptions } from '../../../lib/auth'
import { profileSchema } from '../../../lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const profiles = client.db().collection('profiles')
    
    const profile = await profiles.findOne({ 
      userId: (session.user as any).id 
    })
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    return NextResponse.json(profile)
    
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = profileSchema.parse(body)
    
    const client = await clientPromise
    const profiles = client.db().collection('profiles')
    
    // Check if profile already exists
    const existingProfile = await profiles.findOne({ 
      userId: (session.user as any).id 
    })
    
    const profileData: any = {
      ...validatedData,
      userId: (session.user as any).id,
      updatedAt: new Date()
    }
    
    if (existingProfile) {
      // Update existing profile
      await profiles.updateOne(
        { userId: (session.user as any).id },
        { $set: profileData }
      )
    } else {
      // Create new profile
      profileData.createdAt = new Date()
      await profiles.insertOne(profileData)
    }
    
    return NextResponse.json(
      { message: 'Profile saved successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Save profile error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid profile data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const profiles = client.db().collection('profiles')
    
    await profiles.deleteOne({ 
      userId: (session.user as any).id 
    })
    
    return NextResponse.json(
      { message: 'Profile deleted successfully' },
      { status: 200 }
    )
    
  } catch (error) {
    console.error('Delete profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
