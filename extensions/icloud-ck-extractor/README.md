# iCloud CK 提取器

用于本人调试的 Chrome / Edge Manifest V3 扩展。扩展只读取 iCloud 域 Cookie，并保存在浏览器本机的扩展存储中，不会上传到任何服务。

## 安装

1. 打开 Chrome 的 `chrome://extensions/`，或 Edge 的 `edge://extensions/`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本目录：`extensions/icloud-ck-extractor`。

## 使用

1. 点击扩展图标，选择“打开 iCloud+”。
2. 登录 Apple ID 并完成双重认证。
3. 在 iCloud+ 中打开“隐藏邮件地址”。扩展会自动捕获 `/v1/hme/` 或 `/v2/hme/` 请求中的准确 CK。
4. 再次打开扩展，点击“复制 CK”，粘贴到工作台的“导入 CK”窗口。

如果页面没有触发隐藏邮箱接口请求，可在已登录的 iCloud 页面点击“读取当前 CK”作为备用方式。

点击“清除”会删除扩展本地保存的 CK。卸载扩展也会清除其本地数据。
