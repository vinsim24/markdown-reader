// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import mermaid from 'mermaid';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MermaidDiagram from './MermaidDiagram';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MermaidDiagram', () => {
  it('renders strict, accessible SVG without HTML injection', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>Local flow</text></svg>',
      diagramType: 'flowchart-v2',
    });

    render(<MermaidDiagram source="flowchart LR; A-->B" theme="light" />);

    expect(
      await screen.findByRole('img', { name: 'Mermaid diagram' })
    ).not.toBeNull();
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        startOnLoad: false,
        theme: 'base',
        themeVariables: expect.objectContaining({
          primaryBorderColor: '#3f6396',
          primaryTextColor: '#20262c',
        }),
      })
    );
    expect(
      (screen.getByRole('button', { name: 'PNG' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      (screen.getByRole('button', { name: 'SVG' }) as HTMLButtonElement)
        .disabled
    ).toBe(false);
    expect(
      screen.getByRole('button', { name: 'View diagram full screen' })
    ).not.toBeNull();
  });

  it('copies the Mermaid source', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" />',
      diagramType: 'flowchart-v2',
    });
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<MermaidDiagram source="flowchart LR; A-->B" theme="dark" />);
    await screen.findByRole('img', { name: 'Mermaid diagram' });
    expect(mermaid.initialize).toHaveBeenLastCalledWith(
      expect.objectContaining({
        themeVariables: expect.objectContaining({
          background: '#1d2227',
          primaryBorderColor: '#87aadb',
          primaryTextColor: '#e8ecef',
        }),
      })
    );
    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith('flowchart LR; A-->B');
    expect(screen.getByRole('button', { name: 'Copied' })).not.toBeNull();
  });

  it('shows the source when a diagram is invalid', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Invalid syntax'));
    render(<MermaidDiagram source="not a diagram" theme="light" />);

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'could not be rendered'
      )
    );
    expect(screen.getByText('not a diagram')).not.toBeNull();
  });
});
