import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { render } from "solid-js/web";
import { CollectionPicker } from "../components/CollectionPicker";
import {
  setActiveDialog,
  activeDialog,
  refetchCollections,
} from "../lib/store";

const mockInvoke = vi.mocked(invoke);
const mockOpen = vi.mocked(open);

let dispose: (() => void) | undefined;

// Helper to wait for async state to settle
const tick = () => new Promise((r) => setTimeout(r, 0));

async function withCollections(
  cols: Array<{ id: number; name: string; path: string; game_count: number }>
) {
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "list_collections") return cols;
    if (cmd === "search_games") return { games: [], total_count: 0 };
    if (cmd === "get_filter_options") return { genres: [], developers: [], publishers: [], years: [], series: [], platforms: [] };
    return null;
  });
  refetchCollections();
  await tick();
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockImplementation(async (cmd) => {
    if (cmd === "list_collections") return [];
    if (cmd === "search_games") return { games: [], total_count: 0 };
    if (cmd === "get_filter_options") return { genres: [], developers: [], publishers: [], years: [], series: [], platforms: [] };
    return null;
  });
  mockOpen.mockReset();
  setActiveDialog(null);
  // Ensure collections resource reflects our mock (first run = no collections)
  refetchCollections();
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
});

// ── First-run mode (no collections) ──────────────────────────────────────────

describe("CollectionPicker first-run mode", () => {
  it("is visible when there are no collections, even with no activeDialog", async () => {
    await tick(); // let collections resolve to []
    dispose = render(() => <CollectionPicker />, document.body);
    expect(document.querySelector(".dialog")).not.toBeNull();
  });

  it("shows 'Welcome to eXo Terminal' title on first run", async () => {
    await tick();
    dispose = render(() => <CollectionPicker />, document.body);
    expect(document.querySelector(".dialog__title")?.textContent).toBe(
      "Welcome to eXo Terminal"
    );
  });

  it("shows a message explaining no collections are configured", async () => {
    await tick();
    dispose = render(() => <CollectionPicker />, document.body);
    expect(document.querySelector(".dialog__body")?.textContent).toContain(
      "No collections configured"
    );
  });

  it("does not show a Close button on first run (cannot be dismissed)", async () => {
    await tick();
    dispose = render(() => <CollectionPicker />, document.body);
    const buttons = document.querySelectorAll(".dialog__button");
    const closeBtn = Array.from(buttons).find((b) => b.textContent?.includes("Close"));
    expect(closeBtn).toBeUndefined();
  });

  it("shows the '< Add & Scan >' button on first run", async () => {
    await tick();
    dispose = render(() => <CollectionPicker />, document.body);
    const buttons = document.querySelectorAll(".dialog__button");
    const addBtn = Array.from(buttons).find((b) => b.textContent?.includes("Add & Scan"));
    expect(addBtn).not.toBeUndefined();
  });

  it("shows name and path inputs on first run", async () => {
    await tick();
    dispose = render(() => <CollectionPicker />, document.body);
    const inputs = document.querySelectorAll(".dialog__input");
    expect(inputs).toHaveLength(2);
  });
});

// ── Add Collection mode ────────────────────────────────────────────────────────

describe("CollectionPicker add-collection mode", () => {
  beforeEach(async () => {
    await withCollections([
      { id: 1, name: "eXoDOS", path: "E:\\Exo\\eXoDOS", game_count: 12000 },
    ]);
    setActiveDialog("collections");
    await tick();
  });

  it("shows 'Add Collection' title", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    expect(document.querySelector(".dialog__title")?.textContent).toBe(
      "Add Collection"
    );
  });

  it("shows name and path inputs", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const inputs = document.querySelectorAll(".dialog__input");
    expect(inputs).toHaveLength(2);
  });

  it("shows '< Close >' button when collections exist", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const buttons = document.querySelectorAll(".dialog__button");
    const closeBtn = Array.from(buttons).find((b) => b.textContent?.includes("Close"));
    expect(closeBtn).not.toBeUndefined();
  });

  it("shows an error when Add & Scan is clicked with empty name and path", async () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const addBtn = Array.from(document.querySelectorAll(".dialog__button")).find((b) =>
      b.textContent?.includes("Add & Scan")
    ) as HTMLElement;
    addBtn.click();
    await tick();
    expect(document.body.textContent).toContain("Please select a directory");
  });

  it("shows an error when path fails validation", async () => {
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "validate_collection_path") return false;
      if (cmd === "list_collections")
        return [{ id: 1, name: "eXoDOS", path: "E:\\Exo", game_count: 1 }];
      return null;
    });
    dispose = render(() => <CollectionPicker />, document.body);

    // Fill in name and path inputs
    const inputs = document.querySelectorAll(".dialog__input");
    const nameInput = inputs[0] as HTMLInputElement;
    const pathInput = inputs[1] as HTMLInputElement;

    nameInput.value = "eXoWin3x";
    nameInput.dispatchEvent(new InputEvent("input", { bubbles: true }));
    pathInput.value = "C:\\NotACollection";
    pathInput.dispatchEvent(new InputEvent("input", { bubbles: true }));

    const addBtn = Array.from(document.querySelectorAll(".dialog__button")).find((b) =>
      b.textContent?.includes("Add & Scan")
    ) as HTMLElement;
    addBtn.click();
    await tick();
    await tick();

    expect(document.body.textContent).toContain("Data/Platforms/ not found");
  });

  it("Browse button opens a directory picker", async () => {
    mockOpen.mockResolvedValueOnce(null);
    dispose = render(() => <CollectionPicker />, document.body);
    const browseBtn = Array.from(document.querySelectorAll(".dialog__button")).find((b) =>
      b.textContent?.includes("Browse")
    ) as HTMLElement;
    browseBtn.click();
    await tick();
    expect(mockOpen).toHaveBeenCalledWith(
      expect.objectContaining({ directory: true })
    );
  });

  it("Browse button populates name from the last path segment", async () => {
    mockOpen.mockResolvedValueOnce("E:\\Exo\\eXoWin3x");
    dispose = render(() => <CollectionPicker />, document.body);
    const browseBtn = Array.from(document.querySelectorAll(".dialog__button")).find((b) =>
      b.textContent?.includes("Browse")
    ) as HTMLElement;
    browseBtn.click();
    await tick();

    const nameInput = document.querySelectorAll(".dialog__input")[0] as HTMLInputElement;
    expect(nameInput.value).toBe("eXoWin3x");
  });

  it("Close button sets activeDialog to null", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const closeBtn = Array.from(document.querySelectorAll(".dialog__button")).find((b) =>
      b.textContent?.includes("Close")
    ) as HTMLElement;
    closeBtn.click();
    expect(activeDialog()).toBeNull();
  });
});

// ── Manage Collections mode ────────────────────────────────────────────────────

describe("CollectionPicker manage mode", () => {
  const existingCollections = [
    { id: 1, name: "eXoDOS", path: "E:\\Exo\\eXoDOS", game_count: 12000 },
    { id: 2, name: "eXoWin3x", path: "E:\\Exo\\eXoWin3x", game_count: 500 },
  ];

  beforeEach(async () => {
    await withCollections(existingCollections);
    setActiveDialog("manage-collections");
    await tick();
  });

  it("shows 'Manage Collections' title", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    expect(document.querySelector(".dialog__title")?.textContent).toBe(
      "Manage Collections"
    );
  });

  it("lists all existing collections with item counts", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const body = document.querySelector(".dialog__body")?.textContent ?? "";
    expect(body).toContain("eXoDOS");
    expect(body).toContain("12,000");
    expect(body).toContain("eXoWin3x");
    expect(body).toContain("500");
  });

  it("shows [del] buttons for each collection", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const delBtns = Array.from(document.querySelectorAll("span[title]")).filter(
      (s) => s.getAttribute("title") === "Delete collection"
    );
    expect(delBtns).toHaveLength(2);
  });

  it("clicking [del] shows a delete confirmation dialog", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const delBtn = Array.from(document.querySelectorAll("span[title]")).find(
      (s) => s.getAttribute("title") === "Delete collection"
    ) as HTMLElement;
    delBtn.click();

    // A second dialog should appear for the confirmation
    const dialogs = document.querySelectorAll(".dialog");
    expect(dialogs.length).toBeGreaterThan(1);
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).toContain("eXoDOS");
    expect(bodyText).toContain("cannot be undone");
  });

  it("clicking '< Cancel >' cancels the delete confirmation", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const delBtn = Array.from(document.querySelectorAll("span[title]")).find(
      (s) => s.getAttribute("title") === "Delete collection"
    ) as HTMLElement;
    delBtn.click();

    const cancelBtn = Array.from(document.querySelectorAll(".dialog__button")).find(
      (b) => b.textContent?.includes("Cancel")
    ) as HTMLElement;
    cancelBtn.click();

    // Confirmation dialog should be dismissed — only the manage dialog remains
    expect(document.querySelectorAll(".dialog").length).toBe(1);
  });

  it("clicking '< Delete >' calls delete_collection with the correct id", async () => {
    mockInvoke.mockImplementation(async (cmd) => {
      if (cmd === "list_collections") return existingCollections;
      if (cmd === "delete_collection") return undefined;
      if (cmd === "search_games") return { games: [], total_count: 0 };
      if (cmd === "get_filter_options") return { genres: [], developers: [], publishers: [], years: [], series: [], platforms: [] };
      return null;
    });
    dispose = render(() => <CollectionPicker />, document.body);

    const delBtn = Array.from(document.querySelectorAll("span[title]")).find(
      (s) => s.getAttribute("title") === "Delete collection"
    ) as HTMLElement;
    delBtn.click();

    const deleteBtn = Array.from(document.querySelectorAll(".dialog__button")).find(
      (b) => b.textContent?.trim() === "< Delete >"
    ) as HTMLElement;
    deleteBtn.click();
    await tick();

    expect(mockInvoke).toHaveBeenCalledWith("delete_collection", { id: 1 });
  });

  it("shows '< Add New >' button in manage mode", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const buttons = document.querySelectorAll(".dialog__button");
    const addNewBtn = Array.from(buttons).find((b) => b.textContent?.includes("Add New"));
    expect(addNewBtn).not.toBeUndefined();
  });

  it("does not show the add form in manage mode (no name/path inputs)", () => {
    dispose = render(() => <CollectionPicker />, document.body);
    const inputs = document.querySelectorAll(".dialog__input");
    expect(inputs).toHaveLength(0);
  });
});
