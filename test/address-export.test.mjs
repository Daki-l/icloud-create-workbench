import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createAddressRouter } from "../src/routes/address-routes.mjs";

test("MMA 导出按筛选条件输出邮箱和标签文本", async () => {
  let receivedFilters;
  const repositories = {
    /** 记录筛选条件并返回用于验证格式的邮箱。 */
    listAddresses(filters) {
      receivedFilters = filters;
      return [{ email: "alias@icloud.com", label: "apple-001" }];
    }
  };
  const app = express();
  app.use("/api/addresses", createAddressRouter(repositories, {}));

  const response = await request(app)
    .get("/api/addresses/export-mma?accountId=account-1&state=unused&search=apple")
    .expect(200)
    .expect("Content-Type", /text\/plain/)
    .expect("Content-Disposition", /hidden-addresses-mma\.txt/);

  assert.deepEqual(receivedFilters, { accountId: "account-1", state: "unused", search: "apple" });
  assert.equal(response.text.replace(/^\uFEFF/, ""), "alias@icloud.com----apple-001");
});
