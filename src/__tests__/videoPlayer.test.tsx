import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { render } from "solid-js/web";
import { VideoPlayer } from "../components/VideoPlayer";
import { getGameVideos } from "../lib/commands";

const mockInvoke = vi.mocked(invoke);
const mockConvertFileSrc = vi.mocked(convertFileSrc);

let dispose: (() => void) | undefined;

beforeEach(() => {
  mockInvoke.mockReset();
  mockConvertFileSrc.mockImplementation((path) => `asset://localhost/${path}`);
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// getGameVideos command
// ---------------------------------------------------------------------------
describe("getGameVideos", () => {
  it("calls invoke with get_game_videos and id", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    await getGameVideos(42);
    expect(mockInvoke).toHaveBeenCalledWith("get_game_videos", { id: 42 });
  });

  it("returns the video list from invoke", async () => {
    const mockVideos = [
      { name: "Doom-intro.mp4",    path: "C:\\eXoDOS\\Videos\\Doom\\Doom-intro.mp4",    source: "bat" },
      { name: "Doom-gameplay.mp4", path: "C:\\eXoDOS\\Videos\\Doom\\Doom-gameplay.mp4", source: "dir" },
    ];
    mockInvoke.mockResolvedValueOnce(mockVideos);
    const result = await getGameVideos(1);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Doom-intro.mp4");
    expect(result[0].source).toBe("bat");
    expect(result[1].source).toBe("dir");
  });

  it("returns empty array when no videos found", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const result = await getGameVideos(99);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// VideoPlayer component
// ---------------------------------------------------------------------------
describe("VideoPlayer rendering", () => {
  it("renders the video element with the given src", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("asset://localhost/test.mp4");
  });

  it("renders the filename in the header", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/Doom-gameplay.mp4" name="Doom-gameplay.mp4" />,
      document.body
    );
    const header = document.querySelector(".video-player__header");
    expect(header?.textContent).toContain("Doom-gameplay.mp4");
  });

  it("shows play button with play symbol when not playing", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    const playBtn = document.querySelector(".video-player__play-btn");
    expect(playBtn).not.toBeNull();
    // ▶ character
    expect(playBtn?.textContent).toBe("▶");
  });

  it("renders seek and volume range inputs", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    const seek = document.querySelector(".video-player__seek");
    const volume = document.querySelector(".video-player__volume");
    expect(seek).not.toBeNull();
    expect(volume).not.toBeNull();
    expect(seek?.getAttribute("type")).toBe("range");
    expect(volume?.getAttribute("type")).toBe("range");
  });

  it("shows time display", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    const time = document.querySelector(".video-player__time");
    expect(time).not.toBeNull();
    // Should show 0:00/0:00 initially
    expect(time?.textContent).toBe("0:00/0:00");
  });

  it("does not render nav buttons when no onPrev/onNext provided", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    expect(document.querySelectorAll(".video-player__nav-btn")).toHaveLength(0);
  });

  it("shows BAT badge for bat-sourced videos", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/intro.mp4" name="intro.mp4" source="bat" />,
      document.body
    );
    const badge = document.querySelector(".video-player__source-badge");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("BAT");
  });

  it("does not show BAT badge for dir-sourced videos", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/gameplay.mp4" name="gameplay.mp4" source="dir" />,
      document.body
    );
    expect(document.querySelector(".video-player__source-badge")).toBeNull();
  });

  it("does not show BAT badge when source is omitted", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    expect(document.querySelector(".video-player__source-badge")).toBeNull();
  });

  it("renders prev/next nav buttons when callbacks provided", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    dispose = render(
      () => (
        <VideoPlayer
          src="asset://localhost/test.mp4"
          name="test.mp4"
          onPrev={onPrev}
          onNext={onNext}
          navLabel="1/3"
        />
      ),
      document.body
    );
    const navBtns = document.querySelectorAll(".video-player__nav-btn");
    expect(navBtns).toHaveLength(2);
    expect(document.querySelector(".video-player__nav-label")?.textContent).toBe("1/3");
  });

  it("calls onPrev when prev button is clicked", () => {
    const onPrev = vi.fn();
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" onPrev={onPrev} />,
      document.body
    );
    const [prevBtn] = document.querySelectorAll<HTMLElement>(".video-player__nav-btn");
    prevBtn.click();
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("calls onNext when next button is clicked", () => {
    const onNext = vi.fn();
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" onNext={onNext} />,
      document.body
    );
    const [nextBtn] = document.querySelectorAll<HTMLElement>(".video-player__nav-btn");
    nextBtn.click();
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// formatTime helper (tested via rendered output)
// ---------------------------------------------------------------------------
describe("VideoPlayer time formatting", () => {
  it("displays 0:00/0:00 before metadata loads", () => {
    dispose = render(
      () => <VideoPlayer src="asset://localhost/test.mp4" name="test.mp4" />,
      document.body
    );
    expect(document.querySelector(".video-player__time")?.textContent).toBe("0:00/0:00");
  });
});
