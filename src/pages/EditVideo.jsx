import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as videosApi from '../api/videos'
import Loader from '../components/Loader'
import { getErrorMessage } from '../utils/format'
import './VideoForm.css'

export default function EditVideo() {
  const { videoId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [video, setVideo] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnail, setThumbnail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let active = true
    videosApi
      .getVideoById(videoId)
      .then(({ data }) => {
        if (!active) return
        setVideo(data.data)
        setTitle(data.data.title)
        setDescription(data.data.description)
      })
      .catch((err) => active && setError(getErrorMessage(err, 'Video not found.')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [videoId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }

    const formData = new FormData()
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    if (thumbnail) formData.append('thumbnail', thumbnail)

    setSaving(true)
    try {
      await videosApi.updateVideo(videoId, formData)
      setSaved(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save changes.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader />

  if (error && !video) {
    return (
      <div className="page-narrow">
        <div className="form-error">{error}</div>
      </div>
    )
  }

  if (!video) return null

  if (user && video.owner && video.owner._id !== user._id) {
    return (
      <div className="page-narrow">
        <div className="form-error">You can only edit videos you own.</div>
      </div>
    )
  }

  return (
    <div className="page-narrow">
      <div className="page-header">
        <h1>Edit video</h1>
        <Link to={`/watch/${videoId}`} className="btn btn-secondary btn-sm">
          View video
        </Link>
      </div>

      {error && <div className="form-error">{error}</div>}
      {saved && <div className="form-success">Changes saved.</div>}

      <form className="video-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field field-file">
          <label htmlFor="thumbnail">Replace thumbnail</label>
          <input
            id="thumbnail"
            type="file"
            accept="image/*"
            onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
          />
          <div className="file-preview">
            <img
              src={thumbnail ? URL.createObjectURL(thumbnail) : video.thumbnail}
              alt="Thumbnail preview"
            />
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
