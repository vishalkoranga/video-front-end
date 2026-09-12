import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Brand from "../../components/common/Brand";
import Icon from "../../components/common/Icon";
import { apiRequest, unwrap } from "../../services/api";

export default function AuthScreen({ onAuth }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegister = location.pathname === "/register";
  const [form, setForm] = useState({ fullName: "", userName: "", email: "", password: "", avatar: null, coverImage: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");

  function updateField(event) {
    const { name, value, files } = event.target;
    setForm((current) => ({ ...current, [name]: files ? files[0] : value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (isRegister) {
        const body = new FormData();
        ["fullName", "userName", "email", "password"].forEach((key) => body.append(key, form[key]));
        body.append("avatar", form.avatar);
        if (form.coverImage) body.append("coverImage", form.coverImage);
        await apiRequest("/users/register", { method: "POST", body });
        navigate("/login", { state: { notice: "Your account is ready. Sign in to continue." } });
      } else {
        const identifierKey = form.email.includes("@") ? "email" : "userName";
        const result = await apiRequest("/users/login", { method: "POST", body: { [identifierKey]: form.email, password: form.password } });
        onAuth(unwrap(result));
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <div className="auth-layout">
    <section className="auth-art">
      <Brand className="brand-auth" />
      <div className="art-copy"><p className="eyebrow">A better way to watch</p><h1>Your corner of the internet, <em>curated.</em></h1><p>Discover thoughtful videos, follow creators you love, and keep every idea within reach.</p></div>
      <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-noise" />
      <div className="art-footer"><span>01</span><span className="art-line" /><span>the good stuff, in one place</span></div>
    </section>
    <section className="auth-panel"><div className="auth-form-wrap">
      <div className="mobile-brand"><Brand /></div><p className="eyebrow">{isRegister ? "Start your journey" : "Welcome back"}</p><h2>{isRegister ? "Create your account" : "Good to see you again."}</h2><p className="auth-subtitle">{isRegister ? "Set up your profile and start finding your next favorite." : "Pick up where you left off."}</p>
      {error && <div className="form-error">{error}</div>}{notice && <div className="form-success">{notice}</div>}
      <form onSubmit={submit} className="stack-form">
        {isRegister && <><label>Full name<input name="fullName" value={form.fullName} onChange={updateField} placeholder="Alex Morgan" required /></label><label>Username<input name="userName" value={form.userName} onChange={updateField} placeholder="alexmorgan" required /></label></>}
        <label>{isRegister ? "Email" : "Email or username"}<input name="email" type={isRegister ? "email" : "text"} value={form.email} onChange={updateField} placeholder={isRegister ? "you@example.com" : "you@example.com"} required /></label>
        <label>Password<input name="password" type="password" value={form.password} onChange={updateField} placeholder="••••••••" minLength="6" required /></label>
        {isRegister && <div className="file-row"><label>Avatar<input name="avatar" type="file" accept="image/*" onChange={updateField} required /></label><label>Cover <span>(optional)</span><input name="coverImage" type="file" accept="image/*" onChange={updateField} /></label></div>}
        <button className="button button-primary button-wide" disabled={loading}>{loading ? "One moment…" : isRegister ? "Create account" : "Sign in"}<Icon name="arrow" size={17} /></button>
      </form>
      <p className="auth-switch">{isRegister ? "Already have an account?" : "New to VideoTube?"} <button onClick={() => navigate(isRegister ? "/login" : "/register")}>{isRegister ? "Sign in" : "Create an account"}</button></p>
    </div></section>
  </div>;
}
