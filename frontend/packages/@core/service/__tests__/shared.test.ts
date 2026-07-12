import { describe, expect, it, vi } from 'vitest';
import { getAuthorization, handleExpiredRequest, handleRefreshToken, showErrorMsg } from '../src/request/shared';
import type { RequestAdapter, RequestInstanceState } from '../src/request/types';

function createMockAdapter(overrides: Partial<RequestAdapter> = {}): RequestAdapter {
  return {
    getCurrentPath: vi.fn(() => '/current'),
    getRefreshToken: vi.fn(() => 'mock-refresh-token'),
    getToken: vi.fn(() => 'mock-token'),
    redirectToLogin: vi.fn(),
    resetAuth: vi.fn(),
    setAuth: vi.fn(),
    showErrorMessage: vi.fn(),
    showErrorModal: vi.fn(),
    t: vi.fn((key: string) => key),
    fetchRefreshToken: vi.fn(async () => ({ token: 'new-token', refreshToken: 'new-refresh' })),
    ...overrides
  };
}

function createState(overrides: Partial<RequestInstanceState> = {}): RequestInstanceState {
  return {
    errMsgStack: [],
    refreshTokenPromise: null,
    ...overrides
  };
}

describe('getAuthorization', () => {
  it('returns Bearer token when token exists', () => {
    const adapter = createMockAdapter({ getToken: vi.fn(() => 'abc123') });
    expect(getAuthorization(adapter)).toBe('Bearer abc123');
  });

  it('returns null when token is null', () => {
    const adapter = createMockAdapter({ getToken: vi.fn(() => null) });
    expect(getAuthorization(adapter)).toBeNull();
  });
});

describe('handleRefreshToken', () => {
  it('calls fetchRefreshToken and setAuth on success', async () => {
    const adapter = createMockAdapter();
    const result = await handleRefreshToken(adapter);

    expect(adapter.fetchRefreshToken).toHaveBeenCalledWith('mock-refresh-token');
    expect(adapter.setAuth).toHaveBeenCalledWith({ token: 'new-token', refreshToken: 'new-refresh' });
    expect(result).toBe(true);
  });

  it('uses empty string when getRefreshToken returns null', async () => {
    const adapter = createMockAdapter({ getRefreshToken: vi.fn(() => null) });
    await handleRefreshToken(adapter);

    expect(adapter.fetchRefreshToken).toHaveBeenCalledWith('');
  });

  it('redirects to login on failure', async () => {
    const adapter = createMockAdapter({
      fetchRefreshToken: vi.fn(async () => {
        throw new Error('fail');
      })
    });

    const result = await handleRefreshToken(adapter);

    expect(adapter.redirectToLogin).toHaveBeenCalledWith('/current');
    expect(result).toBe(false);
  });
});

describe('handleExpiredRequest', () => {
  it('shares the same promise for concurrent calls', async () => {
    const adapter = createMockAdapter();
    const state = createState();

    const p1 = handleExpiredRequest(adapter, state);
    const p2 = handleExpiredRequest(adapter, state);

    expect(state.refreshTokenPromise).not.toBeNull();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(adapter.fetchRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('clears promise after delay', async () => {
    vi.useFakeTimers();
    const adapter = createMockAdapter();
    const state = createState();

    await handleExpiredRequest(adapter, state);

    expect(state.refreshTokenPromise).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(state.refreshTokenPromise).toBeNull();

    vi.useRealTimers();
  });
});

describe('showErrorMsg', () => {
  it('shows message and adds to stack', () => {
    const adapter = createMockAdapter();
    const state = createState();

    showErrorMsg(adapter, state, 'Something went wrong');

    expect(adapter.showErrorMessage).toHaveBeenCalledWith('Something went wrong', expect.any(Function));
    expect(state.errMsgStack).toContain('Something went wrong');
  });

  it('does not show duplicate messages', () => {
    const adapter = createMockAdapter();
    const state = createState({ errMsgStack: ['Something went wrong'] });

    showErrorMsg(adapter, state, 'Something went wrong');

    expect(adapter.showErrorMessage).not.toHaveBeenCalled();
  });

  it('removes message from stack on close callback', () => {
    vi.useFakeTimers();
    let onCloseCallback: (() => void) | undefined;
    const adapter = createMockAdapter({
      showErrorMessage: vi.fn((_msg: string, onClose?: () => void) => {
        onCloseCallback = onClose;
      })
    });
    const state = createState();

    showErrorMsg(adapter, state, 'Error msg');
    expect(state.errMsgStack).toContain('Error msg');

    onCloseCallback!();
    expect(state.errMsgStack).not.toContain('Error msg');

    vi.advanceTimersByTime(5000);
    expect(state.errMsgStack).toEqual([]);

    vi.useRealTimers();
  });
});
