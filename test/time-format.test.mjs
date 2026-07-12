import assert from "node:assert/strict";
import test from "node:test";

import { formatTime } from "../public/assets/render.js";

test("界面时间固定使用上海时区", () => {
  const result = formatTime("2026-07-12T04:00:00.000Z");
  assert.match(result, /2026\/7\/12/);
  assert.match(result, /12:00/);
});
