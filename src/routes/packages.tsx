import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { usePackages } from "@/hooks/usePackages";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/packages")({
  head: () => ({
    meta: [
      { title: "Studio Packages & Rates — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Day and night hourly rates for rehearsal, virtual live, freelance producer and multitrack recording sessions at Genie Pro Music Studio.",
      },
      { property: "og:title", content: "Studio Packages & Rates — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "Full rate card for rehearsal, virtual, freelance and multitrack studio sessions.",
      },
    ],
  }),
  component: PackagesPage,
});

function PackagesPage() {
  const { data: packages = [], isLoading } = usePackages();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="display-title text-4xl sm:text-5xl">Rate card</h1>
        <p className="mt-2 text-muted-foreground">
          All prices in Nigerian Naira. Each package has separate day and night hourly rates.
        </p>

        <div className="mt-8 space-y-6">
          {isLoading && <p className="text-sm text-muted-foreground">Loading rates…</p>}
          {packages.map((p) => (
            <article key={p.key} className="panel p-5">
              <h2 className="text-2xl">{p.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(["day", "night"] as const).map((period) => (
                  <div key={period} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                      {period}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {p.rates[period].map((r) => (
                        <li key={r.hours} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {r.hours === 12 ? "Full day (12hrs)" : `${r.hours}hrs`}
                          </span>
                          <span className="font-semibold">{naira(r.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {p.includes.map((i) => (
                  <li key={i}>✓ {i}</li>
                ))}
                {p.excludes.map((i) => (
                  <li key={i}>· {i}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/book">Book a session</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/terms">Guidelines & terms</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
