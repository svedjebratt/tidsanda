function padTwoDigits(value: number) {
  return value.toString().padStart(2, '0');
}

export function formatSeconds(totalSeconds: number) {
  const hours = Math.floor(Math.abs(totalSeconds) / 3600);
  const minutes = Math.floor(Math.abs(totalSeconds) / 60) % 60;
  const seconds = Math.abs(totalSeconds) % 60;
  const sign = totalSeconds < 0 ? '-' : '';
  return `${sign}${hours ? `${hours}:` : ''}${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;
}

export function formatMilliseconds(milliseconds: number) {
  return formatSeconds(Math.ceil(milliseconds / 1000));
}
