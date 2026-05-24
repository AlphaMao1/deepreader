# M1 Auth Sync 使用说明

M1 Auth Sync 为 DeepReader 提供 Supabase 账号登录和跨设备数据同步。当前同步范围是书籍元数据、EPUB 文件、阅读状态、书摘/批注、笔记、标签、技能库、用户记忆和阅读会话。

## 准备 Supabase

1. 在 Supabase 创建项目。
2. 打开项目的 SQL Editor。
3. 执行 `packages/app/supabase/migrations/001_m1_auth_sync.sql`。
4. 打开 Project Settings，找到项目的 URL 和 anon public key。
5. 不要把 service_role key 放进客户端。

## 配置登录

1. 启动 App。
2. 打开设置。
3. 进入“账号同步”。
4. 在 Supabase 区域填写：
   - URL：`https://<project-ref>.supabase.co`
   - anon key：Supabase 的 anon public key / publishable key
5. 回到账号区域，输入邮箱和密码。
6. 点击注册或登录。

注册成功后 App 会生成 Recovery Key。请用户自行保存，后续恢复加密配置时需要它。如果 Supabase 项目开启了邮箱验证，注册后需要先完成邮箱验证，再回到 App 登录；未拿到 Supabase session 前 App 不会把注册态视为已登录，也不会自动开启云同步。

## GitHub 登录

GitHub OAuth 暂不属于 M1 可验收登录路径。当前 App 只把邮箱/密码作为支持的登录方式，GitHub 入口会显示为“稍后支持”。

后续如果恢复 GitHub OAuth，需要补齐 Tauri 桌面回调或 deep-link 流程，确保外部浏览器完成授权后能把 Supabase session 带回 App。

## 同步数据

登录后有两个同步按钮：

- 立即同步：增量同步，只同步上次同步后的变更。
- 全量同步：从时间戳 0 重新扫描本地和远端数据，适合第一次联调、旧本地数据没有进入云端、或修复同步时间戳后重新推送。

首次启用云同步时建议点击“全量同步”。

## 切换云账号

当前 M1 不实现按账号隔离的本地资料库；同一台设备上的本地书库仍是一份共享资料库。

如果本机曾经同步过其他云账号，第一次用新云账号同步时，App 会要求用户显式确认。本地资料库会参与合并并可能上传到当前云账号；如果需要空资料库，应先切换到新的本地数据目录或应用配置。导入 EPUB 后的自动同步和后台定时同步也会在这种情况下跳过，直到用户在设置中手动确认同步。

## 删除和重新上传书籍

删除书籍采用软删除：

- 本地记录会设置 `deleted_at`。
- 相关的阅读状态、批注、笔记和阅读会话也会一起设置 `deleted_at`。
- 云端同步后会保留 tombstone，避免另一台设备把旧数据复活。
- 本地书籍文件不会在删除时立刻物理移除，避免 tombstone 尚未同步时造成记录和文件不一致。

如果同一本书被删除后再次上传，App 会恢复原有记录，清空 `deleted_at`，并把 `sync_status` 标记为 `pending`，随后可通过同步推到云端。

## 本地会话与设置加密

App 会把 Supabase 登录会话、应用设置、模型供应商配置、远程 embeddings 配置和 TTS 配置写入本机 Tauri 配置目录。桌面端会使用本机 Device Key 加密这些本地持久化内容；Supabase 登录会话使用立即写入的加密存储，退出登录时会删除对应的本地会话文件。

这只能降低本机明文泄露风险，不等同于 OS keychain/Keystore。OS 级密钥托管仍是后续安全加固项。

## Recovery Key 配置备份

账号同步页面支持用 Recovery Key 加密备份模型配置：

1. 登录账号。
2. 输入 Recovery Key。
3. 点击“备份模型配置”。
4. 云端 `user_configs` 表会保存密文。

备份范围包括聊天/记忆抽取模型供应商配置、对应 API Key、远程 embeddings 模型配置和远程 embeddings API Key。恢复时输入同一个 Recovery Key，然后点击“恢复模型配置”。恢复前会校验云端密文解出的配置结构；如果供应商、模型列表、选中模型或向量模型结构无效，不会写入本地配置。

Recovery Key 只用于跨设备恢复模型供应商/远程 embeddings 配置和 API Key 密文备份，不是完整设备恢复机制。Device Key 是本机用于加密本地设置文件的设备级密钥，两者职责不同。边界说明见 `docs/adr/001-secret-storage-and-recovery.md`。

## 容量说明

启用“云同步”后，导入书籍成功会触发一次 best-effort 增量同步。同步书籍元数据不依赖“EPUB 文件云同步”开关；只有启用“EPUB 文件云同步”后，才会把本地 EPUB 上传到 Supabase Storage 的 `epubs/{userId}/{bookId}/...` 路径。后续手动/定时同步也会补传。如果启用了 EPUB 文件云同步但本地 active EPUB 文件已经缺失，本轮同步会失败并阻止对应 `books` metadata 发布，避免云端出现没有二进制文件的可恢复书籍记录。新设备或新本地资料库在同步到书籍元数据后，会下载缺失的 EPUB 文件到本地书籍目录，并把恢复后的本地 `file_path` 收束为应用数据目录下的安全相对路径。

当前的 50MB 是 EPUB 单文件建议上限，不是完整容量方案。后续仍需要补充：

- 用户级总容量配额
- 大文件分片或压缩策略
- 文件去重
- 已删除文件的清理策略
- 自托管和付费部署的不同容量策略

## 当前限制

- 本地 API Key 使用应用级 device key 加密，尚未接入 OS keychain。
- EPUB Storage、RLS、跨设备恢复仍需要真实 Supabase 项目手动 smoke test。
- GitHub OAuth 已从 M1 支持路径延后。
