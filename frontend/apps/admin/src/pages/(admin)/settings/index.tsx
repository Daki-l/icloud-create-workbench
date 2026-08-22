import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation } from '@tanstack/react-query';
import { Tabs } from 'antd';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/service/workbench';

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UsernameFormValues {
  currentPassword: string;
  newUsername: string;
}

const DEFAULT_PASSWORD: PasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };
const DEFAULT_USERNAME: UsernameFormValues = { currentPassword: '', newUsername: '' };

interface SettingsConfig {
  adminUsername: string;
  inboxSyncIntervalSeconds: number;
}

/** 渲染管理员设置：修改密码、修改用户名、修改同步配置。 */
const SettingsPage = () => {
  const toast = useToast();
  const [passwordValues, setPasswordValues] = useState<PasswordFormValues>(DEFAULT_PASSWORD);
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordFormValues>>({});
  const [usernameValues, setUsernameValues] = useState<UsernameFormValues>(DEFAULT_USERNAME);
  const [usernameErrors, setUsernameErrors] = useState<Partial<UsernameFormValues>>({});
  const [config, setConfig] = useState<SettingsConfig | null>(null);
  const [syncSeconds, setSyncSeconds] = useState('');
  const [syncError, setSyncError] = useState('');

  /** 加载非敏感运行时配置用于回显。 */
  async function loadConfig() {
    try {
      const data = await apiFetch<SettingsConfig>('/api/settings');
      setConfig(data);
      setSyncSeconds(String(data.inboxSyncIntervalSeconds));
    } catch (error) {
      toast({ body: error instanceof Error ? error.message : '加载配置失败', type: 'error' });
    }
  }

  useEffect(() => {
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePasswordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      apiFetch('/api/settings/password', { body: JSON.stringify(values), method: 'POST' }),
    onError: error => toast({ body: error instanceof Error ? error.message : '修改密码失败', type: 'error' }),
    onSuccess: async () => {
      toast({ body: '密码已更新，下次登录生效' });
      setPasswordValues(DEFAULT_PASSWORD);
    }
  });

  const changeUsernameMutation = useMutation({
    mutationFn: (values: UsernameFormValues) =>
      apiFetch('/api/settings/username', { body: JSON.stringify(values), method: 'POST' }),
    onError: error => toast({ body: error instanceof Error ? error.message : '修改用户名失败', type: 'error' }),
    onSuccess: async () => {
      toast({ body: '用户名已更新，当前会话已失效，即将重新登录' });
      setTimeout(() => window.location.replace('/login'), 1200);
    }
  });

  const changeSyncIntervalMutation = useMutation({
    mutationFn: (seconds: number) =>
      apiFetch('/api/settings/sync-interval', { body: JSON.stringify({ seconds }), method: 'POST' }),
    onError: error => toast({ body: error instanceof Error ? error.message : '修改同步间隔失败', type: 'error' }),
    onSuccess: async data => {
      const next = (data as { inboxSyncIntervalSeconds?: number })?.inboxSyncIntervalSeconds ?? Number(syncSeconds);
      setSyncSeconds(String(next));
      setConfig(prev => (prev ? { ...prev, inboxSyncIntervalSeconds: next } : prev));
      toast({ body: '同步间隔已更新并立即生效' });
    }
  });

  /** 校验并提交修改密码。 */
  function submitPassword() {
    const nextErrors: Partial<PasswordFormValues> = {};
    if (!passwordValues.currentPassword) nextErrors.currentPassword = '请输入当前密码';
    if (passwordValues.newPassword.length < 10) nextErrors.newPassword = '新密码至少 10 位';
    if (passwordValues.newPassword !== passwordValues.confirmPassword) nextErrors.confirmPassword = '两次输入的新密码不一致';
    setPasswordErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    changePasswordMutation.mutate(passwordValues);
  }

  /** 校验并提交修改用户名。 */
  function submitUsername() {
    const nextErrors: Partial<UsernameFormValues> = {};
    if (!usernameValues.currentPassword) nextErrors.currentPassword = '请输入当前密码';
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(usernameValues.newUsername)) {
      nextErrors.newUsername = '需为 3-32 位字母、数字、下划线或连字符';
    }
    if (config && usernameValues.newUsername === config.adminUsername) nextErrors.newUsername = '新用户名不能与当前相同';
    setUsernameErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    changeUsernameMutation.mutate(usernameValues);
  }

  /** 校验并提交同步间隔。 */
  function submitSyncInterval() {
    const seconds = Number(syncSeconds);
    if (!Number.isInteger(seconds) || seconds < 10 || seconds > 3600) {
      setSyncError('同步间隔需为 10-3600 之间的整数');
      return;
    }
    setSyncError('');
    changeSyncIntervalMutation.mutate(seconds);
  }

  return (
    <Section className="workbench-page" padding={6}>
      <VStack gap={6}>
        <PageHeader description="管理管理员凭据与运行时同步配置。" title="设置" />
        <Tabs
          items={[
            {
              key: 'password',
              label: '修改密码',
              children: (
                <Card>
                  <VStack gap={4}>
                    <Heading level={3}>修改密码</Heading>
                    <TextInput
                      isRequired
                      label="当前密码"
                      status={passwordErrors.currentPassword ? { message: passwordErrors.currentPassword, type: 'error' } : undefined}
                      type="password"
                      value={passwordValues.currentPassword}
                      onChange={value => {
                        setPasswordErrors(current => ({ ...current, currentPassword: '' }));
                        setPasswordValues(current => ({ ...current, currentPassword: value }));
                      }}
                    />
                    <TextInput
                      isRequired
                      label="新密码"
                      status={passwordErrors.newPassword ? { message: passwordErrors.newPassword, type: 'error' } : undefined}
                      type="password"
                      value={passwordValues.newPassword}
                      onChange={value => {
                        setPasswordErrors(current => ({ ...current, newPassword: '' }));
                        setPasswordValues(current => ({ ...current, newPassword: value }));
                      }}
                    />
                    <TextInput
                      isRequired
                      label="确认新密码"
                      status={passwordErrors.confirmPassword ? { message: passwordErrors.confirmPassword, type: 'error' } : undefined}
                      type="password"
                      value={passwordValues.confirmPassword}
                      onChange={value => {
                        setPasswordErrors(current => ({ ...current, confirmPassword: '' }));
                        setPasswordValues(current => ({ ...current, confirmPassword: value }));
                      }}
                      onEnter={submitPassword}
                    />
                    <Text color="secondary" type="supporting">
                      修改后当前会话仍有效，无需立即重新登录；新密码在下次登录时生效。
                    </Text>
                    <Button
                      isLoading={changePasswordMutation.isPending}
                      label="保存新密码"
                      variant="primary"
                      onClick={submitPassword}
                    />
                  </VStack>
                </Card>
              )
            },
            {
              key: 'username',
              label: '修改用户名',
              children: (
                <Card>
                  <VStack gap={4}>
                    <Heading level={3}>修改用户名</Heading>
                    <Text color="secondary" type="supporting">
                      当前用户名：{config?.adminUsername ?? '—'}
                    </Text>
                    <TextInput
                      isRequired
                      label="当前密码"
                      status={usernameErrors.currentPassword ? { message: usernameErrors.currentPassword, type: 'error' } : undefined}
                      type="password"
                      value={usernameValues.currentPassword}
                      onChange={value => {
                        setUsernameErrors(current => ({ ...current, currentPassword: '' }));
                        setUsernameValues(current => ({ ...current, currentPassword: value }));
                      }}
                    />
                    <TextInput
                      isRequired
                      label="新用户名"
                      status={usernameErrors.newUsername ? { message: usernameErrors.newUsername, type: 'error' } : undefined}
                      value={usernameValues.newUsername}
                      onChange={value => {
                        setUsernameErrors(current => ({ ...current, newUsername: '' }));
                        setUsernameValues(current => ({ ...current, newUsername: value }));
                      }}
                      onEnter={submitUsername}
                    />
                    <Text color="secondary" type="supporting">
                      用户名修改后所有会话立即失效（含本次），需用新用户名重新登录。若遗忘新用户名，可删除数据库 app_settings 中 adminUsername 记录回退到环境变量配置。
                    </Text>
                    <Button
                      isLoading={changeUsernameMutation.isPending}
                      label="保存新用户名"
                      variant="primary"
                      onClick={submitUsername}
                    />
                  </VStack>
                </Card>
              )
            },
            {
              key: 'config',
              label: '修改配置',
              children: (
                <Card>
                  <VStack gap={4}>
                    <Heading level={3}>同步配置</Heading>
                    <TextInput
                      isRequired
                      label="IMAP 同步间隔（秒）"
                      status={syncError ? { message: syncError, type: 'error' } : undefined}
                      value={syncSeconds}
                      onChange={value => {
                        setSyncError('');
                        setSyncSeconds(value);
                      }}
                      onEnter={submitSyncInterval}
                    />
                    <Text color="secondary" type="supporting">
                      取值范围 10-3600 秒，修改后立即生效，无需重启服务。间隔越短 IMAP 压力越大，并发上限仍由 INBOX_SYNC_CONCURRENCY 控制。
                    </Text>
                    <Button
                      isLoading={changeSyncIntervalMutation.isPending}
                      label="保存同步间隔"
                      variant="primary"
                      onClick={submitSyncInterval}
                    />
                  </VStack>
                </Card>
              )
            }
          ]}
        />
      </VStack>
    </Section>
  );
};

export const Route = createFileRoute('/(admin)/settings/')({
  component: SettingsPage,
  staticData: { title: '设置', menu: { icon: 'mdi:cog', order: 7 } }
});
