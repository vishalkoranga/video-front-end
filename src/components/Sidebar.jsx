import { NavLink } from 'react-router-dom'
import { Home, Users, ListVideo, Heart, History as HistoryIcon, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/subscriptions', label: 'Subscriptions', icon: Users },
  { to: '/playlists', label: 'Playlists', icon: ListVideo },
  { to: '/liked-videos', label: 'Liked videos', icon: Heart },
  { to: '/history', label: 'History', icon: HistoryIcon },
  { to: '/dashboard', label: 'Studio', icon: LayoutDashboard },
]

export default function Sidebar() {
  const { user } = useAuth()

  // Signed-out visitors only ever see the login/register pages, so the
  // section rail has nothing useful to point at yet.
  if (!user) return null

  return (
    <aside className="sidebar">
      <nav>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            title={label}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
