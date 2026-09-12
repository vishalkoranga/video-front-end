import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import * as playlistsApi from '../api/playlists'
import { getErrorMessage } from '../utils/format'
import Loader from './Loader'
import './Modal.css'

export default function PlaylistPickerModal({ videoId, onClose }) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  useEffect(() => {
    let active = true
    playlistsApi
      .getUserPlaylists(user._id)
      .then(({ data }) => {
        if (active) setPlaylists(data.data || [])
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [user._id])

  const isInPlaylist = (playlist) => playlist.videos?.includes(videoId)

  const toggle = async (playlist) => {
    setBusyId(playlist._id)
    setError('')
    try {
      if (isInPlaylist(playlist)) {
        await playlistsApi.removeVideoFromPlaylist(videoId, playlist._id)
        setPlaylists((prev) =>
          prev.map((p) =>
            p._id === playlist._id
              ? { ...p, videos: p.videos.filter((v) => v !== videoId) }
              : p
          )
        )
      } else {
        await playlistsApi.addVideoToPlaylist(videoId, playlist._id)
        setPlaylists((prev) =>
          prev.map((p) =>
            p._id === playlist._id ? { ...p, videos: [...(p.videos || []), videoId] } : p
          )
        )
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newDescription.trim()) return
    setCreating(true)
    setError('')
    try {
      const { data } = await playlistsApi.createPlaylist({
        name: newName.trim(),
        description: newDescription.trim(),
      })
      await playlistsApi.addVideoToPlaylist(videoId, data.data._id)
      setPlaylists((prev) => [{ ...data.data, videos: [videoId] }, ...prev])
      setNewName('')
      setNewDescription('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Save to playlist</h3>
        {error && <div className="form-error">{error}</div>}

        {loading ? (
          <Loader full={false} />
        ) : playlists.length === 0 ? (
          <p className="text-muted">You don't have any playlists yet.</p>
        ) : (
          <ul className="playlist-picker-list">
            {playlists.map((playlist) => (
              <li key={playlist._id}>
                <label className="playlist-picker-item">
                  <input
                    type="checkbox"
                    checked={isInPlaylist(playlist)}
                    disabled={busyId === playlist._id}
                    onChange={() => toggle(playlist)}
                  />
                  <span>{playlist.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <hr className="divider" />

        <form onSubmit={handleCreate} className="playlist-picker-create">
          <p className="eyebrow-label">New playlist</p>
          <div className="field">
            <input
              type="text"
              placeholder="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className="field">
            <input
              type="text"
              placeholder="Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary btn-sm" type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create and add'}
          </button>
        </form>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
