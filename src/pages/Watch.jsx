import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Loader from '../components/Loader'
import CommentSection from '../components/CommentSection'
import PlaylistPickerModal from '../components/PlaylistPickerModal'
import ConfirmDialog from '../components/ConfirmDialog'
import * as videosApi from '../api/videos'
import * as authApi from '../api/auth'
import * as likesApi from '../api/likes'
import * as subscriptionsApi from '../api/subscriptions'
import { formatCount, timeAgo, getErrorMessage } from '../utils/format'
import './Watch.css'

export default function Watch() {
  const { videoId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [video, setVideo] = useState(null)
  const [channel, setChannel] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isLiked, setIsLiked] = useState(false)
  const [subBusy, setSubBusy] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setDescExpanded(false)

    videosApi
      .getVideoById(videoId)
      .then(({ data }) => {
        if (!active) return
        const v = data.data
        setVideo(v)

        if (v.owner?.userName) {
          authApi
            .getUserChannelProfile(v.owner.userName)
            .then(({ data }) => active && setChannel(data.data))
            .catch(() => {})

          videosApi
            .getAllVideos({ limit: 8, userId: v.owner._id })
            .then(({ data }) => {
              if (active) setRelated((data.data.docs || []).filter((rv) => rv._id !== videoId))
            })
            .catch(() => {})
        }

        likesApi
          .getLikedVideos()
          .then(({ data }) => {
            if (active) {
              const liked = (data.data || []).some((entry) => entry.likedVideo?._id === videoId)
              setIsLiked(liked)
            }
          })
          .catch(() => {})
      })
      .catch((err) => active && setError(getErrorMessage(err, 'This video could not be found.')))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [videoId])

  const handleLike = async () => {
    setIsLiked((v) => !v)
    try {
      const { data } = await likesApi.toggleVideoLike(videoId)
      setIsLiked(data.data.isLiked)
    } catch (err) {
      setIsLiked((v) => !v)
    }
  }

  const handleSubscribe = async () => {
    if (!channel) return
    setSubBusy(true)
    try {
      const { data } = await subscriptionsApi.toggleSubscription(channel._id)
      const nowSubscribed = data.data.isSubscribed
      setChannel((prev) => ({
        ...prev,
        isSubscribed: nowSubscribed,
        subscribersCount: prev.subscribersCount + (nowSubscribed ? 1 : -1),
      }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubBusy(false)
    }
  }

  const handleTogglePublish = async () => {
    try {
      const { data } = await videosApi.toggleVideoPublishStatus(videoId)
      setVideo((prev) => ({ ...prev, isPublished: data.data.isPublished }))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await videosApi.deleteVideo(videoId)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loading) return <Loader />

  if (error && !video) {
    return (
      <div className="page">
        <div className="form-error">{error}</div>
      </div>
    )
  }

  if (!video) return null

  const isOwner = user && video.owner?._id === user._id

  return (
    <div className="page">
      <div className="watch-layout">
        <div>
          <div className="watch-player">
            <video src={video.videoFile} poster={video.thumbnail} controls autoPlay />
          </div>

          <h1 className="watch-title">{video.title}</h1>
          <p className="watch-stats">
            {formatCount(video.views)} views · {timeAgo(video.createdAt)}
            {video.isPublished === false && ' · Unpublished'}
          </p>

          <div className="watch-owner-row">
            <div className="watch-owner-identity">
              <Link to={`/channel/${video.owner?.userName}`}>
                <Avatar src={video.owner?.avatar} name={video.owner?.fullName} size={46} />
              </Link>
              <div>
                <Link to={`/channel/${video.owner?.userName}`} className="watch-owner-name">
                  {video.owner?.fullName}
                </Link>
                <p className="watch-owner-subs">
                  {formatCount(channel?.subscribersCount ?? 0)} subscribers
                </p>
              </div>
              {!isOwner && channel && (
                <button
                  className={`btn ${channel.isSubscribed ? 'btn-active' : 'btn-primary'} btn-sm`}
                  onClick={handleSubscribe}
                  disabled={subBusy}
                  style={{ marginLeft: 8 }}
                >
                  {channel.isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>

            <div className="watch-owner-actions">
              <button className={`watch-action-btn ${isLiked ? 'is-active' : ''}`} onClick={handleLike}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'}>
                  <path
                    d="M12 21s-6.7-4.35-9.3-8.2C1 10.1 1.8 6.6 4.7 5.2c2.3-1.1 4.7-.2 6.1 1.6.5.6.9 1.3 1.2 2 .3-.7.7-1.4 1.2-2 1.4-1.8 3.8-2.7 6.1-1.6 2.9 1.4 3.7 4.9 2 7.6C18.7 16.65 12 21 12 21z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                {isLiked ? 'Liked' : 'Like'}
              </button>
              <button className="watch-action-btn" onClick={() => setShowPlaylistModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h13M4 12h13M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M19 15v6M16 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Save
              </button>

              {isOwner && (
                <div className="watch-owner-buttons">
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/video/${videoId}/edit`)}>
                    Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleTogglePublish}>
                    {video.isPublished === false ? 'Publish' : 'Unpublish'}
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="watch-description" style={!descExpanded ? { maxHeight: 74, overflow: 'hidden' } : undefined}>
            {video.description}
          </div>
          <button className="watch-description-toggle" onClick={() => setDescExpanded((v) => !v)}>
            {descExpanded ? 'Show less' : 'Show more'}
          </button>

          <hr className="divider" />

          <CommentSection videoId={videoId} />
        </div>

        <aside className="watch-sidebar">
          <h4>More from this channel</h4>
          {related.length === 0 && <p className="text-muted">No other videos yet.</p>}
          {related.map((rv) => (
            <Link key={rv._id} to={`/watch/${rv._id}`} className="watch-side-card">
              <div className="watch-side-thumb">
                <img src={rv.thumbnail} alt={rv.title} />
              </div>
              <div className="watch-side-info">
                <p className="watch-side-title">{rv.title}</p>
                <p className="watch-side-meta">
                  {formatCount(rv.views)} views · {timeAgo(rv.createdAt)}
                </p>
              </div>
            </Link>
          ))}
        </aside>
      </div>

      {showPlaylistModal && (
        <PlaylistPickerModal videoId={videoId} onClose={() => setShowPlaylistModal(false)} />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this video?"
        message="This can't be undone. The video will be permanently removed."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
