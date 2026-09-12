import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/common/Avatar";
import { ErrorState, LoadingState } from "../components/common/Feedback";
import Icon from "../components/common/Icon";
import CommentItem from "../components/video/CommentItem";
import { apiRequest, getList, unwrap } from "../services/api";
import { formatDate, formatViews } from "../utils/formatters";

export default function VideoDetailPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [videoResult, commentResult] = await Promise.all([apiRequest(`/videos/${videoId}`), apiRequest(`/comments/${videoId}?page=1&limit=20`)]);
      setVideo(unwrap(videoResult)); setComments(getList(commentResult));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [videoId]);
  useEffect(() => { load(); }, [load]);

  async function toggleLike() {
    try { setLiked(unwrap(await apiRequest(`/likes/toggle/v/${videoId}`, { method: "POST" })).isLiked); } catch (requestError) { setError(requestError.message); }
  }
  async function addComment(event) {
    event.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try { const created = unwrap(await apiRequest(`/comments/${videoId}`, { method: "POST", body: { content: comment.trim() } })); setComments((current) => [created, ...current]); setComment(""); } catch (requestError) { setError(requestError.message); }
    finally { setCommentLoading(false); }
  }

  if (loading) return <main className="content-page"><LoadingState label="Opening video…" /></main>;
  if (error || !video) return <main className="content-page"><ErrorState message={error || "This video could not be found."} retry={load} /></main>;
  const owner = video.owner || {};
  return <main className="content-page watch-page"><button className="back-link" onClick={() => navigate(-1)}><Icon name="arrow" size={16} /> Back to browse</button><div className="watch-layout"><section><div className="player"><video src={video.videoFile} poster={video.thumbnail} controls /></div><div className="watch-heading"><div><p className="eyebrow">Now watching</p><h1>{video.title}</h1></div><button className={`like-button ${liked ? "liked" : ""}`} onClick={toggleLike}><Icon name="heart" size={18} /> {liked ? "Liked" : "Like"}</button></div><div className="watch-meta"><Link to={`/channel/${owner.userName}`} className="owner-link"><Avatar user={owner} /><span><strong>{owner.fullName || owner.userName || "Creator"}</strong><small>@{owner.userName || "creator"}</small></span></Link><span className="meta-divider" /><span>{formatViews(video.views)} views</span><span>Published {formatDate(video.createdAt)}</span></div><p className="watch-description">{video.description || "No description was added for this video."}</p><div className="comments-header"><h2>Comments <span>{comments.length}</span></h2></div><form className="comment-form" onSubmit={addComment}><span className="avatar avatar-small avatar-fallback">You</span><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add to the conversation…" /><button className="icon-button send-button" disabled={commentLoading || !comment.trim()} aria-label="Post comment"><Icon name="send" /></button></form><div className="comment-list">{comments.length ? comments.map((item) => <CommentItem comment={item} key={item._id} />) : <p className="muted-copy">Be the first to share a thought.</p>}</div></section><aside className="watch-aside"><div className="aside-card"><p className="eyebrow">About the creator</p><Link className="creator-profile" to={`/channel/${owner.userName}`}><Avatar user={owner} size="large" /><strong>{owner.fullName || owner.userName || "Creator"}</strong><span>@{owner.userName || "creator"}</span></Link><p>Explore more work from this creator and find your next rabbit hole.</p><Link className="button button-secondary button-wide" to={`/channel/${owner.userName}`}>View channel <Icon name="arrow" size={15} /></Link></div><div className="quote-card"><span>“</span><p>Good videos make you think. Great ones make you feel.</p></div></aside></div></main>;
}
