import { useI18n } from "../i18n";
import { ROUTE_COLORS } from "../lib/colors";

type Props = {
  /** Current color, or null for "auto" when `allowAuto` is set. */
  value: string | null;
  onChange: (color: string | null) => void;
  /** Offers an "Auto" choice that maps to null. */
  allowAuto?: boolean;
  /** Swatches to offer; defaults to the route palette. */
  presets?: readonly string[];
};


/** Preset swatches plus the browser's native color picker for any other color. */
export default function ColorPicker({ value, onChange, allowAuto = false, presets = ROUTE_COLORS }: Props) {
  const { t } = useI18n();
  const isPreset = value !== null && presets.includes(value);
  const isCustom = value !== null && !isPreset;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {allowAuto && (
        <button
          onClick={() => onChange(null)}
          aria-pressed={value === null}
          className="chip text-sm"
        >
          {t.editor.colorAuto}
        </button>
      )}
      {presets.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          aria-label={t.editor.colorLabel(c)}
          aria-pressed={value === c}
          className="swatch"
          style={{ background: c }}
        />
      ))}
      {/* Native picker: the label is the visible swatch, the input stays in flow but hidden */}
      <label
        aria-label={t.editor.colorCustom}
        title={t.editor.colorCustom}
        className={`swatch relative flex cursor-pointer items-center justify-center ${isCustom ? "swatch-on" : ""}`}
        style={{
          background: isCustom
            ? value
            : "conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)",
        }}
      >
        <input
          type="color"
          value={value ?? "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
