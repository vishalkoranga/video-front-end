import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getAllVideos } from '../api/videos'
import VideoCard from '../components/VideoCard'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import { getErrorMessage } from '../utils/format'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [videos, setVideos] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalDocs: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = (page = 1) => {
    setLoading(true)
    setError('')
    getAllVideos({ page, limit: 12, query })
      .then(({ data }) => {
        const result = data.data
        setVideos(result.docs || [])
        setMeta({
          page: result.page || 1,
          totalPages: result.totalPages || 1,
          totalDocs: result.totalDocs || 0,
        })
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="page">
      <div className="page-header">
        <h1>{query ? `Results for “${query}”` : 'All videos'}</h1>
        {!loading && <span className="text-muted">{meta.totalDocs} found</span>}
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Loader />
      ) : videos.length === 0 ? (
        <EmptyState
          title="No matches"
          description="Try a different title or check for typos."
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
