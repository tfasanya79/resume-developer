import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { CvProfile, CvSummary, ImportResult } from "../types/cv";
import { createEmptyCv, normalizePersonal, normalizeSectionOrder } from "../types/cv";

interface CvStore {
  profile: CvProfile;
  savedCvs: CvSummary[];
  loading: boolean;
  error: string | null;
  dirty: boolean;
  jobContext: string;
  setProfile: (profile: CvProfile) => void;
  updateProfile: (partial: Partial<CvProfile>) => void;
  setJobContext: (text: string) => void;
  loadCvList: () => Promise<void>;
  loadCv: (id: string) => Promise<void>;
  saveCv: () => Promise<string>;
  deleteCv: (id: string) => Promise<void>;
  newCv: (template?: string) => void;
  importCv: (path: string) => Promise<ImportResult>;
}

export const useCvStore = create<CvStore>((set, get) => ({
  profile: createEmptyCv(),
  savedCvs: [],
  loading: false,
  error: null,
  dirty: false,
  jobContext: "",

  setProfile: (profile) => set({ profile, dirty: false }),

  updateProfile: (partial) =>
    set((state) => ({
      profile: { ...state.profile, ...partial },
      dirty: true,
    })),

  setJobContext: (text) => set({ jobContext: text }),

  loadCvList: async () => {
    try {
      const savedCvs = await invoke<CvSummary[]>("list_cvs");
      set({ savedCvs, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadCv: async (id) => {
    set({ loading: true });
    try {
      const loaded = await invoke<CvProfile>("load_cv", { id });
      const profile = {
        ...loaded,
        courses: loaded.courses ?? [],
        section_order: normalizeSectionOrder(loaded.section_order ?? []),
        personal: normalizePersonal(loaded.personal),
      };
      set({ profile, loading: false, error: null, dirty: false });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  saveCv: async () => {
    const { profile } = get();
    const normalized = {
      ...profile,
      personal: normalizePersonal(profile.personal),
    };
    const id = await invoke<string>("save_cv", { profile: normalized });
    const updated = { ...normalized, id };
    set({ profile: updated, dirty: false });
    await get().loadCvList();
    return id;
  },

  deleteCv: async (id) => {
    await invoke("delete_cv", { id });
    await get().loadCvList();
    if (get().profile.id === id) {
      get().newCv();
    }
  },

  newCv: (template) => {
    const profile = createEmptyCv();
    if (template) profile.template = template;
    set({ profile, dirty: false });
  },

  importCv: async (path) => {
    const result = await invoke<ImportResult>("import_cv_pdf", { path });
    return result;
  },
}));
