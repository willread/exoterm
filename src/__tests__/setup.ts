import { vi } from "vitest";

// Mock the Tauri IPC layer so tests can run outside Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue(null),
  // convertFileSrc: converts a local file path to an asset:// URL in Tauri;
  // in tests just prefix with asset:// so components can render without Tauri
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${path}`),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue(null),
}));
