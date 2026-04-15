use serde::{Deserialize, Serialize};

/// 记忆对象
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Memory {
    pub id: String,
    pub category: String,
    pub key: String,
    pub value: String,
    #[serde(rename = "sourceType")]
    pub source_type: Option<String>,
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    #[serde(rename = "bookId")]
    pub book_id: Option<String>,
    #[serde(rename = "relatedMemoryIds")]
    pub related_memory_ids: Option<Vec<String>>,
    pub confidence: f64,
    #[serde(rename = "accessCount")]
    pub access_count: i64,
    #[serde(rename = "lastAccessedAt")]
    pub last_accessed_at: Option<i64>,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    pub updated_at: i64,
}

/// 创建记忆输入
#[derive(Deserialize, Debug)]
pub struct CreateMemoryData {
    pub category: String,
    pub key: String,
    pub value: String,
    #[serde(rename = "sourceType")]
    pub source_type: Option<String>,
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    #[serde(rename = "bookId")]
    pub book_id: Option<String>,
    #[serde(rename = "relatedMemoryIds")]
    pub related_memory_ids: Option<Vec<String>>,
    pub confidence: Option<f64>,
}

/// 更新记忆输入
#[derive(Deserialize, Debug)]
pub struct UpdateMemoryData {
    pub id: String,
    pub key: Option<String>,
    pub value: Option<String>,
    #[serde(rename = "sourceType")]
    pub source_type: Option<String>,
    #[serde(rename = "sourceId")]
    pub source_id: Option<String>,
    #[serde(rename = "bookId")]
    pub book_id: Option<Option<String>>,
    #[serde(rename = "relatedMemoryIds")]
    pub related_memory_ids: Option<Option<Vec<String>>>,
    pub confidence: Option<f64>,
}

/// 查询选项
#[derive(Deserialize, Debug)]
pub struct MemoryQueryOptions {
    pub category: Option<String>,
    #[serde(rename = "bookId")]
    pub book_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    #[serde(rename = "sortBy")]
    pub sort_by: Option<String>,
    #[serde(rename = "sortOrder")]
    pub sort_order: Option<String>,
}

impl Memory {
    pub fn from_db_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        use sqlx::Row;

        let related_ids_str: Option<String> = row.try_get("related_memory_ids")?;
        let related_memory_ids = related_ids_str.and_then(|s| serde_json::from_str(&s).ok());

        Ok(Self {
            id: row.try_get("id")?,
            category: row.try_get("category")?,
            key: row.try_get("key")?,
            value: row.try_get("value")?,
            source_type: row.try_get("source_type")?,
            source_id: row.try_get("source_id")?,
            book_id: row.try_get("book_id")?,
            related_memory_ids,
            confidence: row.try_get("confidence")?,
            access_count: row.try_get("access_count")?,
            last_accessed_at: row.try_get("last_accessed_at")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

impl CreateMemoryData {
    pub fn validate(&self) -> Result<(), String> {
        let valid_categories = ["user_profile", "book_gist", "concept"];
        if !valid_categories.contains(&self.category.as_str()) {
            return Err(format!(
                "无效的记忆类别: {}，必须是 user_profile / book_gist / concept",
                self.category
            ));
        }

        if self.key.trim().is_empty() {
            return Err("记忆键不能为空".to_string());
        }

        if self.value.trim().is_empty() {
            return Err("记忆值不能为空".to_string());
        }

        // book_gist 必须有 book_id
        if self.category == "book_gist" && self.book_id.is_none() {
            return Err("book_gist 类记忆必须关联书籍".to_string());
        }

        Ok(())
    }
}

impl Default for MemoryQueryOptions {
    fn default() -> Self {
        Self {
            category: None,
            book_id: None,
            limit: Some(50),
            offset: Some(0),
            sort_by: Some("updated_at".to_string()),
            sort_order: Some("desc".to_string()),
        }
    }
}
