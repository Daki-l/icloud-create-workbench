import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Pagination } from '@astryxdesign/core/Pagination';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import MailHtmlPreview from '@/components/MailHtmlPreview';
import { apiFetch, queryString } from '@/service/workbench';
import type { MailMessage, Pagination as PageInfo } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

interface MailDrawerProps {
  /** 当前隐私邮箱记录编号。 */
  addressId?: string;
  /** 当前隐私邮箱地址。 */
  email?: string;
  /** 关闭邮件查看器后的回调。 */
  onClose: () => void;
  /** 是否显示邮件查看器。 */
  open: boolean;
}

/** 展示指定隐私邮箱的分页邮件和单封邮件详情。 */
const MailDrawer = (props: MailDrawerProps) => {
  const { addressId, email, onClose, open } = props;
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const listQuery = useQuery({
    enabled: open && Boolean(addressId),
    queryKey: ['address-mails', addressId, page],
    queryFn: () =>
      apiFetch<{ messages: MailMessage[]; pagination: PageInfo }>(
        `/api/addresses/${addressId}/messages?${queryString({ page, pageSize: 10 })}`
      )
  });
  const detailQuery = useQuery({
    enabled: Boolean(selectedId),
    queryKey: ['message', selectedId],
    queryFn: () => apiFetch<{ message: MailMessage }>(`/api/messages/${selectedId}`)
  });

  /** 关闭查看器并清理当前邮件选择。 */
  function close() {
    setSelectedId('');
    setViewMode('html');
    setPage(1);
    onClose();
  }

  /** 返回当前隐私邮箱的邮件列表。 */
  function backToList() {
    setSelectedId('');
    setViewMode('html');
  }

  /** 复制邮件验证码。 */
  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast({ body: '验证码已复制' });
  }

  const message = detailQuery.data?.message;
  const messages = listQuery.data?.messages || [];

  /** 渲染单封邮件详情。 */
  function renderDetail() {
    if (detailQuery.isLoading) return <Spinner label="正在加载邮件详情" />;
    if (!message) return <EmptyState description="邮件可能已被删除或暂时无法读取。" title="邮件不存在" />;
    return (
      <VStack gap={4}>
        <Card variant="muted">
          <VStack gap={2}>
            <Heading level={3}>{message.subject || '无主题'}</Heading>
            <Text color="secondary">发件人：{message.sender || '-'}</Text>
            <Text color="secondary">收件时间：{formatShanghaiTime(message.receivedAt, '-')}</Text>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Text color="secondary">验证码：{message.code || '未识别'}</Text>
              {message.code ? <Button label="复制验证码" size="sm" onClick={() => copyCode(message.code!)} /> : null}
            </HStack>
          </VStack>
        </Card>
        {message.bodyHtml ? (
          <SegmentedControl
            label="邮件正文格式"
            value={viewMode}
            onChange={value => setViewMode(value as 'html' | 'text')}
          >
            <SegmentedControlItem label="HTML 邮件" value="html" />
            <SegmentedControlItem label="纯文本" value="text" />
          </SegmentedControl>
        ) : null}
        {message.bodyHtml && viewMode === 'html' ? (
          <MailHtmlPreview html={message.bodyHtml} title={message.subject || '邮件正文'} />
        ) : (
          <Text className="workbench-code">{message.bodyText || message.preview || '无纯文本正文'}</Text>
        )}
      </VStack>
    );
  }

  /** 渲染当前页邮件列表。 */
  function renderList() {
    if (listQuery.isLoading) return <Spinner label="正在加载关联邮件" />;
    if (!messages.length) return <EmptyState description="后台同步到的新邮件会显示在这里。" title="暂无关联邮件" />;
    return (
      <VStack gap={3}>
        {messages.map((item, index) => (
          <VStack gap={3} key={item.id}>
            {index ? <Divider /> : null}
            <HStack hAlign="between" vAlign="center" wrap="wrap">
              <VStack gap={1}>
                <Text weight="bold">{item.subject || '无主题'}</Text>
                <Text color="secondary" type="supporting">
                  {item.sender || '未知发件人'} · {formatShanghaiTime(item.receivedAt)}
                </Text>
                {item.code ? (
                  <Text color="accent" type="supporting">
                    验证码 {item.code}
                  </Text>
                ) : null}
              </VStack>
              <Button label="查看详情" size="sm" onClick={() => setSelectedId(item.id)} />
            </HStack>
          </VStack>
        ))}
      </VStack>
    );
  }

  /** 渲染邮件查看器底部操作。 */
  function renderFooter() {
    if (selectedId) {
      return (
        <HStack hAlign="between">
          <Button label="返回列表" onClick={backToList} />
          <Button label="关闭" variant="primary" onClick={close} />
        </HStack>
      );
    }
    return (
      <HStack hAlign="between" vAlign="center" wrap="wrap">
        <Pagination
          label="邮件分页"
          page={listQuery.data?.pagination.page || 1}
          pageSize={10}
          totalItems={listQuery.data?.pagination.total || 0}
          variant="compact"
          onChange={setPage}
        />
        <Button label="关闭" onClick={close} />
      </HStack>
    );
  }

  return (
    <Dialog
      isOpen={open}
      maxHeight="90vh"
      padding={0}
      width="min(960px, 94vw)"
      onOpenChange={next => {
        if (!next) close();
      }}
    >
      <Layout
        content={
          <LayoutContent isScrollable padding={5}>
            {selectedId ? renderDetail() : renderList()}
          </LayoutContent>
        }
        footer={<LayoutFooter>{renderFooter()}</LayoutFooter>}
        header={
          <DialogHeader
            title={selectedId ? '邮件详情' : `${email || '隐私邮箱'} · 邮件`}
            onOpenChange={next => {
              if (!next) close();
            }}
          />
        }
      />
    </Dialog>
  );
};

export default MailDrawer;
