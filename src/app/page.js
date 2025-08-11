'use client'
import { useEffect, useMemo, useState } from 'react'
import MobileList from '../components/MobileList'

export default function Home() {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [relevanceFilter, setRelevanceFilter] = useState('')
  const [updatingIds, setUpdatingIds] = useState(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null) // { added }

  // Sorting state
  const [sortField, setSortField] = useState('word')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'

  // Responsive: detect mobile (≤640px)
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mql.matches)
    update()
    if (mql.addEventListener) mql.addEventListener('change', update)
    else mql.addListener(update)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', update)
      else mql.removeListener(update)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/words', { cache: 'no-store' })
        const data = await res.json()
        if (data.success) setWords(data.words)
      } catch (e) {
        console.error('Failed to load words', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const uniqueTypes = useMemo(() => Array.from(new Set(words.map(w => w.type).filter(Boolean))).sort(), [words])
  const uniqueRelevance = useMemo(() => Array.from(new Set(words.map(w => w.relevance).filter(Boolean))).sort(), [words])

  // Filter + search
  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return words.filter(w => {
      const passType = !typeFilter || w.type === typeFilter
      const passRel = !relevanceFilter || w.relevance === relevanceFilter
      const passSearch = term === '' ||
        w.word?.toLowerCase().includes(term) ||
        w.description?.toLowerCase().includes(term) ||
        w.example?.toLowerCase().includes(term)
      return passType && passRel && passSearch
    })
  }, [words, searchTerm, typeFilter, relevanceFilter])

  // Sort
  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const arr = [...filtered]
    arr.sort((a, b) => {
      const va = getFieldValue(a, sortField)
      const vb = getFieldValue(b, sortField)
      if (va == null && vb == null) return 0
      if (va == null) return -1 * dir
      if (vb == null) return 1 * dir

      // Date sort
      if (sortField === 'lastReview') {
        const da = va ? new Date(va).getTime() : 0
        const db = vb ? new Date(vb).getTime() : 0
        return da === db ? 0 : (da < db ? -1 * dir : 1 * dir)
      }
      // Number sort
      if (sortField === 'reviewCount') {
        const na = Number(va) || 0
        const nb = Number(vb) || 0
        return na === nb ? 0 : (na < nb ? -1 * dir : 1 * dir)
      }
      // String sort
      const sa = String(va).toLowerCase()
      const sb = String(vb).toLowerCase()
      return sa === sb ? 0 : (sa < sb ? -1 * dir : 1 * dir)
    })
    return arr
  }, [filtered, sortField, sortDir])

  function getFieldValue(row, field) {
    switch (field) {
      case 'word': return row.word
      case 'type': return row.type
      case 'description': return row.description
      case 'example': return row.example
      case 'relevance': return row.relevance
      case 'reviewCount': return row.reviewCount
      case 'lastReview': return row.lastReview
      default: return row.word
    }
  }

  function toggleSort(field) {
    if (sortField === field) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString()
  }

  const syncFromNotion = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)
      const oldIds = new Set(words.map(w => w.id))
      const res = await fetch('/api/words', { cache: 'no-store' })
      const data = await res.json()
      if (!data.success) { setSyncResult({ added: 0 }); return }
      const fresh = data.words || []
      const added = fresh.filter(w => !oldIds.has(w.id)).length
      setWords(fresh)
      setSyncResult({ added })
    } catch (e) {
      console.error('Sync error', e)
      setSyncResult({ added: 0 })
    } finally {
      setSyncing(false)
    }
  }

  const markAsReviewed = async (word) => {
    try {
      setUpdatingIds(prev => new Set([...prev, word.id]))
      const res = await fetch('/api/update-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: word.id, wordName: word.word })
      })
      const data = await res.json()
      if (data.success) {
        setWords(prev => prev.map(w =>
          w.id === word.id
            ? { ...w, reviewCount: (w.reviewCount || 0) + 1, lastReview: data.lastReviewISO || new Date().toISOString() }
            : w
        ))
      } else {
        console.error('Update review failed', data.error)
      }
    } catch (e) {
      console.error('Update review error', e)
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(word.id); return s })
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '32px auto', padding: '0 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Words Dashboard</h1>
          <p style={{ margin: '6px 0 0', color: '#555' }}>Review, sort and filter your Notion words</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={syncFromNotion} disabled={syncing}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', cursor: syncing ? 'not-allowed' : 'pointer' }}>
            {syncing ? 'Syncing…' : 'Sync from Notion'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6 }}>
          {syncResult.added === 0 ? 'No new words found.' : `${syncResult.added} new ${syncResult.added === 1 ? 'word' : 'words'} added.`}
        </div>
      )}

      {/* Controls */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search word / description / example"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: '1 1 320px', minWidth: 240, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
          aria-label="Search"
        />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} aria-label="Filter by type"
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
          <option value="">Type: All</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={relevanceFilter} onChange={e => setRelevanceFilter(e.target.value)} aria-label="Filter by relevance"
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}>
          <option value="">Relevance: All</option>
          {uniqueRelevance.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Mobile cards OR Desktop table */}
      {isMobile ? (
        <div style={{ marginTop: 16 }}>
          {loading ? (
            <div style={{ padding: 16 }}>Loading…</div>
          ) : (
            <MobileList items={sorted} onReview={markAsReviewed} updatingIds={updatingIds} />
          )}
        </div>
      ) : (
        <div style={{ marginTop: 16, border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fafafa', zIndex: 1 }}>
                <tr>
                  {headerCell('Word', 'word', sortField, sortDir, toggleSort)}
                  {headerCell('Type', 'type', sortField, sortDir, toggleSort)}
                  {headerCell('Description', 'description', sortField, sortDir, toggleSort)}
                  {headerCell('Example', 'example', sortField, sortDir, toggleSort)}
                  {headerCell('Relevance', 'relevance', sortField, sortDir, toggleSort)}
                  {headerCell('Reviewed', 'reviewCount', sortField, sortDir, toggleSort)}
                  {headerCell('Last review', 'lastReview', sortField, sortDir, toggleSort)}
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: 16 }}>Loading…</td></tr>
                ) : (
                  sorted.map((w, idx) => (
                    <tr key={w.id} style={{ background: idx % 2 ? '#fff' : '#fcfcfc' }}>
                      <td style={tdStyle}><strong>{w.word || 'Untitled'}</strong></td>
                      <td style={tdStyle}>{w.type ? <span style={chipStyle}>{w.type}</span> : '—'}</td>
                      <td style={tdStyle}>{w.description || '—'}</td>
                      <td style={tdStyle}>{w.example || '—'}</td>
                      <td style={tdStyle}>{w.relevance ? <span style={badgeStyle(w.relevance)}>{w.relevance}</span> : '—'}</td>
                      <td style={tdStyle}>{typeof w.reviewCount === 'number' ? w.reviewCount : 0}</td>
                      <td style={tdStyle}>{formatDate(w.lastReview)}</td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => markAsReviewed(w)}
                          disabled={updatingIds.has(w.id)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', cursor: updatingIds.has(w.id) ? 'not-allowed' : 'pointer' }}
                        >
                          {updatingIds.has(w.id) ? 'Updating…' : 'Mark as reviewed'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}

const thStyle = { textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #eee', position: 'sticky', top: 0 }
const tdStyle = { padding: '8px 12px', borderBottom: '1px solid #f1f1f1', verticalAlign: 'top' }

// Desktop chip/badge styles to match mobile cards
const chipStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 999,
  padding: '2px 8px',
  fontSize: 12,
  color: '#374151',
  background: '#f9fafb'
}
function badgeStyle(value) {
  const base = { border: '1px solid #c7d2fe', borderRadius: 999, padding: '2px 8px', fontSize: 12, background: '#eef2ff', color: '#273681' }
  const v = String(value || '').toLowerCase()
  if (v.includes('high')) return { ...base, background: '#fff1f2', color: '#9f1239', borderColor: '#fecdd3' }
  if (v.includes('low'))  return { ...base, background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }
  return base
}

function headerCell(label, field, sortField, sortDir, onClick) {
  const isActive = sortField === field
  const arrow = isActive ? (sortDir === 'asc' ? '▲' : '▼') : ''
  return (
    <th style={thStyle}>
      <button
        onClick={() => onClick(field)}
        style={{ background: 'transparent', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' }}
        aria-label={`Sort by ${label}`}
      >
        {label} {arrow}
      </button>
    </th>
  )
}