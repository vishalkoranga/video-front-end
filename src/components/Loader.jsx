export default function Loader({ full = true }) {
  if (!full) return <span className="spinner" />
  return (
    <div className="page-loader">
      <span className="spinner" />
    </div>
  )
}
