# PRD M1: 账号登录 + 云同步（桌面端）v2

**Milestone**: M1
**Priority**: P0
**Label**: `needs-triage`
**Estimated Effort**: 14-18 人天（上调，因为包含 Rust 层 schema migration 和加密方案）

---

## Problem Statement

DeepReader 当前所有数据（书籍、阅读进度、笔记、标注、API Key、记忆系统）仅存在于本地 SQLite 数据库。用户在多设备间无法共享任何数据，每次换设备都需要重新导入书籍、重新配置 API Key、丢失所有阅读进度和笔记。这是实现 M3（Android 客户端）的前置依赖。

## Solution

引入 Supabase 作为后端服务（官方免费托管），实现：
1. Email + 密码登录（可选 GitHub OAuth）
2. 书籍元数据、阅读进度、笔记/标注/高亮、记忆系统、技能库、配置的双向增量同步
3. API Key 通过设备密钥 + 云端 wrapped key 方案加密同步
4. EPUB 文件同步为**可选功能**（默认关闭），加配额提示
5. Last-Write-Wins 冲突解决策略
6. 本地 SQLite schema migration（新增 `deleted_at`, `sync_status` 列）

不同步：AI 对话历史（数据量大，设备独立维护）。

## User Stories

1. As a reader, I want to create an account with email and password, so that my data is tied to my identity and accessible from any device.
2. As a reader, I want to optionally sign in with GitHub, so that I don't need to remember another password.
3. As a reader, I want my reading progress (current location, percentage) to sync across devices, so that I can continue reading exactly where I left off.
4. As a reader, I want my highlights, annotations, and bookmarks to sync, so that I don't lose my notes when switching devices.
5. As a reader, I want my API Keys (OpenAI, Anthropic, DeepSeek, etc.) to sync securely across devices without re-entering them.
6. As a reader, I want my model provider configurations to sync, so that my AI assistant works identically on all devices.
7. As a reader, I want my memory system entries to sync, so that the AI retains long-term context regardless of which device I'm using.
8. As a reader, I want my skill library to sync, so that custom skills are available everywhere.
9. As a reader, I want to see sync status (last synced time, sync in progress), so that I know my data is up to date.
10. As a reader, I want the app to work offline and sync when connectivity is restored, so that I can read without internet.
11. As a reader, I want to log out and have my cloud data remain intact, so that I can log back in and restore everything.
12. As a reader, I want my existing local data to be migrated to the cloud on first login, so that I don't lose anything I've already created.
13. As an open-source user, I want to configure my own Supabase instance URL, so that I can self-host the backend.
14. As a reader, I want to use the app without logging in (local-only mode), so that the login requirement doesn't block basic usage.
15. As a reader, I want my reading session history to sync, so that reading statistics are consistent across devices.
16. As a reader, I want my tags and book groupings to sync, so that my library organization is preserved.
17. As a reader, I want to optionally enable EPUB file cloud sync, with clear indication of storage usage and limits.
18. As a reader, I want a warning when my cloud storage is approaching the free tier limit (1GB).
19. As a reader, I want my Obsidian vault path configuration to remain device-local (not synced), since vault paths differ per machine.
20. As a reader, I want my API Keys encrypted at rest on disk, not just in transit — even when not logged in.
21. As a reader, I want to delete a book on one device and have the deletion propagate to other devices on next sync.
22. As a reader, I want to be able to recover my synced API Keys when I log in on a new device, even if I used GitHub OAuth (no password).

## Implementation Decisions

### Backend: Supabase Free Tier
- Auth: Supabase Auth with Email/Password + optional GitHub OAuth provider
- Database: Supabase PostgreSQL
- Storage: Supabase Storage bucket for EPUB files (optional, user-activated)
- RLS: Row Level Security policies on all tables enforcing `auth.uid() = user_id`
- No real-time subscription; polling-based sync is sufficient

### API Key Encryption (revised — addresses OAuth and password-reset scenarios)

> [!IMPORTANT]
> 原方案用用户密码派生加密密钥，但 GitHub OAuth 没有应用可见密码，密码重置也会导致无法解密。

**新方案：设备密钥 + 云端 wrapped key**

1. 每台设备首次登录时生成一个随机 256-bit **设备密钥 (Device Key)**，存储在本地（Tauri app data 目录，不同步）
2. 用设备密钥通过 AES-256-GCM 加密所有 API Key
3. 加密后的 ciphertext 上传到 Supabase `user_configs` 表
4. 新设备登录时：
   - 如果用户有密码登录：用密码派生临时密钥解密一个"主恢复密钥 (Recovery Key)"，再用 Recovery Key 解密 API Keys
   - 如果用户用 OAuth 登录：首次需要手动输入一次 Recovery Key（注册时展示给用户并提示保存）
5. Recovery Key 在首次注册时随机生成，展示一次让用户保存（类似 2FA 恢复码）

**本地 API Key 加密**：
- `provider-store.ts` 当前将 API Key 以明文 JSON 持久化到 `appConfigDir/modelProvider.json`
- 改为本地也用设备密钥加密后再写入文件
- 设备密钥存储在操作系统 keychain/credential store（桌面端），或 Android Keystore（移动端）

### 本地 SQLite Schema Migration (新增)

> [!IMPORTANT]
> 当前所有表没有 `deleted_at` 列，删除是硬删除（`DELETE FROM`）。同步需要 tombstone 机制。

**Migration v2 — 所有可同步表新增列：**

```sql
-- 为所有可同步表添加 soft delete 和同步状态追踪
ALTER TABLE books ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE books ADD COLUMN sync_status TEXT DEFAULT 'pending'; -- pending|synced|conflict

ALTER TABLE book_status ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE book_status ADD COLUMN sync_status TEXT DEFAULT 'pending';

ALTER TABLE book_notes ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE book_notes ADD COLUMN sync_status TEXT DEFAULT 'pending';

ALTER TABLE notes ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE notes ADD COLUMN sync_status TEXT DEFAULT 'pending';

ALTER TABLE tags ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE tags ADD COLUMN sync_status TEXT DEFAULT 'pending';

ALTER TABLE skills ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE skills ADD COLUMN sync_status TEXT DEFAULT 'pending';

ALTER TABLE user_memories ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE user_memories ADD COLUMN sync_status TEXT DEFAULT 'pending';

ALTER TABLE reading_sessions ADD COLUMN deleted_at INTEGER DEFAULT NULL;
ALTER TABLE reading_sessions ADD COLUMN sync_status TEXT DEFAULT 'pending';
```

**Rust 层改动（不可避免）：**
- 所有 `DELETE FROM` 命令改为 `UPDATE ... SET deleted_at = ?`（软删除）
- 所有 `SELECT` 查询加 `WHERE deleted_at IS NULL`（过滤已删除记录）
- 新增批量接口：
  - `get_changed_since(table, timestamp)` — 返回 `updated_at > timestamp` 的行
  - `bulk_upsert(table, rows)` — 批量插入/更新（同步引擎用）
  - `get_tombstones_since(timestamp)` — 返回 `deleted_at > timestamp` 的行
- 新增 schema version 管理（`database.rs` 增加 migration runner）

### 同步引擎

**架构层：** TypeScript 层负责编排逻辑（调度、冲突判断、Supabase API 调用）；Rust 层通过新增批量接口提供数据读写。同步引擎不直接操作 SQLite，而是通过 Tauri `invoke` 调用 Rust 命令。

- **Trigger**: App 启动 + 周期性（默认 30s）+ 用户手动触发
- **流程**:
  1. 调用 Rust `get_changed_since(last_sync_timestamp)` 获取本地变更
  2. 调用 Supabase API 获取远端变更（`updated_at > last_sync_timestamp`）
  3. LWW 比较 `updated_at`，决定哪边覆盖
  4. 本地变更 → 上传到 Supabase（含 tombstones）
  5. 远端变更 → 调用 Rust `bulk_upsert` 写入本地
  6. 更新 `last_sync_timestamp`
  7. 将所有已同步行的 `sync_status` 标记为 `synced`
- **离线**: 所有操作先写本地 SQLite（`sync_status = 'pending'`），恢复网络后队列式上传

### Supabase PostgreSQL Schema

与本地 SQLite 结构对齐，但增加 `user_id` 列 + RLS：

- `books` — 含 `user_id`, `deleted_at`
- `book_status` — 含 `user_id`, `deleted_at`
- `book_notes` — 含 `user_id`, `deleted_at`
- `notes` — 含 `user_id`, `deleted_at`
- `tags` — 含 `user_id`, `deleted_at`
- `skills` — 含 `user_id`, `deleted_at`
- `user_memories` — 含 `user_id`, `deleted_at`
- `reading_sessions` — 含 `user_id`, `deleted_at`
- `user_configs` — `user_id`, `key`, `encrypted_value`, `iv`, `updated_at`
- `user_devices` — `user_id`, `device_id`, `wrapped_device_key`, `created_at`

RLS policy: `auth.uid() = user_id` on all tables.

### EPUB 文件同步（可选功能）

> [!WARNING]
> Supabase Free Tier: 1GB Storage, 5GB Egress/月。EPUB 库容易超限。

- **默认关闭**。用户在设置中手动开启"书籍文件云同步"
- 开启后：导入书籍时上传到 Supabase Storage `{user_id}/{book_hash}.epub`
- 其他设备按需下载（打开书时才下载，不预下载全部）
- UI 显示当前云存储用量和免费限额
- 单文件大小限制 50MB（超过提示不上传）
- 超额时弹窗：建议自托管 Supabase 或扩容

### Auth Flow
- Login/register 作为可选功能，不阻断 app 使用
- JWT 通过 Zustand persist 存储
- Token 自动刷新（Supabase JS SDK）
- 首次登录触发本地→云端一次性迁移
- 注册时显示 Recovery Key，提示用户保存

### 配置
- Supabase URL 和 anon key 编译时嵌入默认值
- 设置 → 高级 → 自定义 Supabase 实例（开源用户）

### 不同步的数据
- AI 对话历史（`threads` 表）——设备独立
- 本地 Embedding 模型文件——太大
- Obsidian vault 路径——设备相关
- 窗口位置/大小——设备相关

## Testing Decisions

### 测试原则
验证外部行为（输入→输出），不验证内部实现。

### 需要测试的模块：

1. **同步引擎**（最关键）：
   - 本地新增记录 → 上传成功
   - 远端新增记录 → 下载到本地
   - 本地更新比远端新 → 本地数据保留
   - 远端更新比本地新 → 远端数据覆盖本地
   - 本地软删除 → tombstone 传播到远端
   - 远端 tombstone → 本地软删除
   - 离线编辑 → 恢复网络后按队列上传
   - 换账号 → 本地数据隔离

2. **API Key 加密**（安全关键）：
   - 设备密钥加密 → 解密 → 明文匹配
   - 错误密钥解密 → 失败并提示
   - Recovery Key 流程：生成 → 保存 → 新设备恢复

3. **Schema Migration**：
   - 旧版本 DB → 升级后 `deleted_at`/`sync_status` 列存在
   - 软删除后数据不在常规查询中出现
   - 批量 upsert 正确处理冲突

4. **Auth Service**：
   - 有效凭据 → 返回 session
   - Token 过期 → 自动刷新
   - 无网络 → 离线模式正常

### 不自动化测试：
- UI 组件（登录表单、同步状态指示器）
- Supabase RLS 策略（通过 Dashboard 验证）

## Out of Scope

- AI 对话历史同步
- 实时协作编辑
- 付费计划 / 配额强制执行
- 推送通知
- 管理面板
- OAuth 提供商：除 GitHub 外不做（无 WeChat/Google/Apple）
- Android 特定的同步适配（延迟到 M3）
- EPUB 文件同步的自动启用（必须用户手动开启）

## Further Notes

- `types/records.ts` 中的 `DBBook/DBBookConfig/DBBookNote` 已有 `user_id` 字段（SageRead 遗留），与 Supabase schema 对齐
- `settings.ts` 中已有 `keepLogin`, `autoUpload`, `lastSyncedAt*` 字段，将被激活
- `jwt-decode` 已是现有依赖
- 需新增依赖：`@supabase/supabase-js`
- `provider-store.ts` 当前通过 `tauriStorage` 将 `apiKey` 明文写入 `appConfigDir/modelProvider.json`——本地加密优先级高，即使不同步也应该修
- Rust 层改动不可避免：7 张表的 DELETE 改 soft delete + 新增 3 个批量接口 + migration runner。估算 3-4 天
- 同步引擎在 TS 层编排，但通过 Rust `invoke` 批量接口操作数据，不直接用 `tauri-plugin-sql`
