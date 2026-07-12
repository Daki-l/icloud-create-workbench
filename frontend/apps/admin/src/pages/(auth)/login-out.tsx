import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

const LoginOut = () => {
  return null;
};

const LoginSearchSchema = z.object({
  redirect: z.string().startsWith('/').optional()
});

export const Route = createFileRoute('/(auth)/login-out')({
  component: LoginOut,
  validateSearch: LoginSearchSchema,
  staticData: {
    title: 'login-out',
    i18nKey: 'route.login-out'
  },
  beforeLoad: async ({ context, search }) => {
    const redirectPath = search.redirect;

    await fetch(`${import.meta.env.DEV ? '/proxy-default' : ''}/api/auth/logout`, {
      body: '{}',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    }).catch(() => null);

    context.clearAuth();

    throw redirect({ to: '/login', search: redirectPath ? { redirect: redirectPath } : undefined });
  }
});
