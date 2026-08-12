import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateTime } from "@/lib/format";

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, scheduled_at, read_at")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const unread = data.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    const ids = data.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <button onClick={markAllRead} className="text-xs text-primary hover:underline">
            Mark all read
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {data.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {data.map((n) => (
            <div
              key={n.id}
              className={`border-b px-3 py-2 text-sm last:border-0 ${n.read_at ? "opacity-60" : ""}`}
            >
              <p className="font-medium">{n.title}</p>
              <p className="text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatDateTime(n.scheduled_at)}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
