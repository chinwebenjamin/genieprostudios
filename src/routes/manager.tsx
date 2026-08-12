import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudioSettings, useSignedUrl } from "@/hooks/useStudio";
import { naira, formatDateTime, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/manager")({
  head: () => ({
    meta: [
      { title: "Manager Dashboard — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Approve booking requests, manage studio equipment inventory, bank details and branding for Genie Pro Music Studio.",
      },
      { property: "og:title", content: "Manager Dashboard — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "Studio control panel for approvals, inventory and settings.",
      },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <AppShell>
        <p className="p-10 text-center text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!user || role !== "manager") {
    return (
      <AppShell>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="display-title text-3xl">Manager access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with a manager account and invite code to open the control panel.
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
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="display-title text-4xl">Manager dashboard</h1>
        <Tabs defaultValue="requests" className="mt-6">
          <TabsList>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="requests" className="mt-4">
            <BookingList statuses={["pending", "awaiting_payment"]} actions />
          </TabsContent>
          <TabsContent value="schedule" className="mt-4">
            <BookingList statuses={["confirmed", "completed", "declined"]} />
          </TabsContent>
          <TabsContent value="inventory" className="mt-4">
            <Inventory />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function BookingList({ statuses, actions }: { statuses: string[]; actions?: boolean }) {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["manager-bookings", statuses.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, booking_items(id, name, quantity, provided_by)")
        .in("status", statuses)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${STATUS_LABEL[status]?.toLowerCase() ?? status}.`);
    void qc.invalidateQueries({ queryKey: ["manager-bookings"] });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data.length) return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;

  return (
    <div className="space-y-4">
      {data.map((b) => (
        <article key={b.id} className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl">{b.package_label}</h2>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(b.starts_at)} → {formatDateTime(b.ends_at)} · {b.duration_hours}hrs{" "}
                {b.period}
              </p>
            </div>
            <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>
              {STATUS_LABEL[b.status] ?? b.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm">
            {naira(b.price)} · balance {naira(b.balance)} · {b.payment_type ?? "no payment yet"}
          </p>
          {b.booking_items.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {b.booking_items.map((i) => `${i.name} ×${i.quantity} (${i.provided_by})`).join(", ")}
            </p>
          )}
          {b.notes && <p className="mt-1 text-xs text-muted-foreground">Notes: {b.notes}</p>}
          <ReceiptLink path={b.receipt_url} />
          {actions && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void setStatus(b.id, "confirmed")}>
                Approve & confirm
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void setStatus(b.id, "declined")}
              >
                Decline
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function ReceiptLink({ path }: { path: string | null }) {
  const url = useSignedUrl("receipts", path);
  if (!path) return null;
  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-block text-sm text-primary hover:underline"
    >
      View payment receipt
    </a>
  );
}

function Inventory() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [providedBy, setProvidedBy] = useState("studio");

  const { data = [] } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["all-categories"] });

  const add = async () => {
    if (!name.trim()) return toast.error("Give the category a name.");
    const { error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), description: description || null, quantity, provided_by: providedBy });
    if (error) return toast.error(error.message);
    setName("");
    setDescription("");
    setQuantity(1);
    refresh();
    void qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
    void qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h2 className="text-xl">Add category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cdesc">Description</Label>
            <Input id="cdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cqty">Quantity available</Label>
            <Input
              id="cqty"
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cprov">Provided by</Label>
            <select
              id="cprov"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={providedBy}
              onChange={(e) => setProvidedBy(e.target.value)}
            >
              <option value="studio">studio</option>
              <option value="client">client</option>
            </select>
          </div>
        </div>
        <Button className="mt-4" onClick={add}>
          Add category
        </Button>
      </div>

      <div className="space-y-2">
        {data.map((c) => (
          <div key={c.id} className="panel flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-40 flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.description ?? ""} · provided by {c.provided_by}
              </p>
            </div>
            <Input
              type="number"
              min={0}
              defaultValue={c.quantity}
              className="w-24"
              onBlur={(e) => void update(c.id, { quantity: Number(e.target.value) })}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => void update(c.id, { active: !c.active })}
            >
              {c.active ? "Hide" : "Show"}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void remove(c.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Settings() {
  const qc = useQueryClient();
  const { data } = useStudioSettings();
  const [bank, setBank] = useState<{ bank_name: string; account_name: string; account_number: string } | null>(
    null,
  );
  const values = bank ?? {
    bank_name: data?.bank_name ?? "",
    account_name: data?.account_name ?? "",
    account_number: data?.account_number ?? "",
  };

  const save = async () => {
    const { error } = await supabase.from("studio_settings").update(values).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Studio settings saved.");
    void qc.invalidateQueries({ queryKey: ["studio-settings"] });
  };

  const uploadBranding = async (kind: "logo_url" | "profile_image_url", file: File) => {
    const path = `${kind}-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("branding").upload(path, file);
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.from("studio_settings").update({ [kind]: path }).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Image updated.");
    void qc.invalidateQueries({ queryKey: ["studio-settings"] });
  };

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h2 className="text-xl">Payment account</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="bank">Bank</Label>
            <Input
              id="bank"
              value={values.bank_name}
              onChange={(e) => setBank({ ...values, bank_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accname">Account name</Label>
            <Input
              id="accname"
              value={values.account_name}
              onChange={(e) => setBank({ ...values, account_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accno">Account number</Label>
            <Input
              id="accno"
              value={values.account_number}
              onChange={(e) => setBank({ ...values, account_number: e.target.value })}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={save}>
          Save
        </Button>
      </div>

      <div className="panel p-5">
        <h2 className="text-xl">Branding</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="logo">Studio logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadBranding("logo_url", f);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile">Profile image</Label>
            <Input
              id="profile"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadBranding("profile_image_url", f);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
