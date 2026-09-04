/** Long-form date, e.g. "September 1, 2026" (matches the Astro site's
    toLocaleDateString("en-US", { year, month, day })) and ISO date input. */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
