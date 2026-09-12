import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Avatar from "../components/common/Avatar";
import { ErrorState, LoadingState } from "../components/common/Feedback";
import { apiRequest, unwrap } from "../services/api";
import { formatViews } from "../utils/formatters";

export default function ChannelPage() {
  const { username } = useParams();
  const [channel, setChannel] = useState(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { (async () => { try { const data = unwrap(await apiRequest(`/users/channel/${username}`)); setChannel(data); setSubscribed(Boolean(data.isSubscribed)); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } })(); }, [username]);
  async function toggleSubscription() { try { const data = unwrap(await apiRequest(`/subscriptions/c/${channel._id}`, { method: "POST" })); setSubscribed(Boolean(data.isSubscribed)); } catch (requestError) { setError(requestError.message); } }
  if (loading) return <main className="content-page"><LoadingState label="Finding channel…" /></main>;
  if (error || !channel) return <main className="content-page"><ErrorState message={error || "Channel not found."} /> </main>;
  return <main className="content-page channel-page"><div className="channel-cover" style={channel.coverImage ? { backgroundImage: `url(${channel.coverImage})` } : undefined}><span>Creator channel</span></div><div className="channel-head"><Avatar user={channel} size="xlarge" /><div className="channel-identity"><p className="eyebrow">Creator channel</p><h1>{channel.fullName}</h1><p>@{channel.userName} <span>·</span> {formatViews(channel.subscribersCount)} subscribers</p></div><button className={`button ${subscribed ? "button-secondary" : "button-primary"}`} onClick={toggleSubscription}>{subscribed ? "Subscribed" : "Subscribe"}</button></div><div className="channel-divider" /><div className="channel-about"><p className="eyebrow">About</p><p>{channel.email || "A VideoTube creator sharing ideas, stories, and useful things."}</p></div></main>;
}
