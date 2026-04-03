import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "solid-js/web";
import { Lightbox } from "../components/Lightbox";
import type { GameImage } from "../lib/commands";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

const IMAGES: GameImage[] = [
  { category: "Screenshot", data_url: "data:image/png;base64,AAA" },
  { category: "Box Art", data_url: "data:image/png;base64,BBB" },
  { category: "Title Screen", data_url: "data:image/png;base64,CCC" },
];

function fireKey(key: string) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}

// ── Basic rendering ──────────────────────────────────────────────────────────

describe("Lightbox rendering", () => {
  it("renders image with correct src and alt", () => {
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={0}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    const img = document.querySelector(".lightbox__image") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe("data:image/png;base64,AAA");
    expect(img.alt).toBe("Screenshot");
  });

  it("shows counter '1 / 3' for multiple images", () => {
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={0}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    const counter = document.querySelector(".lightbox__counter");
    expect(counter).not.toBeNull();
    expect(counter!.textContent).toBe("1 / 3");
  });

  it("hides counter for single image", () => {
    dispose = render(
      () => (
        <Lightbox
          images={[IMAGES[0]]}
          index={0}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    const counter = document.querySelector(".lightbox__counter");
    expect(counter).toBeNull();
  });
});

// ── Arrow visibility ─────────────────────────────────────────────────────────

describe("Lightbox arrow visibility", () => {
  it("shows right arrow but not left when index=0", () => {
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={0}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    expect(document.querySelector(".lightbox__arrow--left")).toBeNull();
    expect(document.querySelector(".lightbox__arrow--right")).not.toBeNull();
  });

  it("shows left arrow but not right when at last index", () => {
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={2}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    expect(document.querySelector(".lightbox__arrow--left")).not.toBeNull();
    expect(document.querySelector(".lightbox__arrow--right")).toBeNull();
  });

  it("shows both arrows when in middle", () => {
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    expect(document.querySelector(".lightbox__arrow--left")).not.toBeNull();
    expect(document.querySelector(".lightbox__arrow--right")).not.toBeNull();
  });
});

// ── Click interactions ───────────────────────────────────────────────────────

describe("Lightbox click interactions", () => {
  it("clicking backdrop calls onClose", () => {
    const onClose = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={onClose}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    const backdrop = document.querySelector(".lightbox") as HTMLElement;
    backdrop.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking image does not call onClose", () => {
    const onClose = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={onClose}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    const img = document.querySelector(".lightbox__image") as HTMLElement;
    img.click();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("clicking left arrow calls onPrev", () => {
    const onPrev = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={vi.fn()}
          onPrev={onPrev}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    const leftArrow = document.querySelector(".lightbox__arrow--left") as HTMLElement;
    leftArrow.click();
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("clicking right arrow calls onNext", () => {
    const onNext = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={onNext}
        />
      ),
      document.body
    );
    const rightArrow = document.querySelector(".lightbox__arrow--right") as HTMLElement;
    rightArrow.click();
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

// ── Keyboard interactions ────────────────────────────────────────────────────

describe("Lightbox keyboard interactions", () => {
  it("Escape key calls onClose", () => {
    const onClose = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={onClose}
          onPrev={vi.fn()}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    fireKey("Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ArrowLeft key calls onPrev", () => {
    const onPrev = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={vi.fn()}
          onPrev={onPrev}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    fireKey("ArrowLeft");
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("ArrowRight key calls onNext", () => {
    const onNext = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={1}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={onNext}
        />
      ),
      document.body
    );
    fireKey("ArrowRight");
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("ArrowLeft does nothing when index=0", () => {
    const onPrev = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={0}
          onClose={vi.fn()}
          onPrev={onPrev}
          onNext={vi.fn()}
        />
      ),
      document.body
    );
    fireKey("ArrowLeft");
    expect(onPrev).not.toHaveBeenCalled();
  });

  it("ArrowRight does nothing at last index", () => {
    const onNext = vi.fn();
    dispose = render(
      () => (
        <Lightbox
          images={IMAGES}
          index={2}
          onClose={vi.fn()}
          onPrev={vi.fn()}
          onNext={onNext}
        />
      ),
      document.body
    );
    fireKey("ArrowRight");
    expect(onNext).not.toHaveBeenCalled();
  });
});
