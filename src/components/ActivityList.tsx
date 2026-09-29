import { useEffect, useState } from "react";
import { ApiError, listActivities, type Activity } from "../lib/api";
import { formatDate, formatDistance, sportLabel } from "../lib/format";
import { LangSwitcher, useI18n } from "../i18n";
import { ThemeSwitcher } from "../theme";

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

  useEffect(() => {
    let cancelled = false;
    const { cached, fresh } = listActivities(page);
    const apply = (list: Activity[]) => {
      setItems((prev) => (page === 1 ? list : [...prev, ...list]));
      setHasMore(list.length === 20);
    };
    // Affiche le cache tout de suite, puis rafraîchit depuis l'API en arrière-plan
    if (cached) apply(cached);
    setLoading(!cached);
    fresh
      .then((list) => !cancelled && apply(list))
      .catch((e: ApiError) => {
        if (e.status === 401) return onSessionLost();
        // Avec un cache affiché, une erreur réseau ne doit pas masquer la liste
        if (!cancelled && !cached) setError(e);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, onSessionLost]);

  return (
    <main className="mx-auto max-w-xl px-5 py-6">
      <header className="mb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <h1 className="font-display text-5xl font-bold">{t.list.title}</h1>
        <div className="flex items-center gap-2">
            <div className="flex flex-col flex-1 md:gap-2">
              <div className="flex flex-row flex-1 md:items-center  gap-2">
                <ThemeSwitcher />
                <LangSwitcher />
              </div>
              <div className="flex items-end flex-col md:gap-2">
                <button onClick={onLogout} className="link ml-2 text-sm">
                  {t.list.logout}
                </button>
              </div>
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
        <button
          onClick={() => setPage((p) => p + 1)}
          className="btn btn-outline mt-6 w-full"
        >
          {t.list.loadMore}
        </button>
      )}
    </main>
  );
}
