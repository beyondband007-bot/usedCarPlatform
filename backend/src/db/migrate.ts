import { pbkdf2Sync, randomBytes } from "node:crypto";

import { pool } from "./mysql";
import { migrations } from "./migrations";
import {
  defaultBackOfficePermissionPolicies,
  defaultBackOfficeRoles,
} from "../modules/platform/accountCreationPolicyDefaults";

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

const hashPassword = (password: string) => {
  const iterations = 120_000;
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
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

  await pool.query(
    `INSERT INTO app_role_permissions (role_code, permission_code)
     VALUES
      ('developer', 'menu:home'),
      ('developer', 'menu:workspace'),
      ('developer', 'menu:pricing'),
      ('developer', 'menu:points'),
      ('developer', 'menu:recharge'),
      ('developer', 'menu:admin'),
      ('developer', 'account:create:admin'),
      ('developer', 'account:create:agent'),
      ('developer', 'account:create:user'),
      ('developer', 'policy:account-creation:manage'),
      ('admin', 'menu:home'),
      ('admin', 'menu:workspace'),
      ('admin', 'menu:pricing'),
      ('admin', 'menu:points'),
      ('admin', 'menu:recharge'),
      ('admin', 'menu:admin'),
      ('admin', 'account:create:agent'),
      ('admin', 'account:create:user'),
      ('admin', 'policy:agent-user-creation:manage'),
      ('admin', 'policy:user-agent-promotion:manage'),
      ('agent', 'menu:home'),
      ('agent', 'menu:points'),
      ('agent', 'menu:recharge'),
      ('agent', 'menu:admin'),
      ('agent', 'account:create:user'),
      ('enterprise', 'menu:home'),
      ('enterprise', 'menu:workspace'),
      ('enterprise', 'menu:pricing'),
      ('enterprise', 'menu:points'),
      ('enterprise', 'menu:recharge')
     ON DUPLICATE KEY UPDATE
      permission_code = VALUES(permission_code)`,
  );

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
      creditsUserId: 6,
    },
    {
      id: "user_admin",
      username: "admin",
      phone: "13800000001",
      displayName: "管理员",
      role: "admin",
      plan: "flagship",
      creditsUserId: 1,
    },
    {
      id: "user_agent",
      username: "agent",
      phone: "13800000009",
      displayName: "代理商",
      role: "agent",
      plan: "team",
      creditsUserId: 7,
    },
    {
      id: "user_enterprise",
      username: "enterprise",
      phone: "13800000002",
      displayName: "企业用户",
      role: "enterprise",
      plan: "team",
      creditsUserId: 2,
    },
    {
      id: "user_basic",
      username: "basic",
      phone: "13800000003",
      displayName: "基础版企业用户",
      role: "enterprise",
      plan: "basic",
      creditsUserId: 3,
    },
    {
      id: "user_team",
      username: "team",
      phone: "13800000004",
      displayName: "团队版企业用户",
      role: "enterprise",
      plan: "team",
      creditsUserId: 4,
    },
    {
      id: "user_flagship",
      username: "flagship",
      phone: "13800000005",
      displayName: "旗舰版企业用户",
      role: "enterprise",
      plan: "flagship",
      creditsUserId: 5,
    },
  ];

  for (const user of users) {
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
      { ...user, passwordHash: hashPassword("123456") },
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

const seedFlagshipEnterpriseTenant = async () => {
  const childUsers = [
    {
      id: "user_flagship_sub_sales",
      username: "flagship_sub_sales",
      phone: "13800000006",
      displayName: "旗舰子账号-销售",
      creditsUserId: 5,
    },
    {
      id: "user_flagship_sub_ops",
      username: "flagship_sub_ops",
      phone: "13800000007",
      displayName: "旗舰子账号-运营",
      creditsUserId: 5,
    },
    {
      id: "user_flagship_sub_design",
      username: "flagship_sub_design",
      phone: "13800000008",
      displayName: "旗舰子账号-设计",
      creditsUserId: 5,
    },
  ];

  for (const user of childUsers) {
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
      { ...user, passwordHash: hashPassword("123456") },
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
    { id: "em_flagship_sub_sales", userId: "user_flagship_sub_sales", role: "admin" },
    { id: "em_flagship_sub_ops", userId: "user_flagship_sub_ops", role: "member" },
    { id: "em_flagship_sub_design", userId: "user_flagship_sub_design", role: "member" },
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
    await makeColumnNullable("generation_tasks", "input_asset_id", "VARCHAR(64) NULL");

    await addColumnIfMissing("generation_tasks", "credits_user_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "credits_tenant_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "account_scope", "VARCHAR(16) NULL");
    await addColumnIfMissing("generation_tasks", "subscription_user_key", "VARCHAR(64) NULL");
    await addColumnIfMissing("generation_tasks", "subscription_plan_code", "VARCHAR(32) NULL");
    await addColumnIfMissing("generation_tasks", "billing_task_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "billing_status", "VARCHAR(24) NULL");
    await addColumnIfMissing("generation_tasks", "estimated_points", "DECIMAL(18, 4) NULL");
    await addColumnIfMissing("generation_tasks", "settled_points", "DECIMAL(18, 4) NULL");
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
    await seedSubscriptionPlans();
    await seedAuthData();
    await migrateMockSubscriptions();
    await seedFlagshipEnterpriseTenant();
    console.log(`Applied ${migrations.length} MySQL migrations.`);
  } finally {
    connection.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
