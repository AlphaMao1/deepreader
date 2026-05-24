# M1 Auth Sync 手动验收清单

这份清单只包含必须由人确认的部分。当前 continuation 新增/调整过的测试和构建检查尚未全部执行；验证状态以 `docs/testing/local-verification-2026-05-23.md` 和 `docs/testing/m1-acceptance-audit-2026-05-23.md` 为准。

## 0. 打开新版 App

1. 打开 PowerShell。
2. 输入下面两行：

```powershell
cd D:\Project\deepreader-m1-auth-sync
pnpm --filter app tauri dev
```

3. 等待桌面 App 窗口自动弹出。第一次会比较慢。
4. 如果 PowerShell 停在编译日志里，不要关，它就是 App 的运行进程。

## 1. 找到新功能入口

1. 进入 App 后，打开设置。
2. 在设置左侧或顶部 tab 里找到：`账号同步`。
3. 看到下面几个区域即可：
   - `账号`
   - `同步`
   - `恢复密钥`
   - `Supabase`

通过标准：能看到 `账号同步` 页面，文案不是乱码，页面不会白屏。

## 2. 准备 Supabase 项目

这一步必须真人做，因为需要你的 Supabase 账号。

1. 打开 https://supabase.com。
2. 登录。
3. 创建一个新项目。
4. 进入项目后，打开左侧 `SQL Editor`。
5. 新建 query。
6. 打开这个文件，把里面 SQL 全部复制进去执行：

```text
D:\Project\deepreader-m1-auth-sync\packages\app\supabase\migrations\001_m1_auth_sync.sql
```

7. 执行成功后，打开项目设置里的 API 页面。
8. 复制两个值：
   - `Project URL`
   - `anon public key`

通过标准：SQL Editor 没有报错，并且你拿到了 URL 和 anon key。

## 3. 配置 App 连接 Supabase

1. 回到 App。
2. 打开 `设置 -> 账号同步 -> Supabase`。
3. 把 `Project URL` 粘贴到 `URL`。
4. 把 `anon public key` 粘贴到 `anon key`。
5. 不用点保存，输入后应该自动保存。
6. 关闭设置，再重新打开设置。

通过标准：刚才填的 URL 和 anon key 还在。

## 4. 注册和登录

1. 在 `账号同步 -> 账号` 区域输入一个邮箱。
2. 输入密码。
3. 点 `注册`。
4. 如果 Supabase 要求邮箱验证，去邮箱里点验证链接，然后回 App 点 `登录`。
5. 登录成功后，页面应显示你的邮箱。

通过标准：
- 能注册或登录。
- 登录后能看到当前账号。
- `云同步` 开关自动开启，或可以手动开启。
- 如果 Supabase 项目要求邮箱验证，注册后先完成邮箱验证再登录；未返回 session 的注册结果不应显示为已登录，也不应自动开启云同步。

## 5. 手动同步一条数据

1. 在 App 里新增一本书，或新增一条笔记、标签、技能、记忆。
2. 回到 `设置 -> 账号同步`。
3. 点 `立即同步`。
4. 打开 Supabase 左侧 `Table Editor`。
5. 查看对应表里是否出现数据：
   - 书籍：`books`
   - 阅读状态：`book_status`
   - 书摘/批注：`book_notes`
   - 笔记：`notes`
   - 标签：`tags`
   - 技能：`skills`
   - 记忆：`user_memories`
   - 阅读会话：`reading_sessions`

通过标准：Supabase 表里能看到你刚创建的数据，并且 `user_id` 是你的账号。

## 6. 删除同步

1. 在 App 里删除刚才创建的一条数据。
2. 回到 `设置 -> 账号同步`。
3. 点 `立即同步`。
4. 打开 Supabase 对应表。
5. 找到那条记录。

通过标准：
- 记录没有被物理删除。
- 它的 `deleted_at` 有值。
- App 页面里看不到这条已删除数据。

## 7. 换端恢复

这一步最好在另一台电脑做。如果没有另一台电脑，可以先跳过。

1. 在另一台电脑拉取这个分支或打开同一份 worktree。
2. 用同一个 Supabase URL 和 anon key。
3. 用同一个邮箱登录。
4. 点 `立即同步`。

通过标准：第一台电脑创建的数据能出现在第二台电脑。

## 7.1 切换云账号保护

这一步用于确认共享本地资料库不会静默同步到另一个云账号。

1. 在当前本机先用账号 A 完成一次同步。
2. 退出登录。
3. 登录账号 B。
4. 等待一个后台同步间隔，或导入一本书。
5. 回到 `设置 -> 账号同步`。

通过标准：
- 后台同步不会静默把本地资料库推到账号 B。
- 导入后的自动同步会提示需要先手动确认。
- 点击 `立即同步` 或 `全量同步` 时，会出现账号确认弹窗。
- 只有确认后，账号 B 才会进入同步。

## 8. Recovery Key 备份恢复

1. 登录状态下，打开 `账号同步 -> 恢复密钥`。
2. 输入注册时 toast 弹出的 Recovery Key。
3. 确认已配置至少一个聊天模型供应商；如需验证远程 embeddings，也配置一个远程向量模型及 API Key。
4. 点 `备份模型配置`。
5. 到 Supabase 的 `user_configs` 表里看是否出现一条 `key = model-provider` 的记录。
6. 记录里的 `encrypted_value` 不应该是可读 provider/vector model JSON。

通过标准：能备份，云端看到的是密文；用正确 Recovery Key 在新 profile 恢复后，模型供应商、选中模型、记忆抽取模型和远程 embeddings 配置可恢复。

## 9. 明确暂不通过的 PRD 项

下面几项当前不能按“已完成”验收：

- EPUB 文件实际上传/下载：代码已接入 Supabase Storage，但必须用小 EPUB 做真实上传、下载、打开阅读 smoke test。
- OS keychain 级别密钥保护：目前是本地 device key 加密，不是系统钥匙串。
- GitHub OAuth：M1 已延后，入口应显示“稍后支持”，不能按完成验收。
- Supabase migration：需要你在真实 Supabase 项目执行后才能确认线上可用。
- Android 检查：前端、Rust、桌面 Tauri 构建已自动验证；Android Rust target 预检已推进到缺 Android SDK/NDK/JDK 的环境门槛。继续 Android build 前需要先安装并接受 Android SDK 许可。

## 10. 记录问题的格式

如果某一步失败，直接按这个格式发给 Codex：

```text
失败步骤：
我点了什么：
我看到什么：
我原本期待看到什么：
截图或报错：
```
