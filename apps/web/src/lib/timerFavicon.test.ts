import { describe, expect, it } from 'vite-plus/test';
import { createInitialPomodoroState, type PomodoroState } from './pomodoro';
import { getTimerFavicon } from './timerFavicon';

describe('timer favicon', () => {
  for (const phase of ['focus', 'break'] as const) {
    for (const status of ['waiting', 'paused', 'running'] as const) {
      it(`shows activity for ${status} ${phase} only when running or a time entry is active`, () => {
        const state: PomodoroState = { ...createInitialPomodoroState(), phase, status };
        expect(getTimerFavicon(state, false)).toBe(status === 'running' ? 'favicon-active.svg' : 'favicon.png');
        expect(getTimerFavicon(state, true)).toBe('favicon-active.svg');
      });
    }
  }

  it('keeps the dot during focus overtime', () => {
    const state: PomodoroState = { ...createInitialPomodoroState(), status: 'overtime', remainingMs: -3000 };
    expect(getTimerFavicon(state, false)).toBe('favicon-active.svg');
  });

  it('restores the original favicon after all activity ends', () => {
    const state = createInitialPomodoroState();
    expect(getTimerFavicon(state, true)).toBe('favicon-active.svg');
    expect(getTimerFavicon(state, false)).toBe('favicon.png');
  });
});
