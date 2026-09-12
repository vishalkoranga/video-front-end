import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { formatDuration, formatCount, timeAgo } from '../utils/format'
import './VideoCard.css'

export default function VideoCard({ video, showOwner = true, ownerActions = null }) {
  const owner = video.owner

  return (
    <div className="video-card">
      <Link to={`/watch/${video._id}`} className="video-card-thumb">
        <img src={video.thumbnail} alt={video.title} loading="lazy" />
        <span className="video-card-duration">{formatDuration(video.duration)}</span>
        {video.isPublished === false && (
          <span className="video-card-draft">Unpublished</span>
        )}
      </Link>

      <div className="video-card-body">
        {showOwner && (
          <Link to={owner?.userName ? `/channel/${owner.userName}` : '#'}>
            <Avatar src={owner?.avatar} name={owner?.fullName} size={36} />
          </Link>
        )}
        <div className="video-card-info">
          <Link to={`/watch/${video._id}`} className="video-card-title">
            {video.title}
          </Link>
          {showOwner && owner?.fullName && (
            <Link to={`/channel/${owner.userName}`} className="video-card-owner">
              {owner.fullName}
            </Link>
          )}
          <p className="video-card-meta">
            {formatCount(video.views)} views · {timeAgo(video.createdAt)}
          </p>
        </div>
      </div>

      {ownerActions}
    </div>
  )
}
