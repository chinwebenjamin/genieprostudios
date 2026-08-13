import { Button } from "@/components/ui/button";
import { useStudioSettings } from "@/hooks/useStudio";

export function WhatsAppButton({
  message = "Hello Genie Pro Music Studio, I just booked a session.",
  className,
}: {
  message?: string;
  className?: string;
}) {
  const { data } = useStudioSettings();
  const digits = (data?.whatsapp_number ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return (
    <Button asChild variant="outline" className={className}>
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
      >
        Chat with the studio on WhatsApp
      </a>
    </Button>
  );
}
