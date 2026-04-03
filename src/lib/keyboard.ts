type KeyHandler = (e: KeyboardEvent) => void;

interface Binding {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: KeyHandler;
  context?: string;
}

let bindings: Binding[] = [];
let currentContext = "list";
let launching = false;
let handlerAttached = false;

export function setContext(ctx: string) {
  currentContext = ctx;
}

export function getContext() {
  return currentContext;
}

export function registerKey(binding: Binding) {
  bindings.push(binding);
}

export function unregisterKey(key: string, context?: string) {
  const idx = bindings.findIndex(
    (b) => b.key === key && b.context === context
  );
  if (idx >= 0) bindings.splice(idx, 1);
}

/** Clear all bindings — call before re-registering (e.g. HMR re-mount). */
export function clearBindings() {
  bindings = [];
}

function onKeyDown(e: KeyboardEvent) {
  // Ignore key repeats for launch-triggering keys
  if (e.repeat && (e.key === "Enter")) return;

  const target = e.target as HTMLElement;
  const tag = target.tagName;

  // Don't intercept typing in inputs/buttons (except Escape/Tab/Alt combos)
  if (
    (tag === "INPUT" || tag === "BUTTON" || tag === "SELECT") &&
    !e.altKey &&
    !e.ctrlKey &&
    e.key !== "Escape" &&
    e.key !== "Tab"
  ) {
    return;
  }

  for (const binding of bindings) {
    if (binding.context && binding.context !== currentContext && binding.context !== "global") {
      continue;
    }

    const keyMatch = e.key === binding.key || e.code === binding.key;
    const ctrlMatch = !!binding.ctrl === (e.ctrlKey || e.metaKey);
    const altMatch = !!binding.alt === e.altKey;
    const shiftMatch = binding.shift === undefined || !!binding.shift === e.shiftKey;

    if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
      e.preventDefault();
      e.stopPropagation();
      binding.handler(e);
      return;
    }
  }
}

export function initKeyboardHandler() {
  // Guard: only attach the listener once, even across HMR re-mounts.
  if (handlerAttached) return;
  handlerAttached = true;
  document.addEventListener("keydown", onKeyDown);
}

/** Debounced launch guard — prevents double-firing */
export function guardedLaunch(fn: () => Promise<any>) {
  if (launching) return;
  launching = true;
  fn().finally(() => {
    setTimeout(() => { launching = false; }, 2000);
  });
}
