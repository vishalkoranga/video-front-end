import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Avatar from "../common/Avatar";
import Brand from "../common/Brand";
import Icon from "../common/Icon";
import { Toast } from "../common/Feedback";
import { browseNavItems } from "../../constants/navigation";
import { apiRequest } from "../../services/api";

export default function AppShell({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState(new URLSearchParams(location.search).get("query") || "");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setSidebarOpen(false);
    setSearch(new URLSearchParams(location.search).get("query") || "");
  }, [location.pathname, location.search]);

  function submitSearch(event) {
    event.preventDefault();
    navigate(search.trim() ? `/search?query=${encodeURIComponent(search.trim())}` : "/");
  }

  async function logout() {
    try { await apiRequest("/users/logout", { method: "POST" }); } catch { /* token is cleared regardless */ }
    onLogout();
  }

  const isDashboard = location.pathname === "/dashboard";
  return <div className="app-shell">
    <header className="topbar">
      <button className="icon-button menu-button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle menu"><Icon name="menu" /></button>
      <Brand />
      <form className="search-bar" onSubmit={submitSearch}><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search for videos, creators, ideas" /><button type="submit" aria-label="Submit search"><span>⌘</span>K</button></form>
      <div className="top-actions"><Link className="upload-link" to="/upload"><Icon name="plus" size={17} /> <span>Upload</span></Link><button className="user-menu" onClick={() => navigate("/settings")}><Avatar user={user} size="small" /><span className="user-name">{user?.userName || user?.fullName}</span></button></div>
    </header>
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <nav className="side-nav">
        <p className="nav-label">Browse</p>
        {browseNavItems.map((item) => <Link className={`nav-item ${location.pathname === item.to ? "nav-active" : ""}`} to={item.to} key={item.label}><Icon name={item.icon} /><span>{item.label}</span></Link>)}
        <div className="nav-rule" />
        <p className="nav-label">Your studio</p>
        <Link className={`nav-item ${isDashboard ? "nav-active" : ""}`} to="/dashboard"><Icon name="chart" /><span>Dashboard</span><span className="nav-pill">PRO</span></Link>
        <Link className={`nav-item ${location.pathname === "/upload" ? "nav-active" : ""}`} to="/upload"><Icon name="upload" /><span>Upload video</span></Link>
        <Link className={`nav-item ${location.pathname === "/settings" ? "nav-active" : ""}`} to="/settings"><Icon name="settings" /><span>Settings</span></Link>
      </nav>
      <div className="sidebar-bottom"><div className="side-tip"><span className="tip-spark">✦</span><strong>Make your mark</strong><p>Share something the world hasn't seen yet.</p><Link to="/upload">Create video <Icon name="arrow" size={14} /></Link></div><button className="logout-button" onClick={logout}>Sign out <Icon name="arrow" size={14} /></button><p className="side-version">VideoTube / 2024</p></div>
    </aside>
    <div className="main-area">{children}</div>
    <Toast message={toast} onClose={() => setToast("")} />
  </div>;
}
