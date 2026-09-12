import { useEffect, useState } from "react";
import { apiRequest, authStorage, unwrap } from "../services/api";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const currentUser = unwrap(await apiRequest("/users/current-user"));
        if (active) setUser(currentUser);
      } catch {
        authStorage.clear();
      } finally {
        if (active) setCheckingAuth(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function login(payload) {
    authStorage.save(payload);
    setUser(payload.user || payload);
  }

  function logout() {
    authStorage.clear();
    setUser(null);
  }

  return { user, checkingAuth, login, logout, setUser };
}
