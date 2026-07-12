import { render, screen } from '@testing-library/react';
import { atom, useAtomValue } from 'jotai';
import { describe, expect, it } from 'vitest';
import { JotaiProvider } from '../src/provider/JotaiProvider';
import { globalStore } from '../src/store/global';

describe('JotaiProvider', () => {
  it('renders children', () => {
    render(
      <JotaiProvider>
        <div data-testid="child">hello</div>
      </JotaiProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides globalStore to child atoms', () => {
    const testAtom = atom('initial');
    globalStore.set(testAtom, 'from-global');

    function Child() {
      const val = useAtomValue(testAtom);
      return <span data-testid="val">{val}</span>;
    }

    render(
      <JotaiProvider>
        <Child />
      </JotaiProvider>
    );

    expect(screen.getByTestId('val').textContent).toBe('from-global');
  });
});
