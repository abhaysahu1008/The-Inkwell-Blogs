'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '../../../components/Navbar'
import { createClient } from '../../../lib/supabase'

export default function EditPostPage({ params }) {
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
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const { data: userData } = await supabase
        .from('users')
        .select('role, id')
        .eq('id', session.user.id)
        .single()

      if (!userData || userData.role === 'viewer') { router.push('/'); return }

      // Fetch post
      const res = await fetch(`/api/posts/${params.id}`)
      if (!res.ok) { router.push('/'); return }
      const { post } = await res.json()

      // Check edit permission
      if (userData.role !== 'admin' && post.users?.id !== session.user.id) {
        router.push('/')
        return
      }

      setTitle(post.title)
      setBody(post.body)
      setImageUrl(post.image_url || '')
      setUser({ ...session.user, ...userData })
      setAuthChecked(true)
    }
    init()
  }, [params.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch(`/api/posts/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, image_url: imageUrl, user_id: user.id, user_role: user.role }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setLoading(false)
    } else {
      router.push(`/blog/${params.id}`)
    }
  }

  if (!authChecked) {
    return (
      <>
        <Navbar />
        <div className="loading-center"><div className="loading-spinner"></div></div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="page-header">
        <div className="container">
          <h1>Edit Post</h1>
          <p>Make your changes below and save.</p>
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
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Preview"
                style={{ marginTop: '0.75rem', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '3px', border: '1px solid var(--border)' }}
                onError={e => e.target.style.display = 'none'}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Post Content *</label>
            <textarea
              className="form-textarea"
              value={body}
              onChange={e => setBody(e.target.value)}
              style={{ minHeight: '320px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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
