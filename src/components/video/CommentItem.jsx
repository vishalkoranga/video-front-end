import Avatar from "../common/Avatar";
import { formatDate } from "../../utils/formatters";

export default function CommentItem({ comment }) {
  const owner = comment.owner || {};
  return <article className="comment-item"><Avatar user={owner} size="small" /><div><div className="comment-byline"><strong>{owner.fullName || owner.userName || "Viewer"}</strong><span>{formatDate(comment.createdAt)}</span></div><p>{comment.content}</p></div></article>;
}
