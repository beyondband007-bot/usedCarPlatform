import { pool } from "./mysql";
import { migrations } from "./migrations";

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

const makeColumnNullable = async (tableName: string, columnName: string, definition: string) => {
  await pool.query(`ALTER TABLE ${tableName} MODIFY COLUMN ${columnName} ${definition}`);
};

const run = async () => {
  const connection = await pool.getConnection();
  try {
    for (const migration of migrations) {
      await connection.query(migration);
    }
    await addColumnIfMissing("delivery_assets", "local_path", "VARCHAR(1024) NULL");
    await addColumnIfMissing("delivery_assets", "deleted_at", "DATETIME(3) NULL");
    await addColumnIfMissing("delivery_packages", "task_id", "VARCHAR(64) NULL");
    await addColumnIfMissing("delivery_packages", "package_path", "VARCHAR(1024) NULL");
    await addColumnIfMissing("delivery_packages", "expires_at", "DATETIME(3) NULL");
    await makeColumnNullable("generation_tasks", "input_asset_id", "VARCHAR(64) NULL");

    await addColumnIfMissing("generation_tasks", "credits_user_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "credits_tenant_id", "BIGINT NULL");
    await addColumnIfMissing("generation_tasks", "account_scope", "VARCHAR(16) NULL");
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
    await addIndexIfMissing("generation_tasks", "idx_generation_tasks_billing_status", "(billing_status)");

    await addColumnIfMissing("batch_tasks", "credits_user_id", "BIGINT NULL");
    await addColumnIfMissing("batch_tasks", "credits_tenant_id", "BIGINT NULL");
    await addColumnIfMissing("batch_tasks", "account_scope", "VARCHAR(16) NULL");
    await addColumnIfMissing("batch_tasks", "estimated_points", "DECIMAL(18, 4) NULL");
    await addColumnIfMissing("batch_tasks", "settled_points", "DECIMAL(18, 4) NULL");
    await addIndexIfMissing("batch_tasks", "idx_batch_tasks_credits_user_created", "(credits_user_id, created_at)");

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
