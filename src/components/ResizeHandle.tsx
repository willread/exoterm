import { Component } from "solid-js";

export const ResizeHandle: Component<{
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}> = (props) => {
  let startPos = 0;

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    startPos = props.direction === "horizontal" ? e.clientX : e.clientY;
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    const onPointerMove = (e: PointerEvent) => {
      const current = props.direction === "horizontal" ? e.clientX : e.clientY;
      const delta = current - startPos;
      if (Math.abs(delta) > 1) {
        props.onResize(delta);
        startPos = current;
      }
    };

    const onPointerUp = () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      class={`resize-handle resize-handle--${props.direction}`}
      onPointerDown={onPointerDown}
    />
  );
};
