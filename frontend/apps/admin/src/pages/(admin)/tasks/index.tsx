import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, List, Modal, Progress, Row, Select, Space, Tag, Typography, message } from 'antd';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { apiFetch } from '@/service/workbench';
import type { Account, Campaign } from '@/types/workbench';

interface JobResult { email?: string; error?: string; label: string }
interface Job { id: string; appleIdMasked: string; createdAt: string; requestedCount: number; results: JobResult[]; status: string }
interface CampaignFormValues { accountId: string; batchSize: number; labelPrefix: string; targetTotal: number }
interface PrefixFormValues { labelPrefix: string }

/** 渲染持续生产目标、停止继续控制和批次记录。 */
const TasksPage = () => {
  const queryClient = useQueryClient();
  const [now, setNow] = useState(Date.now());
  const [editingCampaign, setEditingCampaign] = useState<Campaign>();
  const [prefixForm] = Form.useForm<PrefixFormValues>();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => apiFetch<{ campaigns: Campaign[] }>('/api/generation-campaigns'), refetchInterval: 30_000 });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => apiFetch<{ jobs: Job[] }>('/api/generation-jobs?page=1&pageSize=20'), refetchInterval: 30_000 });
  const createMutation = useMutation({
    mutationFn: (values: CampaignFormValues) => apiFetch('/api/generation-campaigns', { body: JSON.stringify(values), method: 'POST' }),
    onSuccess: async () => { message.success('生产目标已启动'); await queryClient.invalidateQueries(); }
  });
  const prefixMutation = useMutation({
    mutationFn: (values: PrefixFormValues) => apiFetch(`/api/generation-campaigns/${editingCampaign?.id}`, { body: JSON.stringify(values), method: 'PATCH' }),
    onSuccess: async () => { message.success('标签前缀已更新，下一批开始生效'); setEditingCampaign(undefined); await queryClient.invalidateQueries({ queryKey: ['campaigns'] }); await queryClient.invalidateQueries({ queryKey: ['accounts'] }); }
  });
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /** 停止或继续持续生产目标。 */
  async function changeStatus(id: string, action: 'resume' | 'stop') {
    await apiFetch(`/api/generation-campaigns/${id}/${action}`, { body: '{}', method: 'POST' });
    message.success(action === 'stop' ? '任务已停止' : '任务已继续');
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  }

  /** 打开当前生产目标的标签前缀编辑弹窗。 */
  function editPrefix(campaign: Campaign) {
    setEditingCampaign(campaign);
    prefixForm.setFieldsValue({ labelPrefix: campaign.labelPrefix });
  }

  /** 格式化生产目标下一批执行时间和实时倒计时。 */
  function nextRunText(campaign: Campaign) {
    if (campaign.status === 'stopped') return '下一批：已停止';
    if (campaign.status === 'completed') return '下一批：目标已完成';
    if (!campaign.nextRunAt) return '下一批：等待调度';
    const target = new Date(campaign.nextRunAt).getTime();
    if (!Number.isFinite(target)) return '下一批：时间无效';
    const remaining = Math.max(0, target - now);
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor(remaining % 3_600_000 / 60_000);
    const seconds = Math.floor(remaining % 60_000 / 1000);
    const countdown = hours > 0 ? `${hours}时${minutes}分${seconds}秒` : `${minutes}分${seconds}秒`;
    return `下一批：${new Date(target).toLocaleString('zh-CN', { hour12: false })}（${remaining ? countdown : '即将执行'}）`;
  }

  return (
    <Row gutter={[16, 16]}>
      <Col lg={8} xs={24}>
        <Card title="创建生产目标">
          <Form layout="vertical" initialValues={{ batchSize: 5, labelPrefix: 'changsheng', targetTotal: 700 }} onFinish={values => createMutation.mutate(values)}>
            <Form.Item label="CK 账号" name="accountId" rules={[{ required: true }]}><Select options={(accounts.data?.accounts || []).map(item => ({ label: `${item.appleIdMasked} · 库存 ${item.addressCount}`, value: item.id }))} /></Form.Item>
            <Form.Item label="目标库存" name="targetTotal"><InputNumber className="w-full" max={700} min={1} /></Form.Item>
            <Form.Item label="每批数量" name="batchSize"><InputNumber className="w-full" max={5} min={1} /></Form.Item>
            <Form.Item label="标签前缀" name="labelPrefix"><Input maxLength={24} /></Form.Item>
            <Button block htmlType="submit" loading={createMutation.isPending} type="primary">启动持续生产</Button>
          </Form>
        </Card>
      </Col>
      <Col lg={16} xs={24}>
        <Space className="w-full" direction="vertical" size={16}>
          <Card loading={campaigns.isLoading} title="生产目标">
            <List dataSource={campaigns.data?.campaigns || []} renderItem={item => {
              const percent = Math.min(100, Math.round(item.currentTotal / item.targetTotal * 100));
              const actions = item.status === 'running'
                ? [<Button key="prefix" onClick={() => editPrefix(item)}>修改前缀</Button>, <Button danger key="stop" onClick={() => changeStatus(item.id, 'stop')}>停止</Button>]
                : item.status === 'stopped'
                  ? [<Button key="prefix" onClick={() => editPrefix(item)}>修改前缀</Button>, <Button key="resume" onClick={() => changeStatus(item.id, 'resume')}>继续</Button>]
                  : [];
              return <List.Item actions={actions}>
                <div className="w-full">
                  <div className="flex justify-between"><strong>{item.appleIdMasked}</strong><Tag>{item.status}</Tag></div>
                  <Progress percent={percent} />
                  <Space direction="vertical" size={2}>
                    <Typography.Text type="secondary">库存 {item.currentTotal}/{item.targetTotal} · 每批 {item.batchSize} · 前缀 {item.labelPrefix}</Typography.Text>
                    <Typography.Text type={item.status === 'running' ? 'warning' : 'secondary'}>{nextRunText(item)}</Typography.Text>
                  </Space>
                </div>
              </List.Item>;
            }} />
          </Card>
          <Card loading={jobs.isLoading} title="最近批次">
            <List dataSource={jobs.data?.jobs || []} renderItem={job => <List.Item><List.Item.Meta title={`${job.appleIdMasked} · ${job.status}`} description={`${job.createdAt} · 请求 ${job.requestedCount} 个`} /><Space direction="vertical">{job.results.map(item => <Typography.Text key={item.label}>{item.label} · {item.email || item.error}</Typography.Text>)}</Space></List.Item>} />
          </Card>
        </Space>
      </Col>
      <Modal confirmLoading={prefixMutation.isPending} open={Boolean(editingCampaign)} title="修改标签前缀" onCancel={() => setEditingCampaign(undefined)} onOk={() => prefixForm.submit()}>
        <Form form={prefixForm} layout="vertical" onFinish={values => prefixMutation.mutate(values)}>
          <Form.Item extra="仅影响下一批及后续生成，已创建邮箱不会改名。" label="标签前缀" name="labelPrefix" rules={[{ required: true }, { max: 24 }, { pattern: /^[A-Za-z0-9_-]+$/, message: '只能包含字母、数字、下划线和短横线' }]}>
            <Input maxLength={24} />
          </Form.Item>
        </Form>
      </Modal>
    </Row>
  );
};

export const Route = createFileRoute('/(admin)/tasks/')({
  component: TasksPage,
  staticData: { title: '生产任务', menu: { icon: 'mdi:progress-clock', order: 3 } }
});
