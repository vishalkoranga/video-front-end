import { useEffect, useState } from 'react'
import { getWatchHistory } from '../api/auth'
import VideoCard from '../components/VideoCard'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/format'

export default function History() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getWatchHistory()
      .then(({ data }) => setVideos(data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Watch history</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Loader />
      ) : videos.length === 0 ? (
        <EmptyState title="No history yet" description="Videos you watch will show up here." />
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
