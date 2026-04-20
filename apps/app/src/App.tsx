import { Suspense, lazy, useEffect, useState } from "react";
import type { AuthState } from "./types";

const LoginScreen = lazy(() => import("./components/LoginScreen"));
const PracticeShell = lazy(() => import("./components/PracticeShell"));

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem("app-auth");
    return raw ? (JSON.parse(raw) as AuthState) : null;
  });

  useEffect(() => {
    if (auth) {
      localStorage.setItem("app-auth", JSON.stringify(auth));
      return;
    }
    localStorage.removeItem("app-auth");
  }, [auth]);

  if (!auth) {
    return <Suspense fallback={<div className="practice-login-shell">登录页加载中...</div>}><LoginScreen onLogin={setAuth} /></Suspense>;
  }

  return <Suspense fallback={<div className="practice-layout-shell">练习中心加载中...</div>}><PracticeShell auth={auth} onLogout={() => setAuth(null)} /></Suspense>;
}
