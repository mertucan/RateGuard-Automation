import { useMemo, useState } from "react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function padIso(y, m, d) {
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function parseIso(s) {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Group events by end_date (YYYY-MM-DD). */
function groupByEndDate(events) {
  const m = new Map();
  for (const ev of events || []) {
    const key = (ev.end_date || "").slice(0, 10);
    if (!key) continue;
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(ev);
  }
  return m;
}

function urgencyClass(days) {
  if (days == null) return "bg-primary";
  if (days < 0) return "bg-red-500";
  if (days <= 7) return "bg-red-500";
  if (days <= 30) return "bg-amber-500";
  return "bg-emerald-500";
}

/**
 * @param {Object} props
 * @param {Array<{id: string, end_date: string, company_name?: string, days_until?: number}>} props.events
 * @param {string|null} props.selectedDay — YYYY-MM-DD or null
 * @param {(day: string | null) => void} props.onDaySelect — toggle filter by end date
 * @param {boolean} [props.compact]
 */
export default function ContractExpiryCalendar({
  events = [],
  selectedDay = null,
  onDaySelect,
  compact = false,
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const byDay = useMemo(() => groupByEndDate(events), [events]);

  const y = cursor.getFullYear();
  const mon = cursor.getMonth();
  const first = new Date(y, mon, 1);
  const lastDay = new Date(y, mon + 1, 0).getDate();
  const startPad = (first.getDay() + 6) % 7; // Monday=0

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay; d++) cells.push(d);

  const todayIso = padIso(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );

  const title = cursor.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className={`rounded-xl border border-border bg-surface ${compact ? "p-3" : "p-4 sm:p-5"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          className={`font-bold text-text ${compact ? "text-sm" : "text-base"}`}
        >
          Contract end dates
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(y, mon - 1, 1))}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1 text-text-muted transition-colors hover:bg-hover hover:text-text"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(y, mon + 1, 1))}
            className="rounded-lg border border-border bg-surface-alt px-2 py-1 text-text-muted transition-colors hover:bg-hover hover:text-text"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>
      </div>
      <p className="mb-3 text-center text-xs font-semibold capitalize text-text-muted sm:text-sm">
        {title}
      </p>
      <div
        className={`grid grid-cols-7 gap-0.5 text-center ${compact ? "text-[10px]" : "text-xs"}`}
      >
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 font-semibold uppercase tracking-wide text-text-muted"
          >
            {w}
          </div>
        ))}
        {cells.map((d, idx) => {
          if (d == null) {
            return <div key={`e-${idx}`} className="aspect-square" />;
          }
          const iso = padIso(y, mon, d);
          const dayEvents = byDay.get(iso) || [];
          const has = dayEvents.length > 0;
          const isToday = iso === todayIso;
          const isSel = selectedDay === iso;
          const worst = has
            ? Math.min(
                ...dayEvents.map((e) =>
                  e.days_until != null ? e.days_until : 999,
                ),
              )
            : null;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => {
                if (!onDaySelect) return;
                if (!has) {
                  onDaySelect(null);
                  return;
                }
                onDaySelect(isSel ? null : iso);
              }}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-[11px] font-medium transition-colors sm:text-xs ${
                isSel
                  ? "border-primary bg-primary-soft text-primary"
                  : isToday
                    ? "border-primary/40 bg-primary/5 text-text"
                    : "border-transparent bg-surface-alt text-text hover:border-border hover:bg-hover"
              } ${has ? "cursor-pointer" : ""}`}
            >
              <span>{d}</span>
              {has && (
                <span
                  className={`mt-0.5 h-1.5 w-1.5 rounded-full ${urgencyClass(worst)}`}
                  title={`${dayEvents.length} contract(s)`}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-[10px] text-text-muted sm:text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          ≤7d or overdue
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />8–30d
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          &gt;30d
        </span>
      </div>
    </div>
  );
}

export { parseIso, padIso };
