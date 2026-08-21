import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StudioSettings = {
  logo_url: string | null;
  profile_image_url: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  whatsapp_number: string;
  guidelines: string[];
  project_terms: string[];
};

export function useStudioSettings(enabled = true) {
  return useQuery({
    queryKey: ["studio-settings"],
    enabled,
    queryFn: async (): Promise<StudioSettings | null> => {
      // Public-safe fields come from a view that excludes bank details.
      const { data: pub, error } = await supabase
        .from("studio_public")
        .select("logo_url, profile_image_url, whatsapp_number, guidelines, project_terms")
        .maybeSingle();
      if (error) throw error;
      if (!pub) return null;

      const base: StudioSettings = {
        logo_url: pub.logo_url,
        profile_image_url: pub.profile_image_url,
        whatsapp_number: pub.whatsapp_number ?? "",
        guidelines: pub.guidelines ?? [],
        project_terms: pub.project_terms ?? [],
        bank_name: null,
        account_name: null,
        account_number: null,
      };

      // Bank details are only readable by signed-in users.
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return base;

      const { data: priv } = await supabase
        .from("studio_settings")
        .select("bank_name, account_name, account_number")
        .maybeSingle();
      if (!priv) return base;
      return { ...base, ...priv };
    },
  });
}


/** Branding lives in a private bucket, so paths are exchanged for signed URLs. */
export function useSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 3600) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setUrl(null);
      return;
    }
    void supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [bucket, path, expiresIn]);
  return url;
}
