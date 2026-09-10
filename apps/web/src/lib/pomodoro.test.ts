import { describe, expect, it } from 'vite-plus/test';
import { createPomodoroTimer } from './pomodoro';

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

describe('Pomodoro timer', () => {
  it('starts, pauses, and resumes a focus period', () => {
    const storage = createStorage();
    let now = 1_000;
    const timer = createPomodoroTimer('account-a', storage, () => now);

    expect(timer.read()).toMatchObject({ phase: 'focus', status: 'waiting', remainingMs: 25 * 60_000 });

    timer.advance();
    now += 60_000;
    expect(timer.read()).toMatchObject({ phase: 'focus', status: 'running', remainingMs: 24 * 60_000 });

    timer.advance();
    now += 60_000;
    expect(timer.read()).toMatchObject({ phase: 'focus', status: 'paused', remainingMs: 24 * 60_000 });

    timer.advance();
    now += 60_000;
    expect(timer.read()).toMatchObject({ phase: 'focus', status: 'running', remainingMs: 23 * 60_000 });
  });

  it('waits for the user before starting each next period', () => {
    const storage = createStorage();
    let now = 1_000;
    const timer = createPomodoroTimer('account-a', storage, () => now);

    timer.advance();
    now += 25 * 60_000;
    expect(timer.update()).toMatchObject({
      state: { phase: 'break', status: 'waiting', remainingMs: 5 * 60_000 },
      completedPhase: 'focus',
    });

    timer.advance();
    now += 5 * 60_000;
    expect(timer.update()).toMatchObject({
      state: { phase: 'focus', status: 'waiting', remainingMs: 25 * 60_000 },
      completedPhase: 'break',
    });
  });

  it('restores a running timer after reload and keeps accounts separate', () => {
    const storage = createStorage();
    let now = 1_000;
    createPomodoroTimer('account-a', storage, () => now).advance();
    now += 90_000;

    const restored = createPomodoroTimer('account-a', storage, () => now);
    expect(restored.read()).toMatchObject({ status: 'running', remainingMs: 23.5 * 60_000 });
    expect(createPomodoroTimer('account-b', storage, () => now).read()).toMatchObject({
      status: 'waiting',
      remainingMs: 25 * 60_000,
    });
  });

  it('resets any period to a fresh waiting focus period', () => {
    const timer = createPomodoroTimer('account-a', createStorage(), () => 1_000);
    timer.advance();
    timer.advance();

    expect(timer.reset()).toMatchObject({ phase: 'focus', status: 'waiting', remainingMs: 25 * 60_000 });
  });

  it('allows only one notification claim for a completed period', () => {
    const storage = createStorage();
    const firstTab = createPomodoroTimer('account-a', storage);
    const secondTab = createPomodoroTimer('account-a', storage);

    expect(firstTab.claimNotification('focus', 10_000)).toBe(true);
    expect(secondTab.claimNotification('focus', 10_000)).toBe(false);
    expect(secondTab.claimNotification('break', 20_000)).toBe(true);
  });

  it('recovers from an impossible stored state', () => {
    const storage = createStorage();
    storage.setItem(
      'tidsanda:pomodoro:account-a',
      JSON.stringify({
        version: 1,
        phase: 'focus',
        status: 'running',
        remainingMs: 60_000,
        endsAt: null,
        updatedAt: 1_000,
      }),
    );

    expect(createPomodoroTimer('account-a', storage, () => 2_000).read()).toMatchObject({
      phase: 'focus',
      status: 'waiting',
      remainingMs: 25 * 60_000,
    });
  });
});
