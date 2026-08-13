# iCloud 隐藏邮箱生产控制台

这是一个单管理员、多 CK 的服务器控制台。Node.js 负责 Web、JWT、SQLite 和调度，Python 调用固定版本的 `hidemyemail-generator` 完成 iCloud 操作。

## 功能

- 管理员 JWT 登录，Cookie 使用 `HttpOnly + SameSite=Strict`
- CK 与 IMAP 密码使用 AES-256-GCM 加密保存
- 多 CK 工作台、账号检测和 Apple 邮箱同步
- 自动验证 maildomain 分片，错误的用户分区主机名会回退到区域默认节点
- 每条 CK 每批最多生成 5 个，成功后强制冷却 60 分钟
- 持久化生产目标默认库存 700，可停止、继续并自动按冷却周期执行
- 未使用、已使用、垃圾箱状态与 CSV 导出
- 邮箱、批次记录和邮件分页，支持批量修改使用状态
- 每条 CK 独立 IMAP 配置、验证码提取和邮件预览
- 每 30 秒按 CK 增量同步 IMAP，首次最多读取最近 100 封
- 每个隐私邮箱可生成独立开放密钥，提供 JSON 最新邮件接口和只读网页
- Skyroc Admin v3 管理界面、响应式布局、暗色主题和库存分页
- Docker 镜像、SQLite 持久卷、健康检查和在线备份

## 开放邮件接口

在“邮箱库存”中点击“开放链接”，系统会生成一组仅展示一次的密钥和三个地址：

```text
GET /openapi/mail/:email/:token/latest   # 最新一封（浏览器打开为 HTML，?format=json 返回 JSON）
GET /openapi/mail/:email/:token/list      # 分页返回全部邮件 JSON（列表带正文）
GET /mail/:email/:token                   # 只读网页，分页查看全部邮件
```

`latest` 返回该隐私邮箱在本地数据库中的最新邮件；暂无邮件时返回 `message: null`。`list` 分页返回全部邮件，支持 `page`、`pageSize` 查询参数，`pageSize` 硬上限 20；返回结构与 `latest` 一致地包含正文。只读网页 `/mail/:email/:token` 改为列表+详情视图，支持翻页与每 30 秒自动刷新。重置或撤销后，旧密钥立即失效。开放请求不会临时连接 IMAP，后台同步器默认每 30 秒更新本地邮件。

## 获取 iCloud CK

### 调试插件

仓库内置 Chrome / Edge 调试插件：`extensions/icloud-ck-extractor`。在浏览器扩展管理页开启开发者模式并“加载已解压的扩展程序”后，登录 iCloud+、打开“隐藏邮件地址”，即可自动捕获并复制 CK。详细步骤见插件目录内的 `README.md`。

### 推荐方法：Network 复制为 cURL

请按下面步骤获取：

1. 浏览器打开 `https://www.icloud.com/icloudplus/`。中国区使用 `https://www.icloud.com.cn/icloudplus/`。
2. 正常登录 Apple ID 并完成双重验证。
3. 按 `F12` 打开开发者工具，进入 `Network`，勾选 `Preserve log`。
4. 在 iCloud+ 页面点击“隐藏邮件地址”。
5. 在 Network 过滤框输入 `maildomainws`。
6. 找到路径包含 `/v2/hme/list` 或 `/v1/hme/` 的请求。
7. 右键请求，选择 `Copy` → `Copy as cURL`。
8. 打开控制台的“CK 账号”页面，点击“导入 CK”，粘贴完整 cURL 并提交。

控制台内置 `/guide` 页面，提供相同指引和复制按钮。

## Docker 部署

服务器只需要安装 Docker 与 Docker Compose。拉取代码后创建环境文件：

```bash
cp .env.example .env
# 编辑 .env，至少填写 APP_ORIGIN、ADMIN_PASSWORD、JWT_SECRET 和 DATA_ENCRYPTION_KEY
docker compose up -d --build
docker compose ps
```

`ADMIN_PASSWORD` 直接填写至少 10 位的登录密码，不需要生成哈希。`JWT_SECRET` 可使用 `openssl rand -base64 48` 生成，`DATA_ENCRYPTION_KEY` 可使用 `openssl rand -base64 32` 生成。将 `APP_ORIGIN` 设置为 `http://服务器IP:4173` 或实际域名，然后打开该地址登录。真实 `.env`、数据库和 CK 不得提交。

查看日志：

```bash
docker compose logs -f app
```

更新服务：

```bash
docker compose up -d --build
```

## 数据备份

容器内执行 SQLite 一致性备份：

```bash
docker compose exec app node scripts/backup-db.mjs /app/data/workbench-backup.db
```

再使用 `docker cp` 将备份文件取出。不要直接复制正在写入的数据库和 WAL 文件。

## Windows 本地开发

安装 Node.js 24、Python 3.12 后执行：

```powershell
npm install
npm run init-env
.\start.ps1
```

`start.ps1` 会自动安装根目录 npm 依赖、Skyroc 的 pnpm 依赖、构建前端，并把数据库路径切换为项目内的 `data/workbench.db`。

## 通过 SSH 隧道访问远程数据

本地数据库是独立的 SQLite 文件，默认不与服务器互通。想在本地浏览器里操作远程实时数据，用 SSH 端口转发把远程 4173 映射到本地 4173 即可，无需改代码、无需拷数据库。

```bash
ssh -N -L 4173:localhost:4173 -i "C:/Users/Theadore/.ssh/ssh-cdk-140.238.34.121.key" opc@140.238.34.121
```

- `-N` 只做端口转发，不进远程 shell，保持窗口开着即生效，`Ctrl+C` 或关窗口断开。
- 连通后本地浏览器打开 `http://localhost:4173`，走的就是远程服务、读写远程那份 `workbench.db`。
- 用户名按镜像而定：Oracle Linux 默认 `opc`，Ubuntu 镜像换 `ubuntu`。

### Windows 首次报 "UNPROTECTED PRIVATE KEY FILE"

Windows OpenSSH 对私钥权限检查很严，提示 `bad permissions` 时收紧该 key 权限（PowerShell 执行）：

```powershell
icacls "C:\Users\Theadore\.ssh\ssh-cdk-140.238.34.121.key" /inheritance:r
icacls "C:\Users\Theadore\.ssh\ssh-cdk-140.238.34.121.key" /grant:r "$($env:USERNAME):(R)"
```

第一条去掉继承的所有权限，第二条替换式地只给当前用户读权限。跑完再重试 ssh 命令。

### 可选：写进 ssh config，以后一条命令开启

编辑 `C:\Users\Theadore\.ssh\config`（没有则新建）：

```sshconfig
Host workbench
  HostName 140.238.34.121
  User opc
  IdentityFile C:/Users/Theadore/.ssh/ssh-cdk-140.238.34.121.key
  LocalForward 4173 localhost:4173
```

之后只需：

```bash
ssh -N workbench
```

> 注意：SQLite 是单机文件数据库，不要用 SSHFS/SMB 网络挂载远程 `.db` 到本地再用本地进程读写，WAL 锁在跨机文件系统上不可靠，会损坏数据库。要本地实时操作远程数据，就用上面的 SSH 隧道。

## HTTPS 升级

接入 Nginx、Caddy 或负载均衡后，将 `APP_ORIGIN` 改为实际 HTTPS 地址，并设置 `COOKIE_SECURE=true`，然后重启容器。
