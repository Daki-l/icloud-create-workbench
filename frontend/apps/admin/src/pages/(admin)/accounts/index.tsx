import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { apiFetch } from '@/service/workbench';
import type { Account } from '@/types/workbench';

interface CookieFormValues { cookie: string; region: string }

/** 渲染 CK 导入、同步和删除管理页。 */
const AccountsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [form] = Form.useForm<CookieFormValues>();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  const cookieMutation = useMutation({
    mutationFn: (values: CookieFormValues) => editingAccount
      ? apiFetch(`/api/icloud-accounts/${editingAccount.id}/cookie`, { body: JSON.stringify(values), method: 'PUT' })
      : apiFetch('/api/icloud-accounts/import', { body: JSON.stringify(values), method: 'POST' }),
    onSuccess: async () => {
      message.success(editingAccount ? 'CK 已更新，现有任务和数据保持不变' : 'CK 已导入');
      setOpen(false); setEditingAccount(undefined); form.resetFields();
      await queryClient.invalidateQueries();
    }
  });

  /** 打开新增 CK 弹窗。 */
  function openImport() {
    setEditingAccount(undefined);
    form.setFieldsValue({ cookie: '', region: 'auto' });
    setOpen(true);
  }

  /** 打开指定账号的 CK 更新弹窗。 */
  function openUpdate(account: Account) {
    setEditingAccount(account);
    form.setFieldsValue({ cookie: '', region: account.region || 'auto' });
    setOpen(true);
  }

  /** 关闭 CK 编辑弹窗并清理敏感输入。 */
  function closeModal() {
    setOpen(false);
    setEditingAccount(undefined);
    form.resetFields();
  }

  /** 同步指定 CK 的 Apple 隐藏邮箱。 */
  async function syncAccount(id: string) {
    await apiFetch(`/api/icloud-accounts/${id}/sync`, { body: '{}', method: 'POST' });
    message.success('同步完成');
    await queryClient.invalidateQueries();
  }

  /** 删除指定 CK 并保留历史邮箱。 */
  async function deleteAccount(id: string) {
    await apiFetch(`/api/icloud-accounts/${id}`, { body: '{}', method: 'DELETE' });
    message.success('CK 已删除');
    await queryClient.invalidateQueries({ queryKey: ['accounts'] });
  }

  return (
    <Card title="CK 账号" extra={<Button type="primary" onClick={openImport}>导入 CK</Button>}>
      <Table rowKey="id" loading={accounts.isLoading} dataSource={accounts.data?.accounts || []} pagination={false} columns={[
        { title: 'Apple ID', dataIndex: 'appleIdMasked' },
        { title: '区域', dataIndex: 'region', render: value => <Tag color={value === 'china' ? 'gold' : 'blue'}>{value === 'china' ? '中国区' : '全球区'}</Tag> },
        { title: '库存', dataIndex: 'addressCount' }, { title: '未使用', dataIndex: 'unusedCount' },
        { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => openUpdate(row)}>更新 CK</Button><Button type="link" onClick={() => syncAccount(row.id)}>同步</Button><Popconfirm title="确认删除 CK？" onConfirm={() => deleteAccount(row.id)}><Button danger type="link">删除</Button></Popconfirm></Space> }
      ]} />
      <Modal title={editingAccount ? `更新 CK · ${editingAccount.appleIdMasked}` : '导入 iCloud CK'} open={open} confirmLoading={cookieMutation.isPending} onCancel={closeModal} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" initialValues={{ region: 'auto' }} onFinish={values => cookieMutation.mutate(values)}>
          <Form.Item label="区域" name="region"><Select options={[{ label: '自动检测', value: 'auto' }, { label: '全球区', value: 'global' }, { label: '中国区', value: 'china' }]} /></Form.Item>
          <Form.Item extra={editingAccount ? '新 CK 必须属于当前 Apple ID；更新后库存、生产任务、冷却和 IMAP 配置不会清空。' : undefined} label="CK 或 Copy as cURL" name="cookie" rules={[{ required: true }]}><Input.TextArea autoComplete="off" rows={8} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export const Route = createFileRoute('/(admin)/accounts/')({
  component: AccountsPage,
  staticData: { title: 'CK 账号', menu: { icon: 'mdi:account-key', order: 2 } }
});
