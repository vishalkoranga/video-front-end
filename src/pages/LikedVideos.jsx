import { useEffect, useState } from 'react'
import { getLikedVideos } from '../api/likes'
import VideoCard from '../components/VideoCard'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/format'

export default function LikedVideos() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getLikedVideos()
      .then(({ data }) => setEntries(data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Liked videos</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Loader />
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing liked yet" description="Videos you like will show up here." />
      ) : (
        <div className="video-grid">
          {entries.map((entry) => (
            <VideoCard key={entry._id} video={entry.likedVideo} />
          ))}
        </div>
      )}
    </div>
  )
}
