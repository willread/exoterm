import { Component, Show, onMount, onCleanup } from "solid-js";
import type { GameImage } from "../lib/commands";

interface LightboxProps {
  images: GameImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Lightbox: Component<LightboxProps> = (props) => {
  const hasPrev = () => props.index > 0;
  const hasNext = () => props.index < props.images.length - 1;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      props.onClose();
    } else if (e.key === "ArrowLeft" && hasPrev()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      props.onPrev();
    } else if (e.key === "ArrowRight" && hasNext()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      props.onNext();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown, true);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown, true);
  });

  return (
    <div class="lightbox" onClick={props.onClose}>
      {/* Left arrow */}
      <Show when={hasPrev()}>
        <div
          class="lightbox__arrow lightbox__arrow--left"
          onClick={(e) => { e.stopPropagation(); props.onPrev(); }}
        >
          {"<"}
        </div>
      </Show>

      {/* Image */}
      <img
        class="lightbox__image"
        src={props.images[props.index]?.data_url}
        alt={props.images[props.index]?.category ?? ""}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Right arrow */}
      <Show when={hasNext()}>
        <div
          class="lightbox__arrow lightbox__arrow--right"
          onClick={(e) => { e.stopPropagation(); props.onNext(); }}
        >
          {">"}
        </div>
      </Show>

      {/* Counter */}
      <Show when={props.images.length > 1}>
        <div class="lightbox__counter" onClick={(e) => e.stopPropagation()}>
          {props.index + 1} / {props.images.length}
        </div>
      </Show>
    </div>
  );
};
