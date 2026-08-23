// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReaderUi } from './useReaderUi';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useReaderUi notices', () => {
  it('automatically dismisses transient success notices', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useReaderUi());

    act(() => result.current.showTransientNotice('Opened example.md'));
    expect(result.current.linkNotice).toBe('Opened example.md');

    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.linkNotice).toBe('');
  });

  it('keeps persistent guidance until it is dismissed', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useReaderUi());

    act(() => result.current.setLinkNotice('Open the containing folder.'));
    act(() => vi.advanceTimersByTime(8000));
    expect(result.current.linkNotice).toBe('Open the containing folder.');

    act(() => result.current.dismissLinkNotice());
    expect(result.current.linkNotice).toBe('');
  });
});
