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
