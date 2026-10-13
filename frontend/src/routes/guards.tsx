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
export function RequireBusiness() {
  const b = useBusiness();
  if (b.isLoading) return <Loading />;
  if (b.isError) return <ErrorState message="Could not load your business." onRetry={() => b.refetch()} />;
  if (!b.data) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const me = useMe();
  if (me.isLoading) return <Loading />;
  return me.data ? <Navigate to="/dashboard" replace /> : children;
}
