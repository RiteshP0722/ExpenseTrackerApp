import type { ReactNode } from "react";
import { strings } from "../constants/strings";
import { useAuth } from "../hooks/useAuth";
import { EmptyState, LoadingState } from "./ScreenState";

/** UI guard for admin screens. The database (RLS) enforces the same rule. */
export default function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!isAdmin) return <EmptyState text={strings.adminsOnly} />;
  return <>{children}</>;
}
