import test from "node:test";
import assert from "node:assert/strict";
import { inlineAttachmentCidImages } from "../src/services/inbox-service.mjs";

test("内联附件图片会被替换为可显示的 data URL", () => {
  const html = '<div><img src="cid:image001%40mail.test"><img src="cid:missing"></div>';
  const attachments = [
    {
      contentId: "<image001@mail.test>",
      contentType: "image/png",
      content: Buffer.from("png-binary")
    },
    {
      contentId: "<doc001@mail.test>",
      contentType: "application/pdf",
      content: Buffer.from("pdf-binary")
    }
  ];

  const result = inlineAttachmentCidImages(html, attachments);

  assert.match(result, /src="data:image\/png;base64,/);
  assert.match(result, /src="cid:missing"/);
  assert.doesNotMatch(result, /application\/pdf/);
});
