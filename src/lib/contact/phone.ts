export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** E.164-ish digits for wa.me (India defaults to +91). */
export function toWhatsAppNumber(phone: string): string | null {
  let digits = digitsOnly(phone);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone: string, text?: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  const params = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${params}`;
}

export function mapsSearchDirectionsUrl(destination: string): string {
  const params = new URLSearchParams({
    api: "1",
    destination,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
