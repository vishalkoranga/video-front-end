import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import { timeAgo, getErrorMessage } from '../utils/format'
import * as commentsApi from '../api/comments'
import * as likesApi from '../api/likes'

export default function CommentItem({ comment, onUpdated, onDeleted }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const [liked, setLiked] = useState(false)
  const [error, setError] = useState('')

  const isOwner = user && comment.owner?._id === user._id
  const owner = comment.owner || {}

  const handleSave = async () => {
    if (!content.trim()) return
    setSaving(true)
    setError('')
    try {
      await commentsApi.updateComment(comment._id, content.trim())
      onUpdated(comment._id, content.trim())
      setEditing(false)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await commentsApi.deleteComment(comment._id)
      onDeleted(comment._id)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleLike = async () => {
    setLiked((v) => !v)
    try {
      await likesApi.toggleCommentLike(comment._id)
    } catch {
      setLiked((v) => !v)
    }
  }

  return (
    <div className="comment-item">
      <Link to={owner.userName ? `/channel/${owner.userName}` : '#'}>
        <Avatar src={owner.avatar} name={owner.fullName} size={38} />
      </Link>
      <div className="comment-body">
        <div className="comment-meta">
          <Link to={owner.userName ? `/channel/${owner.userName}` : '#'} className="comment-author">
            {owner.fullName || 'Unknown user'}
          </Link>
          <span className="comment-time">{timeAgo(comment.createdAt)}</span>
        </div>

        {editing ? (
          <div className="comment-edit">
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={2} />
            <div className="comment-edit-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="comment-text">{comment.content}</p>
        )}

        {error && <p className="comment-error">{error}</p>}

        {!editing && (
          <div className="comment-actions">
            <button className={`comment-like ${liked ? 'is-liked' : ''}`} onClick={handleLike}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'}>
                <path
                  d="M12 21s-6.7-4.35-9.3-8.2C1 10.1 1.8 6.6 4.7 5.2c2.3-1.1 4.7-.2 6.1 1.6.5.6.9 1.3 1.2 2 .3-.7.7-1.4 1.2-2 1.4-1.8 3.8-2.7 6.1-1.6 2.9 1.4 3.7 4.9 2 7.6C18.7 16.65 12 21 12 21z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Like
            </button>
            {isOwner && (
              <>
                <button className="comment-action-text" onClick={() => setEditing(true)}>
                  Edit
                </button>
                <button className="comment-action-text comment-action-danger" onClick={handleDelete}>
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
