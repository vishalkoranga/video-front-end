import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as dashboardApi from '../api/dashboard'
import * as videosApi from '../api/videos'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCount, timeAgo, getErrorMessage } from '../utils/format'
import './Dashboard.css'

const STAT_LABELS = [
  { key: 'totalVideos', label: 'Videos' },
  { key: 'totalViews', label: 'Views' },
  { key: 'totalSubscribers', label: 'Subscribers' },
  { key: 'totalLikes', label: 'Likes' },
  { key: 'totalComments', label: 'Comments' },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([dashboardApi.getChannelStats(), dashboardApi.getChannelVideos()])
      .then(([statsRes, videosRes]) => {
        if (!active) return
        setStats(statsRes.data.data)
        setVideos(videosRes.data.data || [])
      })
      .catch((err) => active && setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const handleTogglePublish = async (video) => {
    try {
      const { data } = await videosApi.toggleVideoPublishStatus(video._id)
      setVideos((prev) =>
        prev.map((v) => (v._id === video._id ? { ...v, isPublished: data.data.isPublished } : v))
      )
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await videosApi.deleteVideo(pendingDelete._id)
      setVideos((prev) => prev.filter((v) => v._id !== pendingDelete._id))
      setPendingDelete(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <Loader />

  return (
    <div className="page">
      <div className="page-header">
        <h1>Studio dashboard</h1>
        <Link to="/upload" className="btn btn-primary btn-sm">
          Upload video
        </Link>
      </div>

      {error && <div className="form-error">{error}</div>}

      {stats && (
        <div className="stats-grid">
          {STAT_LABELS.map(({ key, label }) => (
            <div className="stat-card" key={key}>
              <div className="stat-card-value">{formatCount(stats[key])}</div>
              <div className="stat-card-label">{label}</div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 18, marginBottom: 10 }}>Your videos</h2>

      {videos.length === 0 ? (
        <EmptyState
          title="Nothing uploaded yet"
          description="Publish your first video to see it here."
          action={
            <Link to="/upload" className="btn btn-primary">
              Upload a video
            </Link>
          }
        />
      ) : (
        <div>
          {videos.map((video) => (
            <div className="dashboard-video-row" key={video._id}>
              <Link to={`/watch/${video._id}`} className="dashboard-video-thumb">
                <img src={video.thumbnail} alt={video.title} />
              </Link>
              <div className="dashboard-video-info">
                <Link to={`/watch/${video._id}`} className="dashboard-video-title">
                  {video.title}
                </Link>
                <p className="dashboard-video-meta">
                  {formatCount(video.views)} views · {timeAgo(video.createdAt)}
                </p>
                <span className={`dashboard-status ${video.isPublished ? 'published' : 'draft'}`}>
                  {video.isPublished ? 'Published' : 'Unpublished'}
                </span>
              </div>
              <div className="dashboard-video-actions">
                <Link to={`/video/${video._id}/edit`} className="btn btn-secondary btn-sm">
                  Edit
                </Link>
                <button className="btn btn-secondary btn-sm" onClick={() => handleTogglePublish(video)}>
                  {video.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setPendingDelete(video)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this video?"
        message={pendingDelete ? `“${pendingDelete.title}” will be permanently removed.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
