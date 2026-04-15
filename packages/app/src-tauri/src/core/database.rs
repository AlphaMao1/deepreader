use sqlx::{migrate::MigrateDatabase, Sqlite, SqlitePool};
use std::fs;
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Serialize, Debug)]
struct DefaultSkill {
    name: String,
    content: String,
    description: String,
    is_system: bool,
    is_active: bool,
}

pub async fn initialize(app_handle: &AppHandle) -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let db_dir = app_data_dir.join("database");
    fs::create_dir_all(&db_dir)?;

    let db_path = db_dir.join("app.db");
    let db_url = format!(
        "sqlite:{}",
        db_path.to_str().ok_or("Invalid database path")?
    );

    if !Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        Sqlite::create_database(&db_url).await?;
        println!("Database created at: {}", db_url);
    } else {
        println!("Database found at: {}", db_url);
    }

    let pool = SqlitePool::connect(&db_url).await?;

    sqlx::query(include_str!("./schema.sql"))
        .execute(&pool)
        .await?;
    println!("Database schema initialized.");

    // 迁移：检查 skills 表是否有 description 列，没有则 ALTER TABLE 添加
    run_migrations(&pool).await?;

    // 每次启动都同步 default-skills.json，按名称 upsert
    sync_default_skills(&pool).await?;

    Ok(pool)
}

/// 运行增量数据库迁移（不破坏已有数据）
async fn run_migrations(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    // 检查 skills.description 列是否存在
    let row = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pragma_table_info('skills') WHERE name='description'"
    )
    .fetch_one(pool)
    .await?;

    if row == 0 {
        sqlx::query(
            "ALTER TABLE skills ADD COLUMN description TEXT NOT NULL DEFAULT ''"
        )
        .execute(pool)
        .await?;
        println!("Migration applied: added 'description' column to skills table.");
    }

    Ok(())
}

/// 将 default-skills.json 中的所有 skill 按名称同步到数据库：
/// - 已存在（按名称匹配）→ 更新 content / description / is_active / is_system
/// - 不存在 → 插入新记录
async fn sync_default_skills(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let default_skills_json = include_str!("./default-skills.json");
    let default_skills: Vec<DefaultSkill> = serde_json::from_str(default_skills_json)?;

    println!("Syncing {} default skills...", default_skills.len());

    for skill in default_skills {
        let now = chrono::Utc::now().timestamp_millis();

        // 查找是否已存在同名 skill
        let existing = sqlx::query("SELECT id FROM skills WHERE name = ?")
            .bind(&skill.name)
            .fetch_optional(pool)
            .await?;

        if existing.is_some() {
            // 更新已有 skill 的 content、description 和状态
            sqlx::query(
                r#"
                UPDATE skills
                SET content = ?, description = ?, is_active = ?, is_system = ?, updated_at = ?
                WHERE name = ?
                "#,
            )
            .bind(&skill.content)
            .bind(&skill.description)
            .bind(if skill.is_active { 1 } else { 0 })
            .bind(if skill.is_system { 1 } else { 0 })
            .bind(now)
            .bind(&skill.name)
            .execute(pool)
            .await?;
            println!("🔄 Updated skill: {}", skill.name);
        } else {
            // 插入新 skill
            let skill_id = Uuid::new_v4().to_string();
            sqlx::query(
                r#"
                INSERT INTO skills (id, name, content, description, is_active, is_system, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&skill_id)
            .bind(&skill.name)
            .bind(&skill.content)
            .bind(&skill.description)
            .bind(if skill.is_active { 1 } else { 0 })
            .bind(if skill.is_system { 1 } else { 0 })
            .bind(now)
            .bind(now)
            .execute(pool)
            .await?;
            println!("✅ Inserted skill: {}", skill.name);
        }
    }

    println!("Default skills sync completed.");
    Ok(())
}
