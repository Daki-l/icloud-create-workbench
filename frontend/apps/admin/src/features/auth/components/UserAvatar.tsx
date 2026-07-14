import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useSettingsTheme } from '@skyroc/web-admin-theme';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { LogOut, MonitorCog, MoonStar, SunMedium, UserCircle } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserInfoQuery } from '@/service/api';

import { useAuth } from '../use-auth';

/** 返回当前主题模式对应的图标和文字。 */
function getThemePresentation(themeScheme: 'auto' | 'dark' | 'light') {
  if (themeScheme === 'light') return { icon: SunMedium, label: '亮色' };
  if (themeScheme === 'dark') return { icon: MoonStar, label: '暗色' };
  return { icon: MonitorCog, label: '跟随系统' };
}

const UserAvatar = () => {
  const { isLoggedIn } = useAuth();

  const { data: userInfo } = useUserInfoQuery();

  const { t } = useTranslation();
  const { themeScheme, toggleThemeScheme } = useSettingsTheme();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();

  const fullPath = location.href;

  /** 跳转到退出路由并保留当前返回地址。 */
  function logout() {
    setLogoutOpen(false);
    navigate({ to: '/login-out', search: { redirect: fullPath } });
  }

  /** 未登录时跳转到登录页。 */
  function loginOrRegister() {
    navigate({ to: '/login' });
  }

  const theme = getThemePresentation(themeScheme);

  if (isLoggedIn) {
    return (
      <>
        <HStack gap={2} vAlign="center">
          <HStack gap={2} vAlign="center">
            <Icon icon={UserCircle} size="sm" />
            <Text weight="bold">{userInfo?.userName || 'admin'}</Text>
          </HStack>
          <HStack gap={1}>
            <Button
              icon={<Icon icon={theme.icon} size="sm" />}
              isIconOnly
              label={`切换主题，当前${theme.label}`}
              size="sm"
              variant="ghost"
              onClick={toggleThemeScheme}
            />
            <Button
              icon={<Icon icon={LogOut} size="sm" />}
              isIconOnly
              label={t('common.logout')}
              size="sm"
              variant="ghost"
              onClick={() => setLogoutOpen(true)}
            />
          </HStack>
        </HStack>
        <AlertDialog
          actionLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          description={t('common.logoutConfirm')}
          isOpen={logoutOpen}
          title={t('common.tip')}
          onAction={logout}
          onOpenChange={setLogoutOpen}
        />
      </>
    );
  }

  return <Button label={t('page.login.common.loginOrRegister')} onClick={loginOrRegister} />;
};

export default memo(UserAvatar);
