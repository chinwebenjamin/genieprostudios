import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Rate = { hours: number; price: number };
export type Rates = { day: Rate[]; night: Rate[] };

export type DbPackage = {
  id: string;
  key: string;
  label: string;
  tagline: string;
  includes: string[];
  excludes: string[];
  rates: Rates;
  active: boolean;
  sort_order: number;
};

function toRates(value: unknown): Rates {
  const v = (value ?? {}) as { day?: Rate[]; night?: Rate[] };
  return { day: v.day ?? [], night: v.night ?? [] };
}

export function usePackages(activeOnly = true) {
  return useQuery({
    queryKey: ["packages", activeOnly],
    queryFn: async (): Promise<DbPackage[]> => {
      let query = supabase.from("packages").select("*").order("sort_order").order("label");
      if (activeOnly) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        key: p.key,
        label: p.label,
        tagline: p.tagline,
        includes: p.includes,
        excludes: p.excludes,
        rates: toRates(p.rates),
        active: p.active,
        sort_order: p.sort_order,
      }));
    },
  });
}
