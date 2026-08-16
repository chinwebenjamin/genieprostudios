import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, ShieldCheck, Sliders, BellRing } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePackages } from "@/hooks/usePackages";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Genie Pro Music Studio — Book Recording & Rehearsal Sessions" },
      {
        name: "description",
        content:
          "Book recording, rehearsal and live-stream sessions at Genie Pro Music Studio. Lock your slot, pay by transfer and get automatic session reminders.",
      },
      { property: "og:title", content: "Genie Pro Music Studio — Studio Session Booking" },
      {
        property: "og:description",
        content:
          "Reserve studio time, choose your equipment and track your booking from request to confirmation.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: packages = [], isLoading } = usePackages();
  return (
    <AppShell>
      <section className="mx-auto max-w-6xl px-4 pb-14 pt-12 sm:pt-20">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
          Recording · Rehearsal · Live
        </p>
        <h1 className="display-title mt-4 text-5xl sm:text-7xl">
          Your session,
          <br />
          <span className="text-primary">locked in.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Pick a package, choose your slot and equipment, pay by transfer and let the studio handle
          the rest. Every confirmed session comes with automatic reminders for you and the studio
          manager.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/book">Book a session</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/packages">View rate card</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: CalendarClock, title: "No double booking", body: "Slots lock instantly with a mandatory 30-minute setup buffer between sessions." },
          { icon: Sliders, title: "Live inventory", body: "The manager updates mic and equipment counts in real time, so what you see is what's in-house." },
          { icon: ShieldCheck, title: "Verified payments", body: "Transfer to the official account, upload your receipt and get manager approval." },
          { icon: BellRing, title: "Session reminders", body: "3 days, 2 days, 1 day, 45 and 30 minutes before — scaled down for short-notice bookings." },
        ].map((f) => (
          <div key={f.title} className="panel p-5">
            <f.icon className="size-6 text-primary" />
            <h3 className="mt-3 text-xl">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      {(isLoading || packages.length > 0) && (
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="display-title text-3xl sm:text-4xl">Packages</h2>
        {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading packages…</p>}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {packages.map((p) => (
            <div key={p.key} className="panel flex flex-col p-5">
              <h3 className="text-2xl">{p.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              {(() => {
                const prices = [
                  ...p.rates.day.map((r) => r.price),
                  ...p.rates.night.map((r) => r.price),
                ];
                if (prices.length === 0) return null;
                return (
                  <p className="mt-4 text-sm">
                    <span className="text-muted-foreground">From </span>
                    <span className="font-semibold text-primary">{naira(Math.min(...prices))}</span>
                  </p>
                );
              })()}
              <Button variant="outline" className="mt-4 self-start" asChild>
                <Link to="/packages">Details</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>
      )}
    </AppShell>
  );
}
