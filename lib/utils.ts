export function generateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("mc_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("mc_session_id", sid);
  }
  return sid;
}

export function formatPrice(amount: number): string {
  return "₹ " + amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function waLink(phone: string, text: string): string {
  const num = phone.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
