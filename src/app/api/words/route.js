import { Client } from '@notionhq/client'
import { NextResponse } from 'next/server'

// 🚫 Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

const notion = new Client({ auth: process.env.NOTION_TOKEN })

function extractTitle(properties) {
  if (!properties) return ''
  for (const [, prop] of Object.entries(properties)) {
    if (prop?.type === 'title') {
      const arr = prop.title || []
      return Array.isArray(arr)
        ? arr.map(t => t?.plain_text || t?.text?.content || '').join('').trim()
        : ''
    }
  }
  return ''
}

function getText(rt) {
  return Array.isArray(rt) && rt.length
    ? (rt[0]?.plain_text || rt[0]?.text?.content || '')
    : ''
}

async function fetchAllPages(databaseId) {
  const results = []
  let cursor
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      // no filters — get everything
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    })
    results.push(...(res.results || []))
    cursor = res.has_more ? res.next_cursor : undefined
  } while (cursor)
  return results
}

export async function GET() {
  try {
    const databaseId = process.env.NOTION_DB_ID
    if (!process.env.NOTION_TOKEN || !databaseId) {
      return NextResponse.json(
        { success: false, error: 'Missing NOTION_TOKEN or NOTION_DB_ID' },
        { status: 500 }
      )
    }

    const pages = await fetchAllPages(databaseId)

    const words = pages.map(page => {
      const p = page.properties || {}
      const typeValue =
        (p.Type?.select?.name) ||
        (Array.isArray(p.Type?.multi_select)
          ? p.Type.multi_select.map(o => o?.name).filter(Boolean).join(', ')
          : '') || ''

      return {
        id: page.id,
        word: extractTitle(p),
        type: typeValue,
        description: getText(p.Description?.rich_text),
        example: getText(p.Example?.rich_text),
        relevance: p.Relevance?.select?.name || '',
        checkbox: !!p.Checkbox?.checkbox,
        createdTime: page.created_time || p['Created time']?.created_time || '',
        lastReview: p.LastReview?.date?.start || null,
        reviewCount: typeof p.ReviewCount?.number === 'number' ? p.ReviewCount.number : 0,
      }
    })

    const res = NextResponse.json({ success: true, words })
    // Extra guard against any proxy caching:
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error) {
    console.error('Error fetching words:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch words from Notion' }, { status: 500 })
  }
}