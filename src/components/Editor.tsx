import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Dictionary } from "../i18n/en";
import { type Activity, type ApiError, getActivity } from "../lib/api";
import { BRAND_COLORS, type BrandColor } from "../lib/brand";
import { LIGHT_TINTS, NIGHT_TINTS, ROUTE_COLORS } from "../lib/colors";
import { type Crop, DEFAULT_CROP } from "../lib/crop";
import { usesPace } from "../lib/format";
import {
  type Background,
  type Box,
  type CardOptions,
  type Corner,
  DEFAULT_TEXT_STYLE,
  ensureFonts,
  type Format,
  type LayerKey,
  layerOrder,
  loadPhoto,
  type Photo,
  type RenderResult,
  releasePhoto,
  renderCard,
  SIZES,
  type StatKey,
  TEXT_SIZE_MAX,
  TEXT_SIZE_MIN,
  type TextKey,
} from "../lib/render";
import { canShareFiles, canvasToBlob, copyImage, downloadBlob, shareImage } from "../lib/share";
import type { MapStyle } from "../lib/tiles";
import {
  canExportVideo,
  defaultTrim,
  exportVideo,
  loadVideo,
  releaseVideo,
  type VideoClip,
  type VideoTrim,
} from "../lib/video";
import { useTheme } from "../theme";
import CardOverlay, { type BoxChange, type OverlayItem } from "./CardOverlay";
import ColorPicker from "./ColorPicker";
import CornerPicker from "./CornerPicker";
import PhotoCropper from "./PhotoCropper";
import SettingsMenu, { type MenuAction } from "./SettingsMenu";
import TextStylePanel from "./TextStylePanel";
import VideoTrimmer from "./VideoTrimmer";

type Props = { activityId: number; onBack: () => void; onSessionLost: () => void };

const backgrounds = (t: Dictionary): { id: Background; label: string }[] => [
  { id: "photo", label: t.editor.bgPhoto },
  // Only offered where the browser can encode it (WebCodecs)
  ...(canExportVideo() ? [{ id: "video" as const, label: t.editor.bgVideo }] : []),
  { id: "map", label: t.editor.bgMap },
  { id: "transparent", label: t.editor.bgTransparent },
  { id: "night", label: t.editor.bgNight },
  { id: "topo", label: t.editor.bgTopo },
];
const mapStyles = (t: Dictionary): { id: MapStyle; label: string }[] => [
  { id: "light", label: t.editor.mapLight },
  { id: "bright", label: t.editor.mapBright },
  { id: "ground", label: t.editor.mapGround },
  { id: "osm", label: t.editor.mapOSM },
  { id: "dark", label: t.editor.mapDark },
];
const formats = (t: Dictionary): { id: Format; label: string }[] => [
  { id: "story", label: t.editor.story },
  { id: "post", label: t.editor.post },
  { id: "square", label: t.editor.square },
  { id: "landscape", label: t.editor.landscape },
];

export default function Editor({ activityId, onBack, onSessionLost }: Props) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Preview playback: what the user asked for (play / pause button), and what the element is doing
  const wantPlay = useRef(true);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { resolved } = useTheme();
  const [fontsReady, setFontsReady] = useState(false);
  const [opts, setOpts] = useState<CardOptions>(() => ({
    format: "square" as Format,
    background: resolved === "dark" ? "night" : ("topo" as Background),
    routeColor: ROUTE_COLORS[0],
    stats: ["distance", "time", "pace"] as StatKey[],
    showName: true,
    showMeta: true,
    showRoute: true,
    routeTrim: 200,
    titleText: null,
    photo: null,
    photoCrop: DEFAULT_CROP as Crop,
    video: null,
    videoCrop: DEFAULT_CROP as Crop,
    videoTrim: { start: 0, end: 0 },
    videoMuted: false,
    mapStyle: "bright" as MapStyle,
    mapOpacity: 1,
    bgTint: { topo: null, night: null },
    routeBox: null,
    texts: {},
    order: [] as LayerKey[],
    brandCorner: "bl" as Corner,
    brandColor: "auto" as BrandColor,
    creditColor: null,
    ...loadPrefs(),
    t,
  }));
  // Boxes drawn at the last render (route + texts): the overlay hit-tests and drags from them
  const [drawn, setDrawn] = useState<RenderResult | null>(null);
  // Selected elements on the preview ("route", "brand" or text keys); the last one is primary.
  const [selection, setSelection] = useState<string[]>([]);
  const selected: string | null = selection.length === 1 ? selection[0] : null;
  const [tab, setTab] = useState<Tab>("layout");
  // Bumped when a map tile arrives, to redraw the card with it
  const [tileTick, setTileTick] = useState(0);
  // Selecting an element on the preview opens its settings
  // Selecting an element opens the Style tab; tapping empty card space returns to the tab
  // the user was on before (or to the first tab when they were already on Style).
  const tabBeforeSelect = useRef<Tab | null>(null);
  const onSelectLayer = (keys: string[]) => {
    setSelection(keys);
    if (keys.length) {
      if (tab !== "style") tabBeforeSelect.current = tab;
      setTab("style");
    } else {
      setTab(tabBeforeSelect.current ?? "layout");
      tabBeforeSelect.current = null;
    }
  };
  // Crop settings are shown after picking a photo, until the user saves them
  const [photoEditing, setPhotoEditing] = useState(false);
  const [videoEditing, setVideoEditing] = useState(false);
  // Video export: progress while encoding, then the MP4 ready to share (dropped on any edit)
  const [exporting, setExporting] = useState<{ progress: number; abort: AbortController } | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // The dictionary is part of the render options: the canvas redraws when the language changes
  useEffect(() => setOpts((o) => (o.t === t ? o : { ...o, t })), [t]);

  // Every photo loaded in this session stays usable (undo may bring it back); all are released on unmount
  const photos = useRef(new Set<Photo>());
  const clips = useRef(new Set<VideoClip>());
  useEffect(
    () => () => {
      for (const ph of photos.current) releasePhoto(ph);
      for (const clip of clips.current) releaseVideo(clip);
    },
    [],
  );

  // ---- Undo / redo ----
  // Committed snapshots of `opts`. A change is committed once it has been stable for a
  // short while, so a drag or a slider move produces a single history entry.
  const history = useRef<{ past: CardOptions[]; future: CardOptions[]; committed: CardOptions | null }>({
    past: [],
    future: [],
    committed: null,
  });
  const [historyTick, setHistoryTick] = useState(0); // re-render the buttons' enabled state
  const HISTORY_MAX = 50;
  const COMMIT_DELAY_MS = 300;
  useEffect(() => {
    const h = history.current;
    if (h.committed === null) {
      h.committed = opts;
      return;
    }
    if (h.committed === opts) return;
    const timer = window.setTimeout(() => {
      // Ignore language switches: the dictionary is not a user edit
      if (h.committed && sameExceptDictionary(h.committed, opts)) {
        h.committed = opts;
        return;
      }
      h.past = [...h.past.slice(-(HISTORY_MAX - 1)), h.committed!];
      h.future = [];
      h.committed = opts;
      setHistoryTick((n) => n + 1);
    }, COMMIT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [opts]);
  // Remember the settings for the next activity (debounced like the history)
  useEffect(() => {
    const timer = window.setTimeout(() => savePrefs(opts), 500);
    return () => window.clearTimeout(timer);
  }, [opts]);
  const undo = () => {
    const h = history.current;
    const prev = h.past.pop();
    if (!prev) return;
    h.future.push(h.committed!);
    const next = { ...prev, t };
    h.committed = next;
    setOpts(next);
    setSelection([]);
    setHistoryTick((n) => n + 1);
  };
  const redo = () => {
    const h = history.current;
    const next0 = h.future.pop();
    if (!next0) return;
    h.past.push(h.committed!);
    const next = { ...next0, t };
    h.committed = next;
    setOpts(next);
    setSelection([]);
    setHistoryTick((n) => n + 1);
  };
  const canUndo = history.current.past.length > 0;
  const canRedo = history.current.future.length > 0;
  void historyTick;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        /^(input|textarea|select)$/i.test(target.tagName) &&
        (target as HTMLInputElement).type !== "range"
      )
        return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    ensureFonts().finally(() => setFontsReady(true));
    const { cached, fresh } = getActivity(activityId);
    if (cached) setActivity(cached);
    fresh.then(setActivity).catch((e: ApiError) => {
      if (e.status === 401) return onSessionLost();
      if (!cached) setError(e);
    });
  }, [activityId, onSessionLost]);

  /** "Refresh" menu entry: reload this activity from Strava, bypassing both caches. */
  const refreshActivity = async () => {
    try {
      setActivity(await getActivity(activityId, true).fresh);
      setError(null);
    } catch (e) {
      if ((e as ApiError).status === 401) return onSessionLost();
      setError(e as ApiError);
    }
  };

  // Render + precomputed blob: navigator.share must fire without waiting inside the click
  useEffect(() => {
    void tileTick; // a new tile arrived: redraw with it
    const canvas = canvasRef.current;
    if (!canvas || !activity || !fontsReady) return;
    setDrawn(renderCard(canvas, activity, opts, { onTileLoaded: () => setTileTick((n) => n + 1) }));
    blobRef.current = null;
    canvasToBlob(canvas).then((b) => (blobRef.current = b));
  }, [activity, opts, fontsReady, tileTick]);

  // Any edit makes the exported video stale: drop it, and stop an export in progress
  useEffect(() => {
    void activity;
    void opts;
    setVideoBlob(null);
    setExporting((e) => {
      e?.abort.abort();
      return null;
    });
  }, [activity, opts]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const isVideo = opts.background === "video" && !!opts.video;
  const filename = `ofolam-${activityId}.${isVideo ? "mp4" : "png"}`;
  const set = <K extends keyof CardOptions>(k: K, v: CardOptions[K]) => setOpts((o) => ({ ...o, [k]: v }));
  const toggleStat = (s: StatKey) =>
    set("stats", opts.stats.includes(s) ? opts.stats.filter((x) => x !== s) : [...opts.stats, s].slice(0, 4));

  const onShare = () => {
    if (!blobRef.current) return setToast(t.editor.preparing);
    shareImage(blobRef.current, filename).catch(() => setToast(t.editor.shareFailed));
  };

  const onCopy = () => {
    const blob = blobRef.current ?? canvasToBlob(canvasRef.current!);
    copyImage(blob)
      .then(() => setToast(t.editor.copied))
      .catch(() => setToast(t.editor.copyFailed));
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allows picking the same file again
    if (!file) return;
    try {
      const photo = await loadPhoto(file);
      photos.current.add(photo);
      setOpts((o) => ({ ...o, photo, photoCrop: DEFAULT_CROP, background: "photo" }));
      setPhotoEditing(true);
    } catch {
      setToast(t.editor.photoUnreadable);
    }
  };

  const onRemovePhoto = () => {
    setOpts((o) => ({ ...o, photo: null, background: "night" }));
    setPhotoEditing(false);
  };

  const onDownload = async () => {
    if (isVideo) return videoBlob && downloadBlob(videoBlob, filename);
    downloadBlob(blobRef.current ?? (await canvasToBlob(canvasRef.current!)), filename);
  };

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allows picking the same file again
    if (!file) return;
    try {
      const video = await loadVideo(file);
      clips.current.add(video);
      setOpts((o) => ({
        ...o,
        video,
        videoCrop: DEFAULT_CROP,
        videoTrim: defaultTrim(video.duration),
        background: "video",
      }));
      setVideoEditing(true);
      wantPlay.current = true;
    } catch {
      setToast(t.editor.videoUnreadable);
    }
  };

  const onRemoveVideo = () => {
    setOpts((o) => ({ ...o, video: null, background: "night" }));
    setVideoEditing(false);
  };

  /** Moving a trim handle shows that point in the preview. */
  const onTrimChange = (videoTrim: VideoTrim, moved: "start" | "end") => {
    set("videoTrim", videoTrim);
    const el = videoRef.current;
    if (el)
      el.currentTime = moved === "start" ? videoTrim.start : Math.max(videoTrim.start, videoTrim.end - 1);
  };

  /** Keeps the preview looping inside the trimmed part, unless the user paused it. */
  const onPreviewTime = () => {
    const el = videoRef.current;
    if (!el) return;
    const { start, end } = opts.videoTrim;
    if (el.currentTime >= end || el.currentTime < start - 0.25) el.currentTime = start;
    if (el.paused && wantPlay.current) void el.play().catch(() => {});
  };

  const togglePreview = () => {
    const el = videoRef.current;
    if (!el) return;
    wantPlay.current = el.paused;
    if (el.paused) {
      // Resume inside the trimmed part
      const { start, end } = opts.videoTrim;
      if (el.currentTime >= end || el.currentTime < start) el.currentTime = start;
      void el.play().catch(() => {});
    } else el.pause();
  };

  const onCreateVideo = async () => {
    const canvas = canvasRef.current;
    if (!opts.video || !canvas || exporting) return;
    // Freeze the overlay as drawn now: the editor canvas may redraw during the export
    const overlay = document.createElement("canvas");
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.getContext("2d")!.drawImage(canvas, 0, 0);
    const abort = new AbortController();
    setExporting({ progress: 0, abort });
    try {
      const blob = await exportVideo({
        clip: opts.video,
        trim: opts.videoTrim,
        muted: opts.videoMuted,
        crop: opts.videoCrop,
        card: SIZES[opts.format],
        overlay,
        signal: abort.signal,
        onProgress: (progress) => setExporting((e) => (e?.abort === abort ? { ...e, progress } : e)),
      });
      if (abort.signal.aborted) return;
      setVideoBlob(blob);
      setToast(t.editor.videoReady);
    } catch {
      if (!abort.signal.aborted) setToast(t.editor.videoFailed);
    } finally {
      setExporting((e) => (e?.abort === abort ? null : e));
    }
  };

  const onShareVideo = () => {
    if (!videoBlob) return;
    shareImage(videoBlob, filename).catch(() => setToast(t.editor.shareFailed));
  };

  const paceLabel = activity && !usesPace(activity) ? t.stats.speed : t.stats.pace;
  const drawnBox = drawn?.routeBox ?? null;
  const boxes: Partial<Record<LayerKey, Box>> = {
    ...(drawn?.texts ?? {}),
    ...(opts.showRoute && activity?.polyline && drawnBox ? { route: drawnBox } : {}),
  };
  // Items follow the stacking order (deepest first) so the topmost element wins the tap
  const overlayItems: OverlayItem[] = [
    ...(drawn?.order ?? [])
      .filter((key) => boxes[key])
      .map((key) => ({ key, box: boxes[key]!, resizable: key === "route" })),
    // The mention is always on top and only moves between corners
    ...(drawn ? [{ key: "brand", box: drawn.brandBox, fixed: true }] : []),
    ...(drawn ? [{ key: "credit", box: drawn.creditBox, fixed: true }] : []),
  ];

  /** Moves the selected layer: one step up (towards the viewer) or down, or straight to the top or bottom. */
  const moveLayer = (key: LayerKey, dir: 1 | -1 | "top" | "bottom") => {
    const order = layerOrder(opts.order).filter((k) => boxes[k]);
    const i = order.indexOf(key);
    if (i < 0) return;
    if (dir === "top" || dir === "bottom") {
      order.splice(i, 1);
      if (dir === "top") order.push(key);
      else order.unshift(key);
    } else {
      const j = i + dir;
      if (j < 0 || j >= order.length) return;
      [order[i], order[j]] = [order[j], order[i]];
    }
    set("order", order);
  };
  /** Centers an element on the card along one axis, keeping the other coordinate. */
  const centerLayer = (key: LayerKey, axis: "x" | "y") => {
    const box = boxes[key];
    if (!box) return;
    const next = axis === "x" ? { ...box, x: 0.5 - box.w / 2 } : { ...box, y: 0.5 - box.h / 2 };
    onOverlayChange([{ key, box: next }]);
  };
  // Text blocks of the multi-selection, and the style values they share (first one when mixed)
  const selectedTexts = selection.filter(
    (k): k is TextKey => k !== "route" && k !== "brand" && k !== "credit",
  );
  const styleOfKey = (k: TextKey) => opts.texts[k] ?? DEFAULT_TEXT_STYLE;
  const commonSize = selectedTexts.length ? (styleOfKey(selectedTexts[0]).size ?? 1) : 1;
  const commonColor = selectedTexts.length
    ? styleOfKey(selectedTexts[0]).color
    : selection.includes("route")
      ? opts.routeColor
      : null;
  /** Applies a size multiplier to every selected text block. */
  const setSelectionSize = (size: number | null) =>
    setOpts((o) => {
      const texts = { ...o.texts };
      for (const k of selectedTexts) texts[k] = { ...(texts[k] ?? DEFAULT_TEXT_STYLE), size };
      return { ...o, texts };
    });
  /** Applies a color to every selected text block, and to the route when selected (null = auto, texts only). */
  const setSelectionColor = (color: string | null) =>
    setOpts((o) => {
      const texts = { ...o.texts };
      for (const k of selectedTexts) texts[k] = { ...(texts[k] ?? DEFAULT_TEXT_STYLE), color };
      return { ...o, texts, routeColor: color && selection.includes("route") ? color : o.routeColor };
    });

  /** Aligns every selected element on one edge or axis of the selection's bounding box. */
  const alignSelection = (how: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => {
    const group = selection
      .map((k) => ({ key: k, box: boxes[k as LayerKey] }))
      .filter((g): g is { key: string; box: Box } => !!g.box);
    if (group.length < 2) return;
    const x0 = Math.min(...group.map((g) => g.box.x));
    const x1 = Math.max(...group.map((g) => g.box.x + g.box.w));
    const y0 = Math.min(...group.map((g) => g.box.y));
    const y1 = Math.max(...group.map((g) => g.box.y + g.box.h));
    onOverlayChange(
      group.map(({ key, box }) => {
        const b = { ...box };
        if (how === "left") b.x = x0;
        if (how === "centerX") b.x = (x0 + x1) / 2 - box.w / 2;
        if (how === "right") b.x = x1 - box.w;
        if (how === "top") b.y = y0;
        if (how === "centerY") b.y = (y0 + y1) / 2 - box.h / 2;
        if (how === "bottom") b.y = y1 - box.h;
        return { key, box: b };
      }),
    );
  };
  // Stackable layers only (the Strava mention sits outside the stack)
  const stack = (drawn?.order ?? []).filter((key) => boxes[key]);
  const canMoveUp = (key: LayerKey) => stack.indexOf(key) < stack.length - 1;
  const canMoveDown = (key: LayerKey) => stack.indexOf(key) > 0;
  /** Applies box changes from the overlay (a drag may move several elements at once). */
  const onOverlayChange = (changes: BoxChange[]) => {
    setOpts((o) => {
      const texts = { ...o.texts };
      let routeBox = o.routeBox;
      for (const { key, box } of changes) {
        if (key === "route") routeBox = box;
        else if (key !== "brand" && key !== "credit") {
          const textKey = key as TextKey;
          texts[textKey] = { ...(texts[textKey] ?? DEFAULT_TEXT_STYLE), pos: { x: box.x, y: box.y } };
        }
      }
      return { ...o, texts, routeBox };
    });
  };
  const isTextKey = (k: string | null): k is TextKey =>
    k !== null && k !== "route" && k !== "brand" && k !== "credit";
  const selectedText = isTextKey(selected) ? selected : null;
  const textLabel = (key: TextKey) => {
    if (key === "title") return t.editor.showTitleName;
    if (key === "meta") return t.editor.showTitleMeta;
    const stat = key.slice(5) as StatKey;
    return stat === "pace" ? paceLabel : t.stats[stat];
  };

  const STATS: { id: StatKey; label: string }[] = [
    { id: "distance", label: t.stats.distance },
    { id: "time", label: t.stats.time },
    { id: "pace", label: paceLabel },
    { id: "elevation", label: t.stats.elevation },
  ];

  const UndoRedo = ({ size = "sm" }: { size?: "sm" | "nav" }) => {
    // "nav": two compact rows stacked at the end of the mobile tab bar
    const cls =
      size === "nav"
        ? "flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-40"
        : "btn btn-outline btn-sm";
    const icon = (d: string) => (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={size === "nav" ? "1.8" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={d} />
      </svg>
    );
    return (
      <>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className={cls}
          title={t.editor.undo}
          aria-label={t.editor.undo}
        >
          {icon("M9 14L4 9l5-5 M4 9h10a6 6 0 010 12h-3")}
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          className={cls}
          title={t.editor.redo}
          aria-label={t.editor.redo}
        >
          {icon("M15 14l5-5-5-5 M20 9H10a6 6 0 000 12h3")}
        </button>
      </>
    );
  };

  // Primary action: native share when the device supports it, otherwise copy the sticker.
  // Copy / download live in the menu next to it.
  // Video: "Create video" first (encoding takes a while and Safari only shares inside the tap
  // that started it), then share or download the ready MP4.
  const primary = isVideo
    ? !videoBlob
      ? { label: t.editor.createVideo, onClick: () => void onCreateVideo() }
      : canShareFiles("video/mp4")
        ? { label: t.editor.share, onClick: onShareVideo }
        : { label: t.editor.download, onClick: () => void onDownload() }
    : canShareFiles()
      ? { label: t.editor.share, onClick: onShare }
      : { label: t.editor.copyShort, onClick: onCopy };
  const ShareButton = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={primary.onClick}
      disabled={!activity || !!exporting}
      aria-label={primary.label}
      title={primary.label}
      className={`btn btn-primary whitespace-nowrap ${compact ? "btn-sm !px-3" : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={SHARE_ICON} />
      </svg>
      {/* Compact (mobile bar): icon only, the label stays as accessible name */}
      {!compact && primary.label}
    </button>
  );
  // Menu entries: back to the list, then the secondary ways to export the picture
  const menuActions: MenuAction[] = [
    { label: t.editor.back, onClick: onBack },
    // A video cannot go through the clipboard
    ...(canShareFiles() && !isVideo ? [{ label: t.editor.copy, onClick: onCopy, disabled: !activity }] : []),
    {
      label: t.editor.download,
      onClick: () => void onDownload(),
      disabled: !activity || (isVideo && !videoBlob),
    },
  ];

  const Navbar = ({ className }: { className?: string }) => (
    <div className={`flex items-center justify-between ${className ?? ""}`}>
      <button type="button" onClick={onBack} className="link">
        {t.editor.back}
      </button>
      <div className="flex items-center gap-2">
        <UndoRedo />
        <SettingsMenu onRefresh={refreshActivity} actions={menuActions} />
        <ShareButton />
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-5 lg:pb-6">
      {/* Desktop: toolbar at the top */}
      <Navbar className="mb-4 hidden lg:flex" />

      {error && (
        <p role="alert" className="notice mb-4">
          {t.errors[error.code] ?? t.errors.unknown}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,420px)_1fr] lg:gap-8">
        {/* Desktop: vertical nav on the left */}
        <EditorNav tab={tab} onChange={setTab} orientation="vertical" className="hidden self-start lg:flex" />

        <div
          // Shrinks to the canvas so the overlay matches it; on phones the canvas is capped to
          // half the screen so the controls stay visible without scrolling.
          className={`relative mx-auto w-fit max-w-full self-start overflow-hidden rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-card)] lg:mx-0 ${opts.background === "transparent" ? "checker" : ""} ${isVideo ? "bg-black" : ""}`}
        >
          {/* Video background: plays under the canvas, which only holds the veil and the elements.
              object-fit/object-position frame it exactly like the export (focal point, no zoom). */}
          {isVideo && opts.video && (
            <video
              ref={videoRef}
              key={opts.video.url}
              src={opts.video.url}
              muted
              playsInline
              autoPlay
              onPlay={() => setPreviewPlaying(true)}
              onPause={() => setPreviewPlaying(false)}
              onLoadedMetadata={(e) => (e.currentTarget.currentTime = opts.videoTrim.start)}
              onTimeUpdate={onPreviewTime}
              onEnded={onPreviewTime}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${opts.videoCrop.x}% ${opts.videoCrop.y}%` }}
            />
          )}
          <canvas
            ref={canvasRef}
            className="relative block h-auto max-h-[50vh] w-auto max-w-full lg:max-h-none lg:w-full"
            role="img"
            aria-label={activity ? t.editor.previewFor(activity.name) : t.editor.preview}
          />
          {!activity && !error && <p className="p-6 text-muted">{t.editor.loading}</p>}
          {activity && drawn && (
            <CardOverlay
              label={t.editor.preview}
              items={overlayItems}
              selected={selection}
              onSelect={onSelectLayer}
              onChange={onOverlayChange}
            />
          )}
          {exporting && (
            <div
              role="status"
              className="absolute inset-x-0 bottom-0 z-10 space-y-2 bg-black/70 p-3 text-sm text-white"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{t.editor.creatingVideo(Math.round(exporting.progress * 100))}</span>
                <button type="button" onClick={() => exporting.abort.abort()} className="link text-white">
                  {t.editor.cancel}
                </button>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-primary transition-[width]"
                  style={{ width: `${exporting.progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <section className="card min-w-0 space-y-7 p-4 sm:p-6">
          {/* {activity && <h1 className="font-display text-4xl font-bold leading-tight">{activity.name}</h1>} */}

          {tab === "layout" && (
            <>
              <Field label={t.editor.background}>
                <Segmented
                  options={backgrounds(t)}
                  value={opts.background}
                  onChange={(v) => set("background", v)}
                />
                {opts.background === "transparent" && (
                  <p className="mt-2 text-sm text-muted">{t.editor.transparentHint}</p>
                )}
                {(opts.background === "topo" || opts.background === "night") && (
                  <div className="mt-3">
                    <ColorPicker
                      presets={opts.background === "topo" ? LIGHT_TINTS : NIGHT_TINTS}
                      value={
                        opts.bgTint[opts.background] ??
                        (opts.background === "topo" ? LIGHT_TINTS[0] : NIGHT_TINTS[0])
                      }
                      onChange={(c) => set("bgTint", { ...opts.bgTint, [opts.background]: c })}
                    />
                  </div>
                )}
                {opts.background === "map" && (
                  <div className="mt-3 space-y-2">
                    <Segmented
                      options={mapStyles(t)}
                      value={opts.mapStyle}
                      onChange={(v) => set("mapStyle", v)}
                    />
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <label htmlFor="map-opacity" className="text-muted">
                          {t.editor.mapOpacity}
                        </label>
                        <span className="text-muted">{Math.round(opts.mapOpacity * 100)}%</span>
                      </div>
                      <input
                        id="map-opacity"
                        type="range"
                        min={0.2}
                        max={1}
                        step={0.05}
                        value={opts.mapOpacity}
                        onChange={(e) => set("mapOpacity", Number.parseFloat(e.target.value))}
                        className="range w-full"
                      />
                    </div>
                    <p className="text-sm text-muted">
                      {activity?.polyline ? t.editor.mapHint : t.editor.mapNoRoute}
                    </p>
                  </div>
                )}
                {opts.background === "photo" && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickPhoto}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="btn btn-outline"
                    >
                      {opts.photo ? t.editor.changePhoto : t.editor.choosePhoto}
                    </button>
                    {opts.photo && !photoEditing && (
                      <button type="button" onClick={() => setPhotoEditing(true)} className="link text-sm">
                        {t.editor.cropEdit}
                      </button>
                    )}
                    {opts.photo && (
                      <button type="button" onClick={onRemovePhoto} className="link text-sm">
                        {t.editor.removePhoto}
                      </button>
                    )}
                    {!opts.photo && <p className="text-sm text-muted">{t.editor.photoStaysLocal}</p>}
                  </div>
                )}
                {opts.background === "video" && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <input
                      ref={videoFileRef}
                      type="file"
                      accept="video/*"
                      onChange={onPickVideo}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => videoFileRef.current?.click()}
                      className="btn btn-outline"
                    >
                      {opts.video ? t.editor.changeVideo : t.editor.chooseVideo}
                    </button>
                    {opts.video && !videoEditing && (
                      <button type="button" onClick={() => setVideoEditing(true)} className="link text-sm">
                        {t.editor.cropEdit}
                      </button>
                    )}
                    {opts.video && (
                      <button type="button" onClick={onRemoveVideo} className="link text-sm">
                        {t.editor.removePhoto}
                      </button>
                    )}
                    {opts.video && (
                      <button
                        type="button"
                        onClick={togglePreview}
                        className="btn btn-outline btn-sm"
                        aria-label={previewPlaying ? t.editor.pause : t.editor.play}
                        title={previewPlaying ? t.editor.pause : t.editor.play}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path d={previewPlaying ? PAUSE_ICON : PLAY_ICON} />
                        </svg>
                      </button>
                    )}
                    {!opts.video && <p className="text-sm text-muted">{t.editor.videoStaysLocal}</p>}
                  </div>
                )}
              </Field>

              {isVideo && opts.video && (
                <Field label={t.editor.videoTrim}>
                  <VideoTrimmer
                    duration={opts.video.duration}
                    value={opts.videoTrim}
                    onChange={onTrimChange}
                  />
                  {opts.video.hasAudio ? (
                    <label className="mt-3 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={opts.videoMuted}
                        onChange={(e) => set("videoMuted", e.target.checked)}
                        className="accent-[var(--color-primary)]"
                      />
                      {t.editor.videoMute}
                    </label>
                  ) : (
                    <p className="mt-3 text-sm text-muted">{t.editor.videoNoAudio}</p>
                  )}
                </Field>
              )}

              {isVideo && opts.video && videoEditing && (
                <Field label={t.editor.focalPoint}>
                  <PhotoCropper
                    photo={opts.video.poster}
                    target={SIZES[opts.format]}
                    value={opts.videoCrop}
                    onChange={(videoCrop) => set("videoCrop", videoCrop)}
                    zoomable={false}
                    hint={t.editor.videoCropHint}
                  />
                </Field>
              )}

              {opts.background === "photo" && opts.photo && photoEditing && (
                <Field label={t.editor.focalPoint}>
                  <PhotoCropper
                    photo={opts.photo}
                    target={SIZES[opts.format]}
                    value={opts.photoCrop}
                    onChange={(photoCrop) => set("photoCrop", photoCrop)}
                  />
                </Field>
              )}
              <Field label={t.editor.format}>
                <Segmented options={formats(t)} value={opts.format} onChange={(v) => set("format", v)} />
              </Field>
            </>
          )}

          {tab === "elements" && (
            <Field label={t.editor.elements}>
              <div className="flex flex-wrap gap-2">
                {activity?.polyline && (
                  <Pill
                    on={opts.showRoute}
                    onClick={() => {
                      set("showRoute", !opts.showRoute);
                      if (opts.showRoute) setSelection((s) => s.filter((k) => k !== "route"));
                    }}
                  >
                    {t.editor.elementRoute}
                  </Pill>
                )}
                <Pill
                  on={opts.showName}
                  onClick={() => {
                    set("showName", !opts.showName);
                    if (opts.showName) setSelection((s) => s.filter((k) => k !== "title"));
                  }}
                >
                  {t.editor.showTitleName}
                </Pill>
                <Pill
                  on={opts.showMeta}
                  onClick={() => {
                    set("showMeta", !opts.showMeta);
                    if (opts.showMeta) setSelection((s) => s.filter((k) => k !== "meta"));
                  }}
                >
                  {t.editor.showTitleMeta}
                </Pill>
                {STATS.map((s) => (
                  <Pill
                    key={s.id}
                    on={opts.stats.includes(s.id)}
                    onClick={() => {
                      toggleStat(s.id);
                      if (opts.stats.includes(s.id))
                        setSelection((sel) => sel.filter((k) => k !== `stat:${s.id}`));
                    }}
                  >
                    {s.label}
                  </Pill>
                ))}
              </div>
            </Field>
          )}

          {tab === "style" && (
            <>
              {activity && selection.length === 0 && (
                <p className="text-sm text-muted">
                  {t.editor.textHint} {t.editor.multiHint}
                </p>
              )}

              {selection.length > 1 && (
                <Field label={t.editor.multiSelected(selection.length)}>
                  <AlignButtons onAlign={alignSelection} />

                  {selectedTexts.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <label htmlFor="multi-size" className="text-muted">
                          {t.editor.textSize}
                        </label>
                        <span className="flex items-center gap-2 text-muted">
                          {Math.round(commonSize * 100)}%
                          {selectedTexts.some((k) => styleOfKey(k).size !== null) && (
                            <button type="button" onClick={() => setSelectionSize(null)} className="link">
                              {t.editor.resetZoom}
                            </button>
                          )}
                        </span>
                      </div>
                      <input
                        id="multi-size"
                        type="range"
                        min={TEXT_SIZE_MIN}
                        max={TEXT_SIZE_MAX}
                        step={0.05}
                        value={commonSize}
                        onChange={(e) => setSelectionSize(Number.parseFloat(e.target.value))}
                        className="range w-full"
                      />
                    </div>
                  )}
                  <div className="mt-4">
                    <p className="field-label">{t.editor.color}</p>
                    <ColorPicker
                      value={commonColor}
                      onChange={setSelectionColor}
                      allowAuto={selectedTexts.length > 0}
                    />
                  </div>
                </Field>
              )}

              {selectedText && (
                <Field label={`${t.editor.textLayout} · ${textLabel(selectedText)}`}>
                  {selectedText === "title" && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <label htmlFor="title-text" className="text-muted">
                          {t.editor.titleText}
                        </label>
                        <span className="text-muted">
                          {(opts.titleText ?? activity?.name ?? "").length}/{TITLE_MAX}
                        </span>
                      </div>
                      <input
                        id="title-text"
                        type="text"
                        maxLength={TITLE_MAX}
                        value={opts.titleText ?? activity?.name ?? ""}
                        onChange={(e) => set("titleText", e.target.value.slice(0, TITLE_MAX))}
                        className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-primary"
                      />
                      {opts.titleText !== null && (
                        <button
                          type="button"
                          onClick={() => set("titleText", null)}
                          className="link mt-1 text-sm"
                        >
                          {t.editor.titleReset}
                        </button>
                      )}
                    </div>
                  )}
                  <TextStylePanel
                    value={opts.texts[selectedText] ?? DEFAULT_TEXT_STYLE}
                    onChange={(style) => set("texts", { ...opts.texts, [selectedText]: style })}
                  />
                  <div className="mt-4 border-t border-border pt-4">
                    <LayerButtons
                      up={canMoveUp(selectedText)}
                      down={canMoveDown(selectedText)}
                      onMove={(d) => moveLayer(selectedText, d)}
                    />
                    <CenterButtons onCenter={(axis) => centerLayer(selectedText, axis)} />
                  </div>
                </Field>
              )}

              {selected === "credit" && (
                <Field label={t.editor.creditColor}>
                  <ColorPicker value={opts.creditColor} onChange={(c) => set("creditColor", c)} allowAuto />
                  <p className="mt-2 text-xs text-muted">{t.editor.creditHint}</p>
                </Field>
              )}

              {selected === "brand" && (
                <Field label={t.editor.brandCorner}>
                  <CornerPicker value={opts.brandCorner} onChange={(c) => set("brandCorner", c)} />
                  <p className="field-label mt-4">{t.editor.brandColor}</p>
                  <Segmented
                    options={BRAND_COLORS.map((c) => ({ id: c, label: t.editor.brandColors[c] }))}
                    value={opts.brandColor}
                    onChange={(v: BrandColor) => set("brandColor", v)}
                  />
                </Field>
              )}

              {selected === "route" && drawnBox && (
                <Field label={t.editor.routeLayout} hint={t.editor.routeHint}>
                  <div className="flex items-center gap-3 mb-4">
                    <label htmlFor="route-size" className="text-sm text-muted">
                      {t.editor.routeSize}
                    </label>
                    <input
                      id="route-size"
                      type="range"
                      min={0.1}
                      max={1.5}
                      step={0.01}
                      value={drawnBox.w}
                      onChange={(e) => {
                        const w = Number.parseFloat(e.target.value);
                        const h = drawnBox.h * (w / drawnBox.w);
                        const cx = drawnBox.x + drawnBox.w / 2;
                        const cy = drawnBox.y + drawnBox.h / 2;
                        set("routeBox", { x: cx - w / 2, y: cy - h / 2, w, h });
                      }}
                      className="range flex-1"
                    />
                    {opts.routeBox && (
                      <button type="button" onClick={() => set("routeBox", null)} className="link text-sm">
                        {t.editor.routeAuto}
                      </button>
                    )}
                  </div>
                  <p className="mb-4 text-sm text-muted">{t.editor.routeColor}</p>
                  <div className="mb-4">
                    <ColorPicker value={opts.routeColor} onChange={(c) => c && set("routeColor", c)} />
                  </div>
                  <div className="mb-2">
                    <RouteTrim value={opts.routeTrim} onChange={(v) => set("routeTrim", v)} />
                  </div>
                  <LayerButtons
                    up={canMoveUp("route")}
                    down={canMoveDown("route")}
                    onMove={(d) => moveLayer("route", d)}
                  />
                  <CenterButtons onCenter={(axis) => centerLayer("route", axis)} />
                </Field>
              )}
            </>
          )}
        </section>
      </div>

      {/* Mobile: bottom bar */}
      <EditorNav
        tab={tab}
        onChange={setTab}
        orientation="horizontal"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-border bg-background/85 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
        trailing={
          <>
            <span className="mx-1 my-2 w-px bg-border" aria-hidden="true" />
            <div className="flex flex-col justify-center gap-0.5 px-1">
              <UndoRedo size="nav" />
            </div>
            <div className="flex items-center gap-1.5 pr-1">
              <SettingsMenu onRefresh={refreshActivity} actions={menuActions} />
              <ShareButton compact />
            </div>
          </>
        }
      />

      {toast && (
        <p
          role="status"
          className="toast fixed inset-x-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md lg:bottom-5"
        >
          {toast}
        </p>
      )}
    </main>
  );
}

/**
 * Settings worth keeping between activities: everything that is not tied to one activity
 * (positions, photo, video, crop are dropped; text styles are kept without their positions).
 */
const PREFS_KEY = "ofolam.editorPrefs";
type EditorPrefs = Partial<
  Pick<
    CardOptions,
    | "format"
    | "background"
    | "mapStyle"
    | "mapOpacity"
    | "bgTint"
    | "routeColor"
    | "stats"
    | "showName"
    | "showMeta"
    | "showRoute"
    | "routeTrim"
    | "order"
    | "brandCorner"
    | "brandColor"
    | "creditColor"
    | "texts"
  >
>;
function loadPrefs(): EditorPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as EditorPrefs) : {};
  } catch {
    return {};
  }
}
function savePrefs(o: CardOptions) {
  const texts: CardOptions["texts"] = {};
  for (const [k, v] of Object.entries(o.texts))
    if (v) texts[k as keyof CardOptions["texts"]] = { ...v, pos: null };
  const prefs: EditorPrefs = {
    format: o.format,
    background: o.background === "photo" || o.background === "video" ? "night" : o.background,
    mapStyle: o.mapStyle,
    mapOpacity: o.mapOpacity,
    bgTint: o.bgTint,
    routeColor: o.routeColor,
    stats: o.stats,
    showName: o.showName,
    showMeta: o.showMeta,
    showRoute: o.showRoute,
    routeTrim: o.routeTrim,
    order: o.order,
    brandCorner: o.brandCorner,
    brandColor: o.brandColor,
    creditColor: o.creditColor,
    texts,
  };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable: preferences just won't persist
  }
}

/** True when the two option sets differ only by the dictionary (language switch). */
function sameExceptDictionary(a: CardOptions, b: CardOptions): boolean {
  for (const key of Object.keys(a) as (keyof CardOptions)[]) {
    if (key === "t") continue;
    if (a[key] !== b[key]) return false;
  }
  return true;
}

type Tab = "layout" | "elements" | "style";
const TABS: { id: Tab; icon: string }[] = [
  // Simple line icons (24×24 viewBox paths), no icon library needed
  { id: "layout", icon: "M4 5h16v14H4z M4 12h16" },
  { id: "elements", icon: "M5 7h14 M5 12h14 M5 17h9" },
  { id: "style", icon: "M12 3l2.5 5.5L20 9l-4 4 1 6-5-2.7L7 19l1-6-4-4 5.5-.5z" },
];
/** Maximum length of a custom activity name on the card. */
const TITLE_MAX = 120;
const SHARE_ICON = "M12 16V4 M8 8l4-4 4 4 M5 14v6h14v-6";
const PLAY_ICON = "M7 4.5v15l12.5-7.5z";
const PAUSE_ICON = "M6 4.5h4v15H6z M14 4.5h4v15h-4z";

/** Section switcher: a vertical rail on desktop, a bottom bar on mobile. */
function EditorNav({
  tab,
  onChange,
  orientation,
  className = "",
  trailing,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  orientation: "vertical" | "horizontal";
  className?: string;
  /** Extra controls rendered after the tabs (mobile: undo / redo). */
  trailing?: React.ReactNode;
}) {
  const { t } = useI18n();
  const vertical = orientation === "vertical";
  return (
    <nav
      aria-label={t.editor.navLabel}
      className={`${vertical ? "card flex-col gap-1 p-2" : "justify-around px-2 pt-2"} ${className}`}
    >
      {TABS.map((item) => {
        const on = tab === item.id;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-current={on ? "page" : undefined}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${vertical ? "w-20" : "flex-1"} ${on ? "bg-secondary text-secondary-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon} />
            </svg>
            {t.editor.tabs[item.id]}
          </button>
        );
      })}
      {trailing}
    </nav>
  );
}

/** Layer order controls: one step up / down, or straight to the front / back. */
function LayerButtons({
  up,
  down,
  onMove,
}: {
  up: boolean;
  down: boolean;
  onMove: (dir: 1 | -1 | "top" | "bottom") => void;
}) {
  const { t } = useI18n();
  const cls = "btn btn-outline btn-sm";
  const icon = (d: string) => (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">{t.editor.layer}</span>
      <button
        type="button"
        onClick={() => onMove("top")}
        disabled={!up}
        className={cls}
        title={t.editor.layerFront}
        aria-label={t.editor.layerFront}
      >
        {icon("M12 19V7 M6 13l6-6 6 6 M6 4h12")}
      </button>
      <button type="button" onClick={() => onMove(1)} disabled={!up} className={cls}>
        {icon("M12 19V5 M6 11l6-6 6 6")}
        {t.editor.layerUp}
      </button>
      <button type="button" onClick={() => onMove(-1)} disabled={!down} className={cls}>
        {icon("M12 5v14 M6 13l6 6 6-6")}
        {t.editor.layerDown}
      </button>
      <button
        type="button"
        onClick={() => onMove("bottom")}
        disabled={!down}
        className={cls}
        title={t.editor.layerBack}
        aria-label={t.editor.layerBack}
      >
        {icon("M12 5v12 M6 11l6 6 6-6 M6 20h12")}
      </button>
    </div>
  );
}

const ALIGNS: { how: "left" | "centerX" | "right" | "top" | "centerY" | "bottom"; icon: string }[] = [
  { how: "left", icon: "M4 4v16 M8 8h10v3H8z M8 13h6v3H8z" },
  { how: "centerX", icon: "M12 4v16 M7 8h10v3H7z M9 13h6v3H9z" },
  { how: "right", icon: "M20 4v16 M6 8h10v3H6z M10 13h6v3h-6z" },
  { how: "top", icon: "M4 4h16 M8 8h3v10H8z M13 8h3v6h-3z" },
  { how: "centerY", icon: "M4 12h16 M8 7h3v10H8z M13 9h3v6h-3z" },
  { how: "bottom", icon: "M4 20h16 M8 6h3v10H8z M13 10h3v6h-3z" },
];

/** Aligns a multi-selection on an edge or axis of its bounding box: one row per axis. */
function AlignButtons({ onAlign }: { onAlign: (how: (typeof ALIGNS)[number]["how"]) => void }) {
  const { t } = useI18n();
  const rows: { label: string; hows: (typeof ALIGNS)[number]["how"][] }[] = [
    { label: t.editor.alignHorizontal, hows: ["left", "centerX", "right"] },
    { label: t.editor.alignVertical, hows: ["top", "centerY", "bottom"] },
  ];
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-sm text-muted">{row.label}</span>
          {row.hows.map((how) => {
            const icon = ALIGNS.find((a) => a.how === how)!.icon;
            return (
              <button
                type="button"
                key={how}
                onClick={() => onAlign(how)}
                className="btn btn-outline btn-sm"
                title={t.editor.aligns[how]}
                aria-label={t.editor.aligns[how]}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={icon} />
                </svg>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Centers the selected layer horizontally or vertically on the card. */
function CenterButtons({ onCenter }: { onCenter: (axis: "x" | "y") => void }) {
  const { t } = useI18n();
  const cls = "btn btn-outline btn-sm";
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="text-sm text-muted">{t.editor.align}</span>
      <button type="button" onClick={() => onCenter("x")} className={cls}>
        {t.editor.centerH}
      </button>
      <button type="button" onClick={() => onCenter("y")} className={cls}>
        {t.editor.centerV}
      </button>
    </div>
  );
}

/** Privacy slider: meters hidden at both ends of the route. */
function RouteTrim({ value, onChange }: { value: number; onChange: (meters: number) => void }) {
  const { t } = useI18n();
  const id = useId();
  const [showHint, setShowHint] = useState(false);
  const hintId = useId();
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="field-label !mb-0">{t.editor.routeTrim}</p>
        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          aria-expanded={showHint}
          aria-controls={hintId}
          aria-label={t.editor.routeTrimHint}
          title={t.editor.routeTrimHint}
          className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold leading-none transition-colors ${showHint ? "border-secondary bg-secondary text-secondary-foreground" : "border-border text-muted hover:border-muted hover:text-foreground"}`}
        >
          ?
        </button>
      </div>
      {showHint && (
        <p id={hintId} className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          {t.editor.routeTrimHint}
        </p>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{value} m</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={1000}
        step={50}
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
        className="range w-full"
      />
    </div>
  );
}

/** Toggle chip used to choose which elements appear on the card. */
function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="chip">
      {children}
    </button>
  );
}

/** Labelled block; `hint` adds a "?" next to the label that reveals a short explanation. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const [showHint, setShowHint] = useState(false);
  const hintId = useId();
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="field-label !mb-0">{label}</p>
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            aria-expanded={showHint}
            aria-controls={hintId}
            aria-label={hint}
            title={hint}
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold leading-none transition-colors ${showHint ? "border-secondary bg-secondary text-secondary-foreground" : "border-border text-muted hover:border-muted hover:text-foreground"}`}
          >
            ?
          </button>
        )}
      </div>
      {hint && showHint && (
        <p id={hintId} className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cols = useBalancedColumns(ref);
  return (
    <div
      ref={ref}
      role="radiogroup"
      className="seg"
      data-cols={cols ?? undefined}
      style={cols ? ({ "--seg-cols": cols } as React.CSSProperties) : undefined}
    >
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className="seg-item"
        >
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Column count that spreads a wrapping segmented control evenly over its rows
 * (6 options on 2 rows: 3 + 3, not 5 + 1). Null while everything fits on one row.
 * Widths come from the labels' own spans, so the result does not depend on the
 * layout it produces (no resize loop).
 */
function useBalancedColumns(ref: React.RefObject<HTMLDivElement | null>): number | null {
  const [cols, setCols] = useState<number | null>(null);
  useLayoutEffect(() => {
    const seg = ref.current;
    const parent = seg?.parentElement;
    if (!seg || !parent) return;
    const measure = () => {
      const items = Array.from(seg.children) as HTMLElement[];
      if (items.length < 2) return setCols(null);
      const px = (v: string) => Number.parseFloat(v) || 0;
      const segStyle = getComputedStyle(seg);
      const segPad =
        px(segStyle.paddingLeft) +
        px(segStyle.paddingRight) +
        px(segStyle.borderLeftWidth) +
        px(segStyle.borderRightWidth);
      const gap = px(segStyle.columnGap);
      const widths = items.map((item) => {
        const style = getComputedStyle(item);
        const label = item.firstElementChild?.getBoundingClientRect().width ?? 0;
        return Math.ceil(label + px(style.paddingLeft) + px(style.paddingRight));
      });
      const parentStyle = getComputedStyle(parent);
      const avail = parent.clientWidth - px(parentStyle.paddingLeft) - px(parentStyle.paddingRight) - segPad;
      const oneRow = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
      if (oneRow <= avail) return setCols(null);
      // As many equal columns as the widest option allows, then rebalanced over the rows needed
      const perRow = Math.max(1, Math.floor((avail + gap) / (Math.max(...widths) + gap)));
      const rows = Math.ceil(items.length / perRow);
      setCols(Math.ceil(items.length / rows));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(parent);
    // Labels change width when web fonts arrive or the language switches
    for (const item of Array.from(seg.children))
      if (item.firstElementChild) observer.observe(item.firstElementChild);
    return () => observer.disconnect();
  });
  return cols;
}
