import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useBusiness, useMe } from "@/hooks/queries";
import { ErrorState, Loading } from "@/components/common/States";

export function RequireAuth() {
  const me = useMe();
  const loc = useLocation();
  if (me.isLoading) return <Loading label="Checking your session…" />;
  if (me.isError) return <ErrorState message="Could not check your session." onRetry={() => me.refetch()} />;
  if (!me.data) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

/** Owners without a business profile are guided to onboarding first. */
export function RequireAdmin() {
  const me = useMe();
  if (me.isLoading) return <Loading />;
  return me.data?.role === "ADMIN" ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

export function RequireBusiness() {
  const me = useMe();
  const b = useBusiness();
  if (me.data?.role === "ADMIN") return <Navigate to="/admin" replace />; // administrators have no business of their own
  if (b.isLoading) return <Loading />;
  if (b.isError) return <ErrorState message="Could not load your business." onRetry={() => b.refetch()} />;
  if (!b.data) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const me = useMe();
  if (me.isLoading) return <Loading />;
  return me.data ? <Navigate to={me.data.role === "ADMIN" ? "/admin" : "/dashboard"} replace /> : children;
}
