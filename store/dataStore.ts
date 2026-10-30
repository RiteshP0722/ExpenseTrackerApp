import { create } from "zustand";

/**
 * One shared store for the whole app (fixes the old bug where Add Expense
 * had its own copy of the data and Home/Summary never updated).
 *
 * Every screen's data hook reads `version`. After any save, edit or
 * delete we call `invalidate()`, the version goes up, and every
 * mounted screen re-fetches its data from the database at once.
 */
interface DataState {
  version: number;
  invalidate: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  version: 0,
  invalidate: () => set((s) => ({ version: s.version + 1 })),
}));

/** Call from outside React (e.g. after a mutation helper). */
export function invalidateData(): void {
  useDataStore.getState().invalidate();
}
