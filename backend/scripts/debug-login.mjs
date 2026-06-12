import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  database: 'used_car_platform',
  user: 'root',
  password: 'Root@123456',
  namedPlaceholders: true,
})

const userSelectSql = `
  SELECT
    u.id,
    u.username,
    u.phone,
    u.password_hash,
    u.display_name,
    u.status,
    u.credits_user_id,
    u.credits_tenant_id,
    u.account_scope,
    COALESCE(MIN(aur.role_code), 'enterprise') role_code,
    GROUP_CONCAT(DISTINCT arp.permission_code ORDER BY arp.permission_code SEPARATOR ',') permissions_csv,
    MAX(em.tenant_id) enterprise_tenant_id,
    MAX(et.name) enterprise_tenant_name,
    MAX(em.member_role) enterprise_member_role,
    MAX(et.owner_user_id) enterprise_owner_user_id,
    MAX(et.subscription_user_id) enterprise_subscription_user_id
  FROM app_users u
  LEFT JOIN app_user_roles aur ON aur.user_id = u.id
  LEFT JOIN app_role_permissions arp ON arp.role_code = aur.role_code
  LEFT JOIN enterprise_members em
    ON em.user_id = u.id
   AND em.status = 'active'
  LEFT JOIN enterprise_tenants et
    ON et.id = em.tenant_id
   AND et.status = 'active'
`

try {
  await pool.query('SELECT 1 AS ok')
  console.log('mysql ping ok')

  const [users] = await pool.query(
    'SELECT username, phone, status FROM app_users ORDER BY created_at DESC LIMIT 5',
  )
  console.log('sample users', users)

  for (const account of ['test', 'admin', users[0]?.username].filter(Boolean)) {
    const candidates = [account]
    try {
      const [rows] = await pool.query(
        `${userSelectSql}
         WHERE u.username IN (:candidates)
            OR u.phone IN (:candidates)
         GROUP BY u.id
         LIMIT 1`,
        { candidates },
      )
      console.log('account', account, 'rows', rows.length)
    } catch (error) {
      console.error('account', account, 'ERROR', error.message)
    }
  }
} catch (error) {
  console.error('QUERY ERROR:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
