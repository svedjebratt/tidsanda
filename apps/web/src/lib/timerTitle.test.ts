import { describe, expect, it } from 'vite-plus/test';
import { createInitialPomodoroState } from './pomodoro';
import { getTimerTitle } from './timerTitle';

describe('timer title', () => {
  it('uses the app name while neither timer is active', () => {
    expect(getTimerTitle(createInitialPomodoroState(), false, 0)).toBe('Tidsanda');
  });

  it('shows an active regular timer before a Pomodoro cycle starts', () => {
    expect(getTimerTitle(createInitialPomodoroState(), true, 42 * 60 + 8)).toBe('42:08 · Timer · Running | Tidsanda');
  });

  it('gives a running or paused Pomodoro priority over the regular timer', () => {
    const running = {
      ...createInitialPomodoroState(),
      status: 'running' as const,
      remainingMs: 24 * 60_000 + 32_000,
      endsAt: Date.now() + 24 * 60_000 + 32_000,
    };

    expect(getTimerTitle(running, true, 42 * 60 + 8)).toBe('24:32 · Focus · Running | Tidsanda');
    expect(getTimerTitle({ ...running, status: 'paused', endsAt: null }, true, 42 * 60 + 8)).toBe(
      '24:32 · Focus · Paused | Tidsanda',
    );
  });

  it('keeps the Pomodoro title while a break is waiting', () => {
    const waitingBreak = {
      ...createInitialPomodoroState(),
      phase: 'break' as const,
      remainingMs: 5 * 60_000,
    };

    expect(getTimerTitle(waitingBreak, true, 42 * 60 + 8)).toBe('05:00 · Break · Ready | Tidsanda');
    expect(getTimerTitle({ ...waitingBreak, status: 'running', endsAt: Date.now() + 300_000 }, true, 42 * 60 + 8)).toBe(
      '05:00 · Break · Running | Tidsanda',
    );
    expect(getTimerTitle({ ...waitingBreak, status: 'paused' }, true, 42 * 60 + 8)).toBe(
      '05:00 · Break · Paused | Tidsanda',
    );
  });
});
