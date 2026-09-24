export function naira(value: number) {
  return "₦" + Math.round(value).toLocaleString("en-NG");
}

export function formatDateTime(iso: string | Date) {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string | Date) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
}

export function toWhatsAppDigits(raw: string | null | undefined) {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  else if (d.length === 10 && /^[789]/.test(d)) d = "234" + d;
  return d;
}

export function whatsAppLink(raw: string | null | undefined) {
  const d = toWhatsAppDigits(raw);
  return d ? `https://wa.me/${d}` : null;
}

export function gmailComposeLink(email: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
}

export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "Pending review",
  confirmed: "Confirmed",
  declined: "Declined",
  completed: "Completed",
};
