import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import PageHeader from '@/components/PageHeader';
import { apiFetch } from '@/service/workbench';

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const DEFAULT_FORM: PasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** 渲染管理员设置与修改密码表单。 */
const SettingsPage = () => {
  const toast = useToast();
  const [formValues, setFormValues] = useState<PasswordFormValues>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<PasswordFormValues>>({});

  const changePasswordMutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      apiFetch('/api/settings/password', { body: JSON.stringify(values), method: 'POST' }),
    onError: error => toast({ body: error instanceof Error ? error.message : '修改密码失败', type: 'error' }),
    onSuccess: async () => {
      toast({ body: '密码已更新，下次登录生效' });
      setFormValues(DEFAULT_FORM);
    }
  });

  /** 校验并提交修改密码。 */
  function submit() {
    const nextErrors: Partial<PasswordFormValues> = {};
    if (!formValues.currentPassword) nextErrors.currentPassword = '请输入当前密码';
    if (formValues.newPassword.length < 10) nextErrors.newPassword = '新密码至少 10 位';
    if (formValues.newPassword !== formValues.confirmPassword) nextErrors.confirmPassword = '两次输入的新密码不一致';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    changePasswordMutation.mutate(formValues);
  }

  return (
    <Section className="workbench-page" padding={6}>
      <VStack gap={6}>
        <PageHeader description="修改管理员登录密码，新密码以哈希形式保存到数据库并覆盖环境变量配置。" title="设置" />
        <Card>
          <VStack gap={4}>
            <Heading level={3}>修改密码</Heading>
            <TextInput
              isRequired
              label="当前密码"
              status={errors.currentPassword ? { message: errors.currentPassword, type: 'error' } : undefined}
              type="password"
              value={formValues.currentPassword}
              onChange={value => {
                setErrors(current => ({ ...current, currentPassword: '' }));
                setFormValues(current => ({ ...current, currentPassword: value }));
              }}
            />
            <TextInput
              isRequired
              label="新密码"
              status={errors.newPassword ? { message: errors.newPassword, type: 'error' } : undefined}
              type="password"
              value={formValues.newPassword}
              onChange={value => {
                setErrors(current => ({ ...current, newPassword: '' }));
                setFormValues(current => ({ ...current, newPassword: value }));
              }}
            />
            <TextInput
              isRequired
              label="确认新密码"
              status={errors.confirmPassword ? { message: errors.confirmPassword, type: 'error' } : undefined}
              type="password"
              value={formValues.confirmPassword}
              onChange={value => {
                setErrors(current => ({ ...current, confirmPassword: '' }));
                setFormValues(current => ({ ...current, confirmPassword: value }));
              }}
              onEnter={submit}
            />
            <Text color="secondary" type="supporting">
              修改后当前会话仍有效，无需立即重新登录；新密码在下次登录时生效。
            </Text>
            <Button
              isLoading={changePasswordMutation.isPending}
              label="保存新密码"
              variant="primary"
              onClick={submit}
            />
          </VStack>
        </Card>
      </VStack>
    </Section>
  );
};

export const Route = createFileRoute('/(admin)/settings/')({
  component: SettingsPage,
  staticData: { title: '设置', menu: { icon: 'mdi:cog', order: 7 } }
});
