import { Client } from '@notionhq/client'
import { NextResponse } from 'next/server'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

export async function POST(request) {
  try {
    const { wordId } = await request.json()

    if (!wordId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Word ID is required',
        },
        { status: 400 }
      )
    }

    // Get current date in ISO format
    const currentDate = new Date().toISOString().split('T')[0]

    // Update the page in Notion
    await notion.pages.update({
      page_id: wordId,
      properties: {
        LastReview: {
          date: {
            start: currentDate,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Review date updated successfully',
    })
  } catch (error) {
    console.error('Error updating review date:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update review date',
      },
      { status: 500 }
    )
  }
}