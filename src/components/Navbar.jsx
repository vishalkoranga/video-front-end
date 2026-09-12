import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import './Navbar.css'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQuery(location.pathname === '/search' ? params.get('q') || '' : '')
  }, [location])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : '/search')
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          Videotube
        </Link>

        <form className="navbar-search" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search videos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" aria-label="Search">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        <nav className="navbar-actions">
          {user ? (
            <>
              <Link to="/upload" className="btn btn-secondary btn-sm navbar-upload">
                Upload
              </Link>
              <div className="navbar-menu" ref={menuRef}>
                <button
                  className="navbar-avatar-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Account menu"
                >
                  <Avatar src={user.avatar} name={user.fullName} size={34} />
                </button>
                {menuOpen && (
                  <div className="navbar-dropdown">
                    <div className="navbar-dropdown-header">
                      <p className="navbar-dropdown-name">{user.fullName}</p>
                      <p className="navbar-dropdown-handle">@{user.userName}</p>
                    </div>
                    <Link to={`/channel/${user.userName}`} onClick={() => setMenuOpen(false)}>
                      Your channel
                    </Link>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                      Studio dashboard
                    </Link>
                    <Link to="/playlists" onClick={() => setMenuOpen(false)}>
                      Playlists
                    </Link>
                    <Link to="/liked-videos" onClick={() => setMenuOpen(false)}>
                      Liked videos
                    </Link>
                    <Link to="/history" onClick={() => setMenuOpen(false)}>
                      Watch history
                    </Link>
                    <Link to="/subscriptions" onClick={() => setMenuOpen(false)}>
                      Subscriptions
                    </Link>
                    <Link to="/settings" onClick={() => setMenuOpen(false)}>
                      Settings
                    </Link>
                    <button className="navbar-dropdown-logout" onClick={handleLogout}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
