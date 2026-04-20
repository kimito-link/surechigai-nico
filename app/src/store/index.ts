import { create } from "zustand";
import type { EncounterItem } from "../lib/api";

interface AppState {
  // 認証
  uuid: string | null;
  userId: number | null;
  setAuth: (uuid: string, userId: number) => void;

  // すれちがい一覧
  encounters: EncounterItem[];
  setEncounters: (encounters: EncounterItem[]) => void;
  addEncounters: (encounters: EncounterItem[]) => void;

  // プロフィール
  nickname: string;
  hitokoto: string;
  avatarConfig: Record<string, unknown> | null;
  avatarUrl: string | null;
  spotifyTrackName: string | null;
  spotifyArtistName: string | null;
  streakCount: number;
  setProfile: (profile: Partial<AppState>) => void;

  // UI状態
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  uuid: null,
  userId: null,
  setAuth: (uuid, userId) => set({ uuid, userId }),

  encounters: [],
  setEncounters: (encounters) => set({ encounters }),
  addEncounters: (newEncounters) =>
    set((state) => ({
      encounters: [...state.encounters, ...newEncounters],
    })),

  nickname: "匿名さん",
  hitokoto: "",
  avatarConfig: null,
  avatarUrl: null,
  spotifyTrackName: null,
  spotifyArtistName: null,
  streakCount: 0,
  setProfile: (profile) => set(profile),

  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
}));
