import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/common/Feedback";
import Icon from "../components/common/Icon";
import VideoCard from "../components/video/VideoCard";
import { apiRequest, getList } from "../services/api";

export default function FeedPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("query") || "";
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadVideos = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const queryString = new URLSearchParams({ page: "1", limit: "20", ...(query ? { query } : {}) });
      setVideos(getList(await apiRequest(`/videos?${queryString}`)));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => { loadVideos(); }, [loadVideos]);
  const featured = videos[0];
  const rest = videos.slice(featured ? 1 : 0);

  return <main className="content-page feed-page"><PageHeader eyebrow={query ? "Search results" : "Sunday, September 12"} title={query ? `Results for “${query}”` : <>Find something <em>worth</em> watching.</>} description={query ? `${videos.length} videos found in your library.` : "A little inspiration for your next few minutes."} action={<Link className="text-action" to="/upload">Share your story <Icon name="arrow" size={15} /></Link>} />
    {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={loadVideos} /> : videos.length === 0 ? <EmptyState title="Nothing here yet" text={query ? "Try a different search or explore another idea." : "Once creators start sharing, their videos will show up here."} action={<Link className="button button-secondary" to="/upload">Upload the first video</Link>} /> : <>
      {featured && <section className="featured-section"><VideoCard video={featured} featured /><div className="feature-note"><span className="feature-line" /><p>Handpicked for your<br /><strong>curious mind.</strong></p></div></section>}
      <div className="section-label"><h2>{query ? "More to explore" : "Fresh from the community"}</h2><span>{rest.length || (featured ? "That’s all for now" : "")}</span></div>
      <div className="video-grid">{rest.map((video) => <VideoCard video={video} key={video._id} />)}</div>
    </>}
  </main>;
}
