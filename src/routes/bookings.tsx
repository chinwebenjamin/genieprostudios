import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { naira, formatDateTime, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My Bookings — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Track your Genie Pro Music Studio sessions: payment status, manager approval, equipment and session times.",
      },
      { property: "og:title", content: "My Bookings — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "See every session you've booked and its current approval status.",
      },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, booking_items(id, name, quantity, provided_by)")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="display-title text-3xl">Sign in to see your bookings</h1>
          <Button className="mt-5" onClick={() => void navigate({ to: "/auth" })}>
            Sign in
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="display-title text-4xl">My bookings</h1>
          <Button asChild>
            <Link to="/book">New booking</Link>
          </Button>
        </div>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && data.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">
            No bookings yet. Start with a package on the booking page.
          </p>
        )}

        <div className="mt-6 space-y-4">
          {data.map((b) => (
            <article key={b.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{b.package_label}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)}
                  </p>
                </div>
                <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
                  {STATUS_LABEL[b.status] ?? b.status}
                </Badge>
              </div>

              <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Total: </span>
                  {naira(b.price)}
                </p>
                <p>
                  <span className="text-muted-foreground">Balance: </span>
                  {naira(b.balance)}
                </p>
                <p className="capitalize">
                  <span className="text-muted-foreground">Period: </span>
                  {b.period} · {b.duration_hours}hrs
                </p>
                <p>
                  <span className="text-muted-foreground">Payment: </span>
                  {b.payment_type ?? "not submitted"}
                </p>
              </div>

              {b.booking_items.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Equipment:{" "}
                  {b.booking_items.map((i) => `${i.name} ×${i.quantity} (${i.provided_by})`).join(", ")}
                </p>
              )}
              {b.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {b.notes}</p>}

              {b.status === "awaiting_payment" && (
                <Button className="mt-4" size="sm" asChild>
                  <Link to="/pay/$bookingId" params={{ bookingId: b.id }}>
                    Complete payment
                  </Link>
                </Button>
              )}
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
