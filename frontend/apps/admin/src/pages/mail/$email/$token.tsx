import { useCopy } from '@skyroc/hooks/web';
import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { Pagination } from '@astryxdesign/core/Pagination';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Spinner } from '@astryxdesign/core/Spinner';
import { HStack, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useToast } from '@astryxdesign/core/Toast';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, getRouteApi } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import MailHtmlPreview from '@/components/MailHtmlPreview';
import { apiFetch, queryString } from '@/service/workbench';
import type { MailMessage, Pagination as PageInfo } from '@/types/workbench';
import { formatShanghaiTime } from '@/utils/time';

const PAGE_SIZE = 20;
const routeApi = getRouteApi('/mail/$email/$token');

interface PublicMailList {
  email: string;
  messages: MailMessage[];
  pagination: PageInfo;
}

/** 渲染无需管理员登录的全部邮件公开页面（左列表 + 右详情）。 */
const PublicMailPage = () => {
  const { email, token } = routeApi.useParams();
  const toast = useToast();
  const { copy: copyToClipboard } = useCopy();
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [mobilePanel, setMobilePanel] = useState<'list' | 'detail'>('list');
  const listQuery = useQuery({
    queryKey: ['public-mail-list', email, token, page],
    queryFn: () =>
      apiFetch<PublicMailList>(
        `/openapi/mail/${encodeURIComponent(email)}/${token}/list?${queryString({ page, pageSize: PAGE_SIZE })}`
      ),
    refetchInterval: 30_000,
    retry: false
  });

  const messages = listQuery.data?.messages || [];
  const selected = messages.find(item => item.id === selectedId);
  const didInitRef = useRef(false);

  // 列表数据变更后，若当前选中已不在列表中（翻页/刷新/新邮件），自动回到首封。
  // 仅在首次加载时把窄屏切到详情面板，翻页时保持当前面板（不抢走列表视图）。
  useEffect(() => {
    const msgs = listQuery.data?.messages;
    if (!msgs?.length) return;
    if (!msgs.some(item => item.id === selectedId)) {
      const first = msgs[0];
      if (first) {
        setSelectedId(first.id);
        setViewMode('html');
        if (!didInitRef.current) setMobilePanel('detail');
      }
    }
    didInitRef.current = true;
  }, [listQuery.data, selectedId]);

  /** 选中指定邮件并切到详情面板（窄屏切换）。 */
  function selectMail(id: string) {
    setSelectedId(id);
    setViewMode('html');
    setMobilePanel('detail');
  }

  /** 复制文本到剪贴板并提示，非安全上下文回退到 execCommand。 */
  async function copy(value: string, message: string) {
    const ok = await copyToClipboard(value);
    toast({ body: ok ? message : '复制失败，请手动选择复制', type: ok ? 'info' : 'error' });
  }

  if (listQuery.isLoading)
    return (
      <Center axis="both" style={{ minHeight: '100dvh' }}>
        <Spinner label="正在加载邮件" />
      </Center>
    );
  if (listQuery.isError)
    return (
      <Center axis="both" style={{ minHeight: '100dvh' }}>
        <EmptyState description="链接可能已失效、被重置或撤销。" title="公开链接无效" />
      </Center>
    );

  /** 渲染单封邮件详情。 */
  function renderDetail(mail: MailMessage) {
    const body = mail.bodyText || mail.preview || '无纯文本正文';
    return (
      <VStack gap={5}>
        <Button className="mail-viewer-back" label="返回列表" size="sm" onClick={() => setMobilePanel('list')} />
        <VStack gap={2}>
          <Badge label="邮件详情" variant="blue" />
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
    );
  }

  /** 渲染右侧详情面板（含空态）。 */
  function renderDetailPanel() {
    if (selected) return renderDetail(selected);
    return (
      <div className="mail-viewer-empty">
        <EmptyState description="请选择左侧邮件查看详情" title="未选择邮件" />
      </div>
    );
  }

  /** 渲染左侧邮件列表。 */
  function renderList() {
    if (!messages.length)
      return (
        <div className="mail-viewer-empty">
          <EmptyState description={listQuery.data?.email} title="暂未收到邮件" />
        </div>
      );
    return (
      <>
        <div className="mail-viewer-list-scroll">
          <VStack gap={2}>
            {messages.map(item => {
              const isActive = item.id === selectedId;
              return (
                <div
                  className={`mail-viewer-item${isActive ? ' is-active' : ''}`}
                  key={item.id}
                  onClick={() => selectMail(item.id)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectMail(item.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <HStack hAlign="between" vAlign="start">
                    <Text weight="bold">{item.subject || '无主题'}</Text>
                    {item.code ? <Badge label={item.code} variant="green" /> : null}
                  </HStack>
                  <Text color="secondary" type="supporting">
                    {item.sender || '未知发件人'}
                  </Text>
                  <Text color="secondary" type="supporting">
                    {formatShanghaiTime(item.receivedAt)}
                  </Text>
                </div>
              );
            })}
          </VStack>
        </div>
        <div className="mail-viewer-list-footer">
          <Pagination
            label="邮件分页"
            page={listQuery.data?.pagination.page || 1}
            pageSize={PAGE_SIZE}
            totalItems={listQuery.data?.pagination.total || 0}
            variant="compact"
            onChange={setPage}
          />
        </div>
      </>
    );
  }

  return (
    <div className="mail-viewer">
      <header className="mail-viewer-header">
        <VStack gap={1}>
          <HStack hAlign="between" vAlign="center" wrap="wrap">
            <Heading level={2}>{listQuery.data?.email || email}</Heading>
            <Badge label="全部邮件" variant="blue" />
          </HStack>
          <Text color="secondary" type="supporting">
            每 30 秒自动刷新，共 {listQuery.data?.pagination.total || 0} 封
          </Text>
        </VStack>
      </header>
      <div className={`mail-viewer-body${mobilePanel === 'detail' ? ' is-detail' : ''}`}>
        <aside className="mail-viewer-list">{renderList()}</aside>
        <section className="mail-viewer-detail">{renderDetailPanel()}</section>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/mail/$email/$token')({ component: PublicMailPage });
