use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{Row, Sqlite, SqlitePool};
use tauri::{AppHandle, Manager};

#[derive(Clone, Copy)]
struct SyncTable {
    name: &'static str,
    primary_key: &'static str,
    columns: &'static [&'static str],
}

const BOOKS_COLUMNS: &[&str] = &[
    "id",
    "title",
    "author",
    "format",
    "file_path",
    "cover_path",
    "file_size",
    "language",
    "tags",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const BOOK_STATUS_COLUMNS: &[&str] = &[
    "book_id",
    "status",
    "progress_current",
    "progress_total",
    "location",
    "last_read_at",
    "started_at",
    "completed_at",
    "metadata",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const READING_SESSIONS_COLUMNS: &[&str] = &[
    "id",
    "book_id",
    "started_at",
    "ended_at",
    "duration_seconds",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const TAGS_COLUMNS: &[&str] = &[
    "id",
    "name",
    "color",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const NOTES_COLUMNS: &[&str] = &[
    "id",
    "book_id",
    "book_meta",
    "title",
    "content",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const BOOK_NOTES_COLUMNS: &[&str] = &[
    "id",
    "book_id",
    "type",
    "cfi",
    "text",
    "style",
    "color",
    "note",
    "context_before",
    "context_after",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const SKILLS_COLUMNS: &[&str] = &[
    "id",
    "name",
    "content",
    "description",
    "is_active",
    "is_system",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const USER_MEMORIES_COLUMNS: &[&str] = &[
    "id",
    "category",
    "key",
    "value",
    "source_type",
    "source_id",
    "book_id",
    "related_memory_ids",
    "confidence",
    "access_count",
    "last_accessed_at",
    "created_at",
    "updated_at",
    "deleted_at",
    "sync_status",
];

const SYNC_TABLES: &[SyncTable] = &[
    SyncTable {
        name: "books",
        primary_key: "id",
        columns: BOOKS_COLUMNS,
    },
    SyncTable {
        name: "book_status",
        primary_key: "book_id",
        columns: BOOK_STATUS_COLUMNS,
    },
    SyncTable {
        name: "book_notes",
        primary_key: "id",
        columns: BOOK_NOTES_COLUMNS,
    },
    SyncTable {
        name: "notes",
        primary_key: "id",
        columns: NOTES_COLUMNS,
    },
    SyncTable {
        name: "tags",
        primary_key: "id",
        columns: TAGS_COLUMNS,
    },
    SyncTable {
        name: "skills",
        primary_key: "id",
        columns: SKILLS_COLUMNS,
    },
    SyncTable {
        name: "user_memories",
        primary_key: "id",
        columns: USER_MEMORIES_COLUMNS,
    },
    SyncTable {
        name: "reading_sessions",
        primary_key: "id",
        columns: READING_SESSIONS_COLUMNS,
    },
];

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncTableRow {
    pub table: String,
    pub row: Value,
}

pub async fn run_schema_migrations(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    for table in SYNC_TABLES {
        if !table_exists(pool, table.name).await? {
            continue;
        }

        add_column_if_missing(pool, table.name, "deleted_at", "INTEGER DEFAULT NULL").await?;
        add_column_if_missing(pool, table.name, "sync_status", "TEXT DEFAULT 'pending'").await?;

        let deleted_index = format!("idx_{}_deleted_at", table.name);
        let status_index = format!("idx_{}_sync_status", table.name);
        sqlx::query(&format!(
            "CREATE INDEX IF NOT EXISTS {} ON {} ({})",
            quote_identifier(&deleted_index),
            quote_identifier(table.name),
            quote_identifier("deleted_at")
        ))
        .execute(pool)
        .await?;
        sqlx::query(&format!(
            "CREATE INDEX IF NOT EXISTS {} ON {} ({})",
            quote_identifier(&status_index),
            quote_identifier(table.name),
            quote_identifier("sync_status")
        ))
        .execute(pool)
        .await?;
    }

    migrate_active_name_uniqueness(pool).await?;

    Ok(())
}

async fn migrate_active_name_uniqueness(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    migrate_name_unique_table(
        pool,
        "tags",
        &[
            "\"id\" TEXT PRIMARY KEY NOT NULL",
            "\"name\" TEXT NOT NULL",
            "\"color\" TEXT",
            "\"created_at\" INTEGER NOT NULL",
            "\"updated_at\" INTEGER NOT NULL",
            "\"deleted_at\" INTEGER DEFAULT NULL",
            "\"sync_status\" TEXT DEFAULT 'pending'",
        ],
        &[
            "CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_active_name_unique ON tags(name) WHERE deleted_at IS NULL",
            "CREATE INDEX IF NOT EXISTS idx_tags_updated_at ON tags(updated_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at)",
            "CREATE INDEX IF NOT EXISTS idx_tags_sync_status ON tags(sync_status)",
        ],
    )
    .await?;

    migrate_name_unique_table(
        pool,
        "skills",
        &[
            "\"id\" TEXT PRIMARY KEY NOT NULL",
            "\"name\" TEXT NOT NULL",
            "\"content\" TEXT NOT NULL",
            "\"description\" TEXT NOT NULL DEFAULT ''",
            "\"is_active\" INTEGER DEFAULT 1",
            "\"is_system\" INTEGER DEFAULT 0",
            "\"created_at\" INTEGER NOT NULL",
            "\"updated_at\" INTEGER NOT NULL",
            "\"deleted_at\" INTEGER DEFAULT NULL",
            "\"sync_status\" TEXT DEFAULT 'pending'",
        ],
        &[
            "CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name)",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_skills_active_name_unique ON skills(name) WHERE deleted_at IS NULL",
            "CREATE INDEX IF NOT EXISTS idx_skills_is_active ON skills(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_skills_updated_at ON skills(updated_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_skills_deleted_at ON skills(deleted_at)",
            "CREATE INDEX IF NOT EXISTS idx_skills_sync_status ON skills(sync_status)",
        ],
    )
    .await?;

    Ok(())
}

async fn migrate_name_unique_table(
    pool: &SqlitePool,
    table_name: &str,
    column_definitions: &[&str],
    indexes: &[&str],
) -> Result<(), sqlx::Error> {
    if !table_exists(pool, table_name).await? {
        return Ok(());
    }

    let table_sql = sqlx::query_scalar::<_, String>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .bind(table_name)
    .fetch_optional(pool)
    .await?
    .unwrap_or_default();

    let has_legacy_name_unique = table_sql.to_ascii_uppercase().contains("NAME TEXT NOT NULL UNIQUE");
    if has_legacy_name_unique {
        let table = table_meta(table_name).expect("active-name migration only targets sync tables");
        let temp_table = format!("__{}_active_name_migration", table_name);
        let quoted_columns = table
            .columns
            .iter()
            .map(|column| quote_identifier(column))
            .collect::<Vec<_>>()
            .join(", ");

        let mut tx = pool.begin().await?;
        sqlx::query(&format!("DROP TABLE IF EXISTS {}", quote_identifier(&temp_table)))
            .execute(&mut *tx)
            .await?;
        sqlx::query(&format!(
            "CREATE TABLE {} ({})",
            quote_identifier(&temp_table),
            column_definitions.join(", ")
        ))
        .execute(&mut *tx)
        .await?;
        sqlx::query(&format!(
            "INSERT INTO {} ({}) SELECT {} FROM {}",
            quote_identifier(&temp_table),
            quoted_columns,
            quoted_columns,
            quote_identifier(table_name)
        ))
        .execute(&mut *tx)
        .await?;
        sqlx::query(&format!("DROP TABLE {}", quote_identifier(table_name)))
            .execute(&mut *tx)
            .await?;
        sqlx::query(&format!(
            "ALTER TABLE {} RENAME TO {}",
            quote_identifier(&temp_table),
            quote_identifier(table_name)
        ))
        .execute(&mut *tx)
        .await?;
        tx.commit().await?;
    }

    for index in indexes {
        sqlx::query(index).execute(pool).await?;
    }

    Ok(())
}

pub async fn get_changed_since_rows(
    pool: &SqlitePool,
    table_name: &str,
    timestamp: i64,
) -> Result<Vec<Value>, String> {
    let table = table_meta(table_name)?;
    let query = format!(
        "SELECT {} AS row_json FROM {} WHERE ({} > ? OR {} = 'pending') AND {} IS NULL ORDER BY {} ASC",
        json_object_expression(table),
        quote_identifier(table.name),
        quote_identifier("updated_at"),
        quote_identifier("sync_status"),
        quote_identifier("deleted_at"),
        quote_identifier("updated_at")
    );

    let rows = sqlx::query(&query)
        .bind(timestamp)
        .fetch_all(pool)
        .await
        .map_err(|e| format!("查询本地变更失败: {}", e))?;

    rows.into_iter()
        .map(|row| {
            let row_json: String = row
                .try_get("row_json")
                .map_err(|e| format!("读取变更行失败: {}", e))?;
            serde_json::from_str(&row_json).map_err(|e| format!("解析变更行失败: {}", e))
        })
        .collect()
}

pub async fn get_tombstones_since_rows(
    pool: &SqlitePool,
    timestamp: i64,
) -> Result<Vec<SyncTableRow>, String> {
    let mut tombstones = Vec::new();

    for table in SYNC_TABLES {
        if !table_exists(pool, table.name)
            .await
            .map_err(|e| format!("检查表失败: {}", e))?
        {
            continue;
        }

        let query = format!(
            "SELECT {} AS row_json FROM {} WHERE {} IS NOT NULL AND ({} > ? OR {} = 'pending') ORDER BY {} ASC",
            json_object_expression(table),
            quote_identifier(table.name),
            quote_identifier("deleted_at"),
            quote_identifier("deleted_at"),
            quote_identifier("sync_status"),
            quote_identifier("deleted_at")
        );

        let rows = sqlx::query(&query)
            .bind(timestamp)
            .fetch_all(pool)
            .await
            .map_err(|e| format!("查询 tombstone 失败: {}", e))?;

        for row in rows {
            let row_json: String = row
                .try_get("row_json")
                .map_err(|e| format!("读取 tombstone 失败: {}", e))?;
            tombstones.push(SyncTableRow {
                table: table.name.to_string(),
                row: serde_json::from_str(&row_json)
                    .map_err(|e| format!("解析 tombstone 失败: {}", e))?,
            });
        }
    }

    Ok(tombstones)
}

pub async fn soft_delete_row(
    pool: &SqlitePool,
    table_name: &str,
    id: &str,
    timestamp: i64,
) -> Result<(), String> {
    let table = table_meta(table_name)?;
    let query = format!(
        "UPDATE {} SET {} = ?, {} = ?, {} = 'pending' WHERE {} = ? AND {} IS NULL",
        quote_identifier(table.name),
        quote_identifier("deleted_at"),
        quote_identifier("updated_at"),
        quote_identifier("sync_status"),
        quote_identifier(table.primary_key),
        quote_identifier("deleted_at")
    );

    let result = sqlx::query(&query)
        .bind(timestamp)
        .bind(timestamp)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| format!("软删除失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("记录不存在或已删除".to_string());
    }

    Ok(())
}

pub async fn bulk_upsert_rows(
    pool: &SqlitePool,
    table_name: &str,
    rows: Vec<Value>,
) -> Result<u64, String> {
    let table = table_meta(table_name)?;
    let mut affected = 0;
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("开启批量写入事务失败: {}", e))?;

    for row in rows {
        let mut object = row
            .as_object()
            .cloned()
            .ok_or_else(|| "批量写入行必须是对象".to_string())?;

        if !object.contains_key(table.primary_key) {
            return Err(format!("批量写入缺少主键字段 {}", table.primary_key));
        }
        if !object.contains_key("updated_at") {
            return Err("批量写入缺少 updated_at 字段".to_string());
        }
        object
            .entry("sync_status".to_string())
            .or_insert_with(|| Value::String("synced".to_string()));

        let columns: Vec<&str> = table
            .columns
            .iter()
            .copied()
            .filter(|column| object.contains_key(*column))
            .collect();
        let quoted_columns: Vec<String> = columns.iter().map(|column| quote_identifier(column)).collect();
        let update_columns: Vec<String> = columns
            .iter()
            .copied()
            .filter(|column| *column != table.primary_key)
            .map(|column| {
                format!(
                    "{} = excluded.{}",
                    quote_identifier(column),
                    quote_identifier(column)
                )
            })
            .collect();

        let mut query = sqlx::QueryBuilder::<Sqlite>::new(format!(
            "INSERT INTO {} ({}) VALUES (",
            quote_identifier(table.name),
            quoted_columns.join(", ")
        ));

        {
            let mut separated = query.separated(", ");
            for column in &columns {
                let value = object
                    .get(*column)
                    .expect("column was selected from object keys");
                match value {
                    Value::Null => {
                        separated.push_bind(Option::<String>::None);
                    }
                    Value::Bool(value) => {
                        separated.push_bind(if *value { 1i64 } else { 0i64 });
                    }
                    Value::Number(value) => {
                        if let Some(number) = value.as_i64() {
                            separated.push_bind(number);
                        } else if let Some(number) = value.as_u64() {
                            separated.push_bind(i64::try_from(number).unwrap_or(i64::MAX));
                        } else if let Some(number) = value.as_f64() {
                            separated.push_bind(number);
                        } else {
                            separated.push_bind(Option::<String>::None);
                        }
                    }
                    Value::String(value) => {
                        separated.push_bind(value);
                    }
                    Value::Array(_) | Value::Object(_) => {
                        separated.push_bind(value.to_string());
                    }
                }
            }
        }

        query.push(")");
        if update_columns.is_empty() {
            query.push(format!(
                " ON CONFLICT({}) DO NOTHING",
                quote_identifier(table.primary_key)
            ));
        } else {
            query.push(format!(
                " ON CONFLICT({}) DO UPDATE SET {} WHERE excluded.{} >= {}.{}",
                quote_identifier(table.primary_key),
                update_columns.join(", "),
                quote_identifier("updated_at"),
                quote_identifier(table.name),
                quote_identifier("updated_at")
            ));
        }

        let result = query
            .build()
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("批量写入失败: {}", e))?;

        let is_applied_book_tombstone = result.rows_affected() > 0
            && table.name == "books"
            && object
                .get("deleted_at")
                .map(|value| !value.is_null())
                .unwrap_or(false);
        if is_applied_book_tombstone {
            let book_id = object
                .get(table.primary_key)
                .and_then(Value::as_str)
                .ok_or_else(|| "远端书籍 tombstone 缺少有效 ID".to_string())?;
            let timestamp = object
                .get("deleted_at")
                .and_then(value_as_i64)
                .or_else(|| object.get("updated_at").and_then(value_as_i64))
                .ok_or_else(|| "远端书籍 tombstone 缺少有效时间戳".to_string())?;

            for child_table in ["book_status", "book_notes", "notes", "reading_sessions"] {
                sqlx::query(&format!(
                    "UPDATE {} SET {} = ?, {} = ?, {} = 'pending' WHERE {} = ? AND {} IS NULL AND {} <= ?",
                    quote_identifier(child_table),
                    quote_identifier("deleted_at"),
                    quote_identifier("updated_at"),
                    quote_identifier("sync_status"),
                    quote_identifier("book_id"),
                    quote_identifier("deleted_at"),
                    quote_identifier("updated_at")
                ))
                .bind(timestamp)
                .bind(timestamp)
                .bind(book_id)
                .bind(timestamp)
                .execute(&mut *tx)
                .await
                .map_err(|e| format!("级联远端书籍 tombstone 失败: {}", e))?;
            }
        }

        affected += result.rows_affected();
    }

    tx.commit()
        .await
        .map_err(|e| format!("提交批量写入事务失败: {}", e))?;

    Ok(affected)
}

pub async fn mark_rows_synced(
    pool: &SqlitePool,
    table_name: &str,
    rows: Vec<Value>,
) -> Result<(), String> {
    if rows.is_empty() {
        return Ok(());
    }

    let table = table_meta(table_name)?;
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| format!("开启标记同步事务失败: {}", e))?;

    for row in rows {
        let object = row
            .as_object()
            .ok_or_else(|| "标记同步行必须是对象".to_string())?;
        let id = object
            .get(table.primary_key)
            .and_then(Value::as_str)
            .ok_or_else(|| format!("标记同步缺少主键字段 {}", table.primary_key))?;
        let updated_at = object
            .get("updated_at")
            .and_then(value_as_i64)
            .ok_or_else(|| "标记同步缺少 updated_at 字段".to_string())?;

        sqlx::query(&format!(
            "UPDATE {} SET {} = 'synced' WHERE {} = ? AND {} = ?",
            quote_identifier(table.name),
            quote_identifier("sync_status"),
            quote_identifier(table.primary_key),
            quote_identifier("updated_at")
        ))
        .bind(id)
        .bind(updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("标记同步状态失败: {}", e))?;
    }

    tx.commit()
        .await
        .map_err(|e| format!("提交标记同步事务失败: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_changed_since(
    app_handle: AppHandle,
    table: String,
    timestamp: i64,
) -> Result<Vec<Value>, String> {
    let pool = get_db_pool(&app_handle).await?;
    get_changed_since_rows(&pool, &table, timestamp).await
}

#[tauri::command]
pub async fn get_tombstones_since(
    app_handle: AppHandle,
    timestamp: i64,
) -> Result<Vec<SyncTableRow>, String> {
    let pool = get_db_pool(&app_handle).await?;
    get_tombstones_since_rows(&pool, timestamp).await
}

#[tauri::command]
pub async fn bulk_upsert(
    app_handle: AppHandle,
    table: String,
    rows: Vec<Value>,
) -> Result<u64, String> {
    let pool = get_db_pool(&app_handle).await?;
    bulk_upsert_rows(&pool, &table, rows).await
}

#[tauri::command]
pub async fn mark_synced(
    app_handle: AppHandle,
    table: String,
    rows: Vec<Value>,
) -> Result<(), String> {
    let pool = get_db_pool(&app_handle).await?;
    mark_rows_synced(&pool, &table, rows).await
}

fn table_meta(table_name: &str) -> Result<&'static SyncTable, String> {
    SYNC_TABLES
        .iter()
        .find(|table| table.name == table_name)
        .ok_or_else(|| format!("不支持同步表: {}", table_name))
}

async fn table_exists(pool: &SqlitePool, table_name: &str) -> Result<bool, sqlx::Error> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .bind(table_name)
    .fetch_one(pool)
    .await?;
    Ok(count > 0)
}

async fn add_column_if_missing(
    pool: &SqlitePool,
    table_name: &str,
    column_name: &str,
    column_definition: &str,
) -> Result<(), sqlx::Error> {
    let count = sqlx::query_scalar::<_, i64>(&format!(
        "SELECT COUNT(*) FROM pragma_table_info({}) WHERE name = ?",
        quote_string_literal(table_name)
    ))
    .bind(column_name)
    .fetch_one(pool)
    .await?;

    if count == 0 {
        sqlx::query(&format!(
            "ALTER TABLE {} ADD COLUMN {} {}",
            quote_identifier(table_name),
            quote_identifier(column_name),
            column_definition
        ))
        .execute(pool)
        .await?;
    }

    Ok(())
}

fn json_object_expression(table: &SyncTable) -> String {
    let pairs = table
        .columns
        .iter()
        .flat_map(|column| [quote_string_literal(column), quote_identifier(column)])
        .collect::<Vec<_>>()
        .join(", ");
    format!("json_object({})", pairs)
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn quote_string_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn value_as_i64(value: &Value) -> Option<i64> {
    if let Some(number) = value.as_i64() {
        return Some(number);
    }
    if let Some(number) = value.as_u64() {
        return Some(i64::try_from(number).unwrap_or(i64::MAX));
    }
    value.as_str().and_then(|text| text.parse::<i64>().ok())
}

async fn get_db_pool(app_handle: &AppHandle) -> Result<SqlitePool, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用目录失败: {}", e))?;

    let db_path = app_data_dir.join("database").join("app.db");
    let db_url = format!("sqlite:{}", db_path.display());

    let pool = SqlitePool::connect(&db_url)
        .await
        .map_err(|e| format!("数据库连接失败: {}", e))?;
    run_schema_migrations(&pool)
        .await
        .map_err(|e| format!("数据库迁移失败: {}", e))?;
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::{sqlite::SqlitePoolOptions, Row, SqlitePool};

    async fn memory_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .expect("create in-memory sqlite pool");

        sqlx::query(
            r#"
            CREATE TABLE books (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                format TEXT NOT NULL,
                file_path TEXT NOT NULL,
                cover_path TEXT,
                file_size INTEGER NOT NULL,
                language TEXT NOT NULL,
                tags TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE book_status (
                book_id TEXT PRIMARY KEY NOT NULL,
                status TEXT NOT NULL DEFAULT 'unread',
                progress_current INTEGER DEFAULT 0,
                progress_total INTEGER DEFAULT 0,
                location TEXT,
                last_read_at INTEGER,
                started_at INTEGER,
                completed_at INTEGER,
                metadata TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            "#,
        )
        .execute(&pool)
        .await
        .expect("create legacy tables");

        pool
    }

    #[tokio::test]
    async fn migration_adds_sync_columns_to_legacy_tables() {
        let pool = memory_pool().await;

        run_schema_migrations(&pool).await.expect("run migrations");

        for table in ["books", "book_status"] {
            let deleted_at = sqlx::query(&format!(
                "SELECT COUNT(*) AS count FROM pragma_table_info('{}') WHERE name = 'deleted_at'",
                table
            ))
            .fetch_one(&pool)
            .await
            .expect("inspect deleted_at")
            .get::<i64, _>("count");

            let sync_status = sqlx::query(&format!(
                "SELECT COUNT(*) AS count FROM pragma_table_info('{}') WHERE name = 'sync_status'",
                table
            ))
            .fetch_one(&pool)
            .await
            .expect("inspect sync_status")
            .get::<i64, _>("count");

            assert_eq!(deleted_at, 1, "{table} should have deleted_at");
            assert_eq!(sync_status, 1, "{table} should have sync_status");
        }
    }

    #[tokio::test]
    async fn soft_delete_marks_tombstone_and_active_rows_hide_deleted_records() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            INSERT INTO books (
                id, title, author, format, file_path, file_size, language, created_at, updated_at
            ) VALUES ('book-1', 'Title', 'Author', 'EPUB', 'books/book-1/book.epub', 10, 'en', 100, 100)
            "#,
        )
        .execute(&pool)
        .await
        .expect("insert book");

        soft_delete_row(&pool, "books", "book-1", 200)
            .await
            .expect("soft delete");

        let active_rows = get_changed_since_rows(&pool, "books", 0)
            .await
            .expect("get changed rows");
        assert!(active_rows.is_empty(), "deleted rows should be hidden from active changes");

        let tombstones = get_tombstones_since_rows(&pool, 150)
            .await
            .expect("get tombstones");
        assert_eq!(tombstones.len(), 1);
        assert_eq!(tombstones[0].table, "books");
        assert_eq!(tombstones[0].row["id"], serde_json::json!("book-1"));
        assert_eq!(tombstones[0].row["deleted_at"], serde_json::json!(200));
    }

    #[tokio::test]
    async fn pending_active_rows_are_returned_even_when_older_than_last_sync() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                book_id TEXT,
                book_meta TEXT,
                title TEXT,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'pending'
            );
            INSERT INTO notes (
                id, title, content, created_at, updated_at, sync_status
            ) VALUES (
                'note-1', 'Pending note', 'Body', 100, 100, 'pending'
            );
            "#,
        )
        .execute(&pool)
        .await
        .expect("create notes");

        let rows = get_changed_since_rows(&pool, "notes", 200)
            .await
            .expect("get changed rows");

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["id"], serde_json::json!("note-1"));
    }

    #[tokio::test]
    async fn pending_tombstones_are_returned_even_when_older_than_last_sync() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            CREATE TABLE book_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                type TEXT NOT NULL,
                cfi TEXT NOT NULL,
                text TEXT,
                style TEXT,
                color TEXT,
                note TEXT NOT NULL,
                context_before TEXT,
                context_after TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'pending'
            );
            INSERT INTO book_notes (
                id, book_id, type, cfi, note, created_at, updated_at, deleted_at, sync_status
            ) VALUES (
                'book-note-1', 'book-1', 'annotation', 'cfi', '', 100, 100, 100, 'pending'
            );
            "#,
        )
        .execute(&pool)
        .await
        .expect("create book_notes");

        let tombstones = get_tombstones_since_rows(&pool, 200)
            .await
            .expect("get tombstones");

        assert_eq!(tombstones.len(), 1);
        assert_eq!(tombstones[0].table, "book_notes");
        assert_eq!(tombstones[0].row["id"], serde_json::json!("book-note-1"));
    }

    #[tokio::test]
    async fn bulk_upsert_keeps_newer_local_row_when_remote_is_older() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            CREATE TABLE book_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                type TEXT NOT NULL,
                cfi TEXT NOT NULL,
                text TEXT,
                style TEXT,
                color TEXT,
                note TEXT NOT NULL,
                context_before TEXT,
                context_after TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                book_id TEXT,
                book_meta TEXT,
                title TEXT,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE reading_sessions (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            INSERT INTO books (
                id, title, author, format, file_path, file_size, language,
                created_at, updated_at, sync_status
            ) VALUES ('book-1', 'Local New', 'Author', 'EPUB', 'local.epub', 10, 'en', 100, 300, 'pending')
            "#,
        )
        .execute(&pool)
        .await
        .expect("insert local row");

        bulk_upsert_rows(
            &pool,
            "books",
            vec![serde_json::json!({
                "id": "book-1",
                "title": "Remote Old",
                "author": "Author",
                "format": "EPUB",
                "file_path": "remote.epub",
                "file_size": 10,
                "language": "en",
                "created_at": 90,
                "updated_at": 200,
                "sync_status": "synced"
            })],
        )
        .await
        .expect("bulk upsert");

        let row = sqlx::query("SELECT title, updated_at, sync_status FROM books WHERE id = 'book-1'")
            .fetch_one(&pool)
            .await
            .expect("load row");

        assert_eq!(row.get::<String, _>("title"), "Local New");
        assert_eq!(row.get::<i64, _>("updated_at"), 300);
        assert_eq!(row.get::<String, _>("sync_status"), "pending");
    }

    #[tokio::test]
    async fn mark_synced_does_not_clear_newer_pending_update() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            CREATE TABLE book_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                type TEXT NOT NULL,
                cfi TEXT NOT NULL,
                text TEXT,
                style TEXT,
                color TEXT,
                note TEXT NOT NULL,
                context_before TEXT,
                context_after TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                book_id TEXT,
                book_meta TEXT,
                title TEXT,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE reading_sessions (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            INSERT INTO books (
                id, title, author, format, file_path, file_size, language,
                created_at, updated_at, sync_status
            ) VALUES ('book-1', 'Local Newer', 'Author', 'EPUB', 'local.epub', 10, 'en', 100, 300, 'pending')
            "#,
        )
        .execute(&pool)
        .await
        .expect("insert local row");

        mark_rows_synced(
            &pool,
            "books",
            vec![serde_json::json!({
                "id": "book-1",
                "updated_at": 200
            })],
        )
        .await
        .expect("mark synced");

        let row = sqlx::query("SELECT updated_at, sync_status FROM books WHERE id = 'book-1'")
            .fetch_one(&pool)
            .await
            .expect("load row");

        assert_eq!(row.get::<i64, _>("updated_at"), 300);
        assert_eq!(row.get::<String, _>("sync_status"), "pending");

        mark_rows_synced(
            &pool,
            "books",
            vec![serde_json::json!({
                "id": "book-1",
                "updated_at": 300
            })],
        )
        .await
        .expect("mark current row synced");

        let row = sqlx::query("SELECT sync_status FROM books WHERE id = 'book-1'")
            .fetch_one(&pool)
            .await
            .expect("reload row");

        assert_eq!(row.get::<String, _>("sync_status"), "synced");
    }

    #[tokio::test]
    async fn applied_remote_book_tombstone_cascades_to_local_children() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            CREATE TABLE book_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                type TEXT NOT NULL,
                cfi TEXT NOT NULL,
                text TEXT,
                style TEXT,
                color TEXT,
                note TEXT NOT NULL,
                context_before TEXT,
                context_after TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                book_id TEXT,
                book_meta TEXT,
                title TEXT,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE reading_sessions (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            INSERT INTO books (
                id, title, author, format, file_path, file_size, language,
                created_at, updated_at, sync_status
            ) VALUES ('book-1', 'Local', 'Author', 'EPUB', 'local.epub', 10, 'en', 100, 100, 'synced');

            INSERT INTO book_status (book_id, status, created_at, updated_at, sync_status)
            VALUES ('book-1', 'reading', 100, 100, 'synced');

            INSERT INTO book_notes (id, book_id, type, cfi, note, created_at, updated_at, sync_status)
            VALUES ('book-note-1', 'book-1', 'annotation', 'cfi', '', 100, 100, 'synced');

            INSERT INTO notes (id, book_id, title, content, created_at, updated_at, sync_status)
            VALUES ('note-1', 'book-1', 'Note', 'Body', 100, 100, 'synced');

            INSERT INTO reading_sessions (id, book_id, started_at, created_at, updated_at, sync_status)
            VALUES ('session-1', 'book-1', 100, 100, 100, 'synced');
            "#,
        )
        .execute(&pool)
        .await
        .expect("seed book children");

        bulk_upsert_rows(
            &pool,
            "books",
            vec![serde_json::json!({
                "id": "book-1",
                "title": "Remote Deleted",
                "author": "Author",
                "format": "EPUB",
                "file_path": "remote.epub",
                "file_size": 10,
                "language": "en",
                "created_at": 100,
                "updated_at": 300,
                "deleted_at": 300,
                "sync_status": "synced"
            })],
        )
        .await
        .expect("apply remote tombstone");

        for table in ["book_status", "book_notes", "notes", "reading_sessions"] {
            let row = sqlx::query(&format!(
                "SELECT deleted_at, updated_at, sync_status FROM {} WHERE book_id = 'book-1'",
                table
            ))
            .fetch_one(&pool)
            .await
            .expect("load child row");

            assert_eq!(row.get::<i64, _>("deleted_at"), 300, "{table}");
            assert_eq!(row.get::<i64, _>("updated_at"), 300, "{table}");
            assert_eq!(row.get::<String, _>("sync_status"), "pending", "{table}");
        }
    }

    #[tokio::test]
    async fn applied_remote_book_tombstone_does_not_overwrite_newer_local_children() {
        let pool = memory_pool().await;
        run_schema_migrations(&pool).await.expect("run migrations");

        sqlx::query(
            r#"
            CREATE TABLE book_notes (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                type TEXT NOT NULL,
                cfi TEXT NOT NULL,
                text TEXT,
                style TEXT,
                color TEXT,
                note TEXT NOT NULL,
                context_before TEXT,
                context_after TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                book_id TEXT,
                book_meta TEXT,
                title TEXT,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            CREATE TABLE reading_sessions (
                id TEXT PRIMARY KEY,
                book_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                duration_seconds INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER DEFAULT NULL,
                sync_status TEXT DEFAULT 'synced'
            );

            INSERT INTO books (
                id, title, author, format, file_path, file_size, language,
                created_at, updated_at, sync_status
            ) VALUES ('book-1', 'Local', 'Author', 'EPUB', 'local.epub', 10, 'en', 100, 100, 'synced');

            INSERT INTO book_status (book_id, status, created_at, updated_at, sync_status)
            VALUES ('book-1', 'reading', 100, 500, 'pending');
            "#,
        )
        .execute(&pool)
        .await
        .expect("seed newer child row");

        bulk_upsert_rows(
            &pool,
            "books",
            vec![serde_json::json!({
                "id": "book-1",
                "title": "Remote Deleted",
                "author": "Author",
                "format": "EPUB",
                "file_path": "remote.epub",
                "file_size": 10,
                "language": "en",
                "created_at": 100,
                "updated_at": 300,
                "deleted_at": 300,
                "sync_status": "synced"
            })],
        )
        .await
        .expect("apply remote tombstone");

        let row = sqlx::query("SELECT deleted_at, updated_at, sync_status FROM book_status WHERE book_id = 'book-1'")
            .fetch_one(&pool)
            .await
            .expect("load child row");

        assert!(row.get::<Option<i64>, _>("deleted_at").is_none());
        assert_eq!(row.get::<i64, _>("updated_at"), 500);
        assert_eq!(row.get::<String, _>("sync_status"), "pending");
    }
}
