import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import VideoCard from '../components/VideoCard'
import * as authApi from '../api/auth'
import * as videosApi from '../api/videos'
import * as playlistsApi from '../api/playlists'
import * as subscriptionsApi from '../api/subscriptions'
import { formatCount, getErrorMessage } from '../utils/format'
import './Channel.css'

export default function Channel() {
  const { username } = useParams()
  const { user } = useAuth()

  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('videos')
  const [subBusy, setSubBusy] = useState(false)

  const [videos, setVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [playlistsLoading, setPlaylistsLoading] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setTab('videos')
    authApi
      .getUserChannelProfile(username)
      .then(({ data }) => active && setChannel(data.data))
      .catch((err) => active && setError(getErrorMessage(err, 'Channel not found.')))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [username])

  useEffect(() => {
    if (!channel) return
    if (tab === 'videos') {
      setVideosLoading(true)
      videosApi
        .getAllVideos({ userId: channel._id, limit: 24 })
        .then(({ data }) => setVideos(data.data.docs || []))
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setVideosLoading(false))
    } else if (tab === 'playlists') {
      setPlaylistsLoading(true)
      playlistsApi
        .getUserPlaylists(channel._id)
        .then(({ data }) => setPlaylists(data.data || []))
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setPlaylistsLoading(false))
    }
  }, [channel, tab])

  const handleSubscribe = async () => {
    setSubBusy(true)
    try {
      const { data } = await subscriptionsApi.toggleSubscription(channel._id)
      const nowSubscribed = data.data.isSubscribed
      setChannel((prev) => ({
        ...prev,
        isSubscribed: nowSubscribed,
        subscribersCount: prev.subscribersCount + (nowSubscribed ? 1 : -1),
      }))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubBusy(false)
    }
  }

  if (loading) return <Loader />

  if (error && !channel) {
    return (
      <div className="page">
        <div className="form-error">{error}</div>
      </div>
    )
  }

  if (!channel) return null

  const isOwnChannel = user && user._id === channel._id

  return (
    <div className="page">
      {channel.coverImage && (
        <div className="channel-cover">
          <img src={channel.coverImage} alt="" />
        </div>
      )}

      <div className="channel-header">
        <Avatar src={channel.avatar} name={channel.fullName} size={104} />
        <div className="channel-identity">
          <h1 className="channel-name">{channel.fullName}</h1>
          <p className="channel-handle">@{channel.userName}</p>
          <p className="channel-stats">
            {formatCount(channel.subscribersCount)} subscribers · {formatCount(channel.channelsSubscribedTo)} subscribed
          </p>
        </div>
        {isOwnChannel ? (
          <Link to="/settings" className="btn btn-secondary">
            Edit channel
          </Link>
        ) : (
          <button
            className={`btn ${channel.isSubscribed ? 'btn-active' : 'btn-primary'}`}
            onClick={handleSubscribe}
            disabled={subBusy}
          >
            {channel.isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        )}
      </div>

      <div className="channel-tabs">
        <button className={`channel-tab ${tab === 'videos' ? 'active' : ''}`} onClick={() => setTab('videos')}>
          Videos
        </button>
        <button className={`channel-tab ${tab === 'playlists' ? 'active' : ''}`} onClick={() => setTab('playlists')}>
          Playlists
        </button>
      </div>

      {tab === 'videos' &&
        (videosLoading ? (
          <Loader />
        ) : videos.length === 0 ? (
          <EmptyState title="No videos yet" description="This channel hasn't published anything yet." />
        ) : (
          <div className="video-grid">
            {videos.map((v) => (
              <VideoCard key={v._id} video={{ ...v, owner: channel }} showOwner={false} />
            ))}
          </div>
        ))}

      {tab === 'playlists' &&
        (playlistsLoading ? (
          <Loader />
        ) : playlists.length === 0 ? (
          <EmptyState title="No playlists yet" />
        ) : (
          <div className="playlist-grid">
            {playlists.map((p) => (
              <Link key={p._id} to={`/playlist/${p._id}`} className="playlist-card">
                <strong>{p.name}</strong>
                <p className="playlist-card-count">{p.videos?.length || 0} videos</p>
              </Link>
            ))}
          </div>
        ))}
    </div>
  )
}
