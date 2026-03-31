import { Component, createSignal, For, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { Dialog } from "./Dialog";
import {
  activeDialog,
  setActiveDialog,
  collections,
  refetchCollections,
  setScanning,
  setScanStatus,
  fetchGames,
  refetchFilterOptions,
} from "../lib/store";
import { scanCollection, validateCollectionPath, deleteCollection } from "../lib/commands";

export const CollectionPicker: Component = () => {
  const [selectedPath, setSelectedPath] = createSignal("");
  const [collectionName, setCollectionName] = createSignal("");
  const [error, setError] = createSignal("");
  const [isScanning, setIsScanning] = createSignal(false);
  const [confirmDeleteId, setConfirmDeleteId] = createSignal<number | null>(null);

  const handleBrowse = async () => {
    const result = await open({
      directory: true,
      title: "Select eXo Collection Directory",
    });
    if (result) {
      setSelectedPath(result as string);
      const parts = (result as string).replace(/\\/g, "/").split("/");
      setCollectionName(parts[parts.length - 1] || "");
      setError("");
    }
  };

  const handleAdd = async () => {
    const path = selectedPath();
    const name = collectionName();

    if (!path || !name) {
      setError("Please select a directory and provide a name.");
      return;
    }

    const valid = await validateCollectionPath(path);
    if (!valid) {
      setError("Invalid collection: Data/Platforms/ not found in this directory.");
      return;
    }

    setIsScanning(true);
    setScanning(true);
    setScanStatus(`Scanning ${name}...`);
    setError("");

    try {
      const count = await scanCollection(name, path);
      setScanStatus(`Done! ${count.toLocaleString()} items imported.`);
      refetchCollections();
      refetchFilterOptions();
      fetchGames();

      // Reset form
      setSelectedPath("");
      setCollectionName("");

      // Auto-close after short delay
      setTimeout(() => {
        setActiveDialog(null);
        setScanning(false);
        setScanStatus("");
      }, 1500);
    } catch (e: any) {
      setError(`Scan failed: ${e}`);
      setScanning(false);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteCollection(id);
      refetchCollections();
      refetchFilterOptions();
      fetchGames();
      setConfirmDeleteId(null);
    } catch (e: any) {
      setError(`Delete failed: ${e}`);
    }
  };

  const isFirstRun = () => !collections()?.length;
  const isManageMode = () => activeDialog() === "manage-collections";
  const isAddMode = () => activeDialog() === "collections";
  const isVisible = () =>
    isManageMode() || isAddMode() || (isFirstRun() && activeDialog() !== "about");

  const title = () => {
    if (isFirstRun()) return "Welcome to eXo Terminal";
    if (isManageMode()) return "Manage Collections";
    return "Add Collection";
  };

  return (
    <Dialog
      title={title()}
      visible={isVisible()}
      onClose={() => {
        if (!isFirstRun()) {
          setActiveDialog(null);
          setConfirmDeleteId(null);
        }
      }}
      footer={
        <div style="display: flex; gap: 2ch;">
          <Show when={isManageMode() && !isFirstRun()}>
            <button class="dialog__button" onClick={() => setActiveDialog("collections")}>
              {"< Add New >"}
            </button>
          </Show>
          <Show when={isAddMode() || isFirstRun()}>
            <button
              class="dialog__button"
              onClick={handleAdd}
              disabled={isScanning()}
            >
              {isScanning() ? "Scanning..." : "< Add & Scan >"}
            </button>
          </Show>
          <Show when={!isFirstRun()}>
            <button class="dialog__button" onClick={() => {
              setActiveDialog(null);
              setConfirmDeleteId(null);
            }}>
              {"< Close >"}
            </button>
          </Show>
        </div>
      }
    >
      <Show when={isFirstRun()}>
        <p style="margin-bottom: 1ch;">
          No collections configured. Select your eXo
          collection directory to get started.
        </p>
      </Show>

      {/* Collection list with delete */}
      <Show when={(collections()?.length ?? 0) > 0}>
        <div style="margin-bottom: 1ch;">
          <div style="color: var(--fg-dialog); margin-bottom: 2px;">Collections:</div>
          <For each={collections()}>
            {(c) => (
              <div style="display: flex; align-items: center; padding: 1px 0;">
                <div style="flex: 1;">
                  {c.name} ({c.game_count.toLocaleString()} items)
                </div>
                <Show when={confirmDeleteId() === c.id} fallback={
                  <span
                    style="cursor: pointer; color: var(--fg-dialog); opacity: 0.7;"
                    onClick={() => setConfirmDeleteId(c.id)}
                    title="Delete collection"
                  >
                    [del]
                  </span>
                }>
                  <span style="color: #AA0000;">
                    Delete?{" "}
                    <span
                      style="cursor: pointer; text-decoration: underline;"
                      onClick={() => handleDelete(c.id)}
                    >
                      Yes
                    </span>
                    {" / "}
                    <span
                      style="cursor: pointer; text-decoration: underline;"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      No
                    </span>
                  </span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Add collection form: show in add mode, first run, or when manage mode transitions */}
      <Show when={isAddMode() || isFirstRun()}>
        <div style="margin-bottom: 4px;">
          <div>Name:</div>
          <input
            class="dialog__input"
            value={collectionName()}
            onInput={(e) => setCollectionName(e.currentTarget.value)}
            placeholder="e.g. eXoDOS"
          />
        </div>

        <div style="margin-bottom: 4px;">
          <div>Path:</div>
          <div style="display: flex; gap: 1ch;">
            <input
              class="dialog__input"
              value={selectedPath()}
              onInput={(e) => setSelectedPath(e.currentTarget.value)}
              placeholder="C:\path\to\eXoDOS"
              style="flex: 1;"
            />
            <button class="dialog__button" onClick={handleBrowse}>
              Browse...
            </button>
          </div>
        </div>
      </Show>

      <Show when={error()}>
        <div style="color: #AA0000; margin-top: 4px;">{error()}</div>
      </Show>
    </Dialog>
  );
};
