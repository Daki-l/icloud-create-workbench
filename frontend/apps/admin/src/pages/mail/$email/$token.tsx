import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Section } from '@astryxdesign/core/Section';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';

import MailHtmlPreview from '@/components/MailHtmlPreview';
import { apiFetch } from '@/service/workbench';
import type { MailMessage } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

const pageStyle: React.CSSProperties = { minHeight: '100dvh' };
const routeApi = getRouteApi('/mail/$email/$token');

/** 渲染无需管理员登录的最新邮件公开页面。 */
const PublicMailPage = () => {
  const { email, token } = routeApi.useParams();
  const toast = useToast();
  const latest = useQuery({
    queryKey: ['public-mail', email, token],
    queryFn: () =>
      apiFetch<{ email: string; message: MailMessage | null }>(
        `/openapi/mail/${encodeURIComponent(email)}/${token}/latest`
      ),
    refetchInterval: 15_000,
    retry: false
  });

  /** 复制公开邮件中的文本。 */
  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    toast({ body: message });
  }

  if (latest.isLoading)
    return (
      <Center axis="both" style={pageStyle}>
        <Spinner label="正在加载最新邮件" />
      </Center>
    );
  if (latest.isError)
    return (
      <Center axis="both" style={pageStyle}>
        <EmptyState description="链接可能已失效、被重置或撤销。" title="公开链接无效" />
      </Center>
    );
  if (!latest.data?.message)
    return (
      <Center axis="both" style={pageStyle}>
        <EmptyState description={latest.data?.email} title="暂未收到邮件" />
      </Center>
    );

  const mail = latest.data.message;
  const body = mail.bodyText || mail.preview || '无纯文本正文';

  return (
    <Section padding={6} style={pageStyle}>
      <Card maxWidth={840} width="100%" style={{ marginInline: 'auto' }}>
        <VStack gap={5}>
          <VStack gap={2}>
            <Badge label="最新邮件" variant="blue" />
            <Heading level={2}>{latest.data.email}</Heading>
            <Text color="secondary">页面每 15 秒自动刷新</Text>
          </VStack>
          {mail.code ? (
            <Card variant="blue">
              <HStack hAlign="between" vAlign="center" wrap="wrap">
                <VStack gap={1}>
                  <Text color="secondary">验证码</Text>
                  <Heading level={2}>{mail.code}</Heading>
                </VStack>
                <Button label="复制验证码" variant="primary" onClick={() => copy(mail.code!, '验证码已复制')} />
              </HStack>
            </Card>
          ) : null}
          <VStack gap={2}>
            <Text>
              <strong>主题：</strong>
              {mail.subject || '无主题'}
            </Text>
            <Text>
              <strong>发件人：</strong>
              {mail.sender || '-'}
            </Text>
            <Text>
              <strong>时间：</strong>
              {formatShanghaiTime(mail.receivedAt, '-')}
            </Text>
            <Text>
              <strong>验证码：</strong>
              {mail.code || '未识别'}
            </Text>
          </VStack>
          <Divider />
          <HStack hAlign="between" vAlign="center">
            <Heading level={3}>邮件正文</Heading>
            <Button label="复制正文" size="sm" onClick={() => copy(body, '邮件正文已复制')} />
          </HStack>
          {mail.bodyHtml ? (
            <MailHtmlPreview html={mail.bodyHtml} title={mail.subject || '邮件正文'} />
          ) : (
            <Text className="workbench-code">{body}</Text>
          )}
        </VStack>
      </Card>
    </Section>
  );
};

export const Route = createFileRoute('/mail/$email/$token')({ component: PublicMailPage });
