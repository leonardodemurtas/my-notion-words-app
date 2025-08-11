'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [words, setWords] = useState([])
  const [filteredWords, setFilteredWords] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState(new Set())

  // Fetch words from API
  useEffect(() => {
    fetchWords()
  }, [])

  // Filter words based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredWords(words)
    } else {
      const filtered = words.filter(word =>
        word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (word.type && word.type.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredWords(filtered)
    }
  }, [words, searchTerm])

  const fetchWords = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/words')
      const data = await response.json()
      
      if (data.success) {
        setWords(data.words)
      } else {
        console.error('Failed to fetch words:', data.error)
      }
    } catch (error) {
      console.error('Error fetching words:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsReviewed = async (wordId) => {
    try {
      setUpdatingIds(prev => new Set([...prev, wordId]))
      
      const response = await fetch('/api/update-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wordId }),
      })

      const data = await response.json()
      
      if (data.success) {
        // Update the word in local state
        setWords(prevWords => 
          prevWords.map(word => 
            word.id === wordId 
              ? { ...word, lastReview: new Date().toISOString() }
              : word
          )
        )
      } else {
        console.error('Failed to update review:', data.error)
      }
    } catch (error) {
      console.error('Error updating review:', error)
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(wordId)
        return newSet
      })
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never reviewed'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStats = () => {
    const total = words.length
    const reviewed = words.filter(word => word.lastReview).length
    const unreviewed = total - reviewed
    return { total, reviewed, unreviewed }
  }

  const stats = getStats()

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your words...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1>Words Dashboard</h1>
        <p>Master your vocabulary with focused review sessions</p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total Words</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.unreviewed}</span>
          <span className="stat-label">Need Review</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.reviewed}</span>
          <span className="stat-label">Reviewed</span>
        </div>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search words, descriptions, or types..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredWords.length === 0 ? (
        <div className="no-results">
          {searchTerm ? 'No words found matching your search.' : 'No words available.'}
        </div>
      ) : (
        <div className="words-grid">
          {filteredWords.map((word) => (
            <div key={word.id} className="word-card">
              <h2 className="word-title">{word.word}</h2>
              
              {word.type && (
                <span className="word-type">{word.type}</span>
              )}

              <p className="word-description">{word.description}</p>

              {word.example && (
                <div className="word-example">
                  <strong>Example:</strong> {word.example}
                </div>
              )}

              <div className="word-meta">
                <span>Relevance: {word.relevance || 'Not set'}</span>
                <span>Last Review: {formatDate(word.lastReview)}</span>
              </div>

              <button
                className="review-button"
                onClick={() => markAsReviewed(word.id)}
                disabled={updatingIds.has(word.id)}
              >
                {updatingIds.has(word.id) ? 'Updating...' : 'Mark as Reviewed'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}