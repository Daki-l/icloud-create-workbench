import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Col, Form, Input, InputNumber, List, Progress, Row, Select, Space, Tag, Typography, message } from 'antd';
import { createFileRoute } from '@tanstack/react-router';

import { apiFetch } from '@/service/workbench';
import type { Account, Campaign } from '@/types/workbench';

interface JobResult { email?: string; error?: string; label: string }
interface Job { id: string; appleIdMasked: string; createdAt: string; requestedCount: number; results: JobResult[]; status: string }
interface CampaignFormValues { accountId: string; batchSize: number; labelPrefix: string; targetTotal: number }

/** 渲染持续生产目标、停止继续控制和批次记录。 */
const TasksPage = () => {
  const queryClient = useQueryClient();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => apiFetch<{ campaigns: Campaign[] }>('/api/generation-campaigns'), refetchInterval: 30_000 });
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: () => apiFetch<{ jobs: Job[] }>('/api/generation-jobs?page=1&pageSize=20'), refetchInterval: 30_000 });
  const createMutation = useMutation({
    mutationFn: (values: CampaignFormValues) => apiFetch('/api/generation-campaigns', { body: JSON.stringify(values), method: 'POST' }),
    onSuccess: async () => { message.success('生产目标已启动'); await queryClient.invalidateQueries(); }
  });

  /** 停止或继续持续生产目标。 */
  async function changeStatus(id: string, action: 'resume' | 'stop') {
    await apiFetch(`/api/generation-campaigns/${id}/${action}`, { body: '{}', method: 'POST' });
    message.success(action === 'stop' ? '任务已停止' : '任务已继续');
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
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
              return <List.Item actions={item.status === 'running' ? [<Button danger key="stop" onClick={() => changeStatus(item.id, 'stop')}>停止</Button>] : item.status === 'stopped' ? [<Button key="resume" onClick={() => changeStatus(item.id, 'resume')}>继续</Button>] : []}>
                <div className="w-full"><div className="flex justify-between"><strong>{item.appleIdMasked}</strong><Tag>{item.status}</Tag></div><Progress percent={percent} /><Typography.Text type="secondary">库存 {item.currentTotal}/{item.targetTotal} · 每批 {item.batchSize}</Typography.Text></div>
              </List.Item>;
            }} />
          </Card>
          <Card loading={jobs.isLoading} title="最近批次">
            <List dataSource={jobs.data?.jobs || []} renderItem={job => <List.Item><List.Item.Meta title={`${job.appleIdMasked} · ${job.status}`} description={`${job.createdAt} · 请求 ${job.requestedCount} 个`} /><Space direction="vertical">{job.results.map(item => <Typography.Text key={item.label}>{item.label} · {item.email || item.error}</Typography.Text>)}</Space></List.Item>} />
          </Card>
        </Space>
      </Col>
    </Row>
  );
};

export const Route = createFileRoute('/(admin)/tasks/')({
  component: TasksPage,
  staticData: { title: '生产任务', menu: { icon: 'mdi:progress-clock', order: 3 } }
});
