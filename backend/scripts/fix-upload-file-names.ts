import { pool } from "../src/db/mysql";
import { normalizeMultipartFileName } from "../src/shared/fileName";

type AssetRow = {
  id: string;
  file_name: string;
};

const applyChanges = process.env.APPLY_FILE_NAME_FIX === "true";

const main = async () => {
  const [rows] = await pool.query<AssetRow[]>(
    `SELECT id, file_name
     FROM assets
     WHERE file_name IS NOT NULL AND file_name <> ''`,
  );

  const fixes = rows
    .map((row) => ({
      assetId: row.id,
      sourceFileName: row.file_name,
      fileName: normalizeMultipartFileName(row.file_name),
    }))
    .filter((item) => item.fileName !== item.sourceFileName);

  console.log(`Detected ${fixes.length} mojibake filename(s).`);
  for (const item of fixes) {
    console.log(`${item.assetId}: ${item.sourceFileName} -> ${item.fileName}`);
  }

  if (!applyChanges || fixes.length === 0) {
    console.log(applyChanges ? "No changes required." : "Dry run only. Set APPLY_FILE_NAME_FIX=true to apply.");
    return;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of fixes) {
      await connection.execute(
        "UPDATE assets SET file_name = :fileName WHERE id = :assetId",
        item,
      );
      await connection.execute(
        "UPDATE vehicle_library_materials SET file_name = :fileName WHERE asset_id = :assetId",
        item,
      );
    }
    await connection.commit();
    console.log(`Updated ${fixes.length} asset filename(s) and related vehicle-library materials.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

main()
  .catch((error) => {
    console.error("Filename repair failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
