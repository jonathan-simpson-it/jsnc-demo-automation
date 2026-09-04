interface StatCardProps {
  value: string;
  label: string;
  /** Optional 0..100 progress bar integrated into the card (e.g. accuracy). */
  bar?: number | null;
}

/**
 * Metric stat card: large tabular value over a small uppercase mono label.
 * With `bar`, a mini progress fill renders inside the card bottom instead of
 * floating as a separate element.
 */
export default function StatCard({ value, label, bar }: StatCardProps) {
  const barWidth = Math.min(100, Math.max(0, Number(bar) || 0));
  return (
    <div className="flex flex-col justify-between rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div>
        <div className="text-3xl font-bold tracking-tight text-neutral-900">
          {value}
        </div>
        <div className="mt-1 text-xs font-mono uppercase tracking-wider text-neutral-500">
          {label}
        </div>
      </div>
      {bar != null && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${
              barWidth >= 100 ? "bg-emerald-600" : "bg-neutral-900"
            }`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
    </div>
  );
}