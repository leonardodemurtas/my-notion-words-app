import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'

async function getTitlePropertyName(notion, databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId })
  for (const [name, def] of Object.entries(db.properties || {})) {
    if (def?.type === 'title') return name
  }
  return 'Name'
}

export async function POST(req) {
  try {
    const { pageId, wordName } = await req.json()

    const token = process.env.NOTION_TOKEN
    const databaseId = process.env.NOTION_DB_ID
    if (!token || !databaseId) {
      return NextResponse.json({ success: false, error: 'Missing NOTION_TOKEN or NOTION_DB_ID' }, { status: 500 })
    }

    const notion = new Client({ auth: token })

    let targetPageId = pageId
    if (!targetPageId) {
      if (!wordName) {
        return NextResponse.json({ success: false, error: 'Provide pageId or wordName' }, { status: 400 })
      }
      const titleProp = await getTitlePropertyName(notion, databaseId)
      const query = await notion.databases.query({
        database_id: databaseId,
        filter: { property: titleProp, title: { equals: wordName } },
        page_size: 1,
      })
      if (!query.results?.length) {
        return NextResponse.json({ success: false, error: `No page found for word: ${wordName}` }, { status: 404 })
      }
      targetPageId = query.results[0].id
    }

    const page = await notion.pages.retrieve({ page_id: targetPageId })
    const currentProp = page.properties?.ReviewCount
    const currentCount = (currentProp?.type === 'number' && typeof currentProp.number === 'number')
      ? currentProp.number
      : 0

    const nextCount = currentCount + 1
    const nowISO = new Date().toISOString()

    await notion.pages.update({
      page_id: targetPageId,
      properties: {
        ReviewCount: { number: nextCount },
        LastReview: { date: { start: nowISO } },
      }
    })

    return NextResponse.json({ success: true, reviewCount: nextCount, lastReviewISO: nowISO })
  } catch (err) {
    console.error('update-review error', err?.message || err)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}