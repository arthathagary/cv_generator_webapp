import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import clientPromise from '../../../../lib/mongodb'
import { authOptions } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()
    const userId = (session.user as any).id

    // Collect all user data
    const userData = {
      user: await db.collection('users').findOne({ _id: userId }),
      profile: await db.collection('profiles').findOne({ userId }),
      jobMatches: await db.collection('jobMatches').find({ userId }).toArray(),
      aiAnalyses: await db.collection('aiAnalyses').find({ userId }).toArray(),
      exportDate: new Date().toISOString(),
      exportVersion: '1.0'
    }

    // Remove sensitive data
    if (userData.user) {
      delete userData.user.password
    }

    return NextResponse.json(userData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="resume-app-data-${Date.now()}.json"`
      }
    })

  } catch (error) {
    console.error('Data export error:', error)
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
    const db = client.db()
    const userId = (session.user as any).id

    // Delete all user data
    await Promise.all([
      db.collection('profiles').deleteMany({ userId }),
      db.collection('jobMatches').deleteMany({ userId }),
      db.collection('aiAnalyses').deleteMany({ userId }),
      db.collection('users').deleteOne({ _id: userId }),
      db.collection('accounts').deleteMany({ userId }),
      db.collection('sessions').deleteMany({ userId })
    ])

    return NextResponse.json({ 
      message: 'All user data has been permanently deleted' 
    })

  } catch (error) {
    console.error('Data deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
