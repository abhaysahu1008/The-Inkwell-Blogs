'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '../../../components/Navbar'
import { createClient } from '../../../lib/supabase'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

function getInitials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
}

export default function BlogPostPage({ params }) {
  const [post, setPost] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPost()
    fetchUser()
  }, [params.id])

  const fetchPost = async () => {
    const res = await fetch(`/api/posts/${params.id}`)
    if (res.ok) {
      const { post } = await res.json()
      setPost(post)
      setComments(post.comments || [])
    }
    setLoading(false)
  }

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase
        .from('users')
        .select('role, id, name')
        .eq('id', session.user.id)
        .single()
      setUser({ ...session.user, ...data })
      setUserRole(data?.role)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!user) { router.push('/login'); return }
    setCommentLoading(true)
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: params.id, user_id: user.id, comment_text: commentText }),
    })
    if (res.ok) {
      const { comment } = await res.json()
      setComments(prev => [comment, ...prev])
      setCommentText('')
    }
    setCommentLoading(false)
  }

  const handleDeletePost = async () => {
    if (!confirm('Delete this post permanently?')) return
    setDeleteLoading(true)
    const res = await fetch(`/api/posts/${params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, user_role: userRole }),
    })
    if (res.ok) {
      router.push('/')
    } else {
      alert('Failed to delete post')
      setDeleteLoading(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return
    await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, user_role: userRole }),
    })
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  const canEdit = user && post && (userRole === 'admin' || (userRole === 'author' && post.users?.id === user.id))

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-center">
          <div className="loading-spinner"></div>
        </div>
      </>
    )
  }

  if (!post) {
    return (
      <>
        <Navbar />
        <div className="empty-state">
          <h3>Post not found</h3>
          <Link href="/" className="btn btn-primary mt-2">Back to Home</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />

      {post.image_url && (
        <img src={post.image_url} alt={post.title} className="post-hero-image" />
      )}

      <main className="container-narrow">
        <article className="post-content">
          <h1 className="post-title">{post.title}</h1>

          <div className="post-meta-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="avatar-sm" style={{ width: 34, height: 34, fontSize: '0.8rem' }}>
                {getInitials(post.users?.name)}
              </div>
              <div>
                <div className="author-name">{post.users?.name || 'Anonymous'}</div>
                <div className="date">{formatDate(post.created_at)}</div>
              </div>
            </div>
            {canEdit && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                <Link href={`/edit/${post.id}`} className="btn btn-outline btn-sm">Edit</Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDeletePost}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? '...' : 'Delete'}
                </button>
              </div>
            )}
          </div>

          {post.summary && (
            <div className="ai-summary-box">
              <div className="label">✦ AI-Generated Summary</div>
              <p>{post.summary}</p>
            </div>
          )}

          <div className="post-body">
            {post.body.split('\n').filter(p => p.trim()).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>

        <section className="comments-section">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.4rem' }}>
            Comments ({comments.length})
          </h2>

          {/* Add comment */}
          {user ? (
            <form onSubmit={handleComment} style={{ marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="form-label">Leave a comment</label>
                <textarea
                  className="form-textarea"
                  placeholder="Share your thoughts..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  style={{ minHeight: '100px' }}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={commentLoading}
              >
                {commentLoading ? 'Posting...' : 'Post Comment'}
              </button>
            </form>
          ) : (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '0.9rem', color: 'var(--muted)' }}>
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link> to leave a comment.
            </div>
          )}

          {comments.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map(comment => (
              <div className="comment-card" key={comment.id}>
                <div className="commenter">
                  <div className="avatar-sm">{getInitials(comment.users?.name)}</div>
                  <span className="commenter-name">{comment.users?.name}</span>
                  <span className="comment-date">
                    {comment.created_at ? formatDate(comment.created_at) : ''}
                  </span>
                  {userRole === 'admin' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginLeft: 'auto', color: 'var(--error)', fontSize: '0.75rem' }}
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="comment-text">{comment.comment_text}</p>
              </div>
            ))
          )}
        </section>
      </main>

      <footer className="footer">
        <p>The <span>Inkwell</span> · Built for Hivon Automations</p>
      </footer>
    </>
  )
}
