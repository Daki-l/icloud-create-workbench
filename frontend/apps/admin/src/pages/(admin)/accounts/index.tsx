import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { apiFetch } from '@/service/workbench';
import type { Account } from '@/types/workbench';

/** 渲染 CK 导入、同步和删除管理页。 */
const AccountsPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  const importMutation = useMutation({
    mutationFn: (values: { cookie: string; region: string }) => apiFetch('/api/icloud-accounts/import', { body: JSON.stringify(values), method: 'POST' }),
    onSuccess: async () => { message.success('CK 已导入'); setOpen(false); form.resetFields(); await queryClient.invalidateQueries({ queryKey: ['accounts'] }); }
  });

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
    <Card title="CK 账号" extra={<Button type="primary" onClick={() => setOpen(true)}>导入 CK</Button>}>
      <Table rowKey="id" loading={accounts.isLoading} dataSource={accounts.data?.accounts || []} pagination={false} columns={[
        { title: 'Apple ID', dataIndex: 'appleIdMasked' },
        { title: '区域', dataIndex: 'region', render: value => <Tag color={value === 'china' ? 'gold' : 'blue'}>{value === 'china' ? '中国区' : '全球区'}</Tag> },
        { title: '库存', dataIndex: 'addressCount' }, { title: '未使用', dataIndex: 'unusedCount' },
        { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => syncAccount(row.id)}>同步</Button><Popconfirm title="确认删除 CK？" onConfirm={() => deleteAccount(row.id)}><Button danger type="link">删除</Button></Popconfirm></Space> }
      ]} />
      <Modal title="导入 iCloud CK" open={open} confirmLoading={importMutation.isPending} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" initialValues={{ region: 'auto' }} onFinish={values => importMutation.mutate(values)}>
          <Form.Item label="区域" name="region"><Select options={[{ label: '自动检测', value: 'auto' }, { label: '全球区', value: 'global' }, { label: '中国区', value: 'china' }]} /></Form.Item>
          <Form.Item label="CK 或 Copy as cURL" name="cookie" rules={[{ required: true }]}><Input.TextArea rows={8} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export const Route = createFileRoute('/(admin)/accounts/')({
  component: AccountsPage,
  staticData: { title: 'CK 账号', menu: { icon: 'mdi:account-key', order: 2 } }
});
