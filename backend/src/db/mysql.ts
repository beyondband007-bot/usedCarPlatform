import mysql from "mysql2/promise";

import { env } from "../config/env";

export const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  database: env.mysql.database,
  user: env.mysql.user,
  password: env.mysql.password,
  waitForConnections: true,
  connectionLimit: env.mysql.connectionLimit,
  namedPlaceholders: true,
});

export const checkMysqlConnection = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
};
