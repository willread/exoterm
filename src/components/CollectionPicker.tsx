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
import { scanCollection, validateCollectionPath } from "../lib/commands";

export const CollectionPicker: Component = () => {
  const [selectedPath, setSelectedPath] = createSignal("");
  const [collectionName, setCollectionName] = createSignal("");
  const [error, setError] = createSignal("");
  const [isScanning, setIsScanning] = createSignal(false);

  const handleBrowse = async () => {
    const result = await open({
      directory: true,
      title: "Select eXo Collection Directory",
    });
    if (result) {
      setSelectedPath(result as string);
      // Auto-detect name from path
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

  const isFirstRun = () => !collections()?.length;

  return (
    <Dialog
      title={isFirstRun() ? "Welcome to eXo Terminal" : "Add Collection"}
      visible={activeDialog() === "collections" || (isFirstRun() && activeDialog() !== "about")}
      onClose={() => {
        if (!isFirstRun()) setActiveDialog(null);
      }}
      footer={
        <div style="display: flex; gap: 2ch;">
          <button
            class="dialog__button"
            onClick={handleAdd}
            disabled={isScanning()}
          >
            {isScanning() ? "Scanning..." : "< Add & Scan >"}
          </button>
          <Show when={!isFirstRun()}>
            <button class="dialog__button" onClick={() => setActiveDialog(null)}>
              {"< Cancel >"}
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

      {/* Existing collections */}
      <Show when={(collections()?.length ?? 0) > 0}>
        <div style="margin-bottom: 1ch;">
          <div style="color: var(--fg-dialog);">Existing collections:</div>
          <For each={collections()}>
            {(c) => (
              <div>
                {"\u2022"} {c.name} ({c.game_count.toLocaleString()} items)
              </div>
            )}
          </For>
        </div>
      </Show>

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

      <Show when={error()}>
        <div style="color: #AA0000; margin-top: 4px;">{error()}</div>
      </Show>
    </Dialog>
  );
};
