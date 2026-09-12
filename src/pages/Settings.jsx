import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import * as authApi from '../api/auth'
import { getErrorMessage } from '../utils/format'
import './Settings.css'

const TABS = [
  { id: 'account', label: 'Account details' },
  { id: 'images', label: 'Avatar & cover' },
  { id: 'password', label: 'Password' },
]

export default function Settings() {
  const [tab, setTab] = useState('account')

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-layout">
        <nav className="settings-nav">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="settings-section">
          {tab === 'account' && <AccountForm />}
          {tab === 'images' && <ImagesForm />}
          {tab === 'password' && <PasswordForm />}
        </div>
      </div>
    </div>
  )
}

function AccountForm() {
  const { user, updateUserLocal } = useAuth()
  const [fullName, setFullName] = useState(user.fullName)
  const [email, setEmail] = useState(user.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!fullName.trim() || !email.trim()) {
      setError('Both fields are required.')
      return
    }
    setSaving(true)
    try {
      const { data } = await authApi.updateAccountDetails({
        fullName: fullName.trim(),
        email: email.trim(),
      })
      updateUserLocal(data.data)
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Account details updated.</div>}

      <div className="field">
        <label htmlFor="fullName">Full name</label>
        <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  )
}

function ImagesForm() {
  const { user, updateUserLocal } = useAuth()
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [savingCover, setSavingCover] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAvatarSave = async () => {
    if (!avatarFile) return
    setError('')
    setSuccess('')
    setSavingAvatar(true)
    const formData = new FormData()
    formData.append('avatar', avatarFile)
    try {
      const { data } = await authApi.updateUserAvatar(formData)
      updateUserLocal({ avatar: data.data.user?.avatar || data.data.avatar })
      setAvatarFile(null)
      setSuccess('Avatar updated.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleCoverSave = async () => {
    if (!coverFile) return
    setError('')
    setSuccess('')
    setSavingCover(true)
    const formData = new FormData()
    formData.append('coverImage', coverFile)
    try {
      const { data } = await authApi.updateUserCoverImage(formData)
      updateUserLocal({ coverImage: data.data.coverImage })
      setCoverFile(null)
      setSuccess('Cover image updated.')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSavingCover(false)
    }
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <p className="eyebrow-label" style={{ marginBottom: 10 }}>
        Avatar
      </p>
      <div className="settings-image-row">
        <Avatar src={avatarFile ? URL.createObjectURL(avatarFile) : user.avatar} name={user.fullName} size={72} />
        <div>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          <div style={{ marginTop: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleAvatarSave}
              disabled={!avatarFile || savingAvatar}
            >
              {savingAvatar ? 'Uploading…' : 'Update avatar'}
            </button>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <p className="eyebrow-label" style={{ marginBottom: 10 }}>
        Cover image
      </p>
      {(coverFile || user.coverImage) && (
        <div className="settings-cover-preview">
          <img src={coverFile ? URL.createObjectURL(coverFile) : user.coverImage} alt="Cover preview" />
        </div>
      )}
      <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
      <div style={{ marginTop: 10 }}>
        <button className="btn btn-secondary btn-sm" onClick={handleCoverSave} disabled={!coverFile || savingCover}>
          {savingCover ? 'Uploading…' : 'Update cover image'}
        </button>
      </div>
    </div>
  )
}

function PasswordForm() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!oldPassword || !newPassword) {
      setError('Both fields are required.')
      return
    }
    setSaving(true)
    try {
      await authApi.changeCurrentPassword({ oldPassword, newPassword })
      setOldPassword('')
      setNewPassword('')
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">Password changed.</div>}

      <div className="field">
        <label htmlFor="oldPassword">Current password</label>
        <input
          id="oldPassword"
          type="password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="newPassword">New password</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={saving}>
        {saving ? 'Updating…' : 'Change password'}
      </button>
    </form>
  )
}
