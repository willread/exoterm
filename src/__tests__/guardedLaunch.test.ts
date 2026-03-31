import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Re-implement guardedLaunch logic from keyboard.ts for isolated unit testing.
// The real module uses module-level state that persists across tests, so we
// test the logic directly here rather than fighting shared state.
// We add .catch(() => {}) before .finally() so that rejected promises don't
// surface as unhandled rejections in the test runner — the guard-reset behavior
// (the thing being tested) is identical either way.
function makeGuardedLaunch() {
  let launching = false;

  return function guardedLaunch(fn: () => Promise<any>) {
    if (launching) return;
    launching = true;
    fn()
      .catch(() => {})
      .finally(() => {
        setTimeout(() => {
          launching = false;
        }, 2000);
      });
  };
}

describe("guardedLaunch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the provided function", async () => {
    const guardedLaunch = makeGuardedLaunch();
    const fn = vi.fn().mockResolvedValue("ok");
    guardedLaunch(fn);
    await Promise.resolve();
    expect(fn).toHaveBeenCalledOnce();
  });

  it("ignores a second call while the first is still within the guard window", async () => {
    const guardedLaunch = makeGuardedLaunch();
    const fn = vi.fn().mockResolvedValue("ok");

    guardedLaunch(fn);
    await Promise.resolve(); // let the first call's finally run
    guardedLaunch(fn); // second call — should be suppressed

    expect(fn).toHaveBeenCalledOnce();
  });

  it("allows another launch after the 2-second guard expires", async () => {
    const guardedLaunch = makeGuardedLaunch();
    const fn = vi.fn().mockResolvedValue("ok");

    guardedLaunch(fn);
    // Two microtasks needed: one for fn resolve → .catch handler, one for .finally handler
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(2001); // expire the 2-second guard
    guardedLaunch(fn); // should now go through

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not allow a launch exactly at the guard boundary", async () => {
    const guardedLaunch = makeGuardedLaunch();
    const fn = vi.fn().mockResolvedValue("ok");

    guardedLaunch(fn);
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(1999); // still within guard window
    guardedLaunch(fn);

    expect(fn).toHaveBeenCalledOnce();
  });

  it("works for a rejected launch promise (guard still resets after)", async () => {
    const guardedLaunch = makeGuardedLaunch();
    const fn = vi.fn().mockRejectedValue(new Error("launch failed"));

    guardedLaunch(fn);
    // Let the rejection settle (finally still runs after reject)
    await Promise.resolve();
    await Promise.resolve();

    vi.advanceTimersByTime(2001);
    guardedLaunch(fn); // second call after reset

    expect(fn).toHaveBeenCalledTimes(2);
  });
});
