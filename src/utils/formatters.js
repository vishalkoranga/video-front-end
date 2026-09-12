export function formatViews(value = 0) {
  const views = Number(value) || 0;
  if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace(".0", "")}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1).replace(".0", "")}K`;
  return String(views);
}

export function formatDate(date) {
  if (!date) return "Recently";
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export function formatDuration(seconds) {
  if (!seconds) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export function getInitials(user) {
  return (user?.fullName || user?.userName || "VT")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
