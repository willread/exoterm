import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  getFilterOptions,
  getGameImages,
  scanCollection,
  deleteCollection,
  killGame,
  sendGameInput,
  getConfig,
  setConfig,
} from "../lib/commands";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("getFilterOptions", () => {
  it("calls invoke with get_filter_options and content_type", async () => {
    mockInvoke.mockResolvedValueOnce({
      genres: ["Action", "RPG"],
      developers: [],
      publishers: [],
      years: [],
      series: [],
      platforms: [],
    });
    await getFilterOptions("Game");
    expect(mockInvoke).toHaveBeenCalledWith("get_filter_options", {
      content_type: "Game",
    });
  });

  it("passes undefined content_type when not provided", async () => {
    mockInvoke.mockResolvedValueOnce({
      genres: [],
      developers: [],
      publishers: [],
      years: [],
      series: [],
      platforms: [],
    });
    await getFilterOptions();
    expect(mockInvoke).toHaveBeenCalledWith("get_filter_options", {
      content_type: undefined,
    });
  });

  it("returns filter options from backend", async () => {
    const mockOptions = {
      genres: ["Action", "RPG", "Puzzle"],
      developers: ["id Software", "Apogee"],
      publishers: ["GT Interactive"],
      years: [1992, 1993, 1994],
      series: ["Doom"],
      platforms: ["MS-DOS"],
    };
    mockInvoke.mockResolvedValueOnce(mockOptions);
    const result = await getFilterOptions("Game");
    expect(result.genres).toEqual(["Action", "RPG", "Puzzle"]);
    expect(result.years).toEqual([1992, 1993, 1994]);
  });
});

describe("getGameImages", () => {
  it("calls invoke with get_game_images and id", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    await getGameImages(42);
    expect(mockInvoke).toHaveBeenCalledWith("get_game_images", { id: 42 });
  });

  it("returns array of GameImage objects", async () => {
    const mockImages = [
      { category: "Box-Front", data_url: "data:image/png;base64,abc123" },
      { category: "Screenshot-Title", data_url: "data:image/png;base64,def456" },
    ];
    mockInvoke.mockResolvedValueOnce(mockImages);
    const result = await getGameImages(1);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("Box-Front");
    expect(result[1].data_url).toBe("data:image/png;base64,def456");
  });

  it("returns empty array when no images found", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const result = await getGameImages(999);
    expect(result).toEqual([]);
  });
});

describe("scanCollection", () => {
  it("calls invoke with scan_collection, name, and path", async () => {
    mockInvoke.mockResolvedValueOnce(12000);
    await scanCollection("eXoDOS", "E:\\Exo\\eXoDOS");
    expect(mockInvoke).toHaveBeenCalledWith("scan_collection", {
      name: "eXoDOS",
      path: "E:\\Exo\\eXoDOS",
    });
  });

  it("returns the number of games scanned", async () => {
    mockInvoke.mockResolvedValueOnce(7654);
    const result = await scanCollection("eXoWin3x", "D:\\Games\\eXoWin3x");
    expect(result).toBe(7654);
  });
});

describe("deleteCollection", () => {
  it("calls invoke with delete_collection and id", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await deleteCollection(3);
    expect(mockInvoke).toHaveBeenCalledWith("delete_collection", { id: 3 });
  });
});

describe("killGame", () => {
  it("calls invoke with kill_game", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await killGame();
    expect(mockInvoke).toHaveBeenCalledWith("kill_game");
  });
});

describe("sendGameInput", () => {
  it("calls invoke with send_game_input and the keystroke", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await sendGameInput("Y");
    expect(mockInvoke).toHaveBeenCalledWith("send_game_input", { input: "Y" });
  });

  it("passes arbitrary input strings through", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    await sendGameInput("N");
    expect(mockInvoke).toHaveBeenCalledWith("send_game_input", { input: "N" });
  });
});

describe("getConfig", () => {
  it("calls invoke with get_config", async () => {
    const mockConfig = {
      collections: [],
      theme: "blue",
      crt_enabled: true,
      crt_intensity: 0.5,
    };
    mockInvoke.mockResolvedValueOnce(mockConfig);
    const result = await getConfig();
    expect(mockInvoke).toHaveBeenCalledWith("get_config");
    expect(result.theme).toBe("blue");
    expect(result.crt_enabled).toBe(true);
  });
});

describe("setConfig", () => {
  it("calls invoke with set_config and the full config object", async () => {
    mockInvoke.mockResolvedValueOnce(undefined);
    const config = {
      collections: [{ name: "eXoDOS", path: "E:\\Exo\\eXoDOS" }],
      theme: "amber" as const,
      crt_enabled: false,
      crt_intensity: 0.3,
    };
    await setConfig(config);
    expect(mockInvoke).toHaveBeenCalledWith("set_config", { config });
  });
});
