import { Outlet, createRootRouteWithContext, useLocation, useMatches } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { isPublicPath } from '@/utils/route';
import ErrorPage from './error';
import NotFound from './not-found';
import GlobalLoading from './loading';

interface RouteMatchWithStaticData {
  /** Route metadata used by global document side effects. */
  staticData?: Router.Meta;
}

function getCurrentRouteMeta(matches: RouteMatchWithStaticData[]) {
  return matches.findLast(match => match.staticData?.i18nKey || match.staticData?.title)?.staticData ?? null;
}

const Root = () => {
  const { pathname } = useLocation();
  const matches = useMatches();
  const { t } = useTranslation();
  const routeMeta = getCurrentRouteMeta(matches);
  const documentTitle = routeMeta?.i18nKey ? t(routeMeta.i18nKey) : routeMeta?.title;

  useEffect(() => {
    if (documentTitle) {
      document.title = documentTitle;
    }
  }, [documentTitle]);

  useEffect(() => {
    globalConfig.nprogress.done();

    return () => {
      globalConfig.nprogress.start();
    };
  }, [pathname]);

  return <Outlet />;
};

export const Route = createRootRouteWithContext<Router.RouterContext>()({
  component: Root,
  notFoundComponent: NotFound,
  beforeLoad: async ({ context, location }) => {
    // 公开页面（取件页、登录页）无需鉴权初始化，避免匿名访问触发 /api/auth/me 的 401。
    if (isPublicPath(location.pathname)) return;
    if (!context.isAuthInitialized) {
      await context.initAuth();
    }
  },
  staticData: {
    title: 'iCloud 隐藏邮箱生产控制台'
  },
  errorComponent: ErrorPage,
  pendingComponent: GlobalLoading
});
