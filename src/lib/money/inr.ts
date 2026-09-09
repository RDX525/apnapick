/** Format stored paise/cents as an Indian rupee price. */
export function formatInrFromCents(cents: number): string {
  const rupees = cents / 100;
  const formatted = Number.isInteger(rupees)
    ? rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : rupees.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `₹${formatted}`;
}

export function rupeesToCents(rupees: number): number {
  return Math.round(rupees * 100);
}
