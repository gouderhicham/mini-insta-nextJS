export function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 7) {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } else if (diffDays === 7) {
    return "1 week ago";
  } else if (diffDays >= 1) {
    if (diffDays === 1) return "1 day ago";
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
}
