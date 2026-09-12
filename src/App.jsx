import { Route, Routes } from "react-router-dom";
import AppRoutes from "./app/AppRoutes";
import AppShell from "./components/layout/AppShell";
import Icon from "./components/common/Icon";
import AuthScreen from "./features/auth/AuthScreen";
import useAuth from "./hooks/useAuth";

function InitialLoading() {
  return <div className="initial-loading"><span className="brand-mark"><Icon name="play" size={16} /></span><span className="loader" /></div>;
}

export default function App() {
  const { user, checkingAuth, login, logout, setUser } = useAuth();
  if (checkingAuth) return <InitialLoading />;
  if (!user) return <Routes><Route path="/register" element={<AuthScreen onAuth={login} />} /><Route path="*" element={<AuthScreen onAuth={login} />} /></Routes>;
  return <AppShell user={user} onLogout={logout}><AppRoutes user={user} onUserUpdate={setUser} /></AppShell>;
}
