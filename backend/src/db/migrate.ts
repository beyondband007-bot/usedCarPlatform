import { pbkdf2Sync, randomBytes } from "node:crypto";

import { pool } from "./mysql";
import { migrations } from "./migrations";
import { env } from "../config/env";
import {
  closeCreditsAccountLinkPool,
  ensurePersonalCreditsAccount,
  ensureTenantCreditsBundle,
} from "../modules/billing/creditsAccountLinkService";
import {
  defaultBackOfficePermissionPolicies,
  defaultBackOfficeRolePermissions,
  defaultBackOfficeRoles,
} from "../modules/platform/accountCreationPolicyDefaults";

const ADMIN_USER_ID = "user_admin";

const columnExists = async (tableName: string, columnName: string) => {
  const [rows] = await pool.query<any[]>(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = :tableName
       AND column_name = :columnName
     LIMIT 1`,
    { tableName, columnName },
  );
  return rows.length > 0;
};

const addColumnIfMissing = async (tableName: string, columnName: string, definition: string) => {
  if (await columnExists(tableName, columnName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};

const indexExists = async (tableName: string, indexName: string) => {
  const [rows] = await pool.query<any[]>(
    `SELECT 1
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = :tableName
       AND index_name = :indexName
     LIMIT 1`,
    { tableName, indexName },
  );
  return rows.length > 0;
};

const addIndexIfMissing = async (tableName: string, indexName: string, definition: string) => {
  if (await indexExists(tableName, indexName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD INDEX ${indexName} ${definition}`);
};

const addUniqueIndexIfMissing = async (tableName: string, indexName: string, definition: string) => {
  if (await indexExists(tableName, indexName)) return;
  await pool.query(`ALTER TABLE ${tableName} ADD UNIQUE KEY ${indexName} ${definition}`);
};

const dropIndexIfExists = async (tableName: string, indexName: string) => {
  if (!(await indexExists(tableName, indexName))) return;
  await pool.query(`ALTER TABLE ${tableName} DROP INDEX ${indexName}`);
};

const tableExists = async (tableName: string) => {
  const [rows] = await pool.query<any[]>(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = :tableName
     LIMIT 1`,
    { tableName },
  );
  return rows.length > 0;
};

const makeColumnNullable = async (tableName: string, columnName: string, definition: string) => {
  await pool.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${definition}`);
};

const backfillGenerationOwnership = async () => {
  await pool.query(
    `UPDATE generation_tasks
     SET user_id = :adminUserId
     WHERE user_id IS NULL OR user_id = '' OR user_id = 'default_user'`,
    { adminUserId: ADMIN_USER_ID },
  );
  await pool.query(
    `UPDATE batch_tasks
     SET user_id = :adminUserId
     WHERE user_id IS NULL OR user_id = '' OR user_id = 'default_user'`,
    { adminUserId: ADMIN_USER_ID },
  );
  await pool.query(
    `UPDATE assets
     SET user_id = :adminUserId
     WHERE user_id IS NULL OR user_id = '' OR user_id = 'default_user'`,
    { adminUserId: ADMIN_USER_ID },
  );
  await pool.query(
    `UPDATE creative_conversations
     SET user_id = :adminUserId
     WHERE user_id IS NULL OR user_id = '' OR user_id = 'default_user'`,
    { adminUserId: ADMIN_USER_ID },
  );
  await pool.query(
    `UPDATE batch_visual_presets
     SET user_id = :adminUserId
     WHERE user_id IS NULL OR user_id = '' OR user_id = 'default_user'`,
    { adminUserId: ADMIN_USER_ID },
  );
};

const hashPassword = (password: string) => {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
};

const creditsEmailForUsername = (username: string) => `${username}@used-car.local`;

const planGiftPoints = async (planCode: string) => {
  const [rows] = await pool.query<any[]>(
    `SELECT gift_points
     FROM subscription_plans
     WHERE code = :planCode
     LIMIT 1`,
    { planCode },
  );
  return rows[0]?.gift_points ?? 0;
};

const ensureSeedPersonalCreditsUser = async (input: { username: string; plan: string }) => {
  if (!env.credits.enabled) return null;

  const credits = await ensurePersonalCreditsAccount({
    email: creditsEmailForUsername(input.username),
    initialPoints: await planGiftPoints(input.plan),
  });

  return credits.userId;
};

const seedSubscriptionPlans = async () => {
  await pool.query(
    `INSERT INTO subscription_plans
      (code, name, price, account_limit, concurrent_task_limit, visual_concurrent_task_limit,
       batch_concurrent_task_limit, gift_points, status)
     VALUES
      ('basic', '企业基础档', 980.00, 1, 1, 1, 1, 20000, 'active'),
      ('team', '企业团队档', 3980.00, 5, 5, 5, 5, 100000, 'active'),
      ('flagship', '企业旗舰档', 9800.00, 20, 20, 20, 20, 800000, 'active')
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      price = VALUES(price),
      account_limit = VALUES(account_limit),
      concurrent_task_limit = VALUES(concurrent_task_limit),
      visual_concurrent_task_limit = VALUES(visual_concurrent_task_limit),
      batch_concurrent_task_limit = VALUES(batch_concurrent_task_limit),
      gift_points = VALUES(gift_points),
      status = VALUES(status)`,
  );
};

const seedAuthData = async () => {
  await pool.query(
    `INSERT INTO app_roles (code, name, description)
     VALUES
      ('developer', '开发者', 'Reusable Credits Platform 全局开发者权限'),
      ('admin', '管理员', 'Reusable Credits Platform 运营管理权限'),
      ('agent', '代理商', '代理商客户、线索、佣金与结算权限'),
      ('enterprise', '企业用户', '企业内容生产功能权限')
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      description = VALUES(description)`,
  );

  for (const [roleCode, permissions] of Object.entries(defaultBackOfficeRolePermissions)) {
    await pool.query(
      `DELETE FROM app_role_permissions
       WHERE role_code = :roleCode
         AND permission_code NOT IN (:permissions)`,
      { roleCode, permissions: [...permissions] },
    );

    for (const permissionCode of permissions) {
      await pool.query(
        `INSERT INTO app_role_permissions (role_code, permission_code)
         VALUES (:roleCode, :permissionCode)
         ON DUPLICATE KEY UPDATE permission_code = VALUES(permission_code)`,
        { roleCode, permissionCode },
      );
    }
  }

  for (const role of defaultBackOfficeRoles) {
    await pool.query(
      `INSERT INTO back_office_roles
        (code, name, description, hierarchy_rank, can_login, can_create_accounts)
       VALUES
        (:code, :name, :description, :hierarchyRank, :canLogin, :canCreateAccounts)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        hierarchy_rank = VALUES(hierarchy_rank),
        can_login = VALUES(can_login),
        can_create_accounts = VALUES(can_create_accounts)`,
      role,
    );
  }

  for (const policy of defaultBackOfficePermissionPolicies) {
    await pool.query(
      `INSERT INTO back_office_permission_policies
        (policy_code, name, controller_role_code, subject_role_code, action_code,
         target_role_code, is_enabled, is_disableable, metadata_json)
       VALUES
        (:policyCode, :name, :controllerRoleCode, :subjectRoleCode, :actionCode,
         :targetRoleCode, :isEnabled, :isDisableable, :metadataJson)
       ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        controller_role_code = VALUES(controller_role_code),
        subject_role_code = VALUES(subject_role_code),
        action_code = VALUES(action_code),
        target_role_code = VALUES(target_role_code),
        is_enabled = IF(VALUES(is_disableable) = 0, VALUES(is_enabled), is_enabled),
        is_disableable = VALUES(is_disableable),
        metadata_json = VALUES(metadata_json)`,
      {
        ...policy,
        metadataJson: JSON.stringify({ description: policy.description }),
      },
    );
  }

  const users = [
    {
      id: "user_developer",
      username: "developer",
      phone: "13800000000",
      displayName: "开发者",
      role: "developer",
      plan: "flagship",
    },
    {
      id: "user_admin",
      username: "admin",
      phone: "13800000001",
      displayName: "管理员",
      role: "admin",
      plan: "flagship",
    },
    {
      id: "user_agent",
      username: "agent",
      phone: "13800000009",
      displayName: "代理商",
      role: "agent",
      plan: "team",
    },
    {
      id: "user_enterprise",
      username: "enterprise",
      phone: "13800000002",
      displayName: "企业用户",
      role: "enterprise",
      plan: "team",
    },
    {
      id: "user_basic",
      username: "basic",
      phone: "13800000003",
      displayName: "基础版企业用户",
      role: "enterprise",
      plan: "basic",
    },
    {
      id: "user_team",
      username: "team",
      phone: "13800000004",
      displayName: "团队版企业用户",
      role: "enterprise",
      plan: "team",
    },
    {
      id: "user_flagship",
      username: "flagship",
      phone: "13800000005",
      displayName: "旗舰版企业用户",
      role: "enterprise",
      plan: "flagship",
      usesTenantCreditsBundle: true,
    },
  ];

  for (const user of users) {
    const creditsUserId = user.usesTenantCreditsBundle ? null : await ensureSeedPersonalCreditsUser(user);

    await pool.query(
      `INSERT INTO app_users
        (id, username, phone, password_hash, display_name, status, credits_user_id, account_scope)
       VALUES
        (:id, :username, :phone, :passwordHash, :displayName, 'active', :creditsUserId, 'personal')
       ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        phone = VALUES(phone),
        display_name = VALUES(display_name),
        status = VALUES(status),
        credits_user_id = VALUES(credits_user_id),
        account_scope = VALUES(account_scope)`,
      { ...user, creditsUserId, passwordHash: hashPassword("123456") },
    );

    await pool.query(
      `INSERT INTO app_user_roles (user_id, role_code)
       VALUES (:userId, :roleCode)
       ON DUPLICATE KEY UPDATE role_code = VALUES(role_code)`,
      { userId: user.id, roleCode: user.role },
    );

    if (user.role === "developer" || user.role === "admin" || user.role === "agent") {
      await pool.query(
        `INSERT INTO back_office_role_assignments
          (id, user_id, role_code, assigned_by_user_id, status, scope_json)
         VALUES
          (:id, :userId, :roleCode, NULL, 'active', :scopeJson)
         ON DUPLICATE KEY UPDATE
          role_code = VALUES(role_code),
          status = VALUES(status),
          scope_json = VALUES(scope_json)`,
        {
          id: `boa_${user.id}_${user.role}`,
          userId: user.id,
          roleCode: user.role,
          scopeJson: JSON.stringify({ platform: "reusable-credits" }),
        },
      );
    }

    await pool.query(
      `INSERT INTO user_subscriptions (user_id, plan_code, status)
       VALUES (:userId, :planCode, 'active')
       ON DUPLICATE KEY UPDATE
        plan_code = VALUES(plan_code),
        status = VALUES(status)`,
      { userId: user.id, planCode: user.plan },
    );
  }
};

const migrateMockSubscriptions = async () => {
  if (!(await tableExists("mock_user_subscriptions"))) return;

  await pool.query(
    `INSERT INTO user_subscriptions (user_id, plan_code, status, starts_at, expires_at)
     SELECT u.id, mus.plan_code, mus.status, mus.starts_at, mus.expires_at
     FROM mock_user_subscriptions mus
     JOIN app_users u ON u.username = mus.mock_user_key
     ON DUPLICATE KEY UPDATE
      plan_code = VALUES(plan_code),
      status = VALUES(status),
      expires_at = VALUES(expires_at)`,
  );
};

const backfillBatchItemErrorCodes = async () => {
  if (!(await tableExists("batch_task_items"))) return;
  await pool.query(
    `UPDATE batch_task_items bti
     LEFT JOIN generation_tasks gt ON gt.id = bti.generation_task_id
     SET bti.error_code = CASE
       WHEN bti.error_message = 'KIE_REQUEST_TIMEOUT' THEN 'KIE_REQUEST_TIMEOUT'
       WHEN bti.error_message IS NOT NULL THEN COALESCE(gt.error_code, gt.last_error_code, 'BATCH_ITEM_SUBMIT_FAILED')
       ELSE COALESCE(gt.error_code, gt.last_error_code)
     END
     WHERE bti.error_code IS NULL
       AND (bti.status = 'fail' OR bti.error_message IS NOT NULL)`,
  );
};

const seedFlagshipEnterpriseTenant = async () => {
  const childUsers = [
    {
      id: "user_flagship_sub_sales",
      username: "flagship_sub_sales",
      phone: "13800000006",
      displayName: "旗舰子账号-销售",
      creditsRole: "admin" as const,
      memberRole: "admin",
    },
    {
      id: "user_flagship_sub_ops",
      username: "flagship_sub_ops",
      phone: "13800000007",
      displayName: "旗舰子账号-运营",
      creditsRole: "employee" as const,
      memberRole: "member",
    },
    {
      id: "user_flagship_sub_design",
      username: "flagship_sub_design",
      phone: "13800000008",
      displayName: "旗舰子账号-设计",
      creditsRole: "employee" as const,
      memberRole: "member",
    },
  ];

  const tenantCredits = env.credits.enabled
    ? await ensureTenantCreditsBundle({
        tenantName: "企业旗舰版演示企业",
        initialPoints: await planGiftPoints("flagship"),
        members: [
          { email: creditsEmailForUsername("flagship"), role: "owner" },
          ...childUsers.map((user) => ({
            email: creditsEmailForUsername(user.username),
            role: user.creditsRole,
          })),
        ],
      })
    : null;

  if (tenantCredits) {
    await pool.query(
      `UPDATE app_users
       SET credits_user_id = :creditsUserId,
           credits_tenant_id = :creditsTenantId,
           account_scope = 'tenant'
       WHERE id = 'user_flagship'`,
      {
        creditsUserId: tenantCredits.userId,
        creditsTenantId: tenantCredits.tenantId,
      },
    );
  }

  for (const [index, user] of childUsers.entries()) {
    const creditsUserId = tenantCredits?.memberUserIds[index + 1] ?? null;
    const creditsTenantId = tenantCredits?.tenantId ?? null;
    const accountScope = tenantCredits ? "tenant" : "personal";

    await pool.query(
      `INSERT INTO app_users
        (id, username, phone, password_hash, display_name, status,
         credits_user_id, credits_tenant_id, account_scope)
       VALUES
        (:id, :username, :phone, :passwordHash, :displayName, 'active',
         :creditsUserId, :creditsTenantId, :accountScope)
       ON DUPLICATE KEY UPDATE
        username = VALUES(username),
        phone = VALUES(phone),
        display_name = VALUES(display_name),
        status = VALUES(status),
        credits_user_id = VALUES(credits_user_id),
        credits_tenant_id = VALUES(credits_tenant_id),
        account_scope = VALUES(account_scope)`,
      { ...user, creditsUserId, creditsTenantId, accountScope, passwordHash: hashPassword("123456") },
    );

    await pool.query(
      `INSERT INTO app_user_roles (user_id, role_code)
       VALUES (:userId, 'enterprise')
       ON DUPLICATE KEY UPDATE role_code = VALUES(role_code)`,
      { userId: user.id },
    );
  }

  await pool.query(
    `INSERT INTO enterprise_tenants
      (id, name, owner_user_id, subscription_user_id, status)
     VALUES
      ('tenant_flagship', '企业旗舰版演示企业', 'user_flagship', 'user_flagship', 'active')
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      owner_user_id = VALUES(owner_user_id),
      subscription_user_id = VALUES(subscription_user_id),
      status = VALUES(status)`,
  );

  const members = [
    { id: "em_flagship_owner", userId: "user_flagship", role: "owner" },
    ...childUsers.map((user) => ({
      id: `em_${user.id.replace(/^user_/, "")}`,
      userId: user.id,
      role: user.memberRole,
    })),
  ];

  for (const member of members) {
    await pool.query(
      `INSERT INTO enterprise_members
        (id, tenant_id, user_id, member_role, status)
       VALUES
        (:id, 'tenant_flagship', :userId, :role, 'active')
       ON DUPLICATE KEY UPDATE
        member_role = VALUES(member_role),
        status = VALUES(status)`,
      member,
    );
  }
};

const seedAgentOperationsData = async () => {
  const [enterpriseRows] = await pool.query<any[]>(
    `SELECT credits_user_id, credits_tenant_id, account_scope
     FROM app_users
     WHERE id = 'user_enterprise'
     LIMIT 1`,
  );
  const enterprise = enterpriseRows[0];

  if (enterprise?.credits_user_id) {
    await pool.query(
      `INSERT INTO application_customer_links
        (id, application_code, user_id, credits_user_id, account_scope,
         credits_tenant_id, created_by_user_id, created_by_role_code, status, metadata_json)
       VALUES
        ('acl_seed_agent_enterprise', 'used-car-platform', 'user_enterprise', :creditsUserId, :accountScope,
         :creditsTenantId, 'user_agent', 'agent', 'active', :metadataJson)
       ON DUPLICATE KEY UPDATE
        credits_user_id = VALUES(credits_user_id),
        account_scope = VALUES(account_scope),
        credits_tenant_id = VALUES(credits_tenant_id),
        created_by_user_id = VALUES(created_by_user_id),
        created_by_role_code = VALUES(created_by_role_code),
        status = VALUES(status),
        metadata_json = VALUES(metadata_json)`,
      {
        creditsUserId: enterprise.credits_user_id,
        creditsTenantId: enterprise.credits_tenant_id,
        accountScope: enterprise.account_scope,
        metadataJson: JSON.stringify({
          seededFor: "phase-6-agent-operations",
          applicationName: "usedCarPlatform",
        }),
      },
    );

    await pool.query(
      `INSERT INTO agent_customer_relations
        (id, agent_user_id, customer_user_id, customer_credits_user_id,
         application_code, relation_type, status, metadata_json)
       VALUES
        ('acr_seed_agent_enterprise', 'user_agent', 'user_enterprise', :creditsUserId,
         'used-car-platform', 'direct', 'active', :metadataJson)
       ON DUPLICATE KEY UPDATE
        customer_credits_user_id = VALUES(customer_credits_user_id),
        relation_type = VALUES(relation_type),
        status = VALUES(status),
        metadata_json = VALUES(metadata_json)`,
      {
        creditsUserId: enterprise.credits_user_id,
        metadataJson: JSON.stringify({
          source: "demo-seed",
          approvalMode: "auto",
        }),
      },
    );
  } else {
    console.warn("Skipped seeded agent/customer credit links because user_enterprise has no credits link.");
  }

  const leads = [
    {
      id: "lead_agent_001",
      applicationCode: "used-car-platform",
      customerName: "华东二手车展厅",
      phone: "13900001111",
      source: "agent_referral",
      stage: "demo_scheduled",
      expectedPoints: 120000,
      note: "已约视觉工作台批量上新演示",
    },
    {
      id: "lead_agent_002",
      applicationCode: "clothing_ai",
      customerName: "新锐服装工作室",
      phone: "13900002222",
      source: "offline_event",
      stage: "new",
      expectedPoints: 80000,
      note: "关注 model_generate 与 try_on_generate",
    },
  ];

  for (const lead of leads) {
    await pool.query(
      `INSERT INTO agent_leads
        (id, agent_user_id, application_code, customer_name, phone, source,
         stage, expected_points, note, status)
       VALUES
        (:id, 'user_agent', :applicationCode, :customerName, :phone, :source,
         :stage, :expectedPoints, :note, 'active')
       ON DUPLICATE KEY UPDATE
        application_code = VALUES(application_code),
        customer_name = VALUES(customer_name),
        phone = VALUES(phone),
        source = VALUES(source),
        stage = VALUES(stage),
        expected_points = VALUES(expected_points),
        note = VALUES(note),
        status = VALUES(status)`,
      lead,
    );
  }

  await pool.query(
     `INSERT INTO agent_settlement_bills
       (id, agent_user_id, period, total_commission_points, status)
      VALUES
      ('asb_agent_2026_06', 'user_agent', '2026-06', 1800.0000, 'draft')
     ON DUPLICATE KEY UPDATE
      total_commission_points = VALUES(total_commission_points),
      status = VALUES(status)`,
  );

  await pool.query(
    `INSERT INTO agent_commission_previews
      (id, agent_user_id, customer_user_id, application_code, period,
       consumed_points, commission_rate, commission_points, status, settlement_id)
     VALUES
      ('acp_agent_enterprise_2026_06', 'user_agent', 'user_enterprise',
       'used-car-platform', '2026-06', 18000.0000, 0.1000, 1800.0000,
       'preview', 'asb_agent_2026_06')
     ON DUPLICATE KEY UPDATE
      customer_user_id = VALUES(customer_user_id),
      application_code = VALUES(application_code),
      period = VALUES(period),
      consumed_points = VALUES(consumed_points),
      commission_rate = VALUES(commission_rate),
      commission_points = VALUES(commission_points),
      status = VALUES(status),
      settlement_id = VALUES(settlement_id)`,
  );

  const materials = [
    {
      id: "mat_agent_used_car_quickstart",
      title: "usedCarPlatform 快速演示话术",
      category: "training",
      applicationCode: "used-car-platform",
      url: "/docs/reusable-credits-three-role-back-office.md",
      sortOrder: 10,
    },
    {
      id: "mat_agent_clothing_ai_waitlist",
      title: "clothing_ai 预约客户说明",
      category: "sales",
      applicationCode: "clothing_ai",
      url: "/docs/first-release-account-creation-policy.md",
      sortOrder: 20,
    },
  ];

  for (const material of materials) {
    await pool.query(
      `INSERT INTO agent_materials
        (id, title, category, application_code, url, status, sort_order)
       VALUES
        (:id, :title, :category, :applicationCode, :url, 'active', :sortOrder)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        application_code = VALUES(application_code),
        url = VALUES(url),
        status = VALUES(status),
        sort_order = VALUES(sort_order)`,
      material,
    );
  }

  await pool.query(
    `INSERT INTO agent_support_tickets
      (id, agent_user_id, subject, category, priority, status, last_message)
     VALUES
      ('ast_agent_001', 'user_agent', '客户充值后积分到账确认', 'billing',
       'normal', 'open', '需要核对客户充值订单与积分流水。')
     ON DUPLICATE KEY UPDATE
      subject = VALUES(subject),
      category = VALUES(category),
      priority = VALUES(priority),
      status = VALUES(status),
      last_message = VALUES(last_message)`,
  );
};

const run = async () => {
  const connection = await pool.getConnection();
  try {
    for (const migration of migrations) {
      await connection.query(migration);
    }
    await addColumnIfMissing("app_users", "phone", "VARCHAR(32) NULL AFTER username");
    await addUniqueIndexIfMissing("app_users", "uk_app_users_phone", "(phone)");
    await addColumnIfMissing("delivery_assets", "local_path", "VARCHAR(1024) NULL");
    await addColumnIfMissing("delivery_assets", "deleted_at", "DATETIME(3) NULL");
    await addColumnIfMissing("delivery_packages", "task_id", "VARCHAR(64) NULL");
    await addColumnIfMissing("delivery_packages", "package_path", "VARCHAR(1024) NULL");
    await addColumnIfMissing("delivery_packages", "expires_at", "DATETIME(3) NULL");
    await addColumnIfMissing("batch_task_items", "source_asset_ids_json", "JSON NULL");
    await addColumnIfMissing("batch_task_items", "error_code", "VARCHAR(120) NULL");
    await makeColumnNullable("generation_tasks", "input_asset_id", "VARCHAR(64) NULL");

    await addColumnIfMissing("assets", "user_id", "VARCHAR(64) NOT NULL DEFAULT 'user_admin' AFTER id");
    await addIndexIfMissing("assets", "idx_assets_user_purpose_created", "(user_id, purpose, created_at)");

    await addColumnIfMissing("generation_tasks", "user_id", "VARCHAR(64) NOT NULL DEFAULT 'user_admin' AFTER id");
    await addIndexIfMissing(
      "generation_tasks",
      "idx_generation_tasks_user_module_created",
      "(user_id, module_code, created_at)",
    );
    await addIndexIfMissing(
      "generation_tasks",
      "idx_generation_tasks_user_status_created",
      "(user_id, status, created_at)",
    );

    await addColumnIfMissing("generation_tasks", "credits_user_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "credits_tenant_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "account_scope", "VARCHAR(16) NULL");
    await addColumnIfMissing("generation_tasks", "subscription_user_key", "VARCHAR(64) NULL");
    await addColumnIfMissing("generation_tasks", "subscription_plan_code", "VARCHAR(32) NULL");
    await addColumnIfMissing("generation_tasks", "billing_task_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "billing_status", "VARCHAR(24) NULL");
    await addColumnIfMissing("generation_tasks", "estimated_points", "DECIMAL(18, 4) NULL");
    await addColumnIfMissing("generation_tasks", "settled_points", "DECIMAL(18, 4) NULL");
    await addColumnIfMissing("generation_tasks", "deadline_at", "DATETIME(3) NULL");
    await addColumnIfMissing("generation_tasks", "soft_timeout_at", "DATETIME(3) NULL");
    await addColumnIfMissing("generation_tasks", "fallback_started_at", "DATETIME(3) NULL");
    await addColumnIfMissing("generation_tasks", "active_model", "VARCHAR(80) NULL");
    await addColumnIfMissing("generation_tasks", "winning_model", "VARCHAR(80) NULL");
    await addColumnIfMissing("generation_tasks", "attempt_count", "INT NOT NULL DEFAULT 0");
    await addColumnIfMissing("generation_tasks", "poll_failure_count", "INT NOT NULL DEFAULT 0");
    await addColumnIfMissing("generation_tasks", "last_kie_poll_at", "DATETIME(3) NULL");
    await addColumnIfMissing("generation_tasks", "last_error_code", "VARCHAR(120) NULL");
    await backfillBatchItemErrorCodes();
    await addIndexIfMissing("generation_tasks", "idx_generation_tasks_billing_task", "(billing_task_id)");
    await addIndexIfMissing(
      "generation_tasks",
      "idx_generation_tasks_credits_user_created",
      "(credits_user_id, created_at)",
    );
    await addIndexIfMissing(
      "generation_tasks",
      "idx_generation_tasks_subscription_running",
      "(subscription_user_key, status, created_at)",
    );
    await addIndexIfMissing("generation_tasks", "idx_generation_tasks_billing_status", "(billing_status)");

    await addColumnIfMissing("batch_tasks", "user_id", "VARCHAR(64) NOT NULL DEFAULT 'user_admin' AFTER id");
    await addIndexIfMissing("batch_tasks", "idx_batch_tasks_user_status_created", "(user_id, status, created_at)");

    await addColumnIfMissing("batch_tasks", "credits_user_id", "BIGINT NULL");
    await addColumnIfMissing("batch_tasks", "credits_tenant_id", "BIGINT NULL");
    await addColumnIfMissing("batch_tasks", "account_scope", "VARCHAR(16) NULL");
    await addColumnIfMissing("batch_tasks", "subscription_user_key", "VARCHAR(64) NULL");
    await addColumnIfMissing("batch_tasks", "subscription_plan_code", "VARCHAR(32) NULL");
    await addColumnIfMissing("batch_tasks", "estimated_points", "DECIMAL(18, 4) NULL");
    await addColumnIfMissing("batch_tasks", "settled_points", "DECIMAL(18, 4) NULL");
    await addIndexIfMissing("batch_tasks", "idx_batch_tasks_credits_user_created", "(credits_user_id, created_at)");
    await addIndexIfMissing(
      "batch_tasks",
      "idx_batch_tasks_subscription_running",
      "(subscription_user_key, status, created_at)",
    );
    await addColumnIfMissing("account_creation_audit_logs", "idempotency_key", "VARCHAR(160) NULL");
    await addColumnIfMissing("account_creation_audit_logs", "request_hash", "CHAR(64) NULL");
    await addColumnIfMissing(
      "back_office_admin_policy_overrides",
      "developer_allows_create_users",
      "TINYINT(1) NOT NULL DEFAULT 1 AFTER admin_user_id",
    );
    await addIndexIfMissing(
      "account_creation_audit_logs",
      "idx_account_creation_audit_idempotency",
      "(operator_user_id, idempotency_key)",
    );
    await addColumnIfMissing("kie_task_records", "attempt_no", "INT NOT NULL DEFAULT 1");
    await addColumnIfMissing("kie_task_records", "model", "VARCHAR(80) NULL");
    await addColumnIfMissing("kie_task_records", "role", "VARCHAR(24) NOT NULL DEFAULT 'primary'");
    await addColumnIfMissing("kie_task_records", "is_winner", "TINYINT(1) NOT NULL DEFAULT 0");
    await addColumnIfMissing("kie_task_records", "finished_at", "DATETIME(3) NULL");
    await dropIndexIfExists("kie_task_records", "uk_kie_task_records_task");
    await addUniqueIndexIfMissing("kie_task_records", "uk_kie_task_records_task_role", "(task_id, role)");
    await backfillGenerationOwnership();
    await seedSubscriptionPlans();
    await seedAuthData();
    await migrateMockSubscriptions();
    await seedFlagshipEnterpriseTenant();
    await seedAgentOperationsData();
    console.log(`Applied ${migrations.length} MySQL migrations.`);
  } finally {
    connection.release();
    await closeCreditsAccountLinkPool();
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
