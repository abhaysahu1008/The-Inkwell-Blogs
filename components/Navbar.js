'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (data) setRole(data.role)
      }
    }
    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (data) setRole(data.role)
      } else {
        setUser(null)
        setRole(null)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    setMenuOpen(false)
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setRole(null)
      router.push('/')
      router.refresh()
    }
    setLoggingOut(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          The <span>Inkwell</span>
        </Link>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <ul className={`navbar-links${menuOpen ? ' open' : ''}`}>
          <li>
            <Link href="/" onClick={() => setMenuOpen(false)}>Home</Link>
          </li>
          {user ? (
            <>
              {(role === 'author' || role === 'admin') && (
                <li>
                  <Link href="/create" onClick={() => setMenuOpen(false)}>
                    + New Post
                  </Link>
                </li>
              )}
              {role === 'admin' && (
                <li>
                  <Link href="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
                </li>
              )}
              <li>
                <button onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link href="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
              </li>
              <li>
                <Link href="/register" className="btn-nav-cta" onClick={() => setMenuOpen(false)}>
                  Get Started
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}
