import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePackages } from "@/hooks/usePackages";
import { naira } from "@/lib/format";
import type { Period } from "@/lib/packages";

export function NewBookingForm() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: packages = [] } = usePackages(false);
  const [packageKey, setPackageKey] = useState("");
  const [period, setPeriod] = useState<Period>("day");
  const [hours, setHours] = useState(2);
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [paid, setPaid] = useState("");
  const [busy, setBusy] = useState(false);

  const pkg = packages.find((p) => p.key === packageKey) ?? packages[0];
  const rates = pkg?.rates[period] ?? [];
  const rate = rates.find((r) => r.hours === hours) ?? rates[0] ?? { hours: 2, price: 0 };
  const price = priceOverride === "" ? rate.price : Number(priceOverride);
  const balance = useMemo(() => Math.max(0, price - (paid === "" ? 0 : Number(paid))), [price, paid]);

  const create = async () => {
    if (!user) return;
    if (!pkg) { toast.error("No packages available."); return; }
    if (!clientName.trim()) { toast.error("Enter the client's name."); return; }
    if (!date || !time) { toast.error("Pick a date and start time."); return; }
    const startsAt = new Date(`${date}T${time}:00`);
    const endsAt = new Date(startsAt.getTime() + rate.hours * 3600_000);

    setBusy(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        client_id: user.id,
        client_name: clientName.trim(),
        created_by_manager: true,
        package_key: pkg.key,
        package_label: pkg.label,
        period,
        duration_hours: rate.hours,
        price,
        balance,
        payment_type: balance > 0 ? "partial" : "full",
        status: "confirmed",
        agreed_terms: true,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        notes: notes || null,
      });
      if (error) throw error;
      toast.success("Booking created and confirmed.");
      setClientName("");
      setNotes("");
      setPriceOverride("");
      setPaid("");
      void qc.invalidateQueries({ queryKey: ["manager-bookings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="text-xl">Book on behalf of a client</h2>
        <p className="text-xs text-muted-foreground">
          Created bookings are confirmed straight away and visible to every manager.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="mb-name">Client name</Label>
          <Input id="mb-name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-pkg">Package</Label>
          <select
            id="mb-pkg"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={pkg?.key ?? ""}
            onChange={(e) => setPackageKey(e.target.value)}
          >
            {packages.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-period">Period</Label>
          <select
            id="mb-period"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="day">day</option>
            <option value="night">night</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-hours">Duration</Label>
          <select
            id="mb-hours"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={rate.hours}
            onChange={(e) => setHours(Number(e.target.value))}
          >
            {rates.map((r) => (
              <option key={r.hours} value={r.hours}>
                {r.hours === 12 ? "Full day (12hrs)" : `${r.hours}hrs`} · {naira(r.price)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-date">Date</Label>
          <Input id="mb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-time">Start time</Label>
          <Input id="mb-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-price">Total price (₦)</Label>
          <Input
            id="mb-price"
            type="number"
            min={0}
            placeholder={String(rate.price)}
            value={priceOverride}
            onChange={(e) => setPriceOverride(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mb-paid">Amount paid (₦)</Label>
          <Input
            id="mb-paid"
            type="number"
            min={0}
            placeholder="0"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
          />
        </div>
      </div>

      <Textarea
        placeholder="Notes for this session…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <p className="text-sm text-muted-foreground">
        Total {naira(price)} · outstanding balance {naira(balance)}
      </p>

      <Button disabled={busy} onClick={() => void create()}>
        Create confirmed booking
      </Button>
    </div>
  );
}