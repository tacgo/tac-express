import { create } from "zustand"
import { persist } from "zustand/middleware"

interface HubStore {
  activeHubCode: string | null
  setActiveHub: (code: string | null) => void
}

export const useHubStore = create<HubStore>()(
  persist(
    (set) => ({
      activeHubCode: null,
      setActiveHub: (code) => set({ activeHubCode: code }),
    }),
    { name: "tac-active-hub" },
  ),
)
