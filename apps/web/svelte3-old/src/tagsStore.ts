import { writable } from 'svelte/store';
import { getTags } from './TimeApi';

function createTags() {
  const tags = writable<string[]>([]);

  const initialize = async () => {
    try {
      tags.set(await getTags());
    } catch (_) {
      console.log('Tags not loaded');
      tags.set([]);
    }
  };

  return {
    subscribe: tags.subscribe,
    initialize,
  };
}

export const tags = createTags();
