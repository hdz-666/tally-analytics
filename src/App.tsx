import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button, ConfigProvider, Result, Spin } from "antd";
import enUS from "antd/locale/en_US";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { canAccess, homePath } from "@/lib/access";
import AppLayout from "@/views/components/layout/AppLayout";
import Dashboard from "@/views/pages/Dashboard";
import Inventory from "@/views/pages/Inventory";
import Sales from "@/views/pages/Sales";
import AreaSales from "@/views/pages/AreaSales";
import Forecast from "@/views/pages/Forecast";
import Profile from "@/views/pages/Profile";
import Ledger from "@/views/pages/Ledger";
import Users from "@/views/pages/Users";
import Login from "@/views/pages/Login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
});

const pages: { path: string; element: React.ReactNode }[] = [
  { path: "/", element: <Dashboard /> },
  { path: "/inventory", element: <Inventory /> },
  { path: "/sales", element: <Sales /> },
  { path: "/area-sales", element: <AreaSales /> },
  { path: "/forecast", element: <Forecast /> },
  { path: "/ledger", element: <Ledger /> },
  { path: "/users", element: <Users /> },
  { path: "/profile", element: <Profile /> },
];

function FullPageSpin() {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Spin size="large" />
    </div>
  );
}

function ProtectedRoutes() {
  const { session, role, accessError, loading, signOut } = useAuth();

  if (loading) return <FullPageSpin />;

  if (!session) return <Navigate to="/login" replace />;

  if (!role) {
    return (
      <Result
        status="403"
        title="No access"
        subTitle={accessError}
        extra={<Button onClick={signOut}>Sign Out</Button>}
      />
    );
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {pages
          .filter((p) => canAccess(role, p.path))
          .map((p) => (
            <Route key={p.path} path={p.path} element={p.element} />
          ))}
        {/* Pages this role can't open (and unknown URLs) land on their home page */}
        <Route path="*" element={<Navigate to={homePath(role)} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={enUS}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

function PublicRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Login />;
}
