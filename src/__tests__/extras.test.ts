import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { getGameExtras } from "../lib/commands";

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
});

// ---------------------------------------------------------------------------
// getGameExtras command
// ---------------------------------------------------------------------------
describe("getGameExtras", () => {
  it("calls invoke with get_game_extras and id", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    await getGameExtras(42);
    expect(mockInvoke).toHaveBeenCalledWith("get_game_extras", { id: 42 });
  });

  it("returns empty array when game has no extras", async () => {
    mockInvoke.mockResolvedValueOnce([]);
    const result = await getGameExtras(1);
    expect(result).toEqual([]);
  });

  it("returns extras list with all fields", async () => {
    const mockExtras = [
      {
        id: 1,
        name: "DOOM II Manual",
        path: "C:\\eXoDOS\\Extras\\DOOM II\\DOOM II Manual.pdf",
        region: "English",
        kind: "pdf",
      },
      {
        id: 2,
        name: "Cheats PC Gamer 1995-02 page 149",
        path: "C:\\eXoDOS\\Extras\\DOOM II\\Cheats PC Gamer 1995-02 page 149.pdf",
        region: "English",
        kind: "pdf",
      },
      {
        id: 3,
        name: "Level Map",
        path: "C:\\eXoDOS\\Extras\\DOOM II\\Level Map.png",
        region: null,
        kind: "image",
      },
    ];
    mockInvoke.mockResolvedValueOnce(mockExtras);
    const result = await getGameExtras(1);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("DOOM II Manual");
    expect(result[0].kind).toBe("pdf");
    expect(result[0].region).toBe("English");
    expect(result[2].kind).toBe("image");
    expect(result[2].region).toBeNull();
  });

  it("handles extras of all kinds", async () => {
    const kinds = ["pdf", "image", "video", "audio", "text", "other"];
    const mockExtras = kinds.map((kind, i) => ({
      id: i + 1,
      name: `Extra ${kind}`,
      path: `C:\\path\\extra.${kind}`,
      region: null,
      kind,
    }));
    mockInvoke.mockResolvedValueOnce(mockExtras);
    const result = await getGameExtras(5);
    expect(result.map((e) => e.kind)).toEqual(kinds);
  });
});
