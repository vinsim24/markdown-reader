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

test('presents local Markdown import as an explicit source action', async ({
  page,
}) => {
  await expect(
    page.getByRole('button', { name: 'Import Markdown' }).first()
  ).toBeVisible();
  await page.locator('input[type="file"]:not([multiple])').setInputFiles({
    name: 'imported.markdown',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Explicit local import'),
  });
  await expect(
    page.getByRole('heading', { name: 'Explicit local import' })
  ).toBeVisible();
});

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'mobile', width: 375, height: 740 },
]) {
  test(`${viewport.name} start page keeps source actions tidy`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await expect(
      page.getByRole('button', { name: 'Import Markdown' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open folder' }).first()
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open cheat sheet' })
    ).toBeVisible();
    await expect(page.locator('.topbar')).toHaveCSS('height', '64px');
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      viewport.width
    );

    await expect(page.getByRole('button', { name: 'More' })).toBeHidden();
    const accessibility = await new AxeBuilder({ page })
      .include('.topbar')
      .analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact || '')
      )
    ).toEqual([]);
  });
}

test('imports a public Markdown URL directly in the browser', async ({
  page,
}) => {
  await page.route('https://example.com/guide.md', async (route) => {
    await route.fulfill({
      body: '# Remote browser document\n\n[External](https://example.org)',
      contentType: 'text/markdown',
    });
  });
  await page.getByRole('button', { name: 'Import from URL' }).click();
  const dialog = page.getByRole('dialog', { name: 'Import from URL' });
  await dialog
    .getByRole('textbox', { name: 'Markdown or GitHub URL' })
    .fill('https://example.com/guide.md');
  await dialog.getByRole('button', { name: 'Import Markdown' }).click();
  await expect(
    page.getByRole('heading', { name: 'Remote browser document' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'External' })).toHaveAttribute(
    'rel',
    'noopener noreferrer'
  );
});

test('offers a working design.md example when no URL is handy', async ({
  page,
}) => {
  await page.route(
    'https://raw.githubusercontent.com/google-labs-code/design.md/main/README.md',
    async (route) => {
      await route.fulfill({
        body: '# design.md example README',
        contentType: 'text/plain',
      });
    }
  );
  await page.getByRole('button', { name: 'Import from URL' }).click();
  await page.getByRole('button', { name: 'Import design.md README' }).click();
  await expect(
    page.getByRole('heading', { name: 'design.md example README' })
  ).toBeVisible();
});

test('opens the bundled Markdown cheat sheet in a reusable tab', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Open cheat sheet' }).click();
  await expect(page.getByText('Opened Markdown Cheat Sheet.md')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Markdown Cheat Sheet' })
  ).toBeVisible();
  await expect(page.locator('.reader table')).toBeVisible();
  await expect(page.locator('.reader .code-block')).toHaveCount(2);
  await expect(
    page.locator('.reader .mermaid-canvas > svg[role="img"]')
  ).toBeVisible();
  await expect(page.getByText('Opened Markdown Cheat Sheet.md')).toBeHidden({
    timeout: 6000,
  });

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: /Cheat sheet/ }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'Open documents' })
      .locator('.document-tab-select')
  ).toHaveCount(1);
});

test('switches the active document to an interactive Markmap view', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) =>
    pageErrors.push(error.stack ?? error.message)
  );
  await page.getByRole('button', { name: 'Markmap example' }).first().click();

  const mindMap = page.getByRole('region', {
    name: 'Mind map for Markmap Examples.md',
  });
  await expect(mindMap.getByRole('img')).toBeVisible();
  await expect(mindMap.locator('.markmap-node').first()).toBeVisible();
  expect(pageErrors, 'mind map initialization errors').toEqual([]);
  await expect(
    mindMap.getByText(
      'Drag to pan, scroll to zoom, and select a branch to fold.'
    )
  ).toBeVisible();
  await mindMap.getByRole('button', { name: 'Zoom in' }).click();
  await mindMap.getByRole('button', { name: 'Zoom out' }).click();
  await mindMap.getByRole('button', { name: 'Fit' }).click();
  expect(pageErrors, 'mind map control errors').toEqual([]);

  const [svgDownload] = await Promise.all([
    page.waitForEvent('download'),
    mindMap.getByRole('button', { name: 'SVG' }).click(),
  ]);
  expect(svgDownload.suggestedFilename()).toBe('Markmap Examples.svg');
  expect(pageErrors, 'mind map export errors').toEqual([]);

  const accessibility = await new AxeBuilder({ page })
    .include('.markmap-view')
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact || '')
    )
  ).toEqual([]);

  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(
    page.getByRole('heading', { name: 'Markmap Examples' })
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
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
    page.getByRole('heading', { name: 'Markdown, made comfortable.' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Single file' })).toBeHidden();
});

test('opens, switches, and closes document tabs', async ({ page }) => {
  const picker = page.locator('input[type="file"]:not([multiple])');
  await picker.setInputFiles({
    name: 'first.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# First tab'),
  });
  await picker.setInputFiles({
    name: 'second.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Second tab'),
  });

  const documentNavigation = page.getByRole('navigation', {
    name: 'Open documents',
  });
  await expect(documentNavigation.locator('.document-tab-select')).toHaveCount(
    2
  );
  await expect(documentNavigation.locator('.document-tab-list')).toHaveCSS(
    'overflow-y',
    'hidden'
  );
  await expect(
    documentNavigation.getByRole('button', { name: 'second.md', exact: true })
  ).toHaveAttribute('aria-current', 'page');
  await documentNavigation
    .getByRole('button', { name: 'first.md', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'First tab' })).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { name: 'Second tab' })).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact || '')
    )
  ).toEqual([]);

  await page.getByRole('button', { name: 'Close second.md' }).click();
  await expect(page.getByRole('heading', { name: 'First tab' })).toBeVisible();
  await page.getByRole('button', { name: 'Close first.md' }).click();
  await expect(
    page.getByRole('heading', { name: 'Markdown, made comfortable.' })
  ).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Open documents' })
  ).toBeHidden();
});

test('@a11y edits a session draft and protects it from accidental closing', async ({
  page,
}) => {
  await page.locator('input[type="file"]:not([multiple])').setInputFiles({
    name: 'draft.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Original\n\nA local draft.'),
  });
  await page.getByRole('button', { name: 'Write', exact: true }).click();

  const editor = page.getByRole('textbox', {
    name: 'Markdown editor for draft.md',
  });
  await expect(editor).toBeVisible();
  await editor.press('Control+End');
  await editor.pressSequentially('\n\n## Added section\n\nBrowser draft.');
  const editorWorkspace = page.getByRole('region', {
    name: 'Writing draft.md',
  });
  await expect(editorWorkspace.getByRole('status')).toHaveText(
    'Unsaved changes'
  );
  await expect(
    page.getByRole('button', { name: /draft\.md.*Unsaved changes/ })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Split' }).click();
  const splitWorkspace = page.getByRole('region', {
    name: 'Split view for draft.md',
  });
  await expect(splitWorkspace.getByLabel('Live preview')).toContainText(
    'Browser draft.'
  );
  await expect(
    page.getByRole('heading', { name: 'Added section' })
  ).toBeVisible();
  await expect(
    splitWorkspace.getByLabel('Live preview').getByText('Browser draft.')
  ).toBeVisible();

  const resizeHandle = splitWorkspace.getByRole('separator', {
    name: 'Resize split panes',
  });
  await resizeHandle.focus();
  await resizeHandle.press('ArrowRight');
  await expect(resizeHandle).toHaveAttribute('aria-valuenow', '55');
  const dividerBounds = await resizeHandle.boundingBox();
  if (!dividerBounds) throw new Error('Split divider was not measurable.');
  await page.mouse.move(
    dividerBounds.x + dividerBounds.width / 2,
    dividerBounds.y + dividerBounds.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(dividerBounds.x + 90, dividerBounds.y + 10);
  await page.mouse.up();
  expect(Number(await resizeHandle.getAttribute('aria-valuenow'))).toBeGreaterThan(
    55
  );

  const splitAccessibility = await new AxeBuilder({ page })
    .include('.split-workspace')
    .analyze();
  expect(
    splitAccessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact || '')
    )
  ).toEqual([]);

  await page.getByRole('button', { name: 'Write', exact: true }).click();
  const accessibility = await new AxeBuilder({ page })
    .include('.editor-workspace')
    .analyze();
  expect(
    accessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact || '')
    )
  ).toEqual([]);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain('Discard unsaved changes to draft.md?');
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Close draft.md' }).click();
  await expect(editor).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Close draft.md' }).click();
  await expect(
    page.getByRole('heading', { name: 'Markdown, made comfortable.' })
  ).toBeVisible();
});

test('opens the directory fallback and resolves local content', async ({
  page,
}) => {
  const fixture = path.resolve('tests/fixtures/library');
  await page.locator('input[webkitdirectory]').setInputFiles(fixture);
  await expect(
    page.getByText('README.md', { exact: true }).first()
  ).toBeVisible();
  const fileTree = page.getByRole('complementary', {
    name: 'Document navigation',
  });
  await fileTree.locator('.tree-file[title="guides/Chapter One.md"]').click();
  await expect(
    page.getByRole('heading', { name: 'Details', exact: true }).first()
  ).toBeVisible();
  await expect(page.locator('.toc a[href="#details-1"]')).toBeVisible();
  await expect(page.locator('.reader img')).toHaveAttribute('src', /^blob:/);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fixture library' })
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'External reference' })
  ).toHaveAttribute('target', '_blank');
  await expect(
    page.getByRole('link', { name: 'External reference' })
  ).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(
    page.locator('.mermaid-canvas > svg[role="img"]')
  ).toBeVisible();
  await expect(page.locator('.mermaid-diagram')).not.toContainText(
    'flowchart LR'
  );
  await page.getByRole('button', { name: 'Open reading settings' }).click();
  for (const [theme, fill] of [
    ['Light', 'rgb(229, 236, 245)'],
    ['Dark', 'rgb(38, 55, 77)'],
    ['Sepia', 'rgb(233, 217, 199)'],
    ['Mono', 'rgb(225, 228, 230)'],
    ['Cappuccino', 'rgb(228, 205, 189)'],
    ['High Contrast', 'rgb(255, 255, 255)'],
  ] as const) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await expect(page.locator('.mermaid-diagram .node rect').first()).toHaveCSS(
      'fill',
      fill
    );
  }
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Reading settings' })
    .getByRole('button', { name: 'Close reading settings' })
    .click();
  await fileTree.locator('.tree-file[title="Markdown-Cheat-sheet.md"]').click();
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
  await expect(
    page.getByRole('heading', { name: 'Text Formatting' })
  ).toHaveCSS('border-bottom-style', 'solid');
  const codeBlocks = page.locator('.reader .code-block');
  await expect(codeBlocks).toHaveCount(3);
  await expect(codeBlocks.nth(0).locator('.code-language')).toHaveText(
    'JavaScript'
  );
  await expect(codeBlocks.nth(1).locator('.code-language')).toHaveText(
    'Python'
  );
  await expect(codeBlocks.nth(2).locator('.code-language')).toHaveText('JSON');
  await expect(
    codeBlocks.nth(0).locator('.hljs-keyword').first()
  ).toBeVisible();
  const readerA11y = await new AxeBuilder({ page })
    .include('.reader')
    .analyze();
  expect(
    readerA11y.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact || '')
    )
  ).toEqual([]);
  await expect(
    codeBlocks.nth(0).getByRole('button', { name: 'Copy JavaScript code' })
  ).toBeVisible();
  const diagramToolbar = page
    .getByRole('toolbar', { name: 'Mermaid diagram actions' })
    .first();
  await expect(
    diagramToolbar.getByRole('button', { name: 'View diagram full screen' })
  ).toBeVisible();
  await expect(
    diagramToolbar.getByRole('button', { name: 'Copy' })
  ).toBeVisible();
  const [svgDownload] = await Promise.all([
    page.waitForEvent('download'),
    diagramToolbar.getByRole('button', { name: 'SVG' }).click(),
  ]);
  expect(svgDownload.suggestedFilename()).toBe('mermaid-diagram.svg');
  await fileTree.locator('.tree-file[title="README.md"]').click();
  await page.getByRole('button', { name: 'Chapter details' }).click();
  await expect(page).toHaveURL(/#details$/);
});

test('renders Obsidian syntax and resolves vault-relative content', async ({
  page,
}) => {
  const fixture = path.resolve('tests/fixtures/library');
  await page.locator('input[webkitdirectory]').setInputFiles(fixture);
  const fileTree = page.getByRole('complementary', {
    name: 'Document navigation',
  });
  await fileTree
    .locator('.tree-file[title="obsidian/Obsidian Home.md"]')
    .click();
  await expect(
    page.getByRole('heading', { name: 'Obsidian Home' })
  ).toBeVisible();
  await expect(page.locator('.obsidian-properties')).toContainText('aliases');
  await expect(page.locator('.obsidian-callout-tip')).toBeVisible();
  await expect(page.locator('.obsidian-tag')).toHaveText('#fixture/obsidian');
  await expect(page.locator('.reader mark')).toHaveText('highlighted text');
  await expect(page.locator('.reader img')).toHaveCSS('max-width', '180px');
  await page.getByRole('button', { name: 'Daily workflow' }).click();
  await expect(
    page.getByRole('heading', { name: 'Daily note', exact: true })
  ).toBeVisible();
  await expect(page).toHaveURL(/#workflow$/);
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

for (const viewport of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 800, height: 900 },
  { name: 'mobile', width: 375, height: 740 },
]) {
  test(`${viewport.name} writing modes stay inside the viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.locator('input[type="file"]:not([multiple])').setInputFiles({
      name: 'responsive-editor.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Responsive editor\n\nEdit locally.'),
    });
    if (viewport.name === 'mobile') {
      await expect(page.getByRole('button', { name: 'Split' })).toBeHidden();
    } else {
      await page.getByRole('button', { name: 'Split' }).click();
      await expect(
        page.getByRole('region', {
          name: 'Split view for responsive-editor.md',
        })
      ).toBeVisible();
      if (viewport.name === 'desktop') {
        await page.setViewportSize({ width: 375, height: 740 });
        await expect(
          page.getByRole('button', { name: 'Preview' })
        ).toHaveAttribute('aria-pressed', 'true');
        await expect(page.getByRole('button', { name: 'Split' })).toBeHidden();
        await page.setViewportSize(viewport);
      }
    }
    await page.getByRole('button', { name: 'Write', exact: true }).click();
    await expect(
      page.getByRole('textbox', {
        name: 'Markdown editor for responsive-editor.md',
      })
    ).toBeVisible();
    await expect(page.locator('body')).toHaveJSProperty(
      'scrollWidth',
      viewport.width
    );
    const workspaceWidth = await page
      .locator('.main-area')
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(workspaceWidth).toBeGreaterThanOrEqual(viewport.width * 0.8);
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
