import { useEffect } from "react";
import { useSettingsStore } from "../state/useSettingsStore";
import { FormField } from "../components/FormField";
import { CV_TEMPLATES } from "../types/cv";

export function SettingsPage() {
  const { settings, loadSettings, updateSettings, saveSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Settings</h2>
      <div className="max-w-lg space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Theme</span>
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Default Template</span>
          <select
            value={settings.default_template}
            onChange={(e) => updateSettings({ default_template: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          >
            {CV_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>

        <FormField label="Ollama URL (local AI)" value={settings.ollama_url} onChange={(v) => updateSettings({ ollama_url: v })} />
        <FormField label="Ollama Model" value={settings.ollama_model} onChange={(v) => updateSettings({ ollama_model: v })} />
        <FormField
          label="Temperature (0.1–1.0)"
          value={String(settings.ollama_temperature)}
          onChange={(v) => updateSettings({ ollama_temperature: parseFloat(v) || 0.3 })}
        />
        <FormField label="Embedding Model" value={settings.embed_model} onChange={(v) => updateSettings({ embed_model: v })} />

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.scraper_remote_ok} onChange={(e) => updateSettings({ scraper_remote_ok: e.target.checked })} />
          Enable RemoteOK scraper
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.scraper_arbeitnow} onChange={(e) => updateSettings({ scraper_arbeitnow: e.target.checked })} />
          Enable Arbeitnow scraper
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.scraper_remote_only} onChange={(e) => updateSettings({ scraper_remote_only: e.target.checked })} />
          Remote-only jobs
        </label>

        <button onClick={() => saveSettings()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          Save Settings
        </button>
      </div>
    </div>
  );
}
