export const migrations = [
  `CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(64) PRIMARY KEY,
    purpose VARCHAR(40) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size BIGINT NOT NULL,
    width INT NULL,
    height INT NULL,
    local_path VARCHAR(1024) NOT NULL,
    public_url VARCHAR(1024) NOT NULL,
    thumbnail_url VARCHAR(1024) NULL,
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_assets_purpose_created (purpose, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS generation_tasks (
    id VARCHAR(64) PRIMARY KEY,
    module_code VARCHAR(80) NOT NULL,
    status VARCHAR(24) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    input_asset_id VARCHAR(64) NULL,
    option_id VARCHAR(120) NULL,
    output_ratio VARCHAR(16) NOT NULL DEFAULT '1:1',
    resolution VARCHAR(16) NOT NULL DEFAULT '1K',
    logo_asset_id VARCHAR(64) NULL,
    prompt TEXT NULL,
    kie_task_id VARCHAR(128) NULL,
    kie_account_hash VARCHAR(128) NULL,
    result_json JSON NULL,
    error_code VARCHAR(120) NULL,
    error_message TEXT NULL,
    credits_user_id BIGINT NULL,
    credits_tenant_id BIGINT NULL,
    account_scope VARCHAR(16) NULL,
    billing_task_id BIGINT NULL,
    billing_status VARCHAR(24) NULL,
    estimated_points DECIMAL(18, 4) NULL,
    settled_points DECIMAL(18, 4) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_generation_tasks_module_created (module_code, created_at),
    INDEX idx_generation_tasks_status (status),
    INDEX idx_generation_tasks_kie_task (kie_task_id),
    INDEX idx_generation_tasks_billing_task (billing_task_id),
    INDEX idx_generation_tasks_credits_user_created (credits_user_id, created_at),
    INDEX idx_generation_tasks_billing_status (billing_status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS batch_tasks (
    id VARCHAR(64) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    preset_id VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL,
    total INT NOT NULL DEFAULT 0,
    completed INT NOT NULL DEFAULT 0,
    failed INT NOT NULL DEFAULT 0,
    progress INT NOT NULL DEFAULT 0,
    visual_config_json JSON NULL,
    credits_user_id BIGINT NULL,
    credits_tenant_id BIGINT NULL,
    account_scope VARCHAR(16) NULL,
    estimated_points DECIMAL(18, 4) NULL,
    settled_points DECIMAL(18, 4) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_batch_tasks_status_created (status, created_at),
    INDEX idx_batch_tasks_credits_user_created (credits_user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS batch_task_items (
    id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL,
    group_title VARCHAR(255) NOT NULL,
    item_kind VARCHAR(24) NOT NULL,
    input_asset_id VARCHAR(64) NOT NULL,
    generation_task_id VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'waiting',
    progress INT NOT NULL DEFAULT 0,
    result_count INT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_batch_task_items_batch (batch_id, sort_order),
    INDEX idx_batch_task_items_generation (generation_task_id),
    INDEX idx_batch_task_items_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS batch_visual_presets (
    id VARCHAR(120) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL DEFAULT 'default_user',
    name VARCHAR(255) NOT NULL,
    visual_config_json JSON NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_batch_visual_presets_user_updated (user_id, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS kie_accounts (
    account_hash VARCHAR(128) PRIMARY KEY,
    label VARCHAR(120) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    current_concurrency INT NOT NULL DEFAULT 0,
    max_concurrency INT NOT NULL DEFAULT 2,
    failure_count INT NOT NULL DEFAULT 0,
    cooldown_until DATETIME(3) NULL,
    last_used_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_kie_accounts_status_cooldown (status, cooldown_until)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS kie_task_records (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(64) NOT NULL,
    kie_task_id VARCHAR(128) NOT NULL,
    kie_account_hash VARCHAR(128) NOT NULL,
    status VARCHAR(24) NOT NULL,
    request_json JSON NULL,
    response_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_kie_task_records_task (task_id),
    INDEX idx_kie_task_records_kie_task (kie_task_id),
    INDEX idx_kie_task_records_account (kie_account_hash)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS delivery_assets (
    id VARCHAR(64) PRIMARY KEY,
    source_task_id VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(1024) NOT NULL,
    thumbnail_url VARCHAR(1024) NULL,
    ratio VARCHAR(16) NOT NULL,
    width INT NULL,
    height INT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_delivery_assets_source (source_task_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS delivery_packages (
    id VARCHAR(64) PRIMARY KEY,
    package_name VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    asset_ids_json JSON NOT NULL,
    download_url VARCHAR(1024) NULL,
    error_message TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS user_logo_settings (
    user_id VARCHAR(64) PRIMARY KEY,
    logo_asset_id VARCHAR(64) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_user_logo_asset (logo_asset_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS creative_conversations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL DEFAULT 'default_user',
    title VARCHAR(255) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    last_message TEXT NULL,
    last_task_id VARCHAR(64) NULL,
    last_result_url VARCHAR(1024) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_creative_conversations_user_updated (user_id, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS creative_messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    role VARCHAR(24) NOT NULL,
    content TEXT NOT NULL,
    task_id VARCHAR(64) NULL,
    reference_asset_id VARCHAR(64) NULL,
    source_task_id VARCHAR(64) NULL,
    source_image_url VARCHAR(1024) NULL,
    generation_mode VARCHAR(32) NULL,
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_creative_messages_conversation_created (conversation_id, created_at),
    INDEX idx_creative_messages_task (task_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS creative_conversation_assets (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL,
    asset_id VARCHAR(64) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'reference',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_creative_assets_conversation_created (conversation_id, created_at),
    INDEX idx_creative_assets_asset (asset_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];
