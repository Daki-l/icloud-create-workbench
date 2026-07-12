import { useQuery } from '@tanstack/react-query';
import { Button, Card, Descriptions, Space, Tag, Typography } from 'antd';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import MailDrawer from '@/components/MailDrawer';
import { apiFetch } from '@/service/workbench';
import type { Address } from '@/types/workbench';

/** 渲染单个隐私邮箱详情和关联邮件入口。 */
const AddressDetailPage = () => {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [mailOpen, setMailOpen] = useState(false);
  const detail = useQuery({ queryKey: ['address', id], queryFn: () => apiFetch<{ address: Address }>(`/api/addresses/${id}`) });
  const address = detail.data?.address;
  return (
    <Space className="w-full" direction="vertical" size={16}>
      <Button onClick={() => navigate({ to: '/addresses' })}>返回库存</Button>
      <Card loading={detail.isLoading} title="邮箱详情" extra={<Button type="primary" onClick={() => setMailOpen(true)}>查看邮件</Button>}>
        {address ? <Descriptions bordered column={{ lg: 2, xs: 1 }}>
          <Descriptions.Item label="隐私邮箱"><Typography.Text copyable>{address.email}</Typography.Text></Descriptions.Item>
          <Descriptions.Item label="Apple ID">{address.appleIdMasked}</Descriptions.Item>
          <Descriptions.Item label="标签">{address.label || '-'}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{address.state}</Tag></Descriptions.Item>
          <Descriptions.Item label="邮件数量">{address.messageCount || 0}</Descriptions.Item>
          <Descriptions.Item label="最新验证码"><Tag color="blue">{address.latestCode || '暂无'}</Tag></Descriptions.Item>
          <Descriptions.Item label="最新邮件时间">{address.latestMessageAt || '-'}</Descriptions.Item>
          <Descriptions.Item label="公开访问">{address.publicAccessEnabled ? '已启用' : '未启用'}</Descriptions.Item>
        </Descriptions> : null}
      </Card>
      <MailDrawer addressId={address?.id} email={address?.email} open={mailOpen} onClose={() => setMailOpen(false)} />
    </Space>
  );
};

export const Route = createFileRoute('/(admin)/addresses/$id')({ component: AddressDetailPage, staticData: { title: '邮箱详情' } });
