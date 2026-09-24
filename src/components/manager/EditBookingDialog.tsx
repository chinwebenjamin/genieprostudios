import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"] & {
  booking_items: { id: string; name: string; quantity: number; provided_by: string }[];
};

const toLocal = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STATUSES = ["awaiting_payment", "pending", "confirmed", "completed", "declined"];

export function EditBookingDialog({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState(() => ({
    client_name: booking.client_name ?? "",
    client_whatsapp: booking.client_whatsapp ?? "",
    package_label: booking.package_label,
    period: booking.period,
    duration_hours: booking.duration_hours,
    starts_at: toLocal(booking.starts_at),
    price: Number(booking.price),
    balance: Number(booking.balance),
    payment_type: booking.payment_type ?? "",
    status: booking.status,
    notes: booking.notes ?? "",
  }));
  const [items, setItems] = useState(booking.booking_items.map((i) => ({ ...i })));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const start = new Date(f.starts_at);
    if (isNaN(start.getTime()) || f.duration_hours <= 0) {
      toast.error("Enter a valid date, time and length.");
      return;
    }
    const end = new Date(start.getTime() + f.duration_hours * 3600_000);
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        client_name: f.client_name.trim() || null,
        client_whatsapp: f.client_whatsapp.trim() || null,
        package_label: f.package_label,
        period: f.period,
        duration_hours: f.duration_hours,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        price: f.price,
        balance: f.balance,
        payment_type: f.payment_type || null,
        status: f.status,
        notes: f.notes.trim() || null,
      })
      .eq("id", booking.id);
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    for (const it of items) {
      const orig = booking.booking_items.find((o) => o.id === it.id);
      if (it.quantity <= 0) {
        await supabase.from("booking_items").delete().eq("id", it.id);
      } else if (orig && (orig.quantity !== it.quantity || orig.provided_by !== it.provided_by)) {
        await supabase
          .from("booking_items")
          .update({ quantity: it.quantity, provided_by: it.provided_by })
          .eq("id", it.id);
      }
    }
    setSaving(false);
    toast.success("Session updated.");
    setOpen(false);
    void qc.invalidateQueries({ queryKey: ["manager-bookings"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">Edit session</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Client name">
            <Input value={f.client_name} onChange={(e) => set("client_name", e.target.value)} />
          </Field>
          <Field label="WhatsApp number">
            <Input value={f.client_whatsapp} onChange={(e) => set("client_whatsapp", e.target.value)} />
          </Field>
          <Field label="Package">
            <Input value={f.package_label} onChange={(e) => set("package_label", e.target.value)} />
          </Field>
          <Field label="Period">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={f.period}
              onChange={(e) => set("period", e.target.value)}
            >
              <option value="day">day</option>
              <option value="night">night</option>
            </select>
          </Field>
          <Field label="Start date & time">
            <Input type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          </Field>
          <Field label="Length (hours)">
            <Input type="number" min={1} value={f.duration_hours} onChange={(e) => set("duration_hours", Number(e.target.value))} />
          </Field>
          <Field label="Price (₦)">
            <Input type="number" min={0} value={f.price} onChange={(e) => set("price", Number(e.target.value))} />
          </Field>
          <Field label="Balance (₦)">
            <Input type="number" min={0} value={f.balance} onChange={(e) => set("balance", Number(e.target.value))} />
          </Field>
          <Field label="Payment type">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={f.payment_type}
              onChange={(e) => set("payment_type", e.target.value)}
            >
              <option value="">none</option>
              <option value="full">full</option>
              <option value="partial">partial</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={f.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </Field>
        </div>
        {items.length > 0 && (
          <div className="space-y-2">
            <Label>Equipment (set quantity to 0 to remove)</Label>
            {items.map((it, idx) => (
              <div key={it.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{it.name}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20"
                  value={it.quantity}
                  onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, quantity: Number(e.target.value) } : x)))}
                />
                <select
                  className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                  value={it.provided_by}
                  onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, provided_by: e.target.value } : x)))}
                >
                  <option value="studio">studio</option>
                  <option value="client">client</option>
                </select>
              </div>
            ))}
          </div>
        )}
        <Field label="Notes">
          <Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
