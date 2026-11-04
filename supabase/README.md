# Supabase 云同步配置

刷题站是纯静态页面，账号、数据库和图片存储都交给 Supabase。GitHub Pages 只负责前端。

## 1. 新建项目

1. 打开 <https://supabase.com>，登录后新建一个免费项目。
2. 等项目的数据库初始化完成。

## 2. 初始化数据库

1. 进入 **SQL Editor**。
2. 打开本目录的 [`schema.sql`](./schema.sql)，整段复制到 SQL Editor，点 **Run**。
3. 它会创建：
   - `public.user_state`：每个用户一份学习进度 JSON
   - `public.traces`：作答图片的元数据
   - 私有 Storage 桶 `traces`
   - 行级安全（RLS）策略：用户只能读写自己的数据
   - Realtime 发布：实时同步进度和图片

## 3. 配置登录

**Authentication → Providers → Email**：

- 保持 Email 开启。
- 如果不想让用户确认邮箱，关闭 **Confirm email**；否则注册后要先点邮件里的确认链接。
- **Authentication → URL Configuration**：
  - Site URL 填线上地址，例如 `https://lucy2025-creator.github.io/math-analysis-quiz/`
  - Redirect URLs 加上同一个地址
  - 本地调试可再加 `http://127.0.0.1:8765/`

## 4. 填到站点

两种方式任选：

1. 打开线上的 `#/account`，在“先配置 Supabase”表单里填 **Project URL** 和 **anon public key**，保存；
2. 或者直接编辑 `assets/js/supabase-config.js` 的 `url` / `anonKey`。

只填 **anon public** key，不要填 `service_role` key。anon key 本来就是公开的，数据安全由 RLS 保证。

## 5. 同步行为

- 登录后自动拉取云端进度，按每道题的更新时间合并。
- 联网时保存动作会延迟约 1 秒推送到云端；Supabase Realtime 会把其他设备的改动实时推回来。
- 断网时改动只写本地，恢复网络后自动补传。
- 作答图片：
  - 上传前压缩到最长边 1600px；
  - 文件存在私有 Storage 桶 `traces/<user_id>/<qid>/...jpg`；
  - 数据库只存路径，其他设备登录后下载到本地 IndexedDB。
- “用云端覆盖本机 / 用本机覆盖云端”在账号页手动操作。

## 6. 免费额度

个人刷题用量很小：进度 JSON 只有几十 KB；图片每张通常 100–300 KB。Supabase 免费额度足够，长期不用项目可能休眠，去 Dashboard 恢复即可。

## 7. 注意

- 当前浏览器会绑定一个云账号，避免把 A 的进度传到 B。换账号前先导出数据并清空本地记录。
- 删除 Supabase Auth 用户需要在 Dashboard 操作；站点内提供退出登录，不直接删除账号。
- 不要关闭 RLS，也不要把 `service_role` key 放进前端。
