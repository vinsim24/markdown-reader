// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
      expect.objectContaining({ securityLevel: 'strict', startOnLoad: false })
    );
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
