import { useI18n } from "../i18n";
import {
  DEFAULT_TEXT_STYLE,
  type FontKey,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  type TextStyle,
} from "../lib/render";
import ColorPicker from "./ColorPicker";

type Props = {
  value: TextStyle;
  onChange: (style: TextStyle) => void;
};

const FONT_KEYS: FontKey[] = ["display", "sans", "serif", "mono"];
const FONT_PREVIEW: Record<FontKey, string> = {
  display: "font-display",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

/** Font, color, weight and position controls for one text block. */
export default function TextStylePanel({ value, onChange }: Props) {
  const { t } = useI18n();
  const set = <K extends keyof TextStyle>(k: K, v: TextStyle[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-4">
      <div>
        <p className="field-label">{t.editor.font}</p>
        <div className="flex flex-wrap gap-2">
          {FONT_KEYS.map((f) => {
            const on = value.font === f;
            return (
              <button
                type="button"
                key={f}
                onClick={() => set("font", on ? null : f)}
                aria-pressed={on}
                className={`chip ${FONT_PREVIEW[f]}`}
              >
                {t.editor.fonts[f]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="field-label">{t.editor.color}</p>
        <ColorPicker value={value.color} onChange={(c) => set("color", c)} allowAuto />
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="text-size" className="text-muted">
            {t.editor.textSize}
          </label>
          <span className="flex items-center gap-2 text-muted">
            {Math.round((value.size ?? 1) * 100)}%
            {value.size !== null && (
              <button type="button" onClick={() => set("size", null)} className="link">
                {t.editor.resetZoom}
              </button>
            )}
          </span>
        </div>
        <input
          id="text-size"
          type="range"
          min={TEXT_SIZE_MIN}
          max={TEXT_SIZE_MAX}
          step={0.05}
          value={value.size ?? 1}
          onChange={(e) => set("size", Number.parseFloat(e.target.value))}
          className="range w-full"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {value.pos && (
          <button type="button" onClick={() => set("pos", null)} className="link text-sm">
            {t.editor.routeAuto}
          </button>
        )}
        {(value.font !== null || value.color !== null || value.size !== null) && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_TEXT_STYLE, pos: value.pos })}
            className="link text-sm"
          >
            {t.editor.resetStyle}
          </button>
        )}
      </div>
    </div>
  );
}
