import { Component, For, Show, createEffect, createResource, createSignal } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { invoke } from "@tauri-apps/api/core";
import { selectedGame, gameList, selectedIndex, setFilters, setSelectedIndex } from "../lib/store";
import { getGameImages, getGameVideos, getGameExtras, launchGame } from "../lib/commands";
import { guardedLaunch } from "../lib/keyboard";
import type { GameExtra, GameImage } from "../lib/commands";
import { VideoPlayer } from "./VideoPlayer";

/** ASCII glyph representing the kind of an extra file. */
function extraKindGlyph(kind: string): string {
  switch (kind) {
    case "pdf":   return "[PDF]";
    case "image": return "[IMG]";
    case "video": return "[VID]";
    case "audio": return "[SND]";
    case "text":  return "[TXT]";
    default:      return "[???]";
  }
}

/** Quantize each RGB channel to 6-bit precision (VGA DAC), giving a 256-color-era look. */
function applyVgaQuantize(img: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / 4) * 4;
    data[i + 1] = Math.round(data[i + 1] / 4) * 4;
    data[i + 2] = Math.round(data[i + 2] / 4) * 4;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

const BoxArt: Component<{ image: GameImage; quantize: boolean }> = (props) => {
  // quantizedSrc holds the VGA-quantized data URL, or null to use the raw prop.
  // Must reset to null whenever the source image changes (new game selected)
  // so the stale quantized image isn't shown for the new game.
  const [quantizedSrc, setQuantizedSrc] = createSignal<string | null>(null);

  createEffect(() => {
    props.image.data_url; // track reactive dependency
    setQuantizedSrc(null);
  });

  const handleLoad = (e: Event) => {
    if (!props.quantize) return;
    const img = e.currentTarget as HTMLImageElement;
    setQuantizedSrc(applyVgaQuantize(img));
  };

  return (
    <div class="detail-panel__boxart-wrap">
      <img
        src={quantizedSrc() ?? props.image.data_url}
        alt={props.image.category}
        class="detail-panel__boxart"
        onLoad={handleLoad}
        title={props.image.category}
      />
    </div>
  );
};

export const DetailPanel: Component = () => {
  const game = () => selectedGame();
  const [quantize, setQuantize] = createSignal(true);
  const [videoIndex, setVideoIndex] = createSignal(0);
  const [extrasOpen, setExtrasOpen] = createSignal(true);

  const [images] = createResource(
    () => game()?.id,
    (id) => (id ? getGameImages(id) : Promise.resolve([] as GameImage[]))
  );

  const [videos] = createResource(
    () => game()?.id,
    async (id) => {
      if (!id) return [];
      const raw = await getGameVideos(id);
      return raw.map((v) => ({ ...v, src: convertFileSrc(v.path) }));
    }
  );

  const [extras] = createResource(
    () => game()?.id,
    (id) => (id ? getGameExtras(id) : Promise.resolve([] as GameExtra[]))
  );

  // Reset video index when game changes
  const currentVideo = () => {
    const vs = videos();
    if (!vs || vs.length === 0) return null;
    const idx = Math.min(videoIndex(), vs.length - 1);
    return vs[idx];
  };

  const boxArt = () => images()?.[0] ?? null;

  const handlePlay = () => {
    const games = gameList();
    const idx = selectedIndex();
    if (games[idx]) {
      guardedLaunch(() => launchGame(games[idx].id));
    }
  };

  return (
    <div class="detail-panel" tabindex="-1">
      <Show
        when={game()}
        fallback={
          <div class="detail-panel__empty">
            Select a game to view details
          </div>
        }
      >
        {(g) => (
          <>
            <div class="detail-panel__title">{g().title}</div>

            {/* Video player — shown when videos are found */}
            <Show when={currentVideo()}>
              {(vid) => (
                <VideoPlayer
                  src={vid().src}
                  name={vid().name}
                  source={vid().source}
                  onPrev={
                    videoIndex() > 0
                      ? () => setVideoIndex((i) => i - 1)
                      : undefined
                  }
                  onNext={
                    videos() && videoIndex() < videos()!.length - 1
                      ? () => setVideoIndex((i) => i + 1)
                      : undefined
                  }
                  navLabel={
                    videos() && videos()!.length > 1
                      ? `${videoIndex() + 1}/${videos()!.length}`
                      : undefined
                  }
                />
              )}
            </Show>

            {/* Box art */}
            <Show when={boxArt()}>
              {(img) => <BoxArt image={img()} quantize={quantize()} />}
            </Show>

            {/* 256-color toggle */}
            <Show when={images() && images()!.length > 0}>
              <div
                class="detail-panel__quantize-toggle"
                onClick={() => setQuantize(!quantize())}
                title="Toggle 256-color VGA quantize filter"
              >
                [{quantize() ? "x" : " "}] 256-color filter
              </div>
            </Show>

            {/* Metadata — scrollable middle section */}
            <div class="detail-panel__info">
              <Show when={g().platform}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Platform:</span>
                  <span class="detail-panel__value">{g().platform}</span>
                </div>
              </Show>

              <Show when={g().release_year}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Year:</span>
                  <span
                    class="detail-panel__value detail-panel__value--link"
                    onClick={() => { setFilters("year", g().release_year); setFilters("offset", 0); setSelectedIndex(0); }}
                  >{g().release_year}</span>
                </div>
              </Show>

              <Show when={g().developer}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Developer:</span>
                  <span
                    class="detail-panel__value detail-panel__value--link"
                    onClick={() => { setFilters("developer", g().developer!); setFilters("offset", 0); setSelectedIndex(0); }}
                  >{g().developer}</span>
                </div>
              </Show>

              <Show when={g().publisher}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Publisher:</span>
                  <span
                    class="detail-panel__value detail-panel__value--link"
                    onClick={() => { setFilters("publisher", g().publisher!); setFilters("offset", 0); setSelectedIndex(0); }}
                  >{g().publisher}</span>
                </div>
              </Show>

              <Show when={g().genre}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Genre:</span>
                  <span
                    class="detail-panel__value detail-panel__value--link"
                    onClick={() => { setFilters("genre", g().genre!); setFilters("offset", 0); setSelectedIndex(0); }}
                  >{g().genre}</span>
                </div>
              </Show>

              <Show when={g().series}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Series:</span>
                  <span
                    class="detail-panel__value detail-panel__value--link"
                    onClick={() => { setFilters("series", g().series!); setFilters("offset", 0); setSelectedIndex(0); }}
                  >{g().series}</span>
                </div>
              </Show>

              <Show when={g().play_mode}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Players:</span>
                  <span class="detail-panel__value">{g().play_mode}</span>
                </div>
              </Show>

              <Show when={g().source}>
                <div class="detail-panel__field">
                  <span class="detail-panel__label">Source:</span>
                  <span class="detail-panel__value">{g().source}</span>
                </div>
              </Show>

              <div class="detail-panel__field">
                <span class="detail-panel__label">Favorite:</span>
                <span class="detail-panel__value">
                  {g().favorite ? "\u2605 Yes" : "No"}
                </span>
              </div>

              <Show when={g().overview}>
                <div class="detail-panel__overview">{g().overview}</div>
              </Show>
            </div>

            {/* Extras — manuals, maps, magazines, etc. */}
            <Show when={extras() && extras()!.length > 0}>
              <div class="detail-panel__extras">
                <div
                  class="detail-panel__extras-header"
                  onClick={() => setExtrasOpen(!extrasOpen())}
                >
                  {extrasOpen() ? "\u25BC" : "\u25BA"} Extras ({extras()!.length})
                </div>
                <Show when={extrasOpen()}>
                  <div class="detail-panel__extras-list">
                    <For each={extras()}>
                      {(extra) => (
                        <div
                          class="detail-panel__extra-item"
                          onClick={() => invoke("open_path_with_shell", { path: extra.path }).catch(console.error)}
                          title={extra.path}
                        >
                          <span class="detail-panel__extra-kind">
                            {extraKindGlyph(extra.kind)}
                          </span>
                          <span class="detail-panel__extra-name">
                            {extra.name}
                          </span>
                          <Show when={extra.region}>
                            <span class="detail-panel__extra-region">
                              {extra.region}
                            </span>
                          </Show>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>

            {/* Play button pinned to bottom */}
            <div class="detail-panel__play-wrap">
              <button class="detail-panel__play-btn" onClick={handlePlay}>
                {"\u25B6 PLAY"}
              </button>
            </div>
          </>
        )}
      </Show>
    </div>
  );
};
