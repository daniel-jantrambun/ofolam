import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import { type Activity, type ApiError, listActivities } from "../lib/api";
import { formatDate, formatDistance, sportLabel } from "../lib/format";
import SettingsMenu from "./SettingsMenu";

type Props = {
  onSelect: (id: number) => void;
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
  // Optional "Buy me a coffee" link, set through VITE_COFFEE_URL in .env (see .env.example)
  const coffeeLink = import.meta.env.VITE_COFFEE_URL;

  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = listActivities(page);
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
  }, [page, onSessionLost]);

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
          <SettingsMenu className="md:hidden" />
        </div>
        <div className="flex flex-col gap-2 md:ml-auto md:items-end">
          {/* Desktop: burger above the sign-out link */}
          <SettingsMenu className="hidden md:block" />
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
        {items.map((a) => {
          const d = formatDistance(a, t);
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted">
                    {sportLabel(a.sportType, t)}, {formatDate(a.startDate, t)}
                  </p>
                  <p className="truncate text-lg font-medium">{a.name}</p>
                </div>
                <p className="font-display text-3xl font-bold tabular-nums">
                  {d.value}
                  <span className="ml-1 text-lg">{d.unit}</span>
                </p>
              </button>
            </li>
          );
        })}
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
