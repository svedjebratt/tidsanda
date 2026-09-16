import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function watchRuntimeErrors(page: Page) {
  const errors: string[] = [];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Runtime.enable');
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
    errors.push(exceptionDetails.exception?.description ?? exceptionDetails.text);
  });
  return { cdp, errors };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('account', 'test-account'));
  await page.route('**/api/time**', async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: ['existing-tag'] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill({ status: 404, json: { error: 'No active timer' } });
    } else {
      await route.fulfill({ json: [] });
    }
  });
});

test('a user can create a timer tag without triggering a reactive update loop', async ({ page }) => {
  const { cdp, errors } = await watchRuntimeErrors(page);

  await page.goto('/timer');
  const tagInput = page.locator('#TagInput');
  await tagInput.evaluate((input: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'brand-new-tag');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    windowsVirtualKeyCode: 13,
  });

  await expect(page.getByText('brand-new-tag', { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('a user can select and remove an existing timer tag', async ({ page }) => {
  const { errors } = await watchRuntimeErrors(page);

  await page.goto('/timer');
  const tagInput = page.locator('#TagInput');
  await tagInput.click();
  await tagInput.press('Enter');

  await expect(page.getByText('existing-tag', { exact: true })).toBeVisible();
  await tagInput.press('Backspace');
  await expect(tagInput).toHaveAttribute('placeholder', 'Set tags');
  expect(errors).toEqual([]);
});

test('g focuses the tag selector without entering the shortcut key', async ({ page }) => {
  await page.goto('/timer');
  const tagInput = page.locator('#TagInput');
  await expect(tagInput).toBeEnabled();
  await expect(page).toHaveTitle('Tidsanda');
  await tagInput.evaluate((input: HTMLInputElement) => input.blur());

  await page.keyboard.press('g');

  await expect(tagInput).toBeFocused();
  await expect(tagInput).toHaveValue('');

  await page.keyboard.press('g');
  await expect(tagInput).toHaveValue('g');
});

test('navigating back to an active timer does not clear its tags', async ({ page }) => {
  const activeTimer = {
    account: 'test-account',
    id: 42,
    start: Date.now(),
    tags: ['existing-tag'],
  };
  const updates: unknown[] = [];
  let activeRequests = 0;

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'PUT') {
      updates.push(request.postDataJSON());
      await route.fulfill({ json: activeTimer });
    } else if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: ['existing-tag'] } });
    } else if (url.pathname.endsWith('/time/active')) {
      activeRequests += 1;
      if (activeRequests > 1) await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({ json: activeTimer });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.goto('/timer');
  await expect(page.getByText('existing-tag', { exact: true })).toBeVisible();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Timer · Running$/);
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Timer · Running$/);
  await page.getByRole('link', { name: 'Timer' }).click();
  await expect(page.getByText('existing-tag', { exact: true })).toBeVisible();

  expect(updates).toEqual([]);
});

test('space starts and stops the timer while typing and the old shortcut do not', async ({ page }) => {
  const commands: string[] = [];
  const activeTimer = {
    account: 'test-account',
    id: 42,
    start: Date.now(),
    tags: [],
  };

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      commands.push(url.pathname);
      await route.fulfill({
        json: url.pathname.endsWith('/stop') ? { discarded: false, timeEntry: activeTimer } : activeTimer,
      });
    } else if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: [] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill({ status: 404, json: { error: 'No active timer' } });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.goto('/timer');
  const tagInput = page.locator('#TagInput');
  const timerLink = page.getByRole('link', { name: 'Timer', exact: true });
  await expect(timerLink.locator('.running-indicator')).toBeHidden();
  await expect(tagInput).toBeEnabled();
  await tagInput.press('Space');
  await tagInput.press('s');
  expect(commands).toEqual([]);

  await tagInput.evaluate((input: HTMLInputElement) => input.blur());
  await page.keyboard.press('s');
  expect(commands).toEqual([]);
  await page.keyboard.press('Space');
  await expect.poll(() => commands).toEqual(['/api/time/start']);
  await expect(
    page.getByRole('link', { name: 'Timer running', exact: true }).locator('.running-indicator'),
  ).toBeVisible();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Timer · Running$/);
  await page.keyboard.press('Space');
  await expect.poll(() => commands).toEqual(['/api/time/start', '/api/time/stop']);
  await expect(timerLink.locator('.running-indicator')).toBeHidden();
  await expect(page).toHaveTitle('Tidsanda');
});

test('a discarded short entry is explained for five seconds or until another timer starts', async ({ page }) => {
  const activeTimer = {
    account: 'test-account',
    id: 42,
    start: Date.now(),
    tags: [],
  };
  let active = false;

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/time/start')) {
      active = true;
      await route.fulfill({ json: activeTimer });
    } else if (url.pathname.endsWith('/time/stop')) {
      active = false;
      await route.fulfill({ json: { discarded: true } });
    } else if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: [] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill(active ? { json: activeTimer } : { status: 404, json: { error: 'No active timer' } });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.goto('/timer');
  await expect(page.locator('#TagInput')).toBeEnabled();
  await page.keyboard.press('Space');
  await expect(page).toHaveTitle(/Timer · Running$/);
  await page.keyboard.press('Space');

  const status = page.getByRole('status');
  await expect(status).toHaveText('Entry under 10 seconds discarded');

  await expect(status).toBeHidden({ timeout: 6000 });

  await page.keyboard.press('Space');
  await expect(page).toHaveTitle(/Timer · Running$/);
  await page.keyboard.press('Space');
  await expect(status).toHaveText('Entry under 10 seconds discarded');

  await page.keyboard.press('Space');
  await expect(status).toBeHidden();
});

test('stopping waits for an adjusted start time to be saved', async ({ page }) => {
  let activeTimer = {
    account: 'test-account',
    id: 42,
    start: Date.now(),
    tags: [],
  };
  let startUpdateSaved = false;
  let stopSawStartUpdate = false;

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'PUT') {
      await new Promise((resolve) => setTimeout(resolve, 100));
      activeTimer = { ...activeTimer, start: request.postDataJSON().start };
      startUpdateSaved = true;
      await route.fulfill({ json: activeTimer });
    } else if (url.pathname.endsWith('/time/stop')) {
      stopSawStartUpdate = startUpdateSaved;
      await route.fulfill({
        json: {
          discarded: false,
          timeEntry: { ...activeTimer, stop: Date.now(), duration: 300 },
        },
      });
    } else if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: [] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill({ json: activeTimer });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.goto('/timer');
  await expect(page.locator('#TagInput')).toBeEnabled();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Space');

  await expect(page).toHaveTitle('Tidsanda');
  expect(stopSawStartUpdate).toBe(true);
  await expect(page.getByRole('status')).toBeHidden();
});

test('a failed start-time update prevents stopping with stale duration', async ({ page }) => {
  const activeTimer = {
    account: 'test-account',
    id: 42,
    start: Date.now(),
    tags: [],
  };
  let stopRequests = 0;

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'PUT') {
      await route.fulfill({ status: 500, json: { error: 'Update failed' } });
    } else if (url.pathname.endsWith('/time/stop')) {
      stopRequests += 1;
      await route.fulfill({ json: { discarded: true } });
    } else if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: [] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill({ json: activeTimer });
    } else {
      await route.fulfill({ json: [] });
    }
  });

  await page.goto('/timer');
  await expect(page.locator('#TagInput')).toBeEnabled();
  await page.keyboard.press('Shift+ArrowDown');
  await page.keyboard.press('Space');

  await expect(page).toHaveTitle(/Timer · Running$/);
  expect(stopRequests).toBe(0);
});

test('today entries are grouped by exact tag set and remain independently editable', async ({ page }) => {
  const entries = [
    {
      account: 'test-account',
      id: 1,
      start: new Date('2026-09-15T08:00:00Z').getTime(),
      stop: new Date('2026-09-15T08:30:00Z').getTime(),
      duration: 1800,
      tags: ['planning', 'client-a'],
    },
    {
      account: 'test-account',
      id: 2,
      start: new Date('2026-09-15T10:00:00Z').getTime(),
      stop: new Date('2026-09-15T10:30:00Z').getTime(),
      duration: 1800,
      tags: ['client-a', 'planning'],
    },
    {
      account: 'test-account',
      id: 3,
      start: new Date('2026-09-15T09:00:00Z').getTime(),
      stop: new Date('2026-09-15T09:30:00Z').getTime(),
      duration: 1800,
      tags: ['client-b'],
    },
    {
      account: 'test-account',
      id: 4,
      start: new Date('2026-09-15T11:00:00Z').getTime(),
      stop: new Date('2026-09-15T11:30:00Z').getTime(),
      duration: 1800,
      tags: [],
    },
  ];

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: ['client-a', 'client-b', 'planning'] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill({ status: 404, json: { error: 'No active timer' } });
    } else {
      await route.fulfill({ json: entries });
    }
  });

  await page.goto('/timer');

  const groups = page.getByRole('group', { name: 'Tag group' });
  await expect(groups).toHaveCount(3);
  await expect(groups.nth(0).getByRole('link')).toHaveAttribute('href', '/log/4');
  await expect(groups.nth(1).getByRole('link')).toHaveCount(2);
  await expect(groups.nth(1).getByRole('link').nth(0)).toHaveAttribute('href', '/log/2');
  await expect(groups.nth(1).getByRole('link').nth(1)).toHaveAttribute('href', '/log/1');
  await expect(groups.nth(2).getByRole('link')).toHaveAttribute('href', '/log/3');
  await expect(page.getByText('client-a', { exact: true })).toHaveCount(1);
  await expect(page.getByText('planning', { exact: true })).toHaveCount(1);
  await expect(page.getByText('client-b', { exact: true })).toHaveCount(1);
  await expect(page.getByText('untagged', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Σ 1h 00m', { exact: true })).toHaveCount(1);
});

test('an edited time entry restarts its tags with and without an active timer', async ({ page }) => {
  const completedEntry = {
    account: 'test-account',
    id: 1,
    start: new Date('2026-09-15T08:00:00Z').getTime(),
    stop: new Date('2026-09-15T08:30:00Z').getTime(),
    duration: 1800,
    tags: ['planning', 'client-a'],
  };
  const activeTimer = {
    account: 'test-account',
    id: 2,
    start: Date.now(),
    tags: ['other-work'],
  };
  const commands: Array<{ path: string; body: unknown }> = [];
  let hasActiveTimer = false;

  await page.unroute('**/api/time**');
  await page.route('**/api/time**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: ['client-a', 'planning', 'other-work'] } });
    } else if (url.pathname.endsWith('/time/active')) {
      await route.fulfill(hasActiveTimer ? { json: activeTimer } : { status: 404, json: { error: 'No active timer' } });
    } else if (request.method() === 'POST') {
      commands.push({ path: url.pathname, body: request.postDataJSON() });
      hasActiveTimer = url.pathname.endsWith('/start');
      await route.fulfill({
        json: url.pathname.endsWith('/stop') ? { discarded: true } : activeTimer,
      });
    } else if (url.pathname.endsWith('/time/1')) {
      await route.fulfill({ json: completedEntry });
    } else {
      await route.fulfill({ json: [completedEntry] });
    }
  });

  await page.goto('/timer');
  await page.getByRole('link', { name: /Duration/ }).click();
  await page.getByRole('button', { name: 'Restart time entry' }).click();
  await expect(page).toHaveURL('/timer');
  await expect.poll(() => commands).toEqual([{ path: '/api/time/start', body: { tags: ['planning', 'client-a'] } }]);

  commands.length = 0;
  await page.getByRole('link', { name: /Duration/ }).click();
  await page.getByRole('button', { name: 'Restart time entry' }).click();
  await expect(page).toHaveURL('/timer');
  await expect
    .poll(() => commands)
    .toEqual([
      { path: '/api/time/stop', body: {} },
      { path: '/api/time/start', body: { tags: ['planning', 'client-a'] } },
    ]);
});
