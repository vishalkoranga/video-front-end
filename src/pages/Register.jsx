import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../api/auth'
import { getErrorMessage } from '../utils/format'
import './Auth.css'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    userName: '',
    password: '',
  })
  const [avatar, setAvatar] = useState(null)
  const [coverImage, setCoverImage] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (Object.values(form).some((v) => !v.trim())) {
      setError('All fields are required.')
      return
    }
    if (!avatar) {
      setError('An avatar image is required.')
      return
    }

    const formData = new FormData()
    formData.append('fullName', form.fullName.trim())
    formData.append('email', form.email.trim())
    formData.append('userName', form.userName.trim())
    formData.append('password', form.password)
    formData.append('avatar', avatar)
    if (coverImage) formData.append('coverImage', coverImage)

    setLoading(true)
    try {
      await registerUser(formData)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1400)
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create your account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">Videotube</p>
        <p className="auth-subtitle">Create a channel and start sharing.</p>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Account created — redirecting to sign in…</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" type="text" value={form.fullName} onChange={update('fullName')} />
          </div>

          <div className="auth-two-col">
            <div className="field">
              <label htmlFor="userName">Username</label>
              <input id="userName" type="text" value={form.userName} onChange={update('userName')} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={form.email} onChange={update('email')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
            />
          </div>

          <div className="auth-avatar-row">
            <div className="field field-file">
              <label htmlFor="avatar">Avatar (required)</label>
              <input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatar(e.target.files?.[0] || null)}
              />
            </div>
            <div className="field field-file">
              <label htmlFor="coverImage">Cover image</label>
              <input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
