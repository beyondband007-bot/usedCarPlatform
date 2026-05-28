import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { pool } from "./mysql";

export class Repository {
  protected async query<T extends RowDataPacket[]>(sql: string, params?: Record<string, unknown>) {
    const [rows] = await pool.query<T>(sql, params as any);
    return rows;
  }

  protected async execute(sql: string, params?: Record<string, unknown>) {
    const [result] = await pool.execute<ResultSetHeader>(sql, params as any);
    return result;
  }
}
