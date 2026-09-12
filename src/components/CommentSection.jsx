import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import CommentItem from './CommentItem'
import Loader from './Loader'
import Pagination from './Pagination'
import * as commentsApi from '../api/comments'
import { getErrorMessage } from '../utils/format'
import './CommentSection.css'

export default function CommentSection({ videoId }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalDocs: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)

  const loadPage = (page = 1) => {
    setLoading(true)
    commentsApi
      .getVideoComments(videoId, { page, limit: 10 })
      .then(({ data }) => {
        const result = data.data
        setComments(result.docs || [])
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
    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  const handlePost = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setPosting(true)
    setError('')
    try {
      await commentsApi.addComment(videoId, newComment.trim())
      setNewComment('')
      loadPage(1)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  const handleUpdated = (id, content) => {
    setComments((prev) => prev.map((c) => (c._id === id ? { ...c, content } : c)))
  }

  const handleDeleted = (id) => {
    setComments((prev) => prev.filter((c) => c._id !== id))
    setMeta((prev) => ({ ...prev, totalDocs: Math.max(0, prev.totalDocs - 1) }))
  }

  return (
    <section className="comment-section">
      <h3 className="comment-heading">{meta.totalDocs} Comments</h3>

      {user && (
        <form className="comment-form" onSubmit={handlePost}>
          <Avatar src={user.avatar} name={user.fullName} size={38} />
          <div className="comment-form-input">
            <textarea
              placeholder="Add a comment…"
              rows={1}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <div className="comment-form-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setNewComment('')}
                disabled={!newComment || posting}
              >
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={posting || !newComment.trim()}>
                {posting ? 'Posting…' : 'Comment'}
              </button>
            </div>
          </div>
        </form>
      )}

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Loader full={false} />
      ) : comments.length === 0 ? (
        <p className="text-muted">No comments yet. Be the first to say something.</p>
      ) : (
        <div className="comment-list">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <Pagination page={meta.page} totalPages={meta.totalPages} onChange={loadPage} />
    </section>
  )
}
