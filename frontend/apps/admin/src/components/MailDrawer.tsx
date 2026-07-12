import { useQuery } from '@tanstack/react-query';
import { Button, Descriptions, Drawer, Empty, List, Modal, Pagination, Segmented, Space, Spin, Tag, Typography } from 'antd';
import { useState } from 'react';

import MailHtmlPreview from '@/components/MailHtmlPreview';
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
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
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
    setViewMode('html');
    setPage(1);
    onClose();
  }

  /** 关闭单封邮件详情弹窗。 */
  function closeDetail() {
    setSelectedId('');
    setViewMode('html');
  }

  const message = detailQuery.data?.message;

  return (
    <Drawer destroyOnHidden onClose={close} open={open} title={`${email || '隐私邮箱'} · 邮件`} width={760}>
      <List
        dataSource={listQuery.data?.messages || []}
        locale={{ emptyText: <Empty description="暂无关联邮件" /> }}
        loading={listQuery.isLoading}
        renderItem={item => (
          <List.Item actions={[<Button key="detail" type="link" onClick={() => setSelectedId(item.id)}>查看详情</Button>]}>
            <List.Item.Meta description={`${item.sender || '未知发件人'} · ${item.receivedAt || ''}`} title={item.subject || '无主题'} />
            {item.code ? <Typography.Text copyable={{ text: item.code }}><Tag color="blue">{item.code}</Tag></Typography.Text> : null}
          </List.Item>
        )}
      />
      <Pagination current={listQuery.data?.pagination.page || 1} pageSize={10} total={listQuery.data?.pagination.total || 0} onChange={setPage} />
      <Modal destroyOnHidden footer={<Button onClick={closeDetail}>关闭</Button>} open={Boolean(selectedId)} title="邮件详情" width={920} onCancel={closeDetail}>
        {detailQuery.isLoading ? <div className="h-240px flex-center"><Spin size="large" /></div> : message ? (
          <Space className="w-full" direction="vertical" size={16}>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="主题">{message.subject || '无主题'}</Descriptions.Item>
              <Descriptions.Item label="发件人">{message.sender || '-'}</Descriptions.Item>
              <Descriptions.Item label="验证码">
                {message.code ? <Typography.Text copyable={{ text: message.code }} strong>{message.code}</Typography.Text> : '未识别'}
              </Descriptions.Item>
              <Descriptions.Item label="收件时间">{message.receivedAt || '-'}</Descriptions.Item>
            </Descriptions>
            {message.bodyHtml ? <Segmented options={[{ label: 'HTML 邮件', value: 'html' }, { label: '纯文本', value: 'text' }]} value={viewMode} onChange={value => setViewMode(value as 'html' | 'text')} /> : null}
            {message.bodyHtml && viewMode === 'html'
              ? <MailHtmlPreview html={message.bodyHtml} title={message.subject || '邮件正文'} />
              : <Typography.Paragraph className="max-h-520px overflow-auto whitespace-pre-wrap" copyable>{message.bodyText || message.preview || '无纯文本正文'}</Typography.Paragraph>}
          </Space>
        ) : <Empty description="邮件不存在或加载失败" />}
      </Modal>
    </Drawer>
  );
};

export default MailDrawer;
