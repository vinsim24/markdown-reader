// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SourceMenu from './SourceMenu';

afterEach(cleanup);

const renderMenu = () => {
  const actions = {
    onOpenCheatSheet: vi.fn(),
    onOpenMarkmapExamples: vi.fn(),
    onOpenObsidianGuide: vi.fn(),
    onOpenUrlImport: vi.fn(),
  };
  render(<SourceMenu {...actions} />);
  return actions;
};

describe('SourceMenu', () => {
  it('opens the grouped source actions and runs the selected action', async () => {
    const user = userEvent.setup();
    const actions = renderMenu();

    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('menu')).not.toBeNull();
    await user.click(screen.getByRole('menuitem', { name: /Cheat sheet/ }));

    expect(actions.onOpenCheatSheet).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'More' });

    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
