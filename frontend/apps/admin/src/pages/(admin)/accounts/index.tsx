import { AlertDialog } from '@astryxdesign/core/AlertDialog';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Table, type TableColumn, pixel, proportional } from '@astryxdesign/core/Table';
import { TextArea } from '@astryxdesign/core/TextArea';
import { useToast } from '@astryxdesign/core/Toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import ActionDialog from '@/components/ActionDialog';
import PageHeader from '@/components/PageHeader';
import StatusBadge from '@/components/StatusBadge';
import { apiFetch } from '@/service/workbench';
import type { Account } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

interface CookieFormValues {
  cookie: string;
  region: string;
}

type AccountRow = Account & Record<string, unknown>;

/** 渲染 CK 导入、同步和删除管理页。 */
const AccountsPage = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [deleteTarget, setDeleteTarget] = useState<Account>();
  const [checkingAccountIds, setCheckingAccountIds] = useState<Set<string>>(new Set());
  const [checkingAll, setCheckingAll] = useState(false);
  const [values, setValues] = useState<CookieFormValues>({ cookie: '', region: 'auto' });
  const [cookieError, setCookieError] = useState('');
  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts')
  });
  const cookieMutation = useMutation({
    mutationFn: (formValues: CookieFormValues) =>
      editingAccount
        ? apiFetch(`/api/icloud-accounts/${editingAccount.id}/cookie`, {
            body: JSON.stringify(formValues),
            method: 'PUT'
          })
        : apiFetch('/api/icloud-accounts/import', { body: JSON.stringify(formValues), method: 'POST' }),
    onError: error => toast({ body: error instanceof Error ? error.message : 'CK 保存失败', type: 'error' }),
    onSuccess: async () => {
      toast({ body: editingAccount ? 'CK 已更新，现有任务和数据保持不变' : 'CK 已导入' });
      closeDialog();
      await queryClient.invalidateQueries();
    }
  });

  /** 打开新增 CK 弹窗。 */
  function openImport() {
    setEditingAccount(undefined);
    setValues({ cookie: '', region: 'auto' });
    setCookieError('');
    setOpen(true);
  }

  /** 打开指定账号的 CK 更新弹窗。 */
  function openUpdate(account: Account) {
    setEditingAccount(account);
    setValues({ cookie: '', region: account.region || 'auto' });
    setCookieError('');
    setOpen(true);
  }

  /** 关闭 CK 编辑弹窗并清理敏感输入。 */
  function closeDialog() {
    setOpen(false);
    setEditingAccount(undefined);
    setValues({ cookie: '', region: 'auto' });
    setCookieError('');
  }

  /** 校验并提交 CK 表单。 */
  function submitCookie() {
    if (!values.cookie.trim()) {
      setCookieError('请输入 CK 或 Copy as cURL 内容');
      return;
    }
    setCookieError('');
    cookieMutation.mutate(values);
  }

  /** 同步指定 CK 的 Apple 隐藏邮箱。 */
  async function syncAccount(id: string) {
    try {
      await apiFetch(`/api/icloud-accounts/${id}/sync`, { body: '{}', method: 'POST' });
      toast({ body: '同步完成' });
      await queryClient.invalidateQueries();
    } catch (error) {
      toast({ body: error instanceof Error ? error.message : '同步失败', type: 'error' });
    }
  }

  /** 请求后端实际连接 Apple 并返回 CK 是否有效。 */
  async function checkAccount(id: string, announce = true) {
    setCheckingAccountIds(current => new Set(current).add(id));
    try {
      const result = await apiFetch<{ error?: string; valid: boolean }>(`/api/icloud-accounts/${id}/check`, {
        body: '{}',
        method: 'POST'
      });
      if (announce && result.valid) toast({ body: 'CK 当前有效' });
      if (announce && !result.valid) toast({ body: `CK 已过期：${result.error || 'Apple 校验失败'}`, type: 'error' });
      return result.valid;
    } catch (error) {
      if (!announce) throw error;
      toast({ body: error instanceof Error ? error.message : 'CK 检测请求失败', type: 'error' });
      return undefined;
    } finally {
      setCheckingAccountIds(current => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  /** 依次触发全部 CK 检测并汇总有效与过期数量。 */
  async function checkAllAccounts() {
    if (!rows.length) return;
    setCheckingAll(true);
    try {
      const results = await Promise.allSettled(rows.map(row => checkAccount(row.id, false)));
      const validCount = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const expiredCount = results.filter(result => result.status === 'fulfilled' && !result.value).length;
      const failedCount = results.length - validCount - expiredCount;
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
      const body = `检测完成：有效 ${validCount}，已过期 ${expiredCount}${failedCount ? `，请求失败 ${failedCount}` : ''}`;
      toast(expiredCount || failedCount ? { body, type: 'error' } : { body });
    } finally {
      setCheckingAll(false);
    }
  }

  /** 删除指定 CK 并保留历史邮箱。 */
  async function deleteAccount() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/icloud-accounts/${deleteTarget.id}`, { body: '{}', method: 'DELETE' });
      toast({ body: 'CK 已删除' });
      setDeleteTarget(undefined);
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    } catch (error) {
      toast({ body: error instanceof Error ? error.message : '删除失败', type: 'error' });
    }
  }

  const columns: TableColumn<AccountRow>[] = [
    { key: 'appleIdMasked', header: 'Apple ID', width: proportional(2) },
    { key: 'region', header: '区域', width: pixel(110), renderCell: row => <StatusBadge value={String(row.region)} /> },
    { key: 'status', header: 'CK 状态', width: pixel(110), renderCell: row => <StatusBadge value={String(row.status)} /> },
    {
      key: 'lastCheckedAt',
      header: '最近检测',
      width: pixel(190),
      renderCell: row => formatShanghaiTime(String(row.lastCheckedAt || ''))
    },
    { key: 'addressCount', header: '库存', width: pixel(90) },
    { key: 'unusedCount', header: '未使用', width: pixel(90) },
    {
      key: 'actions',
      header: '操作',
      width: pixel(380),
      renderCell: row => (
        <HStack gap={1} wrap="wrap">
          <Button
            isLoading={checkingAccountIds.has(row.id)}
            label="检测 CK"
            size="sm"
            variant="ghost"
            onClick={async () => {
              await checkAccount(row.id);
              await queryClient.invalidateQueries({ queryKey: ['accounts'] });
            }}
          />
          <Button label="更新 CK" size="sm" variant="ghost" onClick={() => openUpdate(row)} />
          <Button label="同步" size="sm" variant="ghost" onClick={() => syncAccount(row.id)} />
          <Button label="删除" size="sm" variant="destructive" onClick={() => setDeleteTarget(row)} />
        </HStack>
      )
    }
  ];

  const rows = (accounts.data?.accounts || []) as AccountRow[];

  return (
    <Section className="workbench-page" padding={6}>
      <VStack gap={6}>
        <PageHeader
          actions={
            <HStack gap={2}>
              <Button isDisabled={!rows.length} isLoading={checkingAll} label="检测全部 CK" variant="ghost" onClick={checkAllAccounts} />
              <Button label="导入 CK" variant="primary" onClick={openImport} />
            </HStack>
          }
          description="完整显示 Apple ID，并通过 Apple 请求检测 CK 是否过期。"
          title="CK 账号"
        />
        <Card padding={0}>
          {accounts.isLoading ? (
            <VStack hAlign="center" padding={8}>
              <Spinner label="正在加载 CK 账号" />
            </VStack>
          ) : (
            <div className="workbench-table-scroll">
              <Table<AccountRow> columns={columns} data={rows} density="compact" dividers="rows" hasHover idKey="id" />
            </div>
          )}
        </Card>
      </VStack>
      <ActionDialog
        isLoading={cookieMutation.isPending}
        isOpen={open}
        primaryLabel={editingAccount ? '更新 CK' : '导入 CK'}
        subtitle={
          editingAccount
            ? '更新后库存、任务、冷却和 IMAP 配置保持不变。'
            : '支持直接粘贴 CK 或浏览器 Copy as cURL 内容。'
        }
        title={editingAccount ? `更新 CK · ${editingAccount.appleIdMasked}` : '导入 iCloud CK'}
        onOpenChange={next => (next ? setOpen(true) : closeDialog())}
        onPrimary={submitCookie}
      >
        <VStack gap={4}>
          <Selector
            isRequired
            label="区域"
            options={[
              { label: '自动检测', value: 'auto' },
              { label: '全球区', value: 'global' },
              { label: '中国区', value: 'china' }
            ]}
            value={values.region}
            onChange={region => setValues(current => ({ ...current, region: region || 'auto' }))}
          />
          <TextArea
            isRequired
            label="CK 或 Copy as cURL"
            rows={8}
            status={cookieError ? { message: cookieError, type: 'error' } : undefined}
            value={values.cookie}
            onChange={cookie => {
              setCookieError('');
              setValues(current => ({ ...current, cookie }));
            }}
          />
        </VStack>
      </ActionDialog>
      <AlertDialog
        actionLabel="删除 CK"
        cancelLabel="取消"
        description="删除后历史邮箱仍会保留。"
        isOpen={Boolean(deleteTarget)}
        title={`确认删除 ${deleteTarget?.appleIdMasked || '该 CK'}？`}
        onAction={deleteAccount}
        onOpenChange={next => {
          if (!next) setDeleteTarget(undefined);
        }}
      />
    </Section>
  );
};

export const Route = createFileRoute('/(admin)/accounts/')({
  component: AccountsPage,
  staticData: { title: 'CK 账号', menu: { icon: 'mdi:account-key', order: 2 } }
});
