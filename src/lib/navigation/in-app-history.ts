const IN_APP_NAV_KEY = "apnapick.in-app-nav-stack";

const MAX_STACK = 40;

let pendingPop = false;

function readStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(IN_APP_NAV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(IN_APP_NAV_KEY, JSON.stringify(stack));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Browser back/forward — do not treat as a new in-app hop. */
export function markInAppPop() {
  pendingPop = true;
}

/** Seed the current path on first paint so Back will not leave the site. */
export function seedInAppPath(path: string) {
  const stack = readStack();
  if (stack.length === 0) writeStack([path]);
}

/**
 * Record a client-side path change. Pops when the browser went back/forward;
 * otherwise pushes a new hop.
 */
export function recordInAppPath(path: string) {
  const stack = readStack();
  const popped = pendingPop;
  pendingPop = false;

  if (popped) {
    if (stack.length === 0) {
      writeStack([path]);
      return;
    }
    while (stack.length > 1 && stack[stack.length - 1] !== path) {
      stack.pop();
    }
    if (stack[stack.length - 1] !== path) {
      stack[stack.length - 1] = path;
    }
    writeStack(stack);
    return;
  }

  if (stack[stack.length - 1] === path) return;
  stack.push(path);
  if (stack.length > MAX_STACK) stack.splice(0, stack.length - MAX_STACK);
  writeStack(stack);
}

export function readInAppNavCount() {
  return Math.max(0, readStack().length - 1);
}

/** True only after an in-app navigation this tab — not because Google/Chrome sat behind us. */
export function hasInAppHistory() {
  return readInAppNavCount() > 0;
}
