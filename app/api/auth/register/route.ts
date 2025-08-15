import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import clientPromise from '../../../../lib/mongodb'
import { signUpSchema } from '../../../../lib/validations'
import { sanitizeText } from '../../../../lib/utils'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signUpSchema.parse(body)
    
    // Sanitize input
    const sanitizedData = {
      name: sanitizeText(validatedData.name),
      email: validatedData.email.toLowerCase().trim(),
      password: validatedData.password
    }
    
    const client = await clientPromise
    const users = client.db().collection('users')
    
    // Check if user already exists
    const existingUser = await users.findOne({ email: sanitizedData.email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hash(sanitizedData.password, 12)
    
    // Create user
    const result = await users.insertOne({
      name: sanitizedData.name,
      email: sanitizedData.email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    
    return NextResponse.json(
      { 
        message: 'User created successfully',
        userId: result.insertedId 
      },
      { status: 201 }
    )
    
  } catch (error) {
    console.error('Registration error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
