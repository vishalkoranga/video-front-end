import { initials } from '../utils/format'

export default function Avatar({ src, name, size = 40, style }) {
  const dims = { width: size, height: size, minWidth: size, ...style }

  if (src) {
    return (
      <img
        className="avatar"
        src={src}
        alt={name || 'avatar'}
        style={dims}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  return (
    <div className="avatar-fallback" style={{ ...dims, fontSize: size * 0.4 }}>
      {initials(name)}
    </div>
  )
}
