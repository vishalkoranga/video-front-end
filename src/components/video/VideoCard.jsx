import { Link } from "react-router-dom";
import Avatar from "../common/Avatar";
import Icon from "../common/Icon";
import { formatDate, formatDuration, formatViews } from "../../utils/formatters";

export default function VideoCard({ video, featured = false }) {
  const owner = video.owner || video.createdBy || {};
  return <Link className={`video-card ${featured ? "video-card-featured" : ""}`} to={`/watch/${video._id}`}>
    <div className="thumbnail-wrap">{video.thumbnail ? <img src={video.thumbnail} alt="" className="thumbnail" /> : <div className="thumbnail thumbnail-placeholder"><span><Icon name="play" size={22} /></span></div>}<span className="duration">{formatDuration(video.duration)}</span>{featured && <span className="featured-tag">Featured</span>}</div>
    <div className="video-meta"><Avatar user={owner} size="small" /><div className="video-copy"><h3>{video.title || "Untitled video"}</h3><p className="creator-name">{owner.fullName || owner.userName || "VideoTube creator"}</p><p className="video-stats">{formatViews(video.views)} views <span>·</span> {formatDate(video.createdAt)}</p></div><button className="card-more" onClick={(event) => event.preventDefault()} aria-label="More options"><Icon name="more" /></button></div>
  </Link>;
}
