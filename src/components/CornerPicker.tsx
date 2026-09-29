import { useI18n } from "../i18n";
import type { Corner } from "../lib/render";

const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/** 2×2 grid of small squares, one per card corner. */
export default function CornerPicker({ value, onChange }: { value: Corner; onChange: (c: Corner) => void }) {
  const { t } = useI18n();
  return (
    <div className="seg grid w-fit grid-cols-2 gap-1">
      {CORNERS.map((c) => {
        const on = value === c;
        return (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            aria-label={t.editor.corners[c]}
            title={t.editor.corners[c]}
            aria-pressed={on}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${on ? "bg-secondary" : "hover:bg-surface"}`}
          >
            <span className={`h-2 w-2 rounded-sm ${on ? "bg-secondary-foreground" : "bg-muted"}`} />
          </button>
        );
      })}
    </div>
  );
}
