import { isFocusOvertime, type PomodoroState } from './pomodoro';

export function getTimerFavicon(state: PomodoroState, hasActiveTimeEntry: boolean) {
  const active = hasActiveTimeEntry || state.status === 'running' || isFocusOvertime(state);
  return active ? 'favicon-active.svg' : 'favicon.png';
}
