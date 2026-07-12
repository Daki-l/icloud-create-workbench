import { createFileRoute } from '@tanstack/react-router';

import { useAuthFormRules } from '@/features/auth/use-auth-form-rules';
import { useInitLogin } from '@/features/auth/use-login';

type LoginParams = Api.Auth.LoginParams;

const INITIAL_VALUES = {
  password: '',
  userName: 'admin'
};

const Login = () => {
  const { t } = useTranslation();

  const [form] = AForm.useForm<LoginParams>();

  const { loading, login } = useInitLogin();

  const {
    formRules: { pwd, userName: userNameRules }
  } = useAuthFormRules();

  useKeyPress('enter', () => {
    form.submit();
  });

  return (
    <>
      <h3 className="text-18px text-primary font-medium">{t('page.login.pwdLogin.title')}</h3>
      <AForm className="pt-24px" form={form} initialValues={INITIAL_VALUES} onFinish={login}>
        <AForm.Item name="userName" rules={userNameRules}>
          <AInput size="large" />
        </AForm.Item>

        <AForm.Item name="password" rules={pwd}>
          <AInput.Password autoComplete="password" size="large" />
        </AForm.Item>
        <ASpace className="w-full" orientation="vertical" size={24}>
          <AButton block color="primary" htmlType="submit" loading={loading} shape="round" size="large" type="primary">
            {t('common.confirm')}
          </AButton>
        </ASpace>
      </AForm>
    </>
  );
};

export const Route = createFileRoute('/(auth)/login/')({
  component: Login,
  staticData: {
    title: 'login',
    i18nKey: 'route.login'
  }
});
