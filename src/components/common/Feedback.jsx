import { useEffect } from "react";
import Icon from "./Icon";

export function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  return <div className="toast"><span className="toast-dot" />{message}<button onClick={onClose} aria-label="Close notification"><Icon name="close" size={15} /></button></div>;
}

export function LoadingState({ label = "Loading your feed…" }) {
  return <div className="loading-state"><span className="loader" /><p>{label}</p></div>;
}

export function ErrorState({ message, retry }) {
  return <div className="empty-state error-state"><span className="empty-icon">!</span><h3>We hit a little snag.</h3><p>{message}</p>{retry && <button className="button button-secondary" onClick={retry}>Try again</button>}</div>;
}

export function EmptyState({ title, text, action }) {
  return <div className="empty-state"><span className="empty-icon">✦</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
