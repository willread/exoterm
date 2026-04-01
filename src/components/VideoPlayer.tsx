import { Component, createSignal, onCleanup, onMount, Show } from "solid-js";

export interface VideoPlayerProps {
  src: string;
  name: string;
  /** Called when user navigates to previous video (undefined = no prev) */
  onPrev?: () => void;
  /** Called when user navigates to next video (undefined = no next) */
  onNext?: () => void;
  /** e.g. "2 / 5" */
  navLabel?: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const VideoPlayer: Component<VideoPlayerProps> = (props) => {
  let videoRef!: HTMLVideoElement;

  const [playing, setPlaying] = createSignal(false);
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [volume, setVolume] = createSignal(1);
  const [seeking, setSeeking] = createSignal(false);

  const togglePlay = () => {
    if (playing()) {
      videoRef.pause();
    } else {
      videoRef.play().catch(() => {});
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      togglePlay();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      videoRef.currentTime = Math.max(0, videoRef.currentTime - 5);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      videoRef.currentTime = Math.min(duration(), videoRef.currentTime + 5);
    }
  };

  // Reset player state when src changes
  const resetState = () => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // We use an effect-like approach: track src changes via the prop accessor
  let prevSrc = props.src;
  const checkSrcChange = () => {
    if (props.src !== prevSrc) {
      prevSrc = props.src;
      resetState();
    }
  };

  onMount(() => {
    // Sync volume from initial signal value
    videoRef.volume = volume();
  });

  onCleanup(() => {
    if (videoRef && !videoRef.paused) {
      videoRef.pause();
    }
  });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled at video-player level
    <div
      class="video-player"
      tabindex="0"
      onKeyDown={handleKeyDown}
      onClick={() => videoRef.focus()}
    >
      {/* Title bar with navigation */}
      <div class="video-player__header">
        <Show when={props.onPrev}>
          <button
            class="video-player__nav-btn"
            onClick={props.onPrev}
            title="Previous video"
          >
            {"◄"}
          </button>
        </Show>
        <span class="video-player__title" title={props.name}>
          {props.name}
        </span>
        <Show when={props.navLabel}>
          <span class="video-player__nav-label">{props.navLabel}</span>
        </Show>
        <Show when={props.onNext}>
          <button
            class="video-player__nav-btn"
            onClick={props.onNext}
            title="Next video"
          >
            {"►"}
          </button>
        </Show>
      </div>

      {/* Video element — clicking toggles play/pause */}
      {/* biome-ignore lint/a11y/useMediaCaption: game trailers/gameplay videos have no captions */}
      <video
        ref={videoRef}
        src={props.src}
        class="video-player__video"
        preload="metadata"
        onClick={() => { checkSrcChange(); togglePlay(); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={() => {
          if (!seeking()) setCurrentTime(videoRef.currentTime);
        }}
        onLoadedMetadata={() => setDuration(videoRef.duration)}
        onDurationChange={() => setDuration(videoRef.duration)}
      />

      {/* Controls */}
      <div class="video-player__controls">
        <button
          class="video-player__play-btn"
          onClick={togglePlay}
          title={playing() ? "Pause [Space]" : "Play [Space]"}
        >
          {playing() ? "||" : "\u25B6"}
        </button>

        <input
          class="video-player__seek"
          type="range"
          min="0"
          max={duration() || 0}
          step="0.1"
          value={seeking() ? undefined : currentTime()}
          onMouseDown={() => setSeeking(true)}
          onMouseUp={(e) => {
            videoRef.currentTime = Number(e.currentTarget.value);
            setCurrentTime(Number(e.currentTarget.value));
            setSeeking(false);
          }}
          onInput={(e) => {
            if (seeking()) setCurrentTime(Number(e.currentTarget.value));
          }}
          title="Seek [← →]"
        />

        <span class="video-player__time">
          {formatTime(currentTime())}/{formatTime(duration())}
        </span>

        <span class="video-player__vol-label">VOL</span>
        <input
          class="video-player__volume"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume()}
          onInput={(e) => {
            const v = Number(e.currentTarget.value);
            setVolume(v);
            videoRef.volume = v;
          }}
          title="Volume"
        />
      </div>
    </div>
  );
};
