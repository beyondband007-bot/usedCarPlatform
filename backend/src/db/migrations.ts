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
    subscription_user_key VARCHAR(64) NULL,
    subscription_plan_code VARCHAR(32) NULL,
    billing_task_id BIGINT NULL,
    billing_status VARCHAR(24) NULL,
    estimated_points DECIMAL(18, 4) NULL,
    settled_points DECIMAL(18, 4) NULL,
    deadline_at DATETIME(3) NULL,
    soft_timeout_at DATETIME(3) NULL,
    fallback_started_at DATETIME(3) NULL,
    active_model VARCHAR(80) NULL,
    winning_model VARCHAR(80) NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    poll_failure_count INT NOT NULL DEFAULT 0,
    last_kie_poll_at DATETIME(3) NULL,
    last_error_code VARCHAR(120) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_generation_tasks_module_created (module_code, created_at),
    INDEX idx_generation_tasks_status (status),
    INDEX idx_generation_tasks_kie_task (kie_task_id),
    INDEX idx_generation_tasks_billing_task (billing_task_id),
    INDEX idx_generation_tasks_credits_user_created (credits_user_id, created_at),
    INDEX idx_generation_tasks_subscription_running (subscription_user_key, status, created_at),
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
    subscription_user_key VARCHAR(64) NULL,
    subscription_plan_code VARCHAR(32) NULL,
    estimated_points DECIMAL(18, 4) NULL,
    settled_points DECIMAL(18, 4) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_batch_tasks_status_created (status, created_at),
    INDEX idx_batch_tasks_credits_user_created (credits_user_id, created_at),
    INDEX idx_batch_tasks_subscription_running (subscription_user_key, status, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS subscription_plans (
    code VARCHAR(32) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    account_limit INT NOT NULL,
    concurrent_task_limit INT NOT NULL,
    visual_concurrent_task_limit INT NOT NULL,
    batch_concurrent_task_limit INT NOT NULL,
    gift_points INT NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS app_roles (
    code VARCHAR(32) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS app_role_permissions (
    role_code VARCHAR(32) NOT NULL,
    permission_code VARCHAR(80) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (role_code, permission_code),
    CONSTRAINT app_role_permissions_role_fk FOREIGN KEY (role_code) REFERENCES app_roles (code)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS back_office_roles (
    code VARCHAR(32) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    hierarchy_rank INT NOT NULL,
    can_login TINYINT(1) NOT NULL DEFAULT 1,
    can_create_accounts TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_back_office_roles_rank (hierarchy_rank)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS back_office_permission_policies (
    policy_code VARCHAR(80) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    controller_role_code VARCHAR(32) NULL,
    subject_role_code VARCHAR(32) NOT NULL,
    action_code VARCHAR(80) NOT NULL,
    target_role_code VARCHAR(32) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    is_disableable TINYINT(1) NOT NULL DEFAULT 1,
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_back_office_policies_controller (controller_role_code),
    INDEX idx_back_office_policies_subject_action (subject_role_code, action_code),
    INDEX idx_back_office_policies_target (target_role_code),
    CONSTRAINT back_office_policies_controller_fk FOREIGN KEY (controller_role_code) REFERENCES back_office_roles (code)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT back_office_policies_subject_fk FOREIGN KEY (subject_role_code) REFERENCES back_office_roles (code)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    phone VARCHAR(32) NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    credits_user_id BIGINT NULL,
    credits_tenant_id BIGINT NULL,
    account_scope VARCHAR(16) NOT NULL DEFAULT 'personal',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_app_users_username (username),
    UNIQUE KEY uk_app_users_phone (phone),
    INDEX idx_app_users_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS app_user_roles (
    user_id VARCHAR(64) NOT NULL,
    role_code VARCHAR(32) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (user_id, role_code),
    CONSTRAINT app_user_roles_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT app_user_roles_role_fk FOREIGN KEY (role_code) REFERENCES app_roles (code)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS back_office_role_assignments (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    role_code VARCHAR(32) NOT NULL,
    assigned_by_user_id VARCHAR(64) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    scope_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_back_office_role_assignments_user_role (user_id, role_code),
    INDEX idx_back_office_role_assignments_user_status (user_id, status),
    INDEX idx_back_office_role_assignments_role_status (role_code, status),
    INDEX idx_back_office_role_assignments_assigned_by (assigned_by_user_id),
    CONSTRAINT back_office_assignments_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT back_office_assignments_role_fk FOREIGN KEY (role_code) REFERENCES back_office_roles (code)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT back_office_assignments_assigned_by_fk FOREIGN KEY (assigned_by_user_id) REFERENCES app_users (id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS account_creation_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    operator_user_id VARCHAR(64) NOT NULL,
    operator_role_code VARCHAR(32) NOT NULL,
    target_user_id VARCHAR(64) NULL,
    target_role_code VARCHAR(32) NOT NULL,
    application_code VARCHAR(80) NULL,
    action_code VARCHAR(80) NOT NULL,
    policy_snapshot_json JSON NOT NULL,
    decision VARCHAR(24) NOT NULL,
    reason VARCHAR(255) NULL,
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX idx_account_creation_audit_operator (operator_user_id, created_at),
    INDEX idx_account_creation_audit_target (target_user_id, created_at),
    INDEX idx_account_creation_audit_decision (decision, created_at),
    CONSTRAINT account_creation_audit_operator_fk FOREIGN KEY (operator_user_id) REFERENCES app_users (id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT account_creation_audit_target_fk FOREIGN KEY (target_user_id) REFERENCES app_users (id)
      ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT account_creation_audit_operator_role_fk FOREIGN KEY (operator_role_code) REFERENCES back_office_roles (code)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS platform_user_creation_idempotency (
    id VARCHAR(64) PRIMARY KEY,
    operator_user_id VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    response_json JSON NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_platform_user_creation_idempotency_operator_key (operator_user_id, idempotency_key),
    INDEX idx_platform_user_creation_idempotency_status (status, created_at),
    CONSTRAINT platform_user_creation_idempotency_operator_fk FOREIGN KEY (operator_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS application_customer_links (
    id VARCHAR(64) PRIMARY KEY,
    application_code VARCHAR(80) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    credits_user_id BIGINT NOT NULL,
    account_scope VARCHAR(16) NOT NULL DEFAULT 'personal',
    credits_tenant_id BIGINT NULL,
    created_by_user_id VARCHAR(64) NOT NULL,
    created_by_role_code VARCHAR(32) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_application_customer_links_app_user (application_code, user_id),
    INDEX idx_application_customer_links_credits_user (credits_user_id),
    INDEX idx_application_customer_links_creator (created_by_user_id, created_at),
    CONSTRAINT application_customer_links_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT application_customer_links_creator_fk FOREIGN KEY (created_by_user_id) REFERENCES app_users (id)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS agent_customer_relations (
    id VARCHAR(64) PRIMARY KEY,
    agent_user_id VARCHAR(64) NOT NULL,
    customer_user_id VARCHAR(64) NOT NULL,
    customer_credits_user_id BIGINT NOT NULL,
    application_code VARCHAR(80) NOT NULL,
    relation_type VARCHAR(24) NOT NULL DEFAULT 'direct',
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    metadata_json JSON NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_agent_customer_relations_agent_customer_app (agent_user_id, customer_user_id, application_code),
    INDEX idx_agent_customer_relations_customer (customer_user_id, created_at),
    CONSTRAINT agent_customer_relations_agent_fk FOREIGN KEY (agent_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT agent_customer_relations_customer_fk FOREIGN KEY (customer_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS agent_leads (
    id VARCHAR(64) PRIMARY KEY,
    agent_user_id VARCHAR(64) NOT NULL,
    application_code VARCHAR(80) NOT NULL,
    customer_name VARCHAR(120) NOT NULL,
    phone VARCHAR(32) NULL,
    source VARCHAR(80) NULL,
    stage VARCHAR(32) NOT NULL DEFAULT 'new',
    expected_points DECIMAL(18, 4) NOT NULL DEFAULT 0,
    note VARCHAR(500) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_agent_leads_agent_stage (agent_user_id, stage, created_at),
    INDEX idx_agent_leads_application (application_code, created_at),
    CONSTRAINT agent_leads_agent_fk FOREIGN KEY (agent_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS agent_commission_previews (
    id VARCHAR(64) PRIMARY KEY,
    agent_user_id VARCHAR(64) NOT NULL,
    customer_user_id VARCHAR(64) NULL,
    application_code VARCHAR(80) NOT NULL,
    period VARCHAR(16) NOT NULL,
    consumed_points DECIMAL(18, 4) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(8, 4) NOT NULL DEFAULT 0,
    commission_points DECIMAL(18, 4) NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'preview',
    settlement_id VARCHAR(64) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_agent_commission_agent_period (agent_user_id, period),
    INDEX idx_agent_commission_customer (customer_user_id, created_at),
    CONSTRAINT agent_commission_previews_agent_fk FOREIGN KEY (agent_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT agent_commission_previews_customer_fk FOREIGN KEY (customer_user_id) REFERENCES app_users (id)
      ON DELETE SET NULL ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS agent_settlement_bills (
    id VARCHAR(64) PRIMARY KEY,
    agent_user_id VARCHAR(64) NOT NULL,
    period VARCHAR(16) NOT NULL,
    total_commission_points DECIMAL(18, 4) NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'draft',
    confirmed_at DATETIME(3) NULL,
    paid_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_agent_settlement_agent_period (agent_user_id, period),
    INDEX idx_agent_settlement_status (status, created_at),
    CONSTRAINT agent_settlement_bills_agent_fk FOREIGN KEY (agent_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS agent_materials (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL,
    application_code VARCHAR(80) NULL,
    url VARCHAR(1024) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_agent_materials_category_status (category, status, sort_order),
    INDEX idx_agent_materials_application (application_code, status, sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS agent_support_tickets (
    id VARCHAR(64) PRIMARY KEY,
    agent_user_id VARCHAR(64) NOT NULL,
    subject VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL,
    priority VARCHAR(24) NOT NULL DEFAULT 'normal',
    status VARCHAR(24) NOT NULL DEFAULT 'open',
    last_message VARCHAR(500) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_agent_tickets_agent_status (agent_user_id, status, updated_at),
    CONSTRAINT agent_support_tickets_agent_fk FOREIGN KEY (agent_user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS user_subscriptions (
    user_id VARCHAR(64) PRIMARY KEY,
    plan_code VARCHAR(32) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    starts_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_user_subscriptions_plan (plan_code),
    CONSTRAINT user_subscriptions_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT user_subscriptions_plan_fk FOREIGN KEY (plan_code) REFERENCES subscription_plans (code)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS enterprise_tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    owner_user_id VARCHAR(64) NOT NULL,
    subscription_user_id VARCHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX idx_enterprise_tenants_owner (owner_user_id),
    INDEX idx_enterprise_tenants_subscription_user (subscription_user_id),
    INDEX idx_enterprise_tenants_status (status),
    CONSTRAINT enterprise_tenants_owner_fk FOREIGN KEY (owner_user_id) REFERENCES app_users (id)
      ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT enterprise_tenants_subscription_user_fk FOREIGN KEY (subscription_user_id) REFERENCES app_users (id)
      ON DELETE RESTRICT ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS enterprise_members (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    member_role VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'active',
    joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_enterprise_members_tenant_user (tenant_id, user_id),
    INDEX idx_enterprise_members_user (user_id),
    INDEX idx_enterprise_members_role_status (member_role, status),
    CONSTRAINT enterprise_members_tenant_fk FOREIGN KEY (tenant_id) REFERENCES enterprise_tenants (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT enterprise_members_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    revoked_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_auth_sessions_token_hash (token_hash),
    INDEX idx_auth_sessions_user_expires (user_id, expires_at),
    CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES app_users (id)
      ON DELETE CASCADE ON UPDATE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS batch_task_items (
    id VARCHAR(64) PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL,
    group_title VARCHAR(255) NOT NULL,
    item_kind VARCHAR(24) NOT NULL,
    input_asset_id VARCHAR(64) NOT NULL,
    source_asset_ids_json JSON NULL,
    generation_task_id VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'waiting',
    progress INT NOT NULL DEFAULT 0,
    result_count INT NOT NULL DEFAULT 0,
    error_code VARCHAR(120) NULL,
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
    attempt_no INT NOT NULL DEFAULT 1,
    model VARCHAR(80) NULL,
    role VARCHAR(24) NOT NULL DEFAULT 'primary',
    is_winner TINYINT(1) NOT NULL DEFAULT 0,
    finished_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_kie_task_records_task_role (task_id, role),
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
    INDEX idx_creative_conversations_user_status_updated (user_id, status, updated_at)
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
