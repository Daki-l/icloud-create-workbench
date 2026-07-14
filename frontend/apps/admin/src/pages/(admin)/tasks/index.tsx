import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import ActionDialog from '@/components/ActionDialog';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { apiFetch } from '@/service/workbench';
import type { Account, Campaign } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

interface JobResult {
  email?: string;
  error?: string;
  label: string;
}
interface Job {
  appleIdMasked: string;
  createdAt: string;
  id: string;
  requestedCount: number;
  results: JobResult[];
  status: string;
}
interface CampaignFormValues {
  accountId: string;
  batchSize: number;
  labelPrefix: string;
  targetTotal: number;
}

const DEFAULT_CAMPAIGN: CampaignFormValues = {
  accountId: '',
  batchSize: 5,
  labelPrefix: 'changsheng',
  targetTotal: 700
};

/** 渲染持续生产目标、停止继续控制和批次记录。 */
const TasksPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [now, setNow] = useState(Date.now());
  const [formValues, setFormValues] = useState(DEFAULT_CAMPAIGN);
  const [accountError, setAccountError] = useState('');
  const [editingCampaign, setEditingCampaign] = useState<Campaign>();
  const [deleteTarget, setDeleteTarget] = useState<Campaign>();
  const [labelPrefix, setLabelPrefix] = useState('');
  const [prefixError, setPrefixError] = useState('');
  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts')
  });
  const campaigns = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => apiFetch<{ campaigns: Campaign[] }>('/api/generation-campaigns'),
    refetchInterval: 30_000
  });
  const jobs = useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiFetch<{ jobs: Job[] }>('/api/generation-jobs?page=1&pageSize=20'),
    refetchInterval: 30_000
  });
  const createMutation = useMutation({
    mutationFn: (values: CampaignFormValues) =>
      apiFetch('/api/generation-campaigns', { body: JSON.stringify(values), method: 'POST' }),
    onError: error => toast({ body: error instanceof Error ? error.message : '生产目标创建失败', type: 'error' }),
    onSuccess: async () => {
      toast({ body: '生产目标已启动' });
      setFormValues(DEFAULT_CAMPAIGN);
      await queryClient.invalidateQueries();
    }
  });
  const prefixMutation = useMutation({
    mutationFn: (value: string) =>
      apiFetch(`/api/generation-campaigns/${editingCampaign?.id}`, {
        body: JSON.stringify({ labelPrefix: value }),
        method: 'PATCH'
      }),
    onError: error => toast({ body: error instanceof Error ? error.message : '标签前缀更新失败', type: 'error' }),
    onSuccess: async () => {
      toast({ body: '标签前缀已更新，下一批开始生效' });
      setEditingCampaign(undefined);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /** 校验并创建持续生产目标。 */
  function createCampaign() {
    if (!formValues.accountId) {
      setAccountError('请选择 CK 账号');
      return;
    }
    setAccountError('');
    createMutation.mutate(formValues);
  }

  /** 停止或继续持续生产目标。 */
  async function changeStatus(id: string, action: 'resume' | 'stop') {
    try {
      await apiFetch(`/api/generation-campaigns/${id}/${action}`, { body: '{}', method: 'POST' });
      toast({ body: action === 'stop' ? '任务已停止' : '任务已继续' });
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      toast({ body: error instanceof Error ? error.message : '任务状态更新失败', type: 'error' });
    }
  }

  /** 删除生产目标并保留邮箱与批次历史。 */
  async function deleteCampaign() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/generation-campaigns/${deleteTarget.id}`, { method: 'DELETE' });
      toast({ body: '生产目标已删除，邮箱和批次历史已保留' });
      setDeleteTarget(undefined);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (error) {
      toast({ body: error instanceof Error ? error.message : '生产目标删除失败', type: 'error' });
    }
  }

  /** 打开当前生产目标的标签前缀编辑弹窗。 */
  function editPrefix(campaign: Campaign) {
    setEditingCampaign(campaign);
    setLabelPrefix(campaign.labelPrefix);
    setPrefixError('');
  }

  /** 校验并提交标签前缀。 */
  function submitPrefix() {
    if (!labelPrefix || labelPrefix.length > 24 || !/^[A-Za-z0-9_-]+$/.test(labelPrefix)) {
      setPrefixError('只能包含 1-24 位字母、数字、下划线和短横线');
      return;
    }
    setPrefixError('');
    prefixMutation.mutate(labelPrefix);
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
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    const countdown = hours > 0 ? `${hours}时${minutes}分${seconds}秒` : `${minutes}分${seconds}秒`;
    return `下一批：${formatShanghaiTime(target)}（${remaining ? countdown : '即将执行'}）`;
  }

  /** 渲染生产目标列表。 */
  function renderCampaigns() {
    const rows = campaigns.data?.campaigns || [];
    if (campaigns.isLoading) return <Spinner label="正在加载生产目标" />;
    if (!rows.length) return <Text color="secondary">暂无生产目标</Text>;
    return rows.map(item => {
      const percent = Math.min(100, Math.round((item.currentTotal / item.targetTotal) * 100));
      return (
        <Card key={item.id}>
          <VStack gap={3}>
            <HStack hAlign="between" vAlign="center">
              <Text weight="bold">{item.appleIdMasked}</Text>
              <StatusBadge value={item.status} />
            </HStack>
            <ProgressBar isLabelHidden label={`${item.appleIdMasked} 生产进度`} max={100} value={percent} />
            <Text color="secondary" type="supporting">
              库存 {item.currentTotal}/{item.targetTotal} · 每批 {item.batchSize} · 前缀 {item.labelPrefix}
            </Text>
            <Text
              color="secondary"
              style={item.status === 'running' ? { color: 'var(--color-text-warning)' } : undefined}
              type="supporting"
            >
              {nextRunText(item)}
            </Text>
            <HStack gap={2} wrap="wrap">
              {item.status !== 'completed' ? (
                <Button label="修改前缀" size="sm" onClick={() => editPrefix(item)} />
              ) : null}
              {item.status === 'running' ? (
                <Button label="停止" size="sm" onClick={() => changeStatus(item.id, 'stop')} />
              ) : null}
              {item.status === 'stopped' ? (
                <Button label="继续" size="sm" variant="primary" onClick={() => changeStatus(item.id, 'resume')} />
              ) : null}
              <Button label="删除" size="sm" variant="destructive" onClick={() => setDeleteTarget(item)} />
            </HStack>
          </VStack>
        </Card>
      );
    });
  }

  /** 渲染最近生产批次。 */
  function renderJobs() {
    const rows = jobs.data?.jobs || [];
    if (jobs.isLoading) return <Spinner label="正在加载最近批次" />;
    if (!rows.length) return <Text color="secondary">暂无批次记录</Text>;
    return rows.map(job => (
      <VStack gap={2} key={job.id}>
        <HStack hAlign="between" vAlign="center">
          <Text weight="bold">{job.appleIdMasked}</Text>
          <StatusBadge value={job.status} />
        </HStack>
        <Text color="secondary" type="supporting">
          {formatShanghaiTime(job.createdAt)} · 请求 {job.requestedCount} 个
        </Text>
        {job.results.map(item => (
          <Text className="workbench-code" key={item.label} type="supporting">
            {item.label} · {item.email || item.error}
          </Text>
        ))}
      </VStack>
    ));
  }

  return (
    <Section className="workbench-page" padding={6}>
      <VStack gap={6}>
        <PageHeader description="创建持续生产目标，并查看冷却时间和最近批次。" title="生产任务" />
        <Grid columns={{ minWidth: 340, repeat: 'fit' }} gap={5}>
          <Card>
            <VStack gap={4}>
              <Heading level={3}>创建生产目标</Heading>
              <Selector
                isRequired
                label="CK 账号"
                options={(accounts.data?.accounts || []).map(item => ({
                  label: `${item.appleIdMasked} · 库存 ${item.addressCount}`,
                  value: item.id
                }))}
                placeholder="选择 CK 账号"
                status={accountError ? { message: accountError, type: 'error' } : undefined}
                value={formValues.accountId}
                onChange={accountId => {
                  setAccountError('');
                  setFormValues(current => ({ ...current, accountId: accountId || '' }));
                }}
              />
              <NumberInput
                isRequired
                label="目标库存"
                max={700}
                min={1}
                value={formValues.targetTotal}
                onChange={targetTotal => setFormValues(current => ({ ...current, targetTotal }))}
              />
              <NumberInput
                isRequired
                label="每批数量"
                max={5}
                min={1}
                value={formValues.batchSize}
                onChange={batchSize => setFormValues(current => ({ ...current, batchSize }))}
              />
              <TextInput
                label="标签前缀"
                value={formValues.labelPrefix}
                onChange={labelPrefixValue =>
                  setFormValues(current => ({ ...current, labelPrefix: labelPrefixValue.slice(0, 24) }))
                }
              />
              <Button
                isLoading={createMutation.isPending}
                label="启动持续生产"
                variant="primary"
                onClick={createCampaign}
              />
            </VStack>
          </Card>
          <VStack gap={5}>
            <VStack gap={3}>
              <Heading level={3}>生产目标</Heading>
              {renderCampaigns()}
            </VStack>
            <Divider />
            <VStack gap={3}>
              <Heading level={3}>最近批次</Heading>
              {renderJobs()}
            </VStack>
          </VStack>
        </Grid>
      </VStack>
      <ActionDialog
        isLoading={prefixMutation.isPending}
        isOpen={Boolean(editingCampaign)}
        primaryLabel="保存前缀"
        subtitle="仅影响下一批及后续生成，已创建邮箱不会改名。"
        title="修改标签前缀"
        onOpenChange={next => {
          if (!next) setEditingCampaign(undefined);
        }}
        onPrimary={submitPrefix}
      >
        <TextInput
          isRequired
          label="标签前缀"
          status={prefixError ? { message: prefixError, type: 'error' } : undefined}
          value={labelPrefix}
          onChange={value => {
            setPrefixError('');
            setLabelPrefix(value.slice(0, 24));
          }}
        />
      </ActionDialog>
      <AlertDialog
        actionLabel="删除生产目标"
        cancelLabel="取消"
        description="已生成邮箱和批次历史会保留。"
        isOpen={Boolean(deleteTarget)}
        title="确认删除该生产目标？"
        onAction={deleteCampaign}
        onOpenChange={next => {
          if (!next) setDeleteTarget(undefined);
        }}
      />
    </Section>
  );
};

export const Route = createFileRoute('/(admin)/tasks/')({
  component: TasksPage,
  staticData: { title: '生产任务', menu: { icon: 'mdi:progress-clock', order: 3 } }
});
