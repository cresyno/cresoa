import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { businessId, userId, rating, feedback, pageUrl, browserInfo } = await request.json()

    if (!businessId || !userId || !rating || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        business_id: businessId,
        user_id: userId,
        rating: rating,
        feedback: feedback.trim(),
        page_url: pageUrl || null,
        browser_info: browserInfo || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Feedback error:', error)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: data,
    })

  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
