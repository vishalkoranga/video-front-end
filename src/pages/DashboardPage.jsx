import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/common/Feedback";
import Icon from "../components/common/Icon";
import { apiRequest, getList, unwrap } from "../services/api";
import { formatDate, formatViews } from "../utils/formatters";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => { try { const [statsResult, videoResult] = await Promise.all([apiRequest("/dashboard/stats"), apiRequest("/dashboard/videos")]); setStats(unwrap(statsResult)); setVideos(getList(videoResult)); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  if (loading) return <main className="content-page"><LoadingState label="Loading your studio…" /></main>;
  if (error) return <main className="content-page"><ErrorState message={error} retry={load} /></main>;
  const statItems = [["totalViews", "Total views", "chart"], ["totalSubscribers", "Subscribers", "compass"], ["totalLikes", "Likes", "heart"], ["totalComments", "Comments", "send"]];
  return <main className="content-page dashboard-page"><PageHeader eyebrow="Your studio" title="Make something people remember." description="A quick look at how your work is landing." action={<Link className="button button-primary" to="/upload"><Icon name="plus" size={16} /> New video</Link>} /><div className="stats-grid">{statItems.map(([key, label, icon]) => <div className="stat-card" key={key}><div className="stat-icon"><Icon name={icon} /></div><p>{label}</p><strong>{formatViews(stats?.[key])}</strong><span className="stat-trend">this channel</span></div>)}</div><div className="studio-section"><div className="section-label"><h2>Your videos</h2><span>{videos.length} published</span></div>{videos.length ? <div className="studio-list">{videos.map((video) => <Link className="studio-row" to={`/watch/${video._id}`} key={video._id}><div className="studio-thumb">{video.thumbnail && <img src={video.thumbnail} alt="" />}</div><div className="studio-video-info"><strong>{video.title}</strong><span>{formatDate(video.createdAt)} · {video.isPublished ? "Published" : "Draft"}</span></div><span className="studio-number">{formatViews(video.views)} views</span><Icon name="chevron" size={17} /></Link>)}</div> : <EmptyState title="Your studio is waiting" text="Upload your first video and start building an audience." action={<Link className="button button-primary" to="/upload">Upload video</Link>} />}</div></main>;
}
