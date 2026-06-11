import mysql from 'mysql2/promise'

const pool = await mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Root@123456',
  database: 'used_car_platform',
})

const [rows] = await pool.query(
  `SELECT id, username, display_name, credits_user_id, credits_tenant_id, account_scope
   FROM app_users
   WHERE id IN ('user_flagship', 'user_enterprise', 'user_demo')
      OR username LIKE '%flagship%'
   ORDER BY id`,
)

console.table(rows)
await pool.end()
