import { Suspense, lazy, useEffect, useState } from "react";
import type { AuthState } from "./types";

const LoginView = lazy(() => import("./components/LoginView"));
const AdminShell = lazy(() => import("./components/AdminShell"));

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    const raw = localStorage.getItem("admin-auth");
    return raw ? (JSON.parse(raw) as AuthState) : null;
  });

  useEffect(() => {
    if (auth) {
      localStorage.setItem("admin-auth", JSON.stringify(auth));
      return;
    }
    localStorage.removeItem("admin-auth");
  }, [auth]);

  if (!auth) {
    return <Suspense fallback={<div className="admin-login-shell">登录页加载中...</div>}><LoginView onLogin={setAuth} /></Suspense>;
  }

  return (
    <Suspense fallback={<div className="admin-layout-shell">后台控制台加载中...</div>}>
      <AdminShell auth={auth} onLogout={() => setAuth(null)} />
    </Suspense>
  );
}
