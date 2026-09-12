import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/common/Feedback";
import VideoCard from "../components/video/VideoCard";
import { apiRequest, getList } from "../services/api";

export default function LibraryPage({ liked = false }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const records = getList(await apiRequest(liked ? "/likes/videos" : "/users/history"));
      setVideos(liked ? records.map((record) => record.likedVideo).filter(Boolean) : records);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [liked]);
  useEffect(() => { load(); }, [load]);
  return <main className="content-page"><PageHeader eyebrow="Your library" title={liked ? "Videos you loved." : "Pick up where you left off."} description={liked ? "A collection of the videos that stayed with you." : "Your recent watch history, ready when you are."} />{loading ? <LoadingState label="Loading your library…" /> : error ? <ErrorState message={error} retry={load} /> : videos.length ? <div className="video-grid">{videos.map((video) => <VideoCard video={video} key={video._id} />)}</div> : <EmptyState title={liked ? "No liked videos yet" : "Your history is empty"} text={liked ? "When a video clicks, tap the like button and it will live here." : "Start watching and your recent videos will show up here."} action={<Link className="button button-secondary" to="/">Explore videos</Link>} />}</main>;
}
