import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY environment variable not configured',
        setup_help: 'Add GEMINI_API_KEY=your-key-here to your .env.local file'
      }, { status: 500 })
    }

    // Test the API key with a simple request
    const response = await fetch(
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
              text: 'Say "Hello, API test successful!" in a friendly way.'
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100,
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: `Gemini API Error: ${response.status} ${response.statusText}`,
        details: errorText,
        troubleshooting: {
          common_issues: [
            'Invalid API key - check your GEMINI_API_KEY value',
            'API key not enabled for Gemini API',
            'Billing not set up in Google Cloud Console',
            'API quota exceeded'
          ],
          help_url: 'https://aistudio.google.com/app/apikey'
        }
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return NextResponse.json({
        success: true,
        message: 'Gemini API is working correctly!',
        test_response: data.candidates[0].content.parts[0].text,
        api_info: {
          model: 'gemini-1.5-flash',
          version: 'v1beta'
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unexpected response format from Gemini API',
        raw_response: data
      }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test Gemini API',
      details: (error as Error).message,
      troubleshooting: {
        steps: [
          '1. Verify GEMINI_API_KEY is set in .env.local',
          '2. Check your API key at https://aistudio.google.com/app/apikey',
          '3. Ensure billing is enabled in Google Cloud Console',
          '4. Restart your development server after adding the key'
        ]
      }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Allow testing with custom text
  try {
    const body = await request.json()
    const testText = body.text || 'Hello, this is a test message for the Gemini API.'

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY not configured'
      }, { status: 500 })
    }

    const response = await fetch(
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
              text: `Please respond to this message in a helpful way: ${testText}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: 'Gemini API request failed',
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      input: testText,
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated',
      full_response: data
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Test request failed',
      details: (error as Error).message
    }, { status: 500 })
  }
}