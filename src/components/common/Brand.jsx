import { Link } from "react-router-dom";
import Icon from "./Icon";

export default function Brand({ className = "" }) {
  return <Link className={`brand ${className}`.trim()} to="/"><span className="brand-mark"><Icon name="play" size={15} /></span>video<span>tube</span></Link>;
}
