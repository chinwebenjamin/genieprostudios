import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudioSettings } from "@/hooks/useStudio";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { naira, formatDateTime, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/pay/$bookingId")({
  head: () => ({
    meta: [
      { title: "Complete Payment — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Transfer to the official studio account and upload your receipt to confirm your Genie Pro Music Studio session.",
      },
      { property: "og:title", content: "Complete Payment — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "Upload your transfer receipt so the studio manager can confirm your session.",
      },
    ],
  }),
  component: PayPage,
});

function PayPage() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings } = useStudioSettings();
  const [paymentType, setPaymentType] = useState<"partial" | "full">("partial");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !booking) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
          {isLoading ? "Loading booking…" : "Booking not found."}
        </div>
      </AppShell>
    );
  }

  const amount = paymentType === "full" ? booking.price : Math.round(booking.price * 0.7);

  const submit = async () => {
    if (!file) { toast.error("Upload your transfer receipt."); return; }
    if (!user) return;
    setBusy(true);
    try {
      const path = `${user.id}/${bookingId}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (upErr) throw upErr;
      const { data: updated, error } = await supabase
        .from("bookings")
        .update({
          receipt_url: path,
          payment_type: paymentType,
          balance: booking.price - amount,
          status: "pending",
        })
        .eq("id", bookingId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new Error("Receipt saved but the booking could not be updated.");
      void qc.invalidateQueries({ queryKey: ["booking", bookingId] });
      toast.success("Receipt submitted — the studio manager will review it shortly.");
      void navigate({ to: "/bookings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div>
          <h1 className="display-title text-4xl">Complete payment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Status: {STATUS_LABEL[booking.status] ?? booking.status}
          </p>
        </div>

        <section className="panel space-y-1 p-5 text-sm">
          <h2 className="mb-2 text-xl">Session</h2>
          <p className="font-medium">{booking.package_label}</p>
          <p className="text-muted-foreground">
            {formatDateTime(booking.starts_at)} → {formatDateTime(booking.ends_at)} ·{" "}
            {booking.duration_hours}hrs {booking.period}
          </p>
          <p className="mt-2 text-primary">Total {naira(booking.price)}</p>
        </section>

        <section className="panel p-5">
          <h2 className="text-xl">Bank transfer</h2>
          <div className="mt-3 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Bank: </span>
              {settings?.bank_name}
            </p>
            <p>
              <span className="text-muted-foreground">Account name: </span>
              {settings?.account_name}
            </p>
            <p>
              <span className="text-muted-foreground">Account number: </span>
              <span className="font-semibold tracking-wide">{settings?.account_number}</span>
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Payments are accepted only into this official account. Transfers to any other recipient
            are at your own risk.
          </p>
        </section>

        <section className="panel p-5">
          <h2 className="text-xl">Amount</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPaymentType("partial")}
              className={`rounded-md border px-4 py-2 text-sm ${
                paymentType === "partial" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              70% deposit · {naira(Math.round(booking.price * 0.7))}
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("full")}
              className={`rounded-md border px-4 py-2 text-sm ${
                paymentType === "full" ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              Full payment · {naira(booking.price)}
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Balance after this payment: {naira(booking.price - amount)}. Full payment is required
            before studio access.
          </p>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="receipt">Upload receipt</Label>
            <Input
              id="receipt"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button className="mt-4 w-full" disabled={busy} onClick={submit}>
            Submit for approval
          </Button>
          <WhatsAppButton
            className="mt-3 w-full"
            message={`Hello Genie Pro Music Studio, I have booked the ${booking.package_label} session and sent my payment.`}
          />
        </section>

        <Link to="/bookings" className="block text-center text-sm text-primary hover:underline">
          Back to my bookings
        </Link>
      </div>
    </AppShell>
  );
}
