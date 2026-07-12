import { useQuery } from '@tanstack/react-query';
import { Card, Col, List, Progress, Row, Statistic, Tag, Typography } from 'antd';
import { createFileRoute } from '@tanstack/react-router';

import { apiFetch } from '@/service/workbench';
import type { Account, Campaign } from '@/types/workbench';

/** 渲染工作台概览和生产任务进度。 */
const Home = () => {
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => apiFetch<{ campaigns: Campaign[] }>('/api/generation-campaigns') });
  const rows = accounts.data?.accounts || [];
  const total = rows.reduce((sum, item) => sum + Number(item.addressCount || 0), 0);
  const unused = rows.reduce((sum, item) => sum + Number(item.unusedCount || 0), 0);

  return (
    <div className="flex flex-col gap-16px">
      <div>
        <Typography.Title level={2}>iCloud 隐藏邮箱生产控制台</Typography.Title>
        <Typography.Text type="secondary">管理 CK、生产目标、邮箱库存与验证码。</Typography.Text>
      </div>
      <Row gutter={[16, 16]}>
        <Col lg={6} sm={12} xs={24}><Card><Statistic title="CK 账号" value={rows.length} /></Card></Col>
        <Col lg={6} sm={12} xs={24}><Card><Statistic title="邮箱库存" value={total} /></Card></Col>
        <Col lg={6} sm={12} xs={24}><Card><Statistic title="未使用" value={unused} /></Card></Col>
        <Col lg={6} sm={12} xs={24}><Card><Statistic title="生产目标" value={campaigns.data?.campaigns.length || 0} /></Card></Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col lg={12} xs={24}>
          <Card loading={accounts.isLoading} title="CK 状态">
            <List dataSource={rows} renderItem={item => (
              <List.Item extra={<Tag color={item.region === 'china' ? 'gold' : 'blue'}>{item.region === 'china' ? '中国区' : '全球区'}</Tag>}>
                <List.Item.Meta description={`库存 ${item.addressCount} · 未使用 ${item.unusedCount}`} title={item.appleIdMasked} />
              </List.Item>
            )} />
          </Card>
        </Col>
        <Col lg={12} xs={24}>
          <Card loading={campaigns.isLoading} title="生产进度">
            <List dataSource={campaigns.data?.campaigns || []} renderItem={item => (
              <List.Item>
                <div className="w-full">
                  <div className="mb-8px flex justify-between"><strong>{item.appleIdMasked}</strong><Tag>{item.status}</Tag></div>
                  <Progress percent={Math.min(100, Math.round(item.currentTotal / item.targetTotal * 100))} />
                  <Typography.Text type="secondary">库存 {item.currentTotal}/{item.targetTotal}</Typography.Text>
                </div>
              </List.Item>
            )} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export const Route = createFileRoute('/(admin)/home/')({
  component: Home,
  staticData: { title: '控制台概览', menu: { icon: 'mdi:monitor-dashboard', order: 1 } }
});
