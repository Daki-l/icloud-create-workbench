interface MailHtmlPreviewProps {
  /** 邮件原始 HTML 正文。 */
  html: string;
  /** Iframe 无障碍标题。 */
  title: string;
}

/** 在禁止脚本、表单、远程资源和顶层跳转的沙箱中展示邮件 HTML。 */
const MailHtmlPreview = (props: MailHtmlPreviewProps) => {
  const { html, title } = props;
  // 放行常见外链图片资源，脚本与表单仍保持禁用。
  const policy = "default-src 'none'; img-src data: cid: blob: https: http:; style-src 'unsafe-inline'; font-src data: https: http:";
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;padding:12px;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;

  return (
    <iframe className="workbench-mail-frame" referrerPolicy="no-referrer" sandbox="" srcDoc={srcDoc} title={title} />
  );
};

export default MailHtmlPreview;
