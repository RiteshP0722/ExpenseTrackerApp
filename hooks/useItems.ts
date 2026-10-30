import * as api from "../lib/api";
import { useQuery } from "./useQuery";

export function useItems(includeInactive = false) {
  return useQuery(`items:${includeInactive}`, () => api.fetchItems(includeInactive));
}

export function useItemRequests(enabled: boolean) {
  return useQuery("item-requests", api.fetchItemRequests, enabled);
}

export function useStaff() {
  return useQuery("staff", api.fetchStaff);
}

export function usePeople(enabled: boolean) {
  return useQuery("people", api.fetchPeople, enabled);
}
