import { pool } from "./mysql";
import { migrations } from "./migrations";

const run = async () => {
  const connection = await pool.getConnection();
  try {
    for (const migration of migrations) {
      await connection.query(migration);
    }
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
