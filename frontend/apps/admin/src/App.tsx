import { JotaiProvider } from '@skyroc/core-state';
import { i18n } from '@skyroc/web-admin-i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import AntdProvider from './features/antd/AntdProvider';
import AstryxProvider from './features/astryx/AstryxProvider';
import GlobalEffect from './features/effects/GlobalEffect';
import RouterProvider from './features/router/RouterProvider';
import { queryClient } from './service/queryClient';

interface ProviderProps {
  /** 需要挂载到全局 Provider 下的应用内容。 */
  children: ReactNode;
}

const Provider = (props: ProviderProps) => {
  const { children } = props;

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>{children}</JotaiProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};

const App = () => (
  <Provider>
    <AntdProvider>
      <AstryxProvider>
        <RouterProvider />
        <GlobalEffect />
      </AstryxProvider>
    </AntdProvider>
  </Provider>
);

export default App;
