export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
  );
}

export function canShareFiles(): boolean {
  if (!navigator.canShare) return false;
  const probe = new File([new Blob()], "probe.png", { type: "image/png" });
  return navigator.canShare({ files: [probe] });
}

/**
 * Opens the native share sheet (Instagram, WhatsApp, …).
 * Must be called directly from the click handler, with a blob already prepared:
 * Safari refuses to share if a promise is awaited first.
 */
export async function shareImage(blob: Blob, filename: string): Promise<"shared" | "cancelled"> {
  const file = new File([blob], filename, { type: "image/png" });
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    throw e;
  }
}

/**
 * Copies the image to the clipboard, to paste it as a sticker in an Instagram story.
 * A promise is handed to ClipboardItem (Safari requires it to stay within the user gesture).
 */
export function copyImage(blob: Blob | Promise<Blob>): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return Promise.reject(new Error("Copie d'image non supportée par ce navigateur"));
  }
  return navigator.clipboard.write([new ClipboardItem({ "image/png": Promise.resolve(blob) })]);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
