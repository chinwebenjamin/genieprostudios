import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StudioLogo } from "@/components/StudioLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";

const navLink =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <StudioLogo size={36} />
            <span className="display-title text-xl leading-none sm:text-2xl">
              Genie Pro <span className="text-primary">Music Studio</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-5 sm:flex">
            <Link to="/packages" className={navLink}>
              Packages
            </Link>
            <Link to="/terms" className={navLink}>
              Guidelines
            </Link>
            {user && (
              <Link to="/bookings" className={navLink}>
                My bookings
              </Link>
            )}
            {role === "manager" && (
              <Link to="/manager" className={navLink}>
                Manager
              </Link>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:ml-3">
            <NotificationBell />
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  void navigate({ to: "/" });
                }}
              >
                Sign out
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-4 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
          <Link to="/packages" className={navLink}>
            Packages
          </Link>
          <Link to="/terms" className={navLink}>
            Guidelines
          </Link>
          {user && (
            <Link to="/bookings" className={navLink}>
              My bookings
            </Link>
          )}
          {role === "manager" && (
            <Link to="/manager" className={navLink}>
              Manager
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        Genie Pro Music Studio · Bookings, sessions and studio management
      </footer>
    </div>
  );
}
