import { Client } from '@notionhq/client'
import { NextResponse } from 'next/server'

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DB_ID,
      sorts: [
        {
          property: 'LastReview',
          direction: 'ascending',
        },
      ],
    })

    const words = response.results.map((page) => {
      const properties = page.properties
      
      return {
        id: page.id,
        word: properties.word?.title?.[0]?.text?.content || '',
        type: properties.Type?.select?.name || '',
        description: properties.Description?.rich_text?.[0]?.text?.content || '',
        example: properties.Example?.rich_text?.[0]?.text?.content || '',
        relevance: properties.Relevance?.select?.name || '',
        checkbox: properties.Checkbox?.checkbox || false,
        createdTime: properties['Created time']?.created_time || '',
        lastReview: properties.LastReview?.date?.start || null,
      }
    })

    return NextResponse.json({
      success: true,
      words,
    })
  } catch (error) {
    console.error('Error fetching words:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch words from Notion',
      },
      { status: 500 }
    )
  }
}