import { useEffect, useState } from 'react'
import { getAllVideos } from '../api/videos'
import VideoCard from '../components/VideoCard'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import { getErrorMessage } from '../utils/format'
import '../components/VideoCard.css'

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest' },
  { value: 'createdAt-asc', label: 'Oldest' },
  { value: 'views-desc', label: 'Most viewed' },
]

export default function Home() {
  const [videos, setVideos] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 })
  const [sort, setSort] = useState('createdAt-desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = (page = 1) => {
    setLoading(true)
    setError('')
    const [sortBy, sortType] = sort.split('-')
    getAllVideos({ page, limit: 12, sortBy, sortType })
      .then(({ data }) => {
        const result = data.data
        setVideos(result.docs || [])
        setMeta({ page: result.page || 1, totalPages: result.totalPages || 1 })
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  return (
    <div className="page">
      <div className="page-header">
        <h1>Latest uploads</h1>
        <div className="field" style={{ margin: 0, minWidth: 180 }}>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Loader />
      ) : videos.length === 0 ? (
        <EmptyState
          title="No videos yet"
          description="Be the first to publish something on Videotube."
        />
      ) : (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
          <Pagination page={meta.page} totalPages={meta.totalPages} onChange={load} />
        </>
      )}
    </div>
  )
}
