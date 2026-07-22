# PRD: DeepReader Web/PWA Reader Rebuild

## Problem Statement

DeepReader 当前 release 是一个 Tauri 桌面阅读器，已经具备 EPUB 阅读、AI 对话、标注、记忆、Obsidian 导出等基础能力，但继续沿 Tauri/Android native 路线会把项目拖回沉重的移动端开发环境、桌面打包、系统插件和本地进程管理里。

用户真正需要的是一个能恢复读书习惯的轻量阅读入口：在电脑上读 EPUB，画线后顺手问 AI，标注和记忆能沉淀；在 Android Chrome/PWA 上能继续同一本书，不需要反复导入文件。旧的桌面系统集成、Tauri Android native、Obsidian 直写和本地 llama.cpp 自动启动都不是第一版核心。

## Solution

新建 Web/PWA 主线，电脑和 Android Chrome/PWA 共用同一套阅读器、同步模型和 AI 交互。第一版只支持 EPUB，使用 Supabase 提供登录、数据库同步和私有 EPUB 存储；浏览器本机负责解析 EPUB、分块、调用 embedding API 并写入检索索引。

用户上传 EPUB 后，系统自动同步文件并完成整书 RAG 索引，把等待放在导入阶段。阅读时，用户可以选中文字并在浮动菜单里高亮、记笔记或 Ask AI。桌面端使用右侧 AI 侧栏，窄屏 Android PWA 使用 bottom sheet。已同步到本机的 EPUB 可以离线阅读；AI 问答、远程 RAG 和跨端同步需要联网。

第一版不买自定义域名，不做 Android native，不做端到端加密，不做多格式阅读，不做全自动记忆抽取。Obsidian 集成先通过 Markdown 下载解决，后续可由 Codex 自动化归档。

## User Stories

1. As a reader, I want to open DeepReader in a browser, so that I do not need to install a desktop app.
2. As a reader, I want to install the reader as a PWA on desktop, so that it feels easy to launch for daily reading.
3. As a reader, I want to use the same reader in Android Chrome, so that my phone can continue the same reading workflow.
4. As a reader, I want to sign in with email magic link or email code, so that my desktop and Android data can sync under one account.
5. As a reader, I want to upload an EPUB, so that it becomes available in my personal library.
6. As a reader, I want the EPUB file itself to sync, so that I do not need to manually copy books to every device.
7. As a reader, I want the system to reject unsupported formats clearly, so that I understand first version only supports EPUB.
8. As a reader, I want each book to show upload and indexing progress, so that I know when it is ready for AI questions.
9. As a reader, I want indexing to begin automatically after upload, so that I do not wait when asking questions later.
10. As a reader, I want indexing failures to be visible and retryable, so that a failed import does not silently disable RAG.
11. As a reader, I want indexing to resume after a tab closes, so that browser interruptions do not force me to start over.
12. As a reader, I want a small personal library limit to be acceptable, so that Supabase Free can support my use without a paid setup.
13. As a reader, I want to delete old books when storage is full, so that I can stay within free tier constraints.
14. As a reader, I want reading progress to sync, so that I can continue from the same place across desktop and Android.
15. As a reader, I want my local progress to be saved offline first, so that closing the browser does not lose my place.
16. As a reader, I want synced books to open offline after they have been cached locally, so that reading is not blocked by spotty network.
17. As a reader, I want AI features to degrade clearly when offline, so that I know why a question cannot be answered.
18. As a reader, I want to select text and immediately see a compact action menu, so that asking AI or highlighting does not interrupt reading.
19. As a reader, I want to highlight selected text, so that important passages remain visible.
20. As a reader, I want to attach a note to a highlight, so that my own thought stays with the passage.
21. As a reader, I want Ask AI to include the selected text automatically, so that I do not copy and paste manually.
22. As a reader, I want Ask AI to use current page context before RAG, so that simple questions are fast.
23. As a reader, I want Ask AI to use the whole-book index when needed, so that I can ask questions beyond the current page.
24. As a reader, I want the desktop AI chat to live in a right sidebar, so that reading and conversation can happen side by side.
25. As a mobile reader, I want the AI chat to open as a bottom sheet, so that it works on narrow screens without squeezing the book.
26. As a reader, I want one default conversation thread per book, so that the conversation remains continuous without thread management overhead.
27. As a reader, I want conversation history to sync with the book, so that I can see prior questions on another device.
28. As a reader, I want to manually save a memory with `/记住`, so that durable context is intentional.
29. As a reader, I want AI to suggest memories for confirmation, so that useful long-term context is easy to save without automatic pollution.
30. As a reader, I want memories to be injected into later AI answers, so that the assistant gradually understands my reading preferences.
31. As a reader, I want book-specific gist and concept memories to remain linked to the book, so that future questions can reuse them.
32. As a reader, I want cross-book memories not to be deleted automatically, so that deleting one book does not erase long-term concepts.
33. As a reader, I want Markdown export, so that I can move highlights and notes into Obsidian manually or through Codex automation.
34. As a reader, I want API keys to stay local to each device, so that the cloud database does not store my model credentials.
35. As a reader, I want to configure DeepSeek for chat, so that AI answers are affordable.
36. As a reader, I want to configure Gemini or another embedding provider, so that RAG indexing can use a low-cost embedding API.
37. As a reader, I want clear cost expectations, so that I know Supabase Free and low-cost AI APIs are enough for a small personal library.
38. As a reader, I want private EPUB storage with user isolation, so that other accounts cannot access my files.
39. As a reader, I want deleted books to remove cloud EPUB files and indexes, so that storage is reclaimed.
40. As a reader, I want deleted annotations and conversations to stay deleted across devices, so that sync does not resurrect old data.
41. As a reader, I want conflicting progress updates to resolve predictably, so that cross-device sync stays understandable.
42. As a developer, I want a new Web/PWA package rather than mutating the existing Tauri app, so that the old release remains a reference point.
43. As a developer, I want storage and AI access behind browser-friendly adapters, so that business components do not depend on Tauri APIs.
44. As a developer, I want the UI redesigned for web and mobile PWA, so that the product does not inherit desktop-shell assumptions.
45. As a developer, I want automated tests for upload, indexing, sync, offline reading, and deletion, so that agents cannot satisfy the PRD with static UI.

## Implementation Decisions

- Build a new Web/PWA app in the existing workspace rather than converting the current Tauri app in place.
- Keep the current release branch as the stable baseline and use the Web/PWA branch for the rebuild.
- Continue with React, Vite, Tailwind/Radix, TanStack Query, Zustand, AI SDK, and the existing foliate-based EPUB reading approach.
- Redesign the UI for browser/PWA and Android Chrome. Existing Tauri UI can inform behavior, but should not be copied visually.
- Support EPUB only in the first version.
- Use Supabase Auth with email magic link or email verification code. Do not implement Google/GitHub OAuth in the first version.
- Use Supabase database and private Storage for sync. EPUB files are uploaded to private per-user storage paths.
- Do not use end-to-end encryption for EPUB files in the first version. Rely on Supabase Auth, Row Level Security, private buckets, user path isolation, and explicit deletion behavior.
- Store DeepSeek, Gemini, and other provider API keys locally in each browser/device. Do not sync API keys to Supabase and do not proxy all AI requests through a project-owned paid backend.
- Uploading an EPUB automatically starts whole-book indexing.
- Run first-version indexing in the browser client. The client parses EPUB text, chunks content, calls the configured embedding API, and writes chunks/vectors back to Supabase.
- Indexing must be resumable. Persist job state so tab closure, refresh, API throttling, or network interruption can recover without starting from zero.
- Show indexing progress, error state, retry, pause/resume, and manual re-index actions.
- Prefer DeepSeek or another low-cost provider for chat. Prefer Gemini Embedding or another low-cost embedding API for RAG.
- Use one default conversation thread per book. Defer multiple threads or named topic threads.
- Use manual `/记住` plus AI-suggested memory confirmation. Do not automatically extract all memories from conversation.
- Use a desktop right sidebar for AI chat and a narrow-screen bottom sheet for Android/PWA.
- The selection floating menu must include highlight, note, and Ask AI actions.
- Markdown export is the first-version Obsidian path. Direct vault writing is deferred.
- Preserve basic offline reading. Cached EPUBs can open offline; progress and annotations are saved locally first and sync later.
- AI chat, remote RAG, embedding, and cross-device sync require network.
- Use `updated_at` last-write-wins for simple conflict resolution.
- Resolve reading progress by latest write.
- Treat annotations, notes, memories, and messages as record-level append/update operations, not whole-book replacement.
- Use `deleted_at` soft delete for sync-visible deletion.
- Deleting a book removes EPUB storage objects, local cache, RAG index, and the book record. Related annotations and conversations are soft-deleted. Cross-book memories are retained unless the user explicitly confirms memory deletion.
- Do not buy or require a custom domain for the first version. Use platform-provided HTTPS domains until the product proves useful.
- Do not build a dedicated backend indexing queue unless browser-side indexing proves too unreliable.

## Testing Decisions

- Tests should verify externally observable behavior: what the user can upload, read, sync, ask, export, delete, and recover from. They should not assert private implementation details except where schema/security rules are the behavior boundary.
- Use a high-level end-to-end seam for the core flow: sign in, upload EPUB, auto-index, read, highlight, ask AI, sync to another browser profile, open on narrow viewport, and delete the book.
- Use adapter-level tests for storage, sync, local cache, AI provider calls, and indexing job state. These are the main seams that prevent UI-only fake completion.
- Use a real Supabase test project or disposable Supabase environment for smoke verification of Auth, RLS, private Storage, upload/download, vector/chunk persistence, soft delete, and cross-device restore.
- Use representative small EPUB fixtures for automated tests and one larger image-heavy EPUB for manual boundary testing near file-size and indexing constraints.
- Use mocked provider responses for deterministic UI/indexing unit tests, and one live Gemini/embedding smoke test to verify real API shape and rate-limit handling.
- Verify API keys are not written to Supabase by inspecting persisted user records and network writes during provider configuration.
- Verify offline reading by caching a synced EPUB, disabling network, opening the book, changing progress, adding a highlight, restoring network, and confirming sync.
- Verify deletion by checking local UI state, Supabase database rows, Supabase Storage objects, RAG chunks/vectors, and retained cross-book memories.
- Verify Android compatibility through Chrome mobile emulation and a real Android Chrome/PWA manual run before calling the MVP complete.
- Verify responsive AI containers: desktop right sidebar and narrow-screen bottom sheet must both support selection-based Ask AI and ongoing conversation.
- Verify PRD anti-shortcut risks: no hardcoded demo book, no fake sync success, no static indexing progress, no skipped RLS, no cloud-stored API key, no unsupported format pretending to work.

## Out of Scope

- Android native app.
- Tauri mobile as a first-version delivery path.
- Continuing the old Tauri M1 sync branch as the main path.
- PDF, MOBI, CBZ, scanned books, comics, or image-heavy document workflows.
- Direct Obsidian vault writing.
- Local llama.cpp download/start/cleanup.
- End-to-end encryption for EPUB cloud storage.
- Custom domain purchase.
- Full multi-user SaaS billing, quota, or operations.
- Google/GitHub OAuth.
- Multiple chat threads per book.
- Fully automatic memory extraction.
- Dedicated backend indexing queue.
- Desktop system integrations such as file association, tray, native menus, global shortcuts, or native installer flows.

## Further Notes

- This PRD supersedes the old Tauri/mobile-oriented sync continuation direction for current work. The existing release remains the stable baseline, while Web/PWA becomes the new rebuild path.
- Existing Tauri code is valuable as reference material, especially the foliate-based reader, annotation behavior, prompt construction, AI tools, memory categories, and export behavior. It should not dictate the new UI or data layer.
- Cost assumptions are intentionally personal-use scale: roughly 10 EPUB files, Supabase Free where possible, no custom domain, and low-cost API providers.
- The highest product risk is not whether a browser can display EPUB; it is whether sync, indexing, and AI feel ready at the moment of reading. The upload-to-ready indexing flow is therefore part of MVP, not a later optimization.
