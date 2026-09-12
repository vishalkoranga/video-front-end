import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import * as subscriptionsApi from '../api/subscriptions'
import Avatar from '../components/Avatar'
import Loader from '../components/Loader'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/format'
import './Subscriptions.css'

export default function Subscriptions() {
  const { user } = useAuth()
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    subscriptionsApi
      .getSubscribedChannels(user._id)
      .then(({ data }) => setSubs(data.data || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [user._id])

  const handleUnsubscribe = async (entry) => {
    setBusyId(entry._id)
    try {
      await subscriptionsApi.toggleSubscription(entry.channel._id)
      setSubs((prev) => prev.filter((s) => s._id !== entry._id))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Subscriptions</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      {loading ? (
        <Loader />
      ) : subs.length === 0 ? (
        <EmptyState title="No subscriptions yet" description="Channels you subscribe to will show up here." />
      ) : (
        <div className="subs-list">
          {subs.map((entry) => (
            <div className="subs-row" key={entry._id}>
              <Link to={`/channel/${entry.channel.userName}`}>
                <Avatar src={entry.channel.avatar} name={entry.channel.fullName} size={48} />
              </Link>
              <div className="subs-row-info">
                <Link to={`/channel/${entry.channel.userName}`} className="subs-row-name">
                  {entry.channel.fullName}
                </Link>
                <p className="subs-row-handle">@{entry.channel.userName}</p>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => handleUnsubscribe(entry)}
                disabled={busyId === entry._id}
              >
                Unsubscribe
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
