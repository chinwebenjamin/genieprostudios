import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, gmailComposeLink, naira, STATUS_LABEL, whatsAppLink } from "@/lib/format";

type Customer = {
  key: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  bookings: { id: string; package_label: string; starts_at: string; status: string; price: number }[];
};

export function CustomersList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["manager-customers"],
    queryFn: async () => {
      const [{ data: bookings, error }, { data: profiles, error: pErr }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, client_id, client_name, client_whatsapp, created_by_manager, package_label, starts_at, status, price")
          .order("starts_at", { ascending: false }),
        supabase.from("profiles").select("id, email, full_name"),
      ]);
      if (error) throw error;
      if (pErr) throw pErr;
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      const map = new Map<string, Customer>();
      for (const b of bookings ?? []) {
        const key = b.created_by_manager
          ? `name:${(b.client_name ?? "").trim().toLowerCase()}`
          : b.client_id;
        const profile = b.created_by_manager ? undefined : byId.get(b.client_id);
        let c = map.get(key);
        if (!c) {
          c = {
            key,
            name: b.client_name || profile?.full_name || profile?.email || "Unknown client",
            email: profile?.email ?? null,
            whatsapp: null,
            bookings: [],
          };
          map.set(key, c);
        }
        if (!c.whatsapp && b.client_whatsapp) c.whatsapp = b.client_whatsapp;
        c.bookings.push(b);
      }
      return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data.length) return <p className="text-sm text-muted-foreground">No customers yet.</p>;

  return (
    <div className="space-y-4">
      {data.map((c) => {
        const wa = whatsAppLink(c.whatsapp);
        return (
          <article key={c.key} className="panel p-5">
            <h2 className="text-xl">{c.name}</h2>
            <div className="mt-1 space-y-0.5 text-sm">
              <p>
                <span className="text-muted-foreground">Email: </span>
                {c.email ? (
                  <a href={gmailComposeLink(c.email)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {c.email}
                  </a>
                ) : (
                  "—"
                )}
              </p>
              <p>
                <span className="text-muted-foreground">WhatsApp: </span>
                {wa ? (
                  <a href={wa} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {c.whatsapp}
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.email && (
                <Button asChild size="sm">
                  <a href={gmailComposeLink(c.email)} target="_blank" rel="noreferrer">Send Email</a>
                </Button>
              )}
              {wa && (
                <Button asChild size="sm" variant="outline">
                  <a href={wa} target="_blank" rel="noreferrer">Chat on WhatsApp</a>
                </Button>
              )}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {c.bookings.map((b) => (
                <li key={b.id}>
                  {formatDateTime(b.starts_at)} · {b.package_label} · {naira(b.price)} ·{" "}
                  {STATUS_LABEL[b.status] ?? b.status}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
