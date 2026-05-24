# M1 Auth Sync 验收记录

记录时间：2026-05-02

## 结论

这份记录是 2026-05-02 的历史验收记录，不能直接视为当前 M1 continuation 已完成。2026-05-23 接手后，当前验收口径已经调整：阅读进度同步和 EPUB 文件同步是必要范围，GitHub OAuth 延后，AI 对话历史同步延后。

## 已自动验证

- 前端新增测试通过：`sync-service.test.ts`、`encrypted-storage.test.ts`
- Rust 核心测试通过：加密、schema migration、soft delete、LWW bulk upsert
- Rust 新增删除测试通过：删除书籍会级联软删除 `books`、`book_status`、`book_notes`、`notes`、`reading_sessions`
- 前端完整构建通过：`pnpm --filter app build`
- Rust 编译检查通过：`cargo check --lib`
- 新增 TS 文件 Biome 检查通过
- 真实本地 SQLite 旧库缺失 `deleted_at` / `sync_status` 的问题已修复，并补充兜底迁移

## 已人工验收 / 视为通过

- 邮箱注册/登录可用
- Supabase 表已创建，Table Editor 可见新增同步表
- 本地旧书籍数据恢复可见
- 全量同步入口已提供
- 删除书籍会写入 tombstone，相关状态、批注、笔记和阅读会话会一起软删除
- 重新上传同一本书的软删除恢复逻辑已修复
- `book_notes` 云端表有数据，视为书摘/批注同步链路通过

## 未做 / 暂不阻塞

- 换端恢复仍未做真实 Supabase smoke test。
- Recovery Key 备份/恢复已接入模型配置，并在恢复前校验云端配置结构；仍需真实新设备/新 profile 验证。
- GitHub OAuth 已从 M1 支持路径延后，UI 标记为“稍后支持”。
- Supabase auth session 已改用本机加密的 immediate-write Tauri storage；仍需真实登录/退出 smoke 验证本地会话文件写入和删除行为。

## 已知限制

- EPUB 文件二进制云同步已接入 Supabase Storage 编排，但仍需小 EPUB 的上传、下载、打开阅读 smoke test。
- 当前文档里的 50MB 是单文件建议上限，不是完整容量方案。未来需要设计用户级总容量、清理策略、压缩/去重和付费/自托管配额。
- 本地 API Key 加密使用应用级 device key，尚未接入 OS keychain。
- Recovery Key 当前主要用于 provider 配置密文备份，不是完整设备密钥恢复体系。
- Supabase session、应用设置和 provider 配置的本地加密仍不是 OS keychain/Keystore 级托管。
