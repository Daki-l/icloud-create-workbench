import { LinkProvider } from '@astryxdesign/core/Link';
import { Theme } from '@astryxdesign/core/theme';
import { ToastViewport } from '@astryxdesign/core/Toast';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { useSettingsTheme } from '@skyroc/web-admin-theme';
import { Link as TanStackLink } from '@tanstack/react-router';
import { type AnchorHTMLAttributes, type PropsWithChildren, forwardRef } from 'react';

interface RouterLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** TanStack Router 接收的内部跳转地址。 */
  to?: string;
}

/** 将 Astryx 链接统一接入 TanStack Router，外部地址仍由浏览器处理。 */
const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>((props, ref) => {
  const { children, href = '', to, ...rest } = props;
  const target = to || href;

  if (/^(?:https?:|mailto:|tel:)/.test(target)) {
    return (
      <a {...rest} href={target} ref={ref}>
        {children}
      </a>
    );
  }

  return (
    <TanStackLink {...rest} ref={ref} to={target}>
      {children}
    </TanStackLink>
  );
});

RouterLink.displayName = 'RouterLink';

/** 提供 Astryx 主题、路由链接和全局提示容器。 */
const AstryxProvider = ({ children }: PropsWithChildren) => {
  const { themeScheme } = useSettingsTheme();
  const mode = themeScheme === 'auto' ? 'system' : themeScheme;

  return (
    <Theme mode={mode} theme={neutralTheme}>
      <LinkProvider component={RouterLink}>
        <ToastViewport position="bottomEnd">{children}</ToastViewport>
      </LinkProvider>
    </Theme>
  );
};

export default AstryxProvider;
