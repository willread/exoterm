import { Component, JSX, Show } from "solid-js";

interface DialogProps {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: JSX.Element;
  footer?: JSX.Element;
}

export const Dialog: Component<DialogProps> = (props) => {
  return (
    <Show when={props.visible}>
      <div
        class="dialog-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") props.onClose();
        }}
      >
        <div class="dialog">
          <div class="dialog__title">{props.title}</div>
          <div class="dialog__body">{props.children}</div>
          <Show when={props.footer}>
            <div class="dialog__footer">{props.footer}</div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
