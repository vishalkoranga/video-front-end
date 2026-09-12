import { getInitials } from "../../utils/formatters";

export default function Avatar({ user, size = "normal" }) {
  return user?.avatar ? (
    <img className={`avatar avatar-${size}`} src={user.avatar} alt={user.fullName || user.userName || "User"} />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`}>{getInitials(user)}</span>
  );
}
