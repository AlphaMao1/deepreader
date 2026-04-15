use super::models::*;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[tauri::command]
pub async fn create_memory(
    app_handle: AppHandle,
    data: CreateMemoryData,
) -> Result<Memory, String> {
    data.validate()?;

    let db_pool = get_db_pool(&app_handle).await?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    let related_ids_json = data
        .related_memory_ids
        .as_ref()
        .map(|ids| serde_json::to_string(ids).unwrap_or_default());

    let confidence = data.confidence.unwrap_or(1.0);

    sqlx::query(
        r#"
        INSERT INTO user_memories (
            id, category, key, value, source_type, source_id,
            book_id, related_memory_ids, confidence,
            access_count, last_accessed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&data.category)
    .bind(&data.key)
    .bind(&data.value)
    .bind(&data.source_type)
    .bind(&data.source_id)
    .bind(&data.book_id)
    .bind(&related_ids_json)
    .bind(confidence)
    .bind(now)
    .bind(now)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("创建记忆失败: {}", e))?;

    Ok(Memory {
        id,
        category: data.category,
        key: data.key,
        value: data.value,
        source_type: data.source_type,
        source_id: data.source_id,
        book_id: data.book_id,
        related_memory_ids: data.related_memory_ids,
        confidence,
        access_count: 0,
        last_accessed_at: None,
        created_at: now,
        updated_at: now,
    })
}

#[tauri::command]
pub async fn get_memories(
    app_handle: AppHandle,
    options: Option<MemoryQueryOptions>,
) -> Result<Vec<Memory>, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let opts = options.unwrap_or_default();

    let sort_by = opts.sort_by.as_deref().unwrap_or("updated_at");
    let sort_order = opts.sort_order.as_deref().unwrap_or("desc");

    let valid_sort_fields = ["updated_at", "created_at", "access_count", "key"];
    let sort_field = if valid_sort_fields.contains(&sort_by) {
        sort_by
    } else {
        "updated_at"
    };

    let order = if sort_order.to_lowercase() == "asc" {
        "ASC"
    } else {
        "DESC"
    };

    let limit = opts.limit.unwrap_or(50);
    let offset = opts.offset.unwrap_or(0);

    let mut query_builder = sqlx::QueryBuilder::new("SELECT * FROM user_memories");
    let mut has_where = false;

    if let Some(ref category) = opts.category {
        query_builder.push(" WHERE category = ").push_bind(category);
        has_where = true;
    }

    if let Some(ref book_id) = opts.book_id {
        if has_where {
            query_builder.push(" AND book_id = ").push_bind(book_id);
        } else {
            query_builder.push(" WHERE book_id = ").push_bind(book_id);
        }
    }

    query_builder.push(&format!(" ORDER BY {} {}", sort_field, order));
    query_builder.push(&format!(" LIMIT {} OFFSET {}", limit, offset));

    let rows = query_builder
        .build()
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("查询记忆失败: {}", e))?;

    let memories: Result<Vec<Memory>, sqlx::Error> = rows.iter().map(Memory::from_db_row).collect();
    memories.map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn get_memory_by_id(
    app_handle: AppHandle,
    id: String,
) -> Result<Option<Memory>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM user_memories WHERE id = ?")
        .bind(&id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询记忆失败: {}", e))?;

    match row {
        Some(row) => {
            let memory =
                Memory::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))?;
            Ok(Some(memory))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_memory(
    app_handle: AppHandle,
    data: UpdateMemoryData,
) -> Result<Memory, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = chrono::Utc::now().timestamp_millis();

    let mut has_updates = false;
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE user_memories SET ");
    let mut separated = query_builder.separated(", ");

    if let Some(ref key) = data.key {
        has_updates = true;
        separated.push("key = ").push_bind(key.clone());
    }

    if let Some(ref value) = data.value {
        has_updates = true;
        separated.push("value = ").push_bind(value.clone());
    }

    if let Some(ref source_type) = data.source_type {
        has_updates = true;
        separated.push("source_type = ").push_bind(source_type.clone());
    }

    if let Some(ref source_id) = data.source_id {
        has_updates = true;
        separated.push("source_id = ").push_bind(source_id.clone());
    }

    if let Some(ref book_id_opt) = data.book_id {
        has_updates = true;
        separated
            .push("book_id = ")
            .push_bind(book_id_opt.clone());
    }

    if let Some(ref related_ids_opt) = data.related_memory_ids {
        has_updates = true;
        let json = related_ids_opt
            .as_ref()
            .map(|ids| serde_json::to_string(ids).unwrap_or_default());
        separated.push("related_memory_ids = ").push_bind(json);
    }

    if let Some(confidence) = data.confidence {
        has_updates = true;
        separated.push("confidence = ").push_bind(confidence);
    }

    if !has_updates {
        return Err("没有需要更新的字段".to_string());
    }

    separated.push("updated_at = ").push_bind(now);

    query_builder.push(" WHERE id = ").push_bind(&data.id);

    let result = query_builder
        .build()
        .execute(&db_pool)
        .await
        .map_err(|e| format!("更新记忆失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("记忆不存在".to_string());
    }

    get_memory_by_id(app_handle, data.id)
        .await?
        .ok_or("更新后获取记忆失败".to_string())
}

#[tauri::command]
pub async fn delete_memory(app_handle: AppHandle, id: String) -> Result<(), String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let result = sqlx::query("DELETE FROM user_memories WHERE id = ?")
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("删除记忆失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("记忆不存在".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn search_memories(
    app_handle: AppHandle,
    query: String,
    category: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Memory>, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let search_pattern = format!("%{}%", query);
    let max = limit.unwrap_or(20);

    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT * FROM user_memories WHERE (key LIKE "
    );
    query_builder.push_bind(search_pattern.clone());
    query_builder.push(" OR value LIKE ");
    query_builder.push_bind(search_pattern);
    query_builder.push(")");

    if let Some(ref cat) = category {
        query_builder.push(" AND category = ").push_bind(cat);
    }

    query_builder.push(" ORDER BY access_count DESC");
    query_builder.push(&format!(" LIMIT {}", max));

    let rows = query_builder
        .build()
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("搜索记忆失败: {}", e))?;

    let memories: Result<Vec<Memory>, sqlx::Error> = rows.iter().map(Memory::from_db_row).collect();
    memories.map_err(|e| format!("转换搜索结果失败: {}", e))
}

/// 内部辅助：增加访问计数并更新 last_accessed_at
#[tauri::command]
pub async fn touch_memories(
    app_handle: AppHandle,
    ids: Vec<String>,
) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }

    let db_pool = get_db_pool(&app_handle).await?;
    let now = chrono::Utc::now().timestamp_millis();

    for id in &ids {
        sqlx::query(
            "UPDATE user_memories SET access_count = access_count + 1, last_accessed_at = ?, updated_at = ? WHERE id = ?"
        )
        .bind(now)
        .bind(now)
        .bind(id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("更新记忆访问计数失败: {}", e))?;
    }

    Ok(())
}

async fn get_db_pool(app_handle: &AppHandle) -> Result<SqlitePool, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用目录失败: {}", e))?;

    let db_path = app_data_dir.join("database").join("app.db");
    let db_url = format!("sqlite:{}", db_path.display());

    SqlitePool::connect(&db_url)
        .await
        .map_err(|e| format!("数据库连接失败: {}", e))
}
