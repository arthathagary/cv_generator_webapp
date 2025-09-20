import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import clientPromise from '../../../../lib/mongodb'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (session?.user) {
      // Clean up any user-specific data from the database
      const client = await clientPromise
      const db = client.db()
      
      // Clean up sessions (if you're storing them in MongoDB)
      try {
        await db.collection('sessions').deleteMany({
          userId: (session.user as any).id
        })
      } catch (error) {
        // Sessions might not be stored in MongoDB, that's okay
        console.log('No sessions to clean up:', error)
      }
      
      // Add any other cleanup logic here
      // For example: clearing temporary data, logging logout events, etc.
    }
    
    // Always return success for logout requests
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Logout cleanup error:', error)
    // Even if cleanup fails, we should allow the logout to proceed
    return NextResponse.json({ success: true })
  }
}
