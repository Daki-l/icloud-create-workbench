import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { Key } from 'react';

import MailDrawer from '@/components/MailDrawer';
import { apiFetch, queryString } from '@/service/workbench';
import type { Account, Address, Pagination } from '@/types/workbench';

interface PublicLinks { apiUrl: string; token: string; viewerUrl: string }

/** 渲染邮箱库存、批量状态、邮件与开放链接操作。 */
const AddressesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ accountId: '', search: '', state: '' });
  const [selected, setSelected] = useState<Key[]>([]);
  const [mailAddress, setMailAddress] = useState<Address>();
  const [links, setLinks] = useState<PublicLinks>();
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => apiFetch<{ accounts: Account[] }>('/api/icloud-accounts') });
  const addresses = useQuery({
    queryKey: ['addresses', page, filters],
    queryFn: () => apiFetch<{ addresses: Address[]; pagination: Pagination }>(`/api/addresses?${queryString({ ...filters, page, pageSize: 20 })}`)
  });
  const publicMutation = useMutation({
    mutationFn: (id: string) => apiFetch<PublicLinks>(`/api/addresses/${id}/public-access`, { body: '{}', method: 'POST' }),
    onSuccess: async data => { setLinks(data); await queryClient.invalidateQueries({ queryKey: ['addresses'] }); }
  });

  /** 批量修改选中邮箱状态。 */
  async function batchState(state: string) {
    if (!selected.length) return message.warning('请先选择邮箱');
    await apiFetch('/api/addresses/batch-state', { body: JSON.stringify({ ids: selected, state }), method: 'PATCH' });
    setSelected([]); message.success('批量状态已更新'); await queryClient.invalidateQueries({ queryKey: ['addresses'] });
  }

  /** 撤销指定邮箱的开放访问。 */
  async function revokeAccess(id: string) {
    await apiFetch(`/api/addresses/${id}/public-access`, { method: 'DELETE' });
    message.success('开放链接已撤销'); await queryClient.invalidateQueries({ queryKey: ['addresses'] });
  }

  return (
    <Card title="邮箱库存" extra={<Button href="/api/addresses/export">导出 CSV</Button>}>
      <Form className="mb-16px" layout="inline" onFinish={values => { setPage(1); setFilters(values); }}>
        <Form.Item name="accountId"><Select allowClear className="w-220px" placeholder="全部 CK" options={(accounts.data?.accounts || []).map(item => ({ label: item.appleIdMasked, value: item.id }))} /></Form.Item>
        <Form.Item name="state"><Select allowClear className="w-160px" placeholder="全部状态" options={[{ label: '未使用', value: 'unused' }, { label: '已使用', value: 'used' }, { label: '垃圾箱', value: 'trash' }]} /></Form.Item>
        <Form.Item name="search"><Input allowClear placeholder="搜索邮箱或标签" /></Form.Item>
        <Button htmlType="submit" type="primary">查询</Button>
      </Form>
      <Space className="mb-12px"><Button onClick={() => batchState('used')}>批量已使用</Button><Button onClick={() => batchState('unused')}>批量未使用</Button><Button danger onClick={() => batchState('trash')}>批量垃圾箱</Button></Space>
      <Table<Address>
        rowKey="id" loading={addresses.isLoading} dataSource={addresses.data?.addresses || []}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected }}
        pagination={{ current: addresses.data?.pagination.page, pageSize: 20, total: addresses.data?.pagination.total, onChange: setPage }}
        columns={[
          { title: '邮箱', dataIndex: 'email', render: value => <Typography.Text copyable>{value}</Typography.Text> },
          { title: 'Apple ID', dataIndex: 'appleIdMasked' }, { title: '标签', dataIndex: 'label' },
          { title: '状态', dataIndex: 'state', render: value => <Tag color={value === 'unused' ? 'green' : value === 'used' ? 'blue' : 'red'}>{value}</Tag> },
          { title: '邮件', dataIndex: 'messageCount', render: (value, row) => <Space>{value || 0}{row.latestCode ? <Tag color="blue">{row.latestCode}</Tag> : null}</Space> },
          { title: '操作', width: 280, render: (_, row) => <Space wrap>
            <Button size="small" onClick={() => navigate({ to: '/addresses/$id', params: { id: row.id } })}>详情</Button>
            <Button size="small" onClick={() => setMailAddress(row)}>邮件</Button>
            <Button size="small" type="primary" onClick={() => publicMutation.mutate(row.id)}>{row.publicAccessEnabled ? '重置链接' : '开放链接'}</Button>
            {row.publicAccessEnabled ? <Popconfirm title="撤销后旧链接立即失效" onConfirm={() => revokeAccess(row.id)}><Button danger size="small">撤销</Button></Popconfirm> : null}
          </Space> }
        ]}
        scroll={{ x: 1200 }}
      />
      <MailDrawer addressId={mailAddress?.id} email={mailAddress?.email} open={Boolean(mailAddress)} onClose={() => setMailAddress(undefined)} />
      <Modal footer={<Button type="primary" onClick={() => setLinks(undefined)}>完成</Button>} open={Boolean(links)} title="开放邮件链接（密钥仅展示一次）" onCancel={() => setLinks(undefined)}>
        <Typography.Paragraph copyable>{links?.apiUrl}</Typography.Paragraph>
        <Typography.Paragraph copyable>{links?.viewerUrl}</Typography.Paragraph>
      </Modal>
    </Card>
  );
};

export const Route = createFileRoute('/(admin)/addresses/')({
  component: AddressesPage,
  staticData: { title: '邮箱库存', menu: { icon: 'mdi:email-multiple', order: 4 } }
});
