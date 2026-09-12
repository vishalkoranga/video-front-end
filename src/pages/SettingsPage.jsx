import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../components/common/Avatar";
import Icon from "../components/common/Icon";
import PageHeader from "../components/common/PageHeader";
import { apiRequest, unwrap } from "../services/api";

export default function SettingsPage({ user, onUserUpdate }) {
  const [form, setForm] = useState({ fullName: user.fullName || "", email: user.email || "" });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) { event.preventDefault(); setError(""); setSaved(false); try { const updated = unwrap(await apiRequest("/users/update-account", { method: "PATCH", body: form })); onUserUpdate(updated); setSaved(true); } catch (requestError) { setError(requestError.message); } }
  return <main className="content-page settings-page"><PageHeader eyebrow="Your account" title="Settings" description="Keep your profile details up to date." /><div className="settings-layout"><section className="settings-card"><div className="settings-card-heading"><Avatar user={user} size="large" /><div><h2>Profile details</h2><p>@{user.userName}</p></div></div>{error && <div className="form-error">{error}</div>}{saved && <div className="form-success">Your profile has been updated.</div>}<form className="stack-form" onSubmit={submit}><label>Full name<input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><button className="button button-primary">Save changes <Icon name="arrow" size={15} /></button></form></section><section className="settings-card muted-card"><p className="eyebrow">Account snapshot</p><h2>Keep making good things.</h2><p>Your username is <strong>@{user.userName}</strong>. This is how people will find your channel on VideoTube.</p><Link className="text-action" to={`/channel/${user.userName}`}>View your channel <Icon name="arrow" size={15} /></Link></section></div></main>;
}
