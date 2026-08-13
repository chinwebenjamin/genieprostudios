import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StudioSettings = {
  logo_url: string | null;
  profile_image_url: string | null;
  bank_name: string;
  account_name: string;
  account_number: string;
  whatsapp_number: string;
};

export function useStudioSettings(enabled = true) {
  return useQuery({
    queryKey: ["studio-settings"],
    enabled,
    queryFn: async (): Promise<StudioSettings | null> => {
      const { data, error } = await supabase
        .from("studio_settings")
        .select(
          "logo_url, profile_image_url, bank_name, account_name, account_number, whatsapp_number",
        )
        .maybeSingle();
      if (error) throw error;
      return data;
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
