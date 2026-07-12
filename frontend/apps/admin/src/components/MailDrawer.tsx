import { useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Drawer, Empty, List, Pagination, Space, Tag, Typography } from 'antd';
import { useState } from 'react';

import { apiFetch, queryString } from '@/service/workbench';
import type { MailMessage, Pagination as PageInfo } from '@/types/workbench';

interface MailDrawerProps {
  /** 当前隐私邮箱记录编号。 */
  addressId?: string;
  /** 当前隐私邮箱地址。 */
  email?: string;
  /** 关闭抽屉后的回调。 */
  onClose: () => void;
  /** 是否显示邮件抽屉。 */
  open: boolean;
}

/** 展示指定隐私邮箱的分页邮件和纯文本正文。 */
const MailDrawer = (props: MailDrawerProps) => {
  const { addressId, email, onClose, open } = props;
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const listQuery = useQuery({
    enabled: open && Boolean(addressId),
    queryKey: ['address-mails', addressId, page],
    queryFn: () => apiFetch<{ messages: MailMessage[]; pagination: PageInfo }>(
      `/api/addresses/${addressId}/messages?${queryString({ page, pageSize: 10 })}`
    )
  });
  const detailQuery = useQuery({
    enabled: Boolean(selectedId),
    queryKey: ['message', selectedId],
    queryFn: () => apiFetch<{ message: MailMessage }>(`/api/messages/${selectedId}`)
  });

  /** 关闭抽屉并清理当前邮件选择。 */
  function close() {
    setSelectedId('');
    setPage(1);
    onClose();
  }

  return (
    <Drawer destroyOnHidden onClose={close} open={open} title={`${email || '隐私邮箱'} · 邮件`} width={760}>
      {detailQuery.data?.message ? (
        <Space className="w-full" direction="vertical" size={16}>
          <Button onClick={() => setSelectedId('')}>返回邮件列表</Button>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="主题">{detailQuery.data.message.subject || '无主题'}</Descriptions.Item>
            <Descriptions.Item label="发件人">{detailQuery.data.message.sender || '-'}</Descriptions.Item>
            <Descriptions.Item label="验证码"><Tag color="blue">{detailQuery.data.message.code || '未识别'}</Tag></Descriptions.Item>
            <Descriptions.Item label="收件时间">{detailQuery.data.message.receivedAt || '-'}</Descriptions.Item>
          </Descriptions>
          <Typography.Paragraph className="whitespace-pre-wrap" copyable>
            {detailQuery.data.message.bodyText || '无纯文本正文'}
          </Typography.Paragraph>
        </Space>
      ) : (
        <>
          <List
            dataSource={listQuery.data?.messages || []}
            locale={{ emptyText: <Empty description="暂无关联邮件" /> }}
            loading={listQuery.isLoading}
            renderItem={item => (
              <List.Item actions={[<Button key="detail" type="link" onClick={() => setSelectedId(item.id)}>查看正文</Button>]}>
                <List.Item.Meta description={`${item.sender || '未知发件人'} · ${item.receivedAt || ''}`} title={item.subject || '无主题'} />
                {item.code ? <Tag color="blue">{item.code}</Tag> : null}
              </List.Item>
            )}
          />
          <Pagination
            current={listQuery.data?.pagination.page || 1}
            pageSize={10}
            total={listQuery.data?.pagination.total || 0}
            onChange={setPage}
          />
        </>
      )}
    </Drawer>
  );
};

export default MailDrawer;
