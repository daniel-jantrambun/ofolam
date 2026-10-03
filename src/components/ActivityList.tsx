import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { type Activity, type ApiError, listActivities } from "../lib/api";
import { formatDate, formatDistance, formatDuration, sportLabel } from "../lib/format";
import { groupActivities, type MetaActivity } from "../lib/multisport";
import type { EditorSubject } from "./Editor";
import SettingsMenu from "./SettingsMenu";

type Props = {
  onSelect: (subject: EditorSubject) => void;
  onLogout: () => void;
  onSessionLost: () => void;
};

export default function ActivityList({ onSelect, onLogout, onSessionLost }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<Activity[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  // Multisport event whose legs are unfolded in the list
  const [expanded, setExpanded] = useState<string | null>(null);
  // Optional "Buy me a coffee" link, set through VITE_COFFEE_URL in .env (see .env.example)
  const coffeeLink = import.meta.env.VITE_COFFEE_URL;

  // Bumped by the "Refresh" menu entry: refetches page 1 past both caches
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () =>
    new Promise<void>((resolve) => {
      setPage(1);
      setRefreshTick((n) => n + 1);
      resolve();
    });

  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = listActivities(page, refreshTick > 0 && page === 1);
    const apply = (list: Activity[]) => {
      setItems((prev) => (page === 1 ? list : [...prev, ...list]));
      setHasMore(list.length === 20);
    };
    // Show the cache right away, then refresh from the API in the background
    if (cached) apply(cached);
    setLoading(!cached);
    fresh
      .then((list) => !cancelled && apply(list))
      .catch((e: ApiError) => {
        if (e.status === 401) return onSessionLost();
        if (!cancelled && !cached) setError(e);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, onSessionLost, refreshTick]);

  return (
    <main className="mx-auto max-w-xl px-5 py-6">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <img src="/ofolam.svg" alt="" aria-hidden="true" className="h-12 w-12 shrink-0" />
              <h1 className="font-display text-4xl md:text-5xl font-bold">{t.list.title}</h1>
            </div>
            {/* Desktop: under the title */}
            {coffeeLink && (
              <a
                href={coffeeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="link hidden text-sm md:inline"
              >
                {t.coffee.label}
              </a>
            )}
          </div>
          {/* Mobile: burger on the right of the title */}
          <SettingsMenu className="md:hidden" onRefresh={refresh} />
        </div>
        <div className="flex flex-col gap-2 md:ml-auto md:items-end">
          {/* Desktop: burger above the sign-out link */}
          <SettingsMenu className="hidden md:block" onRefresh={refresh} />
          <div className="flex items-center justify-between md:justify-end md:gap-2">
            {/* Mobile: next to the sign-out link */}
            {coffeeLink && (
              <a
                href={coffeeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="link text-sm md:hidden"
              >
                {t.coffee.label}
              </a>
            )}
            <button type="button" onClick={onLogout} className="link ml-2 text-sm">
              {t.list.logout}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <p role="alert" className="notice mb-4">
          {t.errors[error.code] ?? t.errors.unknown}
        </p>
      )}

      {!loading && items.length === 0 && !error && <p className="text-muted">{t.list.empty}</p>}

      <ul className="card divide-y divide-border overflow-hidden">
        {groupActivities(items).map((entry) =>
          entry.kind === "single" ? (
            <li key={entry.activity.id}>
              <ActivityRow
                activity={entry.activity}
                onSelect={() => onSelect({ kind: "single", id: entry.activity.id })}
              />
            </li>
          ) : (
            <li key={entry.meta.id}>
              <MultiRow
                meta={entry.meta}
                expanded={expanded === entry.meta.id}
                onToggle={() => setExpanded((e) => (e === entry.meta.id ? null : entry.meta.id))}
                onSelect={() => onSelect({ kind: "multi", ids: entry.meta.legs.map((l) => l.id) })}
                onSelectLeg={(id) => onSelect({ kind: "single", id })}
              />
            </li>
          ),
        )}
      </ul>

      {loading && <p className="py-6 text-muted">{t.list.loading}</p>}

      {hasMore && !loading && items.length > 0 && (
        <button type="button" onClick={() => setPage((p) => p + 1)} className="btn btn-outline mt-6 w-full">
          {t.list.loadMore}
        </button>
      )}
    </main>
  );
}

function ActivityRow({
  activity: a,
  onSelect,
  compact = false,
}: {
  activity: Activity;
  onSelect: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const d = formatDistance(a, t);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-4 text-left transition-colors hover:bg-surface-2 ${compact ? "px-4 py-2 pl-10" : "px-4 py-4"}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted">
          {sportLabel(a.sportType, t)}
          {compact ? "" : `, ${formatDate(a.startDate, t)}`}
        </p>
        <p className={`truncate font-medium ${compact ? "" : "text-lg"}`}>{a.name}</p>
      </div>
      <p className={`font-display font-bold tabular-nums ${compact ? "text-xl" : "text-3xl"}`}>
        {d.value}
        <span className="ml-1 text-lg">{d.unit}</span>
      </p>
    </button>
  );
}

/** A multisport event: one row for the whole event, unfolding its legs. */
function MultiRow({
  meta,
  expanded,
  onToggle,
  onSelect,
  onSelectLeg,
}: {
  meta: MetaActivity;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onSelectLeg: (id: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">
              {t.multi[meta.kind]}, {formatDate(meta.startDate, t)}
            </p>
            <p className="truncate text-lg font-medium">
              {meta.sportLegs.map((l) => sportLabel(l.sportType, t)).join(" · ")}
            </p>
          </div>
          <p className="font-display text-3xl font-bold tabular-nums">{formatDuration(meta.totalTime)}</p>
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={t.list.legs(meta.sportLegs.length)}
          title={t.list.legs(meta.sportLegs.length)}
          className="btn btn-ghost btn-sm mr-2 !px-2"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      {expanded && (
        <ul className="divide-y divide-border border-t border-border bg-surface-2/60">
          {meta.sportLegs.map((leg) => (
            <li key={leg.id}>
              <ActivityRow activity={leg} onSelect={() => onSelectLeg(leg.id)} compact />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
