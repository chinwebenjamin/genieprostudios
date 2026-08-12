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

export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "Pending review",
  confirmed: "Confirmed",
  declined: "Declined",
  completed: "Completed",
};
