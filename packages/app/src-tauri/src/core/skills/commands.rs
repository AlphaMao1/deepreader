use super::models::*;
use crate::core::sync::run_schema_migrations;
use sqlx::{Row, SqlitePool};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

#[tauri::command]
pub async fn create_skill(app_handle: AppHandle, data: SkillCreateData) -> Result<Skill, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let existing_active_skill = sqlx::query("SELECT * FROM skills WHERE name = ? AND deleted_at IS NULL")
        .bind(&data.name)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("检查技能名失败: {}", e))?;

    let now = chrono::Utc::now().timestamp_millis();
    let is_active = data.is_active.unwrap_or(true);
    let is_system = data.is_system.unwrap_or(false);
    let description = data.description.unwrap_or_default();

    if existing_active_skill.is_some() {
        return Err(format!("技能 '{}' 已存在", data.name));
    }

    // 如果只命中 tombstone，则恢复最近删除的原记录，避免制造无意义重复行。
    let existing_deleted_skill = sqlx::query(
        "SELECT * FROM skills WHERE name = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT 1",
    )
    .bind(&data.name)
    .fetch_optional(&db_pool)
    .await
    .map_err(|e| format!("检查已删除技能失败: {}", e))?;

    if let Some(row) = existing_deleted_skill {
        let skill_id: String = row
            .try_get("id")
            .map_err(|e| format!("读取技能 ID 失败: {}", e))?;
        sqlx::query(
            r#"
            UPDATE skills SET
                content = ?, description = ?, is_active = ?, is_system = ?,
                deleted_at = NULL, updated_at = ?, sync_status = 'pending'
            WHERE id = ?
            "#,
        )
        .bind(&data.content)
        .bind(&description)
        .bind(if is_active { 1 } else { 0 })
        .bind(if is_system { 1 } else { 0 })
        .bind(now)
        .bind(&skill_id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("恢复已删除技能失败: {}", e))?;

        return get_skill_by_id(app_handle, skill_id)
            .await?
            .ok_or_else(|| "恢复后无法找到技能".to_string());
    }

    let skill_id = Uuid::new_v4().to_string();

    sqlx::query(
        r#"
        INSERT INTO skills (id, name, content, description, is_active, is_system, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&skill_id)
    .bind(&data.name)
    .bind(&data.content)
    .bind(&description)
    .bind(if is_active { 1 } else { 0 })
    .bind(if is_system { 1 } else { 0 })
    .bind(now)
    .bind(now)
    .execute(&db_pool)
    .await
    .map_err(|e| format!("创建技能失败: {}", e))?;

    Ok(Skill::new(skill_id, data.name, data.content, description, is_active, is_system))
}

#[tauri::command]
pub async fn get_skills(app_handle: AppHandle) -> Result<Vec<Skill>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let rows = sqlx::query("SELECT * FROM skills WHERE deleted_at IS NULL")
        .fetch_all(&db_pool)
        .await
        .map_err(|e| format!("获取技能列表失败: {}", e))?;

    let skills: Result<Vec<Skill>, sqlx::Error> = rows.iter().map(Skill::from_db_row).collect();

    skills.map_err(|e| format!("转换查询结果失败: {}", e))
}

#[tauri::command]
pub async fn get_skill_by_id(app_handle: AppHandle, id: String) -> Result<Option<Skill>, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let row = sqlx::query("SELECT * FROM skills WHERE id = ? AND deleted_at IS NULL")
        .bind(&id)
        .fetch_optional(&db_pool)
        .await
        .map_err(|e| format!("查询技能失败: {}", e))?;

    match row {
        Some(row) => Ok(Some(
            Skill::from_db_row(&row).map_err(|e| format!("转换查询结果失败: {}", e))?,
        )),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn update_skill(
    app_handle: AppHandle,
    id: String,
    update_data: SkillUpdateData,
) -> Result<Skill, String> {
    let db_pool = get_db_pool(&app_handle).await?;
    let now = update_data
        .updated_at
        .unwrap_or_else(|| chrono::Utc::now().timestamp_millis());

    // 如果更新名称，检查名称是否已被其他技能使用
    if let Some(ref name) = update_data.name {
        let existing_skill = sqlx::query("SELECT * FROM skills WHERE name = ? AND id != ? AND deleted_at IS NULL")
            .bind(name)
            .bind(&id)
            .fetch_optional(&db_pool)
            .await
            .map_err(|e| format!("检查技能名失败: {}", e))?;

        if existing_skill.is_some() {
            return Err(format!("技能名 '{}' 已被其他技能使用", name));
        }
    }

    if let Some(name) = &update_data.name {
        sqlx::query("UPDATE skills SET name = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL")
            .bind(name)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新技能名失败: {}", e))?;
    }

    if let Some(content) = &update_data.content {
        sqlx::query("UPDATE skills SET content = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL")
            .bind(content)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新技能内容失败: {}", e))?;
    }

    if let Some(description) = &update_data.description {
        sqlx::query("UPDATE skills SET description = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL")
            .bind(description)
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新技能描述失败: {}", e))?;
    }

    if let Some(is_active) = update_data.is_active {
        sqlx::query("UPDATE skills SET is_active = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL")
            .bind(if is_active { 1 } else { 0 })
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新技能状态失败: {}", e))?;
    }

    if update_data.name.is_none()
        && update_data.content.is_none()
        && update_data.description.is_none()
        && update_data.is_active.is_none()
    {
        sqlx::query("UPDATE skills SET updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL")
            .bind(now)
            .bind(&id)
            .execute(&db_pool)
            .await
            .map_err(|e| format!("更新时间戳失败: {}", e))?;
    }

    get_skill_by_id(app_handle, id)
        .await?
        .ok_or_else(|| "更新后无法找到技能".to_string())
}

#[tauri::command]
pub async fn delete_skill(app_handle: AppHandle, id: String) -> Result<(), String> {
    let db_pool = get_db_pool(&app_handle).await?;

    let skill = get_skill_by_id(app_handle.clone(), id.clone())
        .await?
        .ok_or_else(|| "技能不存在".to_string())?;

    if skill.is_system {
        return Err("系统技能不可删除".to_string());
    }

    let now = chrono::Utc::now().timestamp_millis();
    let result = sqlx::query(
        "UPDATE skills SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL",
    )
        .bind(now)
        .bind(now)
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("删除技能失败: {}", e))?;

    if result.rows_affected() == 0 {
        return Err("技能不存在".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn toggle_skill_active(app_handle: AppHandle, id: String) -> Result<Skill, String> {
    let db_pool = get_db_pool(&app_handle).await?;

    // 获取当前状态
    let skill = get_skill_by_id(app_handle.clone(), id.clone())
        .await?
        .ok_or_else(|| "技能不存在".to_string())?;

    // 切换状态
    let new_active = !skill.is_active;
    let now = chrono::Utc::now().timestamp_millis();

    sqlx::query("UPDATE skills SET is_active = ?, updated_at = ?, sync_status = 'pending' WHERE id = ? AND deleted_at IS NULL")
        .bind(if new_active { 1 } else { 0 })
        .bind(now)
        .bind(&id)
        .execute(&db_pool)
        .await
        .map_err(|e| format!("切换技能状态失败: {}", e))?;

    get_skill_by_id(app_handle, id)
        .await?
        .ok_or_else(|| "更新后无法找到技能".to_string())
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
