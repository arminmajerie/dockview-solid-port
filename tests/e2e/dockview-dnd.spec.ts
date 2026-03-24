import { devices, expect, Page, test } from '@playwright/test';

type LayoutState = {
  groups: Array<{
    id: string;
    panels: string[];
    activePanel?: string;
  }>;
  activePanel?: string;
};

const iPadProfile = devices['iPad Pro 11'];
const iPhoneProfile = devices['iPhone 14'];

async function readJsonState<T>(page: Page, testId: string): Promise<T> {
  const raw = await page.getByTestId(testId).textContent();

  if (!raw) {
    throw new Error(`missing state payload for ${testId}`);
  }

  return JSON.parse(raw) as T;
}

async function waitForLayoutState(page: Page): Promise<LayoutState> {
  await expect
    .poll(async () => {
      const layout = await readJsonState<LayoutState>(page, 'layout-state');

      return layout.groups.length;
    })
    .toBeGreaterThan(1);

  return readJsonState<LayoutState>(page, 'layout-state');
}

async function dragTabToGroup(page: Page, panelId: string, groupId: string) {
  await page
    .locator(`[data-testid="dockview-tab"][data-panel-id="${panelId}"]`)
    .dragTo(
      page.locator(
        `[data-testid="dockview-group-content"][data-group-id="${groupId}"]`
      )
    );
}

async function dispatchTouchDrag(
  page: Page,
  sourceSelector: string,
  targetSelector: string
) {
  const source = page.locator(sourceSelector);
  const target = page.locator(targetSelector);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('missing source or target bounding box');
  }

  const sourcePoint = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const targetPoint = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };

  await source.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: sourcePoint.x,
    clientY: sourcePoint.y,
  });
  await page.waitForTimeout(360);
  await target.dispatchEvent('pointermove', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 1,
    clientX: targetPoint.x,
    clientY: targetPoint.y,
  });
  await page.waitForTimeout(80);
  await target.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: 0,
    clientX: targetPoint.x,
    clientY: targetPoint.y,
  });
}

test('desktop drag moves a tab between groups and updates the serialized layout', async ({
  page,
}) => {
  await page.goto('/?scenario=dnd');

  const initialLayout = await waitForLayoutState(page);
  const gammaGroupId =
    initialLayout.groups.find((group) => group.panels.includes('gamma'))?.id ??
    '';

  expect(gammaGroupId).not.toBe('');
  await expect(page.getByTestId('environment-state')).toContainText(
    '"interactionMode":"desktop"'
  );

  await dragTabToGroup(page, 'beta', gammaGroupId);

  await expect
    .poll(async () => {
      const nextLayout = await readJsonState<LayoutState>(page, 'layout-state');
      return nextLayout.groups.find((group) => group.id === gammaGroupId)?.panels;
    })
    .toEqual(['gamma', 'beta']);

  const updatedLayout = await readJsonState<LayoutState>(page, 'layout-state');
  expect(
    updatedLayout.groups.find((group) => group.panels.includes('alpha'))?.panels
  ).toEqual(['alpha']);
  await expect(page.locator('[data-testid="dockview-drop-overlay"]')).toHaveCount(
    0
  );
  await expect(
    page.locator('[data-testid="dockview-root"]')
  ).toHaveAttribute('data-drag-state', 'idle');
});

test.describe('touch drag', () => {
  test.use({
    viewport: iPadProfile.viewport,
    userAgent: iPadProfile.userAgent,
    deviceScaleFactor: iPadProfile.deviceScaleFactor,
    isMobile: iPadProfile.isMobile,
    hasTouch: iPadProfile.hasTouch,
    colorScheme: 'light',
  });

  test('long-press drag moves a tab and keeps touch/full mode separate', async ({
    page,
  }) => {
    await page.goto('/?scenario=dnd');

    const initialLayout = await waitForLayoutState(page);
    const gammaGroupId =
      initialLayout.groups.find((group) => group.panels.includes('gamma'))?.id ??
      '';

    expect(gammaGroupId).not.toBe('');
    await expect(page.getByTestId('environment-state')).toContainText(
      '"interactionMode":"touch"'
    );
    await expect(page.getByTestId('environment-state')).toContainText(
      '"layoutMode":"full"'
    );

    await dispatchTouchDrag(
      page,
      '[data-testid="dockview-tab"][data-panel-id="beta"]',
      `[data-testid="dockview-group-content"][data-group-id="${gammaGroupId}"]`
    );

    await expect
      .poll(async () => {
        const nextLayout = await readJsonState<LayoutState>(page, 'layout-state');
        return nextLayout.groups.find((group) => group.id === gammaGroupId)?.panels;
      })
      .toEqual(['gamma', 'beta']);

    await expect(page.locator('[data-testid="dockview-drag-ghost"]')).toHaveCount(
      0
    );
    await expect(page.locator('[data-testid="dockview-drop-overlay"]')).toHaveCount(
      0
    );
    await expect(
      page.locator('[data-testid="dockview-root"]')
    ).toHaveAttribute('data-drag-state', 'idle');
  });

  test('long-press drag can drop onto another tab to reorder in touch/full mode', async ({
    page,
  }) => {
    await page.goto('/?scenario=dnd');

    const initialLayout = await waitForLayoutState(page);
    const alphaGroupId =
      initialLayout.groups.find((group) => group.panels.includes('alpha'))?.id ??
      '';

    expect(alphaGroupId).not.toBe('');

    await dispatchTouchDrag(
      page,
      '[data-testid="dockview-tab"][data-panel-id="gamma"]',
      '[data-testid="dockview-tab"][data-panel-id="alpha"]'
    );

    await expect
      .poll(async () => {
        const nextLayout = await readJsonState<LayoutState>(page, 'layout-state');
        return nextLayout.groups.find((group) => group.id === alphaGroupId)?.panels;
      })
      .toEqual(['gamma', 'alpha', 'beta']);

    await expect(page.locator('[data-testid="dockview-drop-overlay"]')).toHaveCount(
      0
    );
    await expect(page.locator('[data-testid="dockview-drag-ghost"]')).toHaveCount(
      0
    );
    await expect(
      page.locator('[data-testid="dockview-root"]')
    ).toHaveAttribute('data-drag-state', 'idle');
  });

  test('cancels cleanly when the touch drag ends outside a valid dock target', async ({
    page,
  }) => {
    await page.goto('/?scenario=dnd');

    const initialLayout = await waitForLayoutState(page);

    await dispatchTouchDrag(
      page,
      '[data-testid="dockview-tab"][data-panel-id="beta"]',
      '[data-testid="dockview-dnd-state"]'
    );

    await expect
      .poll(async () => {
        const layout = await readJsonState<LayoutState>(page, 'layout-state');
        return layout.groups.map((group) => ({
          id: group.id,
          panels: group.panels,
        }));
      })
      .toEqual(
        initialLayout.groups.map((group) => ({
          id: group.id,
          panels: group.panels,
        }))
      );

    await expect(page.locator('[data-testid="dockview-drag-ghost"]')).toHaveCount(
      0
    );
    await expect(page.locator('[data-testid="dockview-drop-overlay"]')).toHaveCount(
      0
    );
    await expect(
      page.locator('[data-testid="dockview-root"]')
    ).toHaveAttribute('data-drag-state', 'idle');
  });
});

test.describe('compact touch drag', () => {
  test.use({
    viewport: iPhoneProfile.viewport,
    userAgent: iPhoneProfile.userAgent,
    deviceScaleFactor: iPhoneProfile.deviceScaleFactor,
    isMobile: iPhoneProfile.isMobile,
    hasTouch: iPhoneProfile.hasTouch,
    colorScheme: 'light',
  });

  test('long-press drag works in touch/compact mode on a phone-sized viewport', async ({
    page,
  }) => {
    await page.goto('/?scenario=dnd');

    const initialLayout = await waitForLayoutState(page);
    const alphaGroupId =
      initialLayout.groups.find((group) => group.panels.includes('alpha'))?.id ??
      '';
    const betaGroupId =
      initialLayout.groups.find((group) => group.panels.includes('beta'))?.id ??
      '';
    const gammaGroupId =
      initialLayout.groups.find((group) => group.panels.includes('gamma'))?.id ??
      '';

    expect(alphaGroupId).not.toBe('');
    expect(betaGroupId).not.toBe('');
    expect(gammaGroupId).not.toBe('');
    await expect(page.getByTestId('environment-state')).toContainText(
      '"interactionMode":"touch"'
    );
    await expect(page.getByTestId('environment-state')).toContainText(
      '"layoutMode":"compact"'
    );

    await dispatchTouchDrag(
      page,
      '[data-testid="dockview-tab"][data-panel-id="beta"]',
      `[data-testid="dockview-group-content"][data-group-id="${gammaGroupId}"]`
    );

    await expect
      .poll(async () => {
        const nextLayout = await readJsonState<LayoutState>(page, 'layout-state');
        return {
          alphaPanels:
            nextLayout.groups.find((group) => group.id === alphaGroupId)?.panels ??
            [],
          betaGroupId:
            nextLayout.groups.find((group) => group.panels.includes('beta'))?.id ??
            '',
          totalGroups: nextLayout.groups.length,
        };
      })
      .toEqual({
        alphaPanels: ['alpha'],
        betaGroupId: expect.not.stringMatching(`^${betaGroupId}$`),
        totalGroups: expect.any(Number),
      });

    await expect(page.locator('[data-testid="dockview-drag-ghost"]')).toHaveCount(
      0
    );
    await expect(page.locator('[data-testid="dockview-drop-overlay"]')).toHaveCount(
      0
    );
    await expect(
      page.locator('[data-testid="dockview-root"]')
    ).toHaveAttribute('data-drag-state', 'idle');
  });

  test('long-press drag can drop onto another tab in touch/compact mode', async ({
    page,
  }) => {
    await page.goto('/?scenario=dnd');

    const initialLayout = await waitForLayoutState(page);
    const alphaGroupId =
      initialLayout.groups.find((group) => group.panels.includes('alpha'))?.id ??
      '';

    expect(alphaGroupId).not.toBe('');

    await dispatchTouchDrag(
      page,
      '[data-testid="dockview-tab"][data-panel-id="gamma"]',
      '[data-testid="dockview-tab"][data-panel-id="alpha"]'
    );

    await expect
      .poll(async () => {
        const nextLayout = await readJsonState<LayoutState>(page, 'layout-state');
        return nextLayout.groups.find((group) => group.id === alphaGroupId)?.panels;
      })
      .toEqual(['gamma', 'alpha', 'beta']);

    await expect(page.locator('[data-testid="dockview-drop-overlay"]')).toHaveCount(
      0
    );
    await expect(page.locator('[data-testid="dockview-drag-ghost"]')).toHaveCount(
      0
    );
    await expect(
      page.locator('[data-testid="dockview-root"]')
    ).toHaveAttribute('data-drag-state', 'idle');
  });
});
