import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import { Dialog } from "../components/Dialog";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

describe("Dialog", () => {
  it("renders nothing when visible is false", () => {
    dispose = render(
      () => (
        <Dialog title="Test" visible={false} onClose={() => {}}>
          <div>Content</div>
        </Dialog>
      ),
      document.body
    );
    expect(document.querySelector(".dialog")).toBeNull();
    expect(document.querySelector(".dialog-overlay")).toBeNull();
  });

  it("renders the dialog when visible is true", () => {
    dispose = render(
      () => (
        <Dialog title="My Dialog" visible={true} onClose={() => {}}>
          <div>Body text</div>
        </Dialog>
      ),
      document.body
    );
    expect(document.querySelector(".dialog")).not.toBeNull();
  });

  it("shows the title in the title bar", () => {
    dispose = render(
      () => (
        <Dialog title="About eXo Terminal" visible={true} onClose={() => {}}>
          <div />
        </Dialog>
      ),
      document.body
    );
    expect(document.querySelector(".dialog__title")?.textContent).toBe(
      "About eXo Terminal"
    );
  });

  it("renders children inside the body", () => {
    dispose = render(
      () => (
        <Dialog title="Test" visible={true} onClose={() => {}}>
          <div class="inner">Hello from body</div>
        </Dialog>
      ),
      document.body
    );
    expect(document.querySelector(".dialog__body .inner")?.textContent).toBe(
      "Hello from body"
    );
  });

  it("calls onClose when the overlay backdrop is clicked", () => {
    const onClose = vi.fn();
    dispose = render(
      () => (
        <Dialog title="Test" visible={true} onClose={onClose}>
          <div>Content</div>
        </Dialog>
      ),
      document.body
    );
    const overlay = document.querySelector(".dialog-overlay") as HTMLElement;
    // Simulate a click directly on the overlay (not a child element)
    overlay.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does NOT call onClose when the inner dialog box is clicked", () => {
    const onClose = vi.fn();
    dispose = render(
      () => (
        <Dialog title="Test" visible={true} onClose={onClose}>
          <div>Content</div>
        </Dialog>
      ),
      document.body
    );
    const inner = document.querySelector(".dialog") as HTMLElement;
    inner.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );
    // onClose should not have been called — the event target is the inner box,
    // not the overlay, so the e.target === e.currentTarget guard prevents it
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders footer content when footer prop is provided", () => {
    dispose = render(
      () => (
        <Dialog
          title="Test"
          visible={true}
          onClose={() => {}}
          footer={<button class="ok-btn">OK</button>}
        >
          <div>Content</div>
        </Dialog>
      ),
      document.body
    );
    expect(document.querySelector(".dialog__footer")).not.toBeNull();
    expect(document.querySelector(".ok-btn")?.textContent).toBe("OK");
  });

  it("does not render the footer section when footer is not provided", () => {
    dispose = render(
      () => (
        <Dialog title="Test" visible={true} onClose={() => {}}>
          <div>Content</div>
        </Dialog>
      ),
      document.body
    );
    expect(document.querySelector(".dialog__footer")).toBeNull();
  });
});
