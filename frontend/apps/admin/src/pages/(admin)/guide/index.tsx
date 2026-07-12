import { Button, Card, Col, Row, Space, Typography, message } from 'antd';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

const steps = [
  { title: '登录 iCloud', text: '打开 iCloud+，登录 Apple ID 并进入隐藏邮件地址。', copy: 'https://www.icloud.com/icloudplus/' },
  { title: '定位请求', text: '按 F12 打开 Network，勾选 Preserve log，过滤 maildomainws。', copy: 'maildomainws' },
  { title: '复制并导入', text: '右键 /v2/hme/list 或 /v1/hme/ 请求，选择 Copy as cURL。' }
];

/** 渲染 CK 获取步骤和复制按钮。 */
const GuidePage = () => {
  const navigate = useNavigate();
  /** 复制指南中的地址或筛选词。 */
  async function copy(value: string) { await navigator.clipboard.writeText(value); message.success('已复制'); }
  return (
    <Space className="w-full" direction="vertical" size={16}>
      <div><Typography.Title level={2}>iCloud CK 获取指南</Typography.Title><Typography.Text type="secondary">从浏览器开发者工具复制完整隐藏邮箱请求。</Typography.Text></div>
      <Row gutter={[16, 16]}>{steps.map((item, index) => <Col key={item.title} lg={8} xs={24}><Card title={`${index + 1}. ${item.title}`}><Typography.Paragraph>{item.text}</Typography.Paragraph>{item.copy ? <Button onClick={() => copy(item.copy!)}>复制 {item.copy}</Button> : <Button type="primary" onClick={() => navigate({ to: '/accounts' })}>前往 CK 账号</Button>}</Card></Col>)}</Row>
    </Space>
  );
};

export const Route = createFileRoute('/(admin)/guide/')({
  component: GuidePage,
  staticData: { title: 'CK 获取指南', menu: { icon: 'mdi:book-open-page-variant', order: 6 } }
});
