import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../types/cv";

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => void;
  saveSettings: () => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: "dark",
  default_template: "modern-professional",
  export_path: "",
  ollama_url: "http://localhost:11434",
  ollama_model: "llama3.2",
  ollama_temperature: 0.3,
  embed_model: "nomic-embed-text",
  scraper_remote_ok: true,
  scraper_remote_only: false,
  scraper_arbeitnow: true,
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  loadSettings: async () => {
    const settings = await invoke<AppSettings>("get_settings");
    set({
      settings: { ...defaultSettings, ...settings },
      loaded: true,
    });
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  },

  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),

  saveSettings: async () => {
    await invoke("save_settings", { settings: get().settings });
    document.documentElement.classList.toggle("dark", get().settings.theme === "dark");
  },

  toggleTheme: async () => {
    const theme = get().settings.theme === "dark" ? "light" : "dark";
    get().updateSettings({ theme });
    await get().saveSettings();
  },
}));
