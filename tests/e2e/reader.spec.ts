import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'showDirectoryPicker');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('opens a single file, searches it, and uses Focus mode', async ({
  page,
}) => {
  await page.locator('input[type="file"]:not([multiple])').setInputFiles({
    name: 'single.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      '# Single file\n\nA searchable sentence.\n\n## Second section\n\nMore text.'
    ),
  });
  await expect(
    page.getByRole('heading', { name: 'Single file' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Search document' }).click();
  await page
    .getByRole('textbox', { name: 'Search this document' })
    .fill('searchable');
  await expect(page.locator('mark')).toHaveText('searchable');
  await page.getByRole('link', { name: 'Second section' }).click();
  await expect(
    page.getByRole('link', { name: 'Second section' })
  ).toHaveAttribute('aria-current', 'location');
  await page.getByRole('button', { name: 'Focus mode' }).click();
  await expect(page.getByRole('button', { name: /Exit Focus/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Exit Focus/ })).toBeHidden();
  await page.getByRole('button', { name: 'Return to start' }).click();
  await expect(
    page.getByRole('heading', { name: 'Open a Markdown document' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Single file' })).toBeHidden();
});

test('opens the directory fallback and resolves local content', async ({
  page,
}) => {
  const fixture = path.resolve('tests/fixtures/library');
  await page.locator('input[webkitdirectory]').setInputFiles(fixture);
  await expect(
    page.getByText('README.md', { exact: true }).first()
  ).toBeVisible();
  await page.getByRole('button', { name: 'Chapter One.md' }).click();
  await expect(
    page.getByRole('heading', { name: 'Details', exact: true }).first()
  ).toBeVisible();
  await expect(page.locator('.toc a[href="#details-1"]')).toBeVisible();
  await expect(page.locator('.reader img')).toHaveAttribute('src', /^blob:/);
  await page.getByRole('button', { name: 'Home' }).click();
  await expect(
    page.getByRole('heading', { name: 'Fixture library' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'External reference' })
  ).toHaveAttribute('target', '_blank');
  await expect(
    page.getByRole('link', { name: 'External reference' })
  ).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('.mermaid-diagram svg')).toBeVisible();
  await expect(page.locator('.mermaid-diagram')).not.toContainText(
    'flowchart LR'
  );
  await page.getByRole('button', { name: 'Markdown-Cheat-sheet.md' }).click();
  await expect(page.locator('.reader .katex')).toHaveCount(5);
  await expect(page.locator('.reader sup').first()).toContainText('2');
  await expect(page.locator('.reader sub').first()).toContainText('2');
  await expect(page.locator('.reader kbd').first()).toHaveText('Ctrl');
  await expect(page.locator('.reader abbr')).toHaveAttribute(
    'title',
    'Hypertext Markup Language'
  );
  await expect(page.locator('.reader mark')).toHaveText('Highlighted text');
  await expect(page.locator('.reader script')).toHaveCount(0);
  await page.getByRole('button', { name: 'README.md' }).click();
  await page.getByRole('button', { name: 'Chapter details' }).click();
  await expect(page).toHaveURL(/#details$/);
});

test('accepts an individual Markdown file by drag and drop', async ({
  page,
}) => {
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(['# Dropped document'], 'dropped.md', {
        type: 'text/markdown',
      })
    );
    window.dispatchEvent(
      new DragEvent('dragenter', { dataTransfer: transfer, bubbles: true })
    );
    window.dispatchEvent(
      new DragEvent('drop', { dataTransfer: transfer, bubbles: true })
    );
  });
  await expect(
    page.getByRole('heading', { name: 'Dropped document' })
  ).toBeVisible();
});

test('applies every theme and font and persists explicit choices', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Open reading settings' }).click();
  const themes = [
    ['Light', 'light'],
    ['Dark', 'dark'],
    ['Sepia', 'sepia'],
    ['Mono', 'mono'],
    ['Cappuccino', 'cappuccino'],
    ['High Contrast', 'contrast'],
  ] as const;
  for (const [label, value] of themes) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-theme', value);
  }
  const fonts = [
    'inter',
    'source-serif',
    'literata',
    'charter',
    'atkinson',
    'system-sans',
    'jetbrains',
    'system-mono',
  ];
  for (const font of fonts) {
    await page.getByLabel('Font').selectOption(font);
    await expect(page.locator('body')).toHaveAttribute('data-font', font);
  }
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute(
    'data-font',
    'system-mono'
  );
  await page.getByRole('button', { name: 'Open reading settings' }).click();
  await page.getByRole('button', { name: 'Reset all preferences' }).click();
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('body')).toHaveAttribute('data-font', 'inter');
});

for (const viewport of [
  { name: 'tablet', width: 800, height: 900 },
  { name: 'mobile', width: 375, height: 740 },
]) {
  test(`${viewport.name} navigation and settings fit the viewport`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.locator('input[type="file"]:not([multiple])').setInputFiles({
      name: 'responsive.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Responsive document\n\n## Section'),
    });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.locator('#reader-sidebar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#reader-sidebar')).not.toHaveClass(/open/);
    await page.getByRole('button', { name: 'Open reading settings' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Reading settings' })
    ).toBeVisible();
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      viewport.width
    );
  });
}

test('@a11y has no serious or critical axe violations', async ({ page }) => {
  await page.getByRole('button', { name: 'Open reading settings' }).click();
  for (const theme of [
    'Light',
    'Dark',
    'Sepia',
    'Mono',
    'Cappuccino',
    'High Contrast',
  ]) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await page.waitForTimeout(50);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact || '')
      )
    ).toEqual([]);
  }
});
