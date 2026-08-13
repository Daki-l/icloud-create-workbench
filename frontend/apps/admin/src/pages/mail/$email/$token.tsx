import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Pagination } from '@astryxdesign/core/Pagination';
import { Section } from '@astryxdesign/core/Section';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { useState } from 'react';

import MailHtmlPreview from '@/components/MailHtmlPreview';
import { apiFetch, queryString } from '@/service/workbench';
import type { MailMessage, Pagination as PageInfo } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

const PAGE_SIZE = 20;
const pageStyle: React.CSSProperties = { minHeight: '100dvh' };
const routeApi = getRouteApi('/mail/$email/$token');

interface PublicMailList {
  email: string;
  messages: MailMessage[];
  pagination: PageInfo;
}

/** 渲染无需管理员登录的全部邮件公开页面。 */
const PublicMailPage = () => {
  const { email, token } = routeApi.useParams();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const listQuery = useQuery({
    queryKey: ['public-mail-list', email, token, page],
    queryFn: () =>
      apiFetch<PublicMailList>(
        `/openapi/mail/${encodeURIComponent(email)}/${token}/list?${queryString({ page, pageSize: PAGE_SIZE })}`
      ),
    refetchInterval: 30_000,
    retry: false
  });

  /** 返回邮件列表视图。 */
  function backToList() {
    setSelectedId('');
    setViewMode('html');
  }

  /** 复制文本到剪贴板并提示。 */
  async function copy(value: string, message: string) {
    await navigator.clipboard.writeText(value);
    toast({ body: message });
  }

  if (listQuery.isLoading)
    return (
      <Center axis="both" style={pageStyle}>
        <Spinner label="正在加载邮件" />
      </Center>
    );
  if (listQuery.isError)
    return (
      <Center axis="both" style={pageStyle}>
        <EmptyState description="链接可能已失效、被重置或撤销。" title="公开链接无效" />
      </Center>
    );

  const messages = listQuery.data?.messages || [];
  const selected = messages.find(item => item.id === selectedId);

  /** 渲染单封邮件详情。 */
  function renderDetail(mail: MailMessage) {
    const body = mail.bodyText || mail.preview || '无纯文本正文';
    return (
      <Card maxWidth={840} width="100%" style={{ marginInline: 'auto' }}>
        <VStack gap={5}>
          <VStack gap={2}>
            <HStack hAlign="between" vAlign="center" wrap="wrap">
              <Badge label="邮件详情" variant="blue" />
              <Button label="返回列表" size="sm" onClick={backToList} />
            </HStack>
            <Heading level={2}>{mail.subject || '无主题'}</Heading>
            <Text color="secondary">发件人：{mail.sender || '-'}</Text>
            <Text color="secondary">收件时间：{formatShanghaiTime(mail.receivedAt, '-')}</Text>
            {mail.code ? (
              <Card variant="blue">
                <HStack hAlign="between" vAlign="center" wrap="wrap">
                  <VStack gap={1}>
                    <Text color="secondary">验证码</Text>
                    <Heading level={2}>{mail.code}</Heading>
                  </VStack>
                  <Button label="复制验证码" variant="primary" onClick={() => copy(mail.code!, '验证码已复制')} />
                </HStack>
              </Card>
            ) : null}
          </VStack>
          <Divider />
          <HStack hAlign="between" vAlign="center">
            <Heading level={3}>邮件正文</Heading>
            <Button label="复制正文" size="sm" onClick={() => copy(body, '邮件正文已复制')} />
          </HStack>
          {mail.bodyHtml ? (
            <SegmentedControl
              label="邮件正文格式"
              value={viewMode}
              onChange={value => setViewMode(value as 'html' | 'text')}
            >
              <SegmentedControlItem label="HTML 邮件" value="html" />
              <SegmentedControlItem label="纯文本" value="text" />
            </SegmentedControl>
          ) : null}
          {mail.bodyHtml && viewMode === 'html' ? (
            <MailHtmlPreview html={mail.bodyHtml} title={mail.subject || '邮件正文'} />
          ) : (
            <Text as="div" className="workbench-code workbench-mail-text">
              {body}
            </Text>
          )}
        </VStack>
      </Card>
    );
  }

  /** 渲染当前页邮件列表。 */
  function renderList() {
    if (!messages.length)
      return (
        <Center axis="both" style={pageStyle}>
          <EmptyState description={listQuery.data?.email} title="暂未收到邮件" />
        </Center>
      );
    return (
      <Card maxWidth={840} width="100%" style={{ marginInline: 'auto' }}>
        <VStack gap={5}>
          <VStack gap={2}>
            <Badge label="全部邮件" variant="blue" />
            <Heading level={2}>{listQuery.data?.email}</Heading>
            <Text color="secondary">每 30 秒自动刷新，共 {listQuery.data?.pagination.total || 0} 封</Text>
          </VStack>
          <Divider />
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
          <HStack hAlign="between" vAlign="center" wrap="wrap">
            <Pagination
              label="邮件分页"
              page={listQuery.data?.pagination.page || 1}
              pageSize={PAGE_SIZE}
              totalItems={listQuery.data?.pagination.total || 0}
              variant="compact"
              onChange={setPage}
            />
          </HStack>
        </VStack>
      </Card>
    );
  }

  return <Section padding={6} style={pageStyle}>{selected ? renderDetail(selected) : renderList()}</Section>;
};

export const Route = createFileRoute('/mail/$email/$token')({ component: PublicMailPage });
