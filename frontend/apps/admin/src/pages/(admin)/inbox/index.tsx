import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, List, Row, Select, Space, Switch, Tag, Typography, message } from 'antd';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { apiFetch, queryString } from '@/service/workbench';
import type { Account, MailMessage, Pagination } from '@/types/workbench';

interface InboxConfig { configured: boolean; email?: string; host?: string; lastError?: string; lastSyncAt?: string; mailbox?: string; nextSyncAt?: string; port?: number; secure?: boolean }
interface InboxFormValues { email: string; host: string; mailbox?: string; password?: string; port?: number; secure?: boolean }

/** 渲染每条 CK 独立的 IMAP 配置、同步状态和邮件列表。 */
const InboxPage = () => {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [form] = Form.useForm();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  useEffect(() => { if (!accountId && accounts.data?.accounts[0]) setAccountId(accounts.data.accounts[0].id); }, [accountId, accounts.data]);
  const config = useQuery({ enabled: Boolean(accountId), queryKey: ['inbox-config', accountId], queryFn: () => apiFetch<InboxConfig>(`/api/inbox/config?accountId=${accountId}`) });
  const mails = useQuery({ enabled: Boolean(accountId), queryKey: ['inbox-mails', accountId], queryFn: () => apiFetch<{ messages: MailMessage[]; pagination: Pagination }>(`/api/inbox/messages?${queryString({ accountId, page: 1, pageSize: 20 })}`), refetchInterval: 30_000 });
  useEffect(() => { if (config.data) form.setFieldsValue({ ...config.data, password: '' }); }, [config.data, form]);
  const saveMutation = useMutation({
    mutationFn: (values: InboxFormValues) => apiFetch('/api/inbox/config', { body: JSON.stringify({ ...values, accountId }), method: 'PUT' }),
    onSuccess: async () => { message.success('IMAP 配置已保存'); await queryClient.invalidateQueries({ queryKey: ['inbox-config', accountId] }); }
  });

  /** 手动同步当前 CK 的新邮件。 */
  async function sync() {
    const result = await apiFetch<{ added: number; scanned: number }>('/api/inbox/sync', { body: JSON.stringify({ accountId }), method: 'POST' });
    message.success(`扫描 ${result.scanned} 封，新增 ${result.added} 封`);
    await queryClient.invalidateQueries({ queryKey: ['inbox-mails', accountId] });
    await queryClient.invalidateQueries({ queryKey: ['inbox-config', accountId] });
  }

  return (
    <Space className="w-full" direction="vertical" size={16}>
      <Card title="收件与验证码" extra={<Button disabled={!accountId} type="primary" onClick={sync}>立即同步</Button>}>
        <Select className="mb-16px w-320px" placeholder="选择 CK" value={accountId || undefined} options={(accounts.data?.accounts || []).map(item => ({ label: item.appleIdMasked, value: item.id }))} onChange={setAccountId} />
        <Row gutter={[16, 16]}>
          <Col lg={14} xs={24}>
            <Form form={form} layout="vertical" onFinish={values => saveMutation.mutate(values)}>
              <Row gutter={12}><Col span={16}><Form.Item label="IMAP 主机" name="host" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={8}><Form.Item label="端口" name="port"><InputNumber className="w-full" /></Form.Item></Col></Row>
              <Form.Item label="邮箱" name="email" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="密码/授权码" name="password"><Input.Password placeholder="留空表示不修改" /></Form.Item>
              <Row gutter={12}><Col span={16}><Form.Item label="文件夹" name="mailbox"><Input /></Form.Item></Col><Col span={8}><Form.Item label="SSL/TLS" name="secure" valuePropName="checked"><Switch /></Form.Item></Col></Row>
              <Button htmlType="submit" loading={saveMutation.isPending} type="primary">保存当前 CK 配置</Button>
            </Form>
          </Col>
          <Col lg={10} xs={24}>
            <Card size="small" title="同步状态">
              <Typography.Paragraph>最近同步：{config.data?.lastSyncAt || '尚未同步'}</Typography.Paragraph>
              <Typography.Paragraph>下次同步：{config.data?.nextSyncAt || '-'}</Typography.Paragraph>
              {config.data?.lastError ? <Typography.Text type="danger">{config.data.lastError}</Typography.Text> : <Tag color="green">正常</Tag>}
            </Card>
          </Col>
        </Row>
      </Card>
      <Card loading={mails.isLoading} title="最近邮件">
        <List dataSource={mails.data?.messages || []} renderItem={item => <List.Item><List.Item.Meta description={`${item.hiddenEmail || '未匹配隐私邮箱'} · ${item.receivedAt || ''}`} title={item.subject || '无主题'} />{item.code ? <Tag color="blue">{item.code}</Tag> : null}</List.Item>} />
      </Card>
    </Space>
  );
};

export const Route = createFileRoute('/(admin)/inbox/')({
  component: InboxPage,
  staticData: { title: '收件与验证码', menu: { icon: 'mdi:email-fast', order: 5 } }
});
