import { useEffect, useState } from "react";

/** Chrome's deferred install prompt (not in the DOM lib typings). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * How the app can be installed from here:
 * - "installed": already running as an installed app, nothing to offer
 * - "prompt": the browser handed us its install prompt (Chrome, Edge, Samsung Internet)
 * - "ios": Safari on iPhone/iPad, which only installs through its own Share menu
 * - "unsupported": other browsers, where an install hint would only confuse
 */
export type InstallState = "installed" | "prompt" | "ios" | "unsupported";

export const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIOS = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  // iPadOS reports itself as a Mac but has touch
  (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);

// The prompt event fires once, often before React mounts: keep it at module level
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    for (const l of listeners) l();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    for (const l of listeners) l();
  });
}

const compute = (): InstallState => {
  if (isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isIOS()) return "ios";
  return "unsupported";
};

/** Current install state, plus the native prompt when the browser provides one. */
export function useInstall(): { state: InstallState; prompt: () => Promise<boolean> } {
  const [state, setState] = useState<InstallState>(compute);
  useEffect(() => {
    const update = () => setState(compute());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);
  const prompt = async () => {
    const ev = deferred;
    if (!ev) return false;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    if (outcome === "accepted") deferred = null;
    setState(compute());
    return outcome === "accepted";
  };
  return { state, prompt };
}
