import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GUIDELINES } from "@/lib/packages";
import { useStudioSettings } from "@/hooks/useStudio";
import type { Period } from "@/lib/packages";
import { usePackages } from "@/hooks/usePackages";
import { naira, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Session — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Choose your package, date, time and equipment, then reserve your Genie Pro Music Studio session in a few steps.",
      },
      { property: "og:title", content: "Book a Session — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "Reserve recording, rehearsal or livestream studio time with instant slot locking.",
      },
    ],
  }),
  component: BookPage,
});

const BUFFER_MIN = 30;

function BookPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: packages = [] } = usePackages();
  const { data: studio } = useStudioSettings();
  const [packageKey, setPackageKey] = useState("");
  const [period, setPeriod] = useState<Period>("day");
  const [hours, setHours] = useState(2);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [clientName, setClientName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const pkg = packages.find((p) => p.key === packageKey) ?? packages[0];
  const rates = pkg?.rates[period] ?? [];
  const rate = rates.find((r) => r.hours === hours) ?? rates[0] ?? { hours: 2, price: 0 };

  useEffect(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    const suggested = meta?.full_name ?? meta?.name ?? "";
    if (suggested) setClientName((n) => n || suggested);
  }, [user]);

  useEffect(() => {
    if (rates.length && !rates.some((r) => r.hours === hours)) setHours(rates[0]!.hours);
  }, [rates, hours]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const dayRange = useMemo(() => {
    if (!date) return null;
    return {
      from: new Date(`${date}T00:00:00`).toISOString(),
      to: new Date(`${date}T23:59:59`).toISOString(),
    };
  }, [date]);

  const { data: busySlots = [] } = useQuery({
    queryKey: ["busy", dayRange],
    enabled: !!dayRange,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("busy_slots", {
        _from: dayRange!.from,
        _to: dayRange!.to,
      });
      if (error) throw error;
      return data;
    },
  });

  const startsAt = date && time ? new Date(`${date}T${time}:00`) : null;
  const endsAt = startsAt ? new Date(startsAt.getTime() + rate.hours * 3600_000) : null;

  const conflict = useMemo(() => {
    if (!startsAt || !endsAt) return false;
    const s = startsAt.getTime() - BUFFER_MIN * 60_000;
    const e = endsAt.getTime() + BUFFER_MIN * 60_000;
    return busySlots.some((b) => {
      const bs = new Date(b.starts_at).getTime();
      const be = new Date(b.ends_at).getTime();
      return s < be && bs < e;
    });
  }, [startsAt, endsAt, busySlots]);

  const submit = async () => {
    if (!user) {
      void navigate({ to: "/auth" });
      return;
    }
    if (!startsAt || !endsAt) { toast.error("Pick a date and start time."); return; }
    if (!pkg) { toast.error("Choose a package."); return; }
    if (!clientName.trim()) { toast.error("Enter your name for the booking."); return; }
    if (startsAt.getTime() < Date.now()) { toast.error("Pick a future date and time."); return; }
    if (conflict) { toast.error("That slot overlaps another session (30-min buffer)."); return; }
    if (!agreed) { toast.error("Please accept the studio guidelines."); return; }

    setBusy(true);
    try {
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          client_id: user.id,
          client_name: clientName.trim(),
          package_key: pkg.key,
          package_label: pkg.label,
          period,
          duration_hours: rate.hours,
          price: rate.price,
          balance: rate.price,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          notes: notes || null,
          agreed_terms: true,
        })
        .select("id")
        .single();
      if (error) throw error;

      const items = Object.entries(selected)
        .filter(([, qty]) => qty > 0)
        .map(([id, qty]) => {
          const cat = categories.find((c) => c.id === id)!;
          return {
            booking_id: booking.id,
            category_id: id,
            name: cat.name,
            quantity: qty,
            provided_by: cat.provided_by,
          };
        });
      if (items.length) {
        const { error: itemErr } = await supabase.from("booking_items").insert(items);
        if (itemErr) throw itemErr;
      }

      void navigate({ to: "/pay/$bookingId", params: { bookingId: booking.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setBusy(false);
    }
  };

  if (!loading && !user) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="display-title text-3xl">Sign in to book</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need an account so we can send confirmations and reminders.
          </p>
          <Button className="mt-5" onClick={() => void navigate({ to: "/auth" })}>
            Sign in
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div>
            <h1 className="display-title text-4xl">Book a session</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Slots include a mandatory 30-minute setup buffer between sessions.
            </p>
          </div>

          <section className="panel p-5">
            <h2 className="text-xl">1 · Package</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {packages.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPackageKey(p.key)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    p.key === pkg?.key
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </button>
              ))}
              {packages.length === 0 && (
                <p className="text-sm text-muted-foreground">No packages available yet.</p>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl">2 · Session length</h2>
            <div className="mt-3 flex gap-2">
              {(["day", "night"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md border px-4 py-2 text-sm capitalize ${
                    p === period ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {rates.map((r) => (
                <button
                  key={r.hours}
                  type="button"
                  onClick={() => setHours(r.hours)}
                  className={`rounded-md border px-4 py-2 text-sm ${
                    r.hours === rate.hours ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {r.hours === 12 ? "Full day" : `${r.hours}hrs`} · {naira(r.price)}
                </button>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl">3 · Date & time</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="time">Start time</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
            {busySlots.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Already booked that day:</p>
                <ul className="mt-1 space-y-0.5">
                  {busySlots.map((b) => (
                    <li key={b.starts_at}>
                      {formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {conflict && (
              <p className="mt-3 text-sm text-destructive">
                This slot clashes with an existing session (including the 30-minute buffer).
              </p>
            )}
          </section>

          <section className="panel p-5">
            <h2 className="text-xl">4 · Equipment categories</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Availability reflects current studio inventory. Items marked “client” must be brought
              by you.
            </p>
            <div className="mt-3 space-y-2">
              {categories.map((c) => {
                const qty = selected[c.id] ?? 0;
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-40 flex-1">
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.description ?? ""} · provided by {c.provided_by} · {c.quantity} available
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={c.quantity}
                      value={qty}
                      className="w-20"
                      onChange={(e) =>
                        setSelected((s) => ({
                          ...s,
                          [c.id]: Math.max(0, Math.min(c.quantity, Number(e.target.value))),
                        }))
                      }
                    />
                  </div>
                );
              })}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No categories listed yet.</p>
              )}
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-xl">5 · Notes & terms</h2>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="clientName">Your name</Label>
              <Input
                id="clientName"
                placeholder="Name to put on this booking"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <Textarea
              className="mt-3"
              placeholder="Anything the studio should know (crew size, special setup, add-on enquiries)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <label className="mt-4 flex items-start gap-3 text-sm">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
              <span className="text-muted-foreground">
                I have read and accept the studio guidelines, including the 70% minimum payment and
                the 25% rescheduling charge.
              </span>
            </label>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer text-primary">Read the guidelines</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {(studio?.guidelines?.length ? studio.guidelines : GUIDELINES).map((g: string) => (
                  <li key={g}>{g}</li>
                ))}
              </ol>
            </details>
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="panel space-y-2 p-5">
            <h2 className="text-xl">Summary</h2>
            <Row label="Name" value={clientName || "—"} />
            <Row label="Package" value={pkg?.label ?? "—"} />
            <Row label="Period" value={period} />
            <Row
              label="Duration"
              value={rate.hours === 12 ? "Full day (12hrs)" : `${rate.hours}hrs`}
            />
            <Row label="Starts" value={startsAt ? formatDateTime(startsAt) : "—"} />
            <Row label="Ends" value={endsAt ? formatDateTime(endsAt) : "—"} />
            <div className="border-t border-border pt-3">
              <Row label="Total" value={naira(rate.price)} strong />
              <Row label="70% deposit" value={naira(Math.round(rate.price * 0.7))} />
            </div>
            <Button className="mt-3 w-full" disabled={busy || conflict} onClick={submit}>
              Continue to payment
            </Button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className={strong ? "font-semibold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
