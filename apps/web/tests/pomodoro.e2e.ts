import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('account', 'test-account'));
  await page.route('**/api/time**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/time/active')) {
      await route.fulfill({ status: 404, json: { error: 'No active timer' } });
    } else if (url.pathname.endsWith('/time/tags')) {
      await route.fulfill({ json: { tags: [] } });
    } else {
      await route.fulfill({ json: [] });
    }
  });
});

test('a user can navigate to, start, pause, and restore a Pomodoro', async ({ page }) => {
  await page.goto('/timer');
  await expect(page.locator('#TagInput')).toBeEnabled();
  await page.locator('#TagInput').evaluate((input: HTMLInputElement) => input.blur());
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('BODY');
  await page.keyboard.press('p');

  await expect(page).toHaveURL('/pomodoro');
  await expect(page.getByRole('heading', { name: 'Focus' })).toBeVisible();
  await expect(page.getByText('25:00')).toBeVisible();
  const pomodoroLink = page.getByRole('link', { name: 'Pomodoro', exact: true });
  await expect(pomodoroLink.locator('.running-indicator')).toBeHidden();
  await expect(page).toHaveTitle('Tidsanda');

  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Pomodoro running', exact: true }).locator('.running-indicator'),
  ).toBeVisible();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Focus · Running \| Tidsanda$/);
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(pomodoroLink.locator('.running-indicator')).toBeHidden();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Focus · Paused \| Tidsanda$/);

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Focus · Paused \| Tidsanda$/);
  await page.getByRole('link', { name: 'Pomodoro' }).click();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  await expect(page).toHaveTitle(/^\d{2}:\d{2} · Focus · Paused \| Tidsanda$/);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('button', { name: 'Start Focus' })).toBeVisible();
  await expect(page.getByText('25:00')).toBeVisible();
  await expect(page).toHaveTitle('Tidsanda');
});

test('a completed focus period waits for a break and sends one notification', async ({ page }) => {
  await page.addInitScript(() => {
    const notifications: string[] = [];
    Object.defineProperty(window, 'testNotifications', { value: notifications });
    class TestNotification {
      static permission = 'granted';
      static requestPermission = async () => 'granted';
      onclick: (() => void) | null = null;

      constructor(title: string) {
        notifications.push(title);
      }
    }
    Object.defineProperty(window, 'Notification', { configurable: true, value: TestNotification });
  });

  await page.goto('/pomodoro');
  await expect(page.getByRole('button', { name: 'Start Focus' })).toBeVisible();
  await page.evaluate(() => {
    const key = 'tidsanda:pomodoro:test-account';
    const now = Date.now();
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        phase: 'focus',
        status: 'running',
        remainingMs: 100,
        endsAt: now + 100,
        updatedAt: now,
      }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });

  await expect(page.getByRole('heading', { name: 'Break' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Break' })).toBeVisible();
  await expect(page.getByText('05:00')).toBeVisible();
  await expect(page).toHaveTitle('05:00 · Break · Ready | Tidsanda');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { testNotifications: string[] }).testNotifications))
    .toEqual(['Focus complete']);
});

test('Pomodoro actions synchronize between tabs', async ({ context, page }) => {
  await context.addInitScript(() => localStorage.setItem('account', 'test-account'));
  const secondPage = await context.newPage();
  await page.goto('/pomodoro');
  await secondPage.goto('/pomodoro');
  await expect(secondPage.getByRole('button', { name: 'Start Focus' })).toBeVisible();

  await page.getByRole('button', { name: 'Start Focus' }).click();

  await expect(secondPage.getByRole('button', { name: 'Pause' })).toBeVisible();
});

test('the Pomodoro controls and navigation fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/pomodoro');

  await expect(page.getByRole('navigation')).toBeInViewport();
  await expect(page.getByRole('heading', { name: 'Focus' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Start Focus' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Reset' })).toBeInViewport();
});
