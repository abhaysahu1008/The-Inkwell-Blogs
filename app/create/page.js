'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { createClient } from '../../lib/supabase'

export default function CreatePostPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: userData } = await supabase
        .from('users')
        .select('role, id, name')
        .eq('id', session.user.id)
        .single()

      if (!userData || userData.role === 'viewer') {
        router.push('/')
        return
      }
      setUser({ ...session.user, ...userData })
      setAuthChecked(true)
    }
    checkAuth()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Call API route to create post + generate AI summary
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          image_url: imageUrl,
          author_id: user.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      router.push(`/blog/${data.post.id}`)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <>
        <Navbar />
        <div className="loading-center">
          <div className="loading-spinner"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>Write a New Post</h1>
          <p>Share your story. An AI summary will be generated automatically.</p>
        </div>
      </div>

      <main className="container-narrow" style={{ padding: '2.5rem 1.5rem 4rem' }}>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Post Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Give your post a compelling title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Featured Image URL</label>
            <input
              type="url"
              className="form-input"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
            />
            <p className="form-hint">Paste a URL to an image (optional)</p>
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                style={{ marginTop: '0.75rem', width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '3px', border: '1px solid var(--border)' }}
                onError={e => e.target.style.display = 'none'}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Post Content *</label>
            <textarea
              className="form-textarea"
              placeholder="Write your post here..."
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ minHeight: '320px' }}
              required
            />
          </div>

          <div
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--gold)',
              borderRadius: '3px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              color: 'var(--muted)',
            }}
          >
            <strong style={{ color: 'var(--ink)', fontFamily: "'DM Mono', monospace", fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ✦ AI Summary
            </strong>
            <p style={{ marginTop: '0.35rem' }}>
              When you publish, Google Gemini will automatically generate a ~200-word summary and save it to the database.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
            >
              {loading ? (
                <><span className="loading-spinner" style={{ width: 18, height: 18 }}></span> Publishing & Summarising...</>
              ) : 'Publish Post'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>

      <footer className="footer">
        <p>The <span>Inkwell</span> · Built for Hivon Automations</p>
      </footer>
    </>
  )
}
