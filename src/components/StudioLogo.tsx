import { useStudioSettings, useSignedUrl } from "@/hooks/useStudio";

export function StudioLogo({ size = 40 }: { size?: number }) {
  const { data } = useStudioSettings();
  const url = useSignedUrl("branding", data?.logo_url);

  if (url) {
    return (
      <img
        src={url}
        alt="Genie Pro Music Studio logo"
        width={size}
        height={size}
        className="rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-md bg-primary font-display text-primary-foreground"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      G
    </div>
  );
}
