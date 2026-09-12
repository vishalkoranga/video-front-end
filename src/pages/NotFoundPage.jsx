import { Link } from "react-router-dom";
import { EmptyState } from "../components/common/Feedback";

export default function NotFoundPage() {
  return <main className="content-page"><EmptyState title="This page wandered off" text="Let's get you back to something worth watching." action={<Link className="button button-primary" to="/">Back home</Link>} /></main>;
}
