import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Descriptions, Result, Spin, Tag, Typography } from 'antd';
import { createFileRoute } from '@tanstack/react-router';

import { apiFetch } from '@/service/workbench';
import type { MailMessage } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

/** 渲染无需管理员登录的最新邮件公开页面。 */
const PublicMailPage = () => {
  const { email, token } = Route.useParams();
  const latest = useQuery({
    queryKey: ['public-mail', email, token],
    queryFn: () => apiFetch<{ email: string; message: MailMessage | null }>(`/openapi/mail/${encodeURIComponent(email)}/${token}/latest`),
    refetchInterval: 15_000,
    retry: false
  });
  if (latest.isLoading) return <div className="min-h-screen flex-center"><Spin size="large" /></div>;
  if (latest.isError) return <Result status="404" title="链接无效或已撤销" />;
  if (!latest.data?.message) return <Result status="info" title="暂未收到邮件" subTitle={latest.data?.email} />;
  const mail = latest.data.message;
  return (
    <div className="min-h-screen bg-layout p-24px"><Card className="mx-auto max-w-840px" title={latest.data.email}>
      {mail.code ? <Alert className="mb-16px" message={<Typography.Title copyable level={2}>{mail.code}</Typography.Title>} type="success" /> : null}
      <Descriptions bordered column={1}><Descriptions.Item label="主题">{mail.subject || '无主题'}</Descriptions.Item><Descriptions.Item label="发件人">{mail.sender || '-'}</Descriptions.Item><Descriptions.Item label="时间">{formatShanghaiTime(mail.receivedAt, '-')}</Descriptions.Item><Descriptions.Item label="验证码"><Tag color="blue">{mail.code || '未识别'}</Tag></Descriptions.Item></Descriptions>
      <Typography.Paragraph className="mt-16px whitespace-pre-wrap" copyable>{mail.bodyText || mail.preview || '无纯文本正文'}</Typography.Paragraph>
    </Card></div>
  );
};

export const Route = createFileRoute('/mail/$email/$token')({ component: PublicMailPage });
