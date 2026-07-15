import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Section } from '@astryxdesign/core/Section';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { apiFetch } from '@/service/workbench';
import type { Account, Campaign } from '@/types/workbench';

interface MetricCardProps {
  /** 指标名称。 */
  label: string;
  /** 指标值。 */
  value: number;
}

/** 渲染概览页单个核心指标。 */
const MetricCard = ({ label, value }: MetricCardProps) => (
  <Card minHeight={132}>
    <VStack gap={2}>
      <Text color="secondary">{label}</Text>
      <Heading level={2}>{value.toLocaleString()}</Heading>
    </VStack>
  </Card>
);

/** 渲染工作台概览和生产任务进度。 */
const Home = () => {
  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts')
  });
  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiFetch<{ campaigns: Campaign[] }>('/api/generation-campaigns')
  });
  const rows = accounts.data?.accounts || [];
  const campaignRows = campaigns.data?.campaigns || [];
  const total = rows.reduce((sum, item) => sum + Number(item.addressCount || 0), 0);
  const unused = rows.reduce((sum, item) => sum + Number(item.unusedCount || 0), 0);

  /** 渲染 CK 状态列表。 */
  function renderAccounts() {
    if (accounts.isLoading) return <Spinner label="正在加载 CK 状态" />;
    if (!rows.length) return <Text color="secondary">暂无 CK 账号</Text>;
    return rows.map((item, index) => (
      <VStack gap={3} key={item.id}>
        {index ? <Divider /> : null}
        <HStack hAlign="between" vAlign="center">
          <VStack gap={1}>
            <Text weight="bold">{item.appleId}</Text>
            <Text color="secondary" type="supporting">
              库存 {item.addressCount} · 未使用 {item.unusedCount}
            </Text>
          </VStack>
          <StatusBadge value={item.region} />
        </HStack>
      </VStack>
    ));
  }

  /** 渲染生产目标进度列表。 */
  function renderCampaigns() {
    if (campaigns.isLoading) return <Spinner label="正在加载生产目标" />;
    if (!campaignRows.length) return <Text color="secondary">暂无生产目标</Text>;
    return campaignRows.map((item, index) => {
      const percent = Math.min(100, Math.round((item.currentTotal / item.targetTotal) * 100));
      return (
        <VStack gap={3} key={item.id}>
          {index ? <Divider /> : null}
          <HStack hAlign="between" vAlign="center">
            <Text weight="bold">{item.appleId}</Text>
            <StatusBadge value={item.status} />
          </HStack>
          <ProgressBar isLabelHidden label={`${item.appleId} 生产进度`} max={100} value={percent} />
          <Text color="secondary" type="supporting">
            库存 {item.currentTotal}/{item.targetTotal}
          </Text>
        </VStack>
      );
    });
  }

  return (
    <Section className="workbench-page" padding={6}>
      <VStack gap={6}>
        <PageHeader description="管理 CK、生产目标、邮箱库存与验证码。" title="iCloud 隐藏邮箱生产控制台" />
        <Grid columns={{ minWidth: 210, repeat: 'fit' }} gap={4}>
          <MetricCard label="CK 账号" value={rows.length} />
          <MetricCard label="邮箱库存" value={total} />
          <MetricCard label="未使用" value={unused} />
          <MetricCard label="生产目标" value={campaignRows.length} />
        </Grid>
        <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={4}>
          <Card>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center">
                <Heading level={3}>CK 状态</Heading>
                <Badge label={`${rows.length} 个账号`} variant="blue" />
              </HStack>
              {renderAccounts()}
            </VStack>
          </Card>
          <Card>
            <VStack gap={4}>
              <HStack hAlign="between" vAlign="center">
                <Heading level={3}>生产进度</Heading>
                <Badge label={`${campaignRows.length} 个目标`} variant="purple" />
              </HStack>
              {renderCampaigns()}
            </VStack>
          </Card>
        </Grid>
      </VStack>
    </Section>
  );
};

export const Route = createFileRoute('/(admin)/home/')({
  component: Home,
  staticData: { title: '控制台概览', menu: { icon: 'mdi:monitor-dashboard', order: 1 } }
});
