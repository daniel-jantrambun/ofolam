export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export PNG impossible"))), "image/png"),
  );
}

export function canShareFiles(): boolean {
  if (!navigator.canShare) return false;
  const probe = new File([new Blob()], "probe.png", { type: "image/png" });
  return navigator.canShare({ files: [probe] });
}

/**
 * Ouvre le menu de partage natif (Instagram, WhatsApp…).
 * Doit être appelé directement dans le handler du clic, avec un blob déjà prêt :
 * Safari refuse le partage si on attend une promesse avant.
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
 * Copie l'image dans le presse-papiers pour la coller en sticker dans une story Instagram.
 * On passe une promesse à ClipboardItem (exigé par Safari pour rester dans le geste utilisateur).
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
