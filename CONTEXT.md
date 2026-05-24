# DeepReader Context

This file is the project glossary. It is not a PRD, implementation plan, or backlog.

## Product Name

- DeepReader: current repository and product name. The codebase, release docs, and recovered PRDs use this name.
- DeepReach: user-facing alias seen in conversation. Treat it as unresolved until the product name is explicitly renamed.

## Product Shape

- DeepReader is a local-first EPUB deep reading app with AI-assisted reading, notes, annotations, memory, skills, and Obsidian export.
- The long-term product goal is a unified desktop and Android reading experience where the user's reading state follows them across devices.
- The app should stay closer to a reading partner than a heavy autonomous tutoring system. It can compile and structure understanding after reading, but should not become a broad multi-agent learning platform by default.

## Core Terms

- Account Sync: account-scoped cloud synchronization for reading data across devices.
- Cloud Sync: the user-visible capability that uses Account Sync to move data between local SQLite and the cloud backend.
- Reading Data: books metadata, reading progress, notes, annotations, highlights, tags, skills, user memories, and reading sessions.
- AI Conversation History: chat threads and messages produced while reading. This is a separate sync decision because it can be large and may have different privacy and conflict rules.
- EPUB Binary Sync: synchronization of the actual book files. This is separate from books metadata and is mandatory for the current M1 continuation, with storage quota, deletion, and copyright implications still requiring explicit limits.
- Device Key: a local key used to encrypt local secrets on one device.
- Recovery Key: a user-held key used to restore or back up encrypted configuration across devices.
- Tombstone: a soft-delete record used so that a deleted local row is not resurrected by another device during sync.
- Mobile Layout: React layout and navigation optimized for small screens.
- Android Client: the packaged Tauri Android app, including Android build, file permissions, WebView behavior, and device integration.

## Milestones

- M1 Auth Sync: desktop account login, local schema changes, soft delete, incremental sync, encrypted local/provider storage, Supabase schema, and sync settings UI.
- M2a UI Reskin: desktop visual token refresh based on the DeepReader logo, without changing product structure or feature entry points.
- M2b Mobile Layout: mobile-specific layout shell that reuses business components where possible.
- M3 Android Port: Tauri Android migration and Android-specific file, touch, plugin, and sync integration work.

## Open Language Questions

- Whether DeepReach should replace DeepReader as the public product name is unresolved.

## Current Product Decisions

- Reading progress sync is mandatory for the desktop-phone unified experience.
- EPUB Binary Sync is mandatory for the next sync milestone. Metadata-only sync is not enough for the target experience.
- AI Conversation History sync is deferred for now. It should not block the next sync milestone unless explicitly re-scoped.
- Account-partitioned local libraries are not required for now. The app can assume a primary single-user flow, but account changes must still avoid accidental data corruption or skipped sync. First sync with a different cloud account must be explicit because the local library is shared.
- GitHub OAuth is not required for the first accepted login release. Email/password can be the supported M1 path.
- Model provider configuration and API keys should sync across devices, but the security model must be safe. If the current Recovery Key design is not safe enough, choose a safer design rather than silently syncing insecure secrets.
