import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useInitLogin } from '@/features/auth/use-login';

/** 渲染管理员密码登录表单。 */
const Login = () => {
  const [userName, setUserName] = useState('admin');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState({ password: '', userName: '' });
  const { clearError, error, loading, login } = useInitLogin();

  /** 校验并提交管理员登录。 */
  function submit() {
    const nextValidation = {
      password: password ? '' : '请输入密码',
      userName: userName ? '' : '请输入用户名'
    };
    setValidation(nextValidation);
    if (nextValidation.password || nextValidation.userName) return;
    login({ password, userName });
  }

  return (
    <VStack gap={4}>
      <Heading level={3}>管理员登录</Heading>
      <TextInput
        isRequired
        label="用户名"
        size="lg"
        status={validation.userName ? { message: validation.userName, type: 'error' } : undefined}
        value={userName}
        onChange={value => {
          clearError();
          setValidation(current => ({ ...current, userName: '' }));
          setUserName(value);
        }}
      />
      <TextInput
        isRequired
        label="密码"
        size="lg"
        status={error || validation.password ? { message: error || validation.password, type: 'error' } : undefined}
        type="password"
        value={password}
        onChange={value => {
          clearError();
          setValidation(current => ({ ...current, password: '' }));
          setPassword(value);
        }}
        onEnter={submit}
      />
      <Button isLoading={loading} label="登录" size="lg" variant="primary" onClick={submit} />
    </VStack>
  );
};

export const Route = createFileRoute('/(auth)/login/')({
  component: Login,
  staticData: {
    title: 'login',
    i18nKey: 'route.login'
  }
});
