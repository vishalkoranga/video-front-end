import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { publishVideo } from '../api/videos'
import { getErrorMessage } from '../utils/format'
import './VideoForm.css'

export default function Upload() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [thumbnail, setThumbnail] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }
    if (!videoFile || !thumbnail) {
      setError('A video file and a thumbnail image are both required.')
      return
    }

    const formData = new FormData()
    formData.append('title', title.trim())
    formData.append('description', description.trim())
    formData.append('videoFile', videoFile)
    formData.append('thumbnail', thumbnail)

    setSubmitting(true)
    try {
      const { data } = await publishVideo(formData)
      navigate(`/watch/${data.data._id}`)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not publish this video.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-narrow">
      <div className="page-header">
        <h1>Upload a video</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

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

        <div className="video-form-files">
          <div className="field field-file">
            <label htmlFor="videoFile">Video file</label>
            <input
              id="videoFile"
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            />
            {videoFile && (
              <div className="file-preview">
                <video src={URL.createObjectURL(videoFile)} muted />
              </div>
            )}
          </div>

          <div className="field field-file">
            <label htmlFor="thumbnail">Thumbnail</label>
            <input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files?.[0] || null)}
            />
            {thumbnail && (
              <div className="file-preview">
                <img src={URL.createObjectURL(thumbnail)} alt="Thumbnail preview" />
              </div>
            )}
          </div>
        </div>

        <p className="upload-progress-note">
          {submitting ? 'Uploading and encoding — this can take a moment for larger files…' : ''}
        </p>

        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
          {submitting ? 'Publishing…' : 'Publish video'}
        </button>
      </form>
    </div>
  )
}
