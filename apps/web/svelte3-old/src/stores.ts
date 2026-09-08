import { writable } from 'svelte/store';

const { subscribe, set } = writable<string | null>(null);

export const accountStore = {
  login(account: string) {
    set(account);
  },
  logout() {
    set(null);
  },
  subscribe,
};
