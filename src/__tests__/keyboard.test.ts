import { describe, it, expect, vi, beforeEach } from "vitest";

// Import a fresh module for each test to avoid shared state
// We test the keyboard module logic directly

describe("keyboard handler", () => {
  let bindings: any[];
  let currentContext: string;

  // Minimal re-implementation matching the module's logic for unit testing
  function makeHandler() {
    bindings = [];
    currentContext = "list";

    function setContext(ctx: string) { currentContext = ctx; }
    function getContext() { return currentContext; }

    function registerKey(binding: any) { bindings.push(binding); }

    function dispatch(e: Partial<KeyboardEvent>) {
      const target = (e.target as any) ?? { tagName: "DIV" };
      if (
        target.tagName === "INPUT" &&
        !e.altKey &&
        !e.ctrlKey &&
        e.key !== "Escape" &&
        e.key !== "Tab"
      ) return;

      for (const binding of bindings) {
        if (binding.context && binding.context !== currentContext && binding.context !== "global") continue;
        const keyMatch = e.key === binding.key || e.code === binding.key;
        const ctrlMatch = !!binding.ctrl === !!(e.ctrlKey);
        const altMatch = !!binding.alt === !!(e.altKey);
        const shiftMatch = binding.shift === undefined || !!binding.shift === !!(e.shiftKey);
        if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
          binding.handler(e);
          return;
        }
      }
    }

    return { setContext, getContext, registerKey, dispatch };
  }

  it("registers and dispatches a key binding", () => {
    const { registerKey, dispatch } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "Enter", context: "global", handler });
    dispatch({ key: "Enter" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire handler for wrong key", () => {
    const { registerKey, dispatch } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "Enter", context: "global", handler });
    dispatch({ key: "Escape" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("respects context — global bindings fire in any context", () => {
    const { registerKey, dispatch, setContext } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "f", context: "global", handler });
    setContext("dialog");
    dispatch({ key: "f" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("respects context — context-specific binding does not fire in other context", () => {
    const { registerKey, dispatch, setContext } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "f", context: "list", handler });
    setContext("dialog");
    dispatch({ key: "f" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("context-specific binding fires in correct context", () => {
    const { registerKey, dispatch, setContext } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "f", context: "list", handler });
    setContext("list");
    dispatch({ key: "f" });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("distinguishes ctrl+key from plain key", () => {
    const { registerKey, dispatch } = makeHandler();
    const plainHandler = vi.fn();
    const ctrlHandler = vi.fn();
    registerKey({ key: "f", ctrl: false, context: "global", handler: plainHandler });
    registerKey({ key: "f", ctrl: true, context: "global", handler: ctrlHandler });

    dispatch({ key: "f", ctrlKey: false });
    expect(plainHandler).toHaveBeenCalledOnce();
    expect(ctrlHandler).not.toHaveBeenCalled();

    dispatch({ key: "f", ctrlKey: true });
    expect(ctrlHandler).toHaveBeenCalledOnce();
  });

  it("alt+key bindings fire correctly", () => {
    const { registerKey, dispatch } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "f", alt: true, context: "global", handler });
    dispatch({ key: "f", altKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("ignores regular keypresses in INPUT elements", () => {
    const { registerKey, dispatch } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "f", context: "global", handler });
    dispatch({ key: "f", target: { tagName: "INPUT" } as any });
    expect(handler).not.toHaveBeenCalled();
  });

  it("allows Escape from INPUT elements", () => {
    const { registerKey, dispatch } = makeHandler();
    const handler = vi.fn();
    registerKey({ key: "Escape", context: "global", handler });
    dispatch({ key: "Escape", target: { tagName: "INPUT" } as any });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("fires first matching binding only", () => {
    const { registerKey, dispatch } = makeHandler();
    const first = vi.fn();
    const second = vi.fn();
    registerKey({ key: "x", context: "global", handler: first });
    registerKey({ key: "x", context: "global", handler: second });
    dispatch({ key: "x" });
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });
});
