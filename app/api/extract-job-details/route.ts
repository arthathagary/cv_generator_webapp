import { NextRequest, NextResponse } from 'next/server'

// POST /api/extract-job-details
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[extract-job-details] Received body:', body);
    // Here you would process the job extraction logic, e.g., AI, scraping, etc.
    // For now, just echo the received data
    return NextResponse.json({ success: true, received: body });
  } catch (error) {
    console.error('[extract-job-details] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
