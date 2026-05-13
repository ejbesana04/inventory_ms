import type { ReactNode } from "react";
import { LoadingSpinner } from "../ui";

type PageShellProps = {
  /** First load — hide volatile metrics until real data exists */
  isInitialLoading: boolean;
  /** Background refresh — subtle, keeps previous UI */
  isFetching?: boolean;
  skeleton?: ReactNode;
  children: ReactNode;
};

/**
 * Standard page loading wrapper: avoids flashing empty/static UI before API data arrives.
 * Use `isInitialLoading` from React Query `isPending` (first fetch with no cached data).
 */
export function PageShell({
  isInitialLoading,
  isFetching = false,
  skeleton,
  children,
}: PageShellProps) {
  if (isInitialLoading) {
    return (
      skeleton ?? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-semibold uppercase tracking-wide text-text-muted">Loading data</p>
        </div>
      )
    );
  }

  return (
    <div
      className={
        isFetching ? "transition-opacity duration-200 opacity-90 pointer-events-none" : undefined
      }
    >
      {children}
    </div>
  );
}
