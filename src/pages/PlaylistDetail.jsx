import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as playlistsApi from '../api/playlists'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatCount, getErrorMessage } from '../utils/format'
import './Playlists.css'

export default function PlaylistDetail() {
  const { playlistId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = () => {
    setLoading(true)
    playlistsApi
      .getPlaylistById(playlistId)
      .then(({ data }) => {
        setPlaylist(data.data)
        setName(data.data.name)
        setDescription(data.data.description)
      })
      .catch((err) => setError(getErrorMessage(err, 'Playlist not found.')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistId])

  const isOwner = user && playlist?.owner?._id === user._id

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data } = await playlistsApi.updatePlaylist(playlistId, {
        name: name.trim(),
        description: description.trim(),
      })
      setPlaylist((prev) => ({ ...prev, name: data.data.name, description: data.data.description }))
      setEditing(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveVideo = async (videoId) => {
    try {
      await playlistsApi.removeVideoFromPlaylist(videoId, playlistId)
      setPlaylist((prev) => ({ ...prev, videos: prev.videos.filter((v) => v._id !== videoId) }))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleDeletePlaylist = async () => {
    setDeleting(true)
    try {
      await playlistsApi.deletePlaylist(playlistId)
      navigate('/playlists')
    } catch (err) {
      setError(getErrorMessage(err))
      setDeleting(false)
    }
  }

  if (loading) return <Loader />

  if (error && !playlist) {
    return (
      <div className="page">
        <div className="form-error">{error}</div>
      </div>
    )
  }

  if (!playlist) return null

  return (
    <div className="page">
      {error && <div className="form-error">{error}</div>}

      {editing ? (
        <form className="edit-playlist-form" onSubmit={handleSave}>
          <div className="field">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="playlist-detail-header">
          <div>
            <h1>{playlist.name}</h1>
            <p className="playlist-detail-meta">
              {playlist.description} · {formatCount(playlist.videos?.length || 0)} videos
              {playlist.owner?.userName && (
                <>
                  {' '}
                  · by{' '}
                  <Link to={`/channel/${playlist.owner.userName}`}>{playlist.owner.fullName}</Link>
                </>
              )}
            </p>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                Edit details
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
                Delete playlist
              </button>
            </div>
          )}
        </div>
      )}

      {(!playlist.videos || playlist.videos.length === 0) ? (
        <EmptyState title="This playlist is empty" description="Add videos to it from any watch page." />
      ) : (
        <div>
          {playlist.videos.map((video) => (
            <div className="playlist-video-row" key={video._id}>
              <Link to={`/watch/${video._id}`} className="playlist-video-thumb">
                <img src={video.thumbnail} alt={video.title} />
              </Link>
              <div className="playlist-video-info">
                <Link to={`/watch/${video._id}`} className="playlist-video-title">
                  {video.title}
                </Link>
                <p className="playlist-video-owner">{video.owner?.fullName}</p>
              </div>
              {isOwner && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleRemoveVideo(video._id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete this playlist?"
        message="This can't be undone."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePlaylist}
      />
    </div>
  )
}
