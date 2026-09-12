import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as playlistsApi from '../api/playlists'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/format'
import './Playlists.css'

export default function Playlists() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    playlistsApi
      .getUserPlaylists(user._id)
      .then(({ data }) => setPlaylists(data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !description.trim()) return
    setCreating(true)
    setError('')
    try {
      await playlistsApi.createPlaylist({ name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your playlists</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="playlists-create-row" onSubmit={handleCreate}>
        <div className="field">
          <input type="text" placeholder="Playlist name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <input
            type="text"
            placeholder="Short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={creating}>
          {creating ? 'Creating…' : 'Create playlist'}
        </button>
      </form>

      {loading ? (
        <Loader />
      ) : playlists.length === 0 ? (
        <EmptyState title="No playlists yet" description="Create one above to start organizing videos." />
      ) : (
        <div className="playlist-grid">
          {playlists.map((p) => (
            <Link key={p._id} to={`/playlist/${p._id}`} className="playlist-card">
              <strong>{p.name}</strong>
              <p className="playlist-card-count">{p.videos?.length || 0} videos</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
