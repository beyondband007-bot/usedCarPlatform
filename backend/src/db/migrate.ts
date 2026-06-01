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
    await addColumnIfMissing("batch_task_items", "source_asset_ids_json", "JSON NULL");
    await makeColumnNullable("generation_tasks", "input_asset_id", "VARCHAR(64) NULL");
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
