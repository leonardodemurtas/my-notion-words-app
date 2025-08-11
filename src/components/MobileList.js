'use client'
import { useState, useMemo } from 'react'

/**
 * Mobile-first card list for words
 * Props:
 *  - items: Array<{ id, word, type, description, example, relevance, reviewCount, lastReview }>
 *  - onReview: (item) => void  // called when user taps "Mark as reviewed"
 *  - updatingIds: Set<string>   // ids currently being updated (disables button)
 */
export default function MobileList({ items = [], onReview, updatingIds = new Set() }) {
  const [expanded, setExpanded] = useState(() => new Set())

  const toggleExpand = (id) => {
    setExpanded(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const safeItems = Array.isArray(items) ? items : []

  if (safeItems.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ margin: 0, color: '#666' }}>No words to show.</p>
      </div>
    )
  }

  return (
    <div style={styles.list}>
      {safeItems.map((w) => (
        <article key={w.id} style={styles.card} aria-label={`Word ${w.word || 'Untitled'}`}>
          {/* Header row: Word + Type + Relevance */}
          <div style={styles.rowHeader}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.word}>{w.word || 'Untitled'}</div>
              <div style={styles.chips}>
                {w.type ? <span style={styles.typeChip}>{w.type}</span> : null}
                {w.relevance ? <BadgeRelevance value={w.relevance} /> : null}
              </div>
            </div>
          </div>

          {/* Description */}
          {w.description ? (
            <p style={styles.description}>
              {w.description}
            </p>
          ) : null}

          {/* Example (collapsible) */}
          {w.example ? (
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => toggleExpand(w.id)}
                style={styles.linkButton}
                aria-expanded={expanded.has(w.id)}
                aria-controls={`ex-${w.id}`}
              >
                {expanded.has(w.id) ? 'Hide example' : 'Show example'}
              </button>
              {expanded.has(w.id) && (
                <blockquote id={`ex-${w.id}`} style={styles.example}>
                  {w.example}
                </blockquote>
              )}
            </div>
          ) : null}

          {/* Footer: counts + last review + action */}
          <div style={styles.footer}>
            <div style={styles.metaLeft}>
              <span title="Times reviewed" style={styles.metaItem}>Reviewed: {typeof w.reviewCount === 'number' ? w.reviewCount : 0}</span>
              <span title="Last review" style={styles.metaItem}>Last: {formatDate(w.lastReview)}</span>
            </div>
            <div>
              <button
                onClick={() => onReview?.(w)}
                disabled={updatingIds.has(w.id)}
                style={{
                  ...styles.actionBtn,
                  opacity: updatingIds.has(w.id) ? 0.6 : 1,
                  cursor: updatingIds.has(w.id) ? 'not-allowed' : 'pointer'
                }}
              >
                {updatingIds.has(w.id) ? 'Updating…' : 'Mark reviewed'}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function BadgeRelevance({ value }) {
  const style = useMemo(() => {
    const base = { ...styles.badge, background: '#eef2ff', color: '#273681', borderColor: '#c7d2fe' }
    const v = String(value).toLowerCase()
    if (v.includes('high')) return { ...base, background: '#fff1f2', color: '#9f1239', borderColor: '#fecdd3' }
    if (v.includes('low')) return { ...base, background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }
    return base
  }, [value])
  return <span style={style}>{value}</span>
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

const styles = {
  list: {
    display: 'grid',
    gap: 12,
  },
  empty: {
    padding: 16,
    border: '1px dashed #e5e7eb',
    borderRadius: 8,
    background: '#fafafa'
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    background: '#fff',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
  },
  rowHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  word: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.2,
  },
  chips: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 6
  },
  typeChip: {
    border: '1px solid #e5e7eb',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
    color: '#374151',
    background: '#f9fafb'
  },
  badge: {
    border: '1px solid',
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
  },
  description: {
    marginTop: 8,
    color: '#374151',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  example: {
    margin: '6px 0 0',
    padding: '8px 10px',
    borderLeft: '3px solid #e5e7eb',
    background: '#fafafa',
    borderRadius: 6,
    color: '#334155'
  },
  footer: {
    marginTop: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  metaLeft: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    color: '#6b7280',
    fontSize: 12
  },
  metaItem: {
    whiteSpace: 'nowrap'
  },
  actionBtn: {
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff'
  },
  linkButton: {
    border: 'none',
    background: 'transparent',
    color: '#2563eb',
    padding: 0,
    textDecoration: 'underline',
    cursor: 'pointer'
  }
}