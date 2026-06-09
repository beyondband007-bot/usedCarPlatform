import type { Request } from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../../db/mysql";
import { errors } from "../../shared/errors";
import { getRequiredCurrentUser } from "../auth/authMiddleware";

type PlatformAgentRow = RowDataPacket & {
  user_id: string;
  username: string;
  display_name: string;
  phone: string | null;
  credits_user_id: number | null;
  status: string;
  assigned_by_user_id: string | null;
  assigned_by_username: string | null;
  assigned_by_display_name: string | null;
  assignment_status: string;
  created_at: Date;
  updated_at: Date;
  customer_count: number | string;
  lead_count: number | string;
  open_ticket_count: number | string;
  applications_csv: string | null;
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function listPlatformAgents(req: Request) {
  const current = getRequiredCurrentUser(req);
  if (current.user.role !== "developer" && current.user.role !== "admin") {
    throw errors.forbidden("agent management requires Developer or Admin role");
  }

  const [rows] = await pool.query<PlatformAgentRow[]>(
    `SELECT
       u.id user_id,
       u.username,
       u.display_name,
       u.phone,
       u.credits_user_id,
       u.status,
       boa.assigned_by_user_id,
       assigned_by.username assigned_by_username,
       assigned_by.display_name assigned_by_display_name,
       boa.status assignment_status,
       boa.created_at,
       boa.updated_at,
       COUNT(DISTINCT CASE WHEN acr.status = 'active' THEN acr.customer_user_id END) customer_count,
       COUNT(DISTINCT CASE WHEN al.status = 'active' THEN al.id END) lead_count,
       COUNT(DISTINCT CASE WHEN ast.status <> 'closed' THEN ast.id END) open_ticket_count,
       GROUP_CONCAT(
         DISTINCT agent_apps.application_code
         ORDER BY agent_apps.application_code
         SEPARATOR ','
       ) applications_csv
     FROM back_office_role_assignments boa
     JOIN app_users u ON u.id = boa.user_id
     LEFT JOIN app_users assigned_by ON assigned_by.id = boa.assigned_by_user_id
     LEFT JOIN agent_customer_relations acr ON acr.agent_user_id = u.id
     LEFT JOIN agent_leads al ON al.agent_user_id = u.id
     LEFT JOIN agent_support_tickets ast ON ast.agent_user_id = u.id
     LEFT JOIN (
       SELECT agent_user_id, application_code
       FROM agent_customer_relations
       WHERE status = 'active'
       UNION
       SELECT agent_user_id, application_code
       FROM agent_leads
       WHERE status = 'active'
     ) agent_apps ON agent_apps.agent_user_id = u.id
     WHERE boa.role_code = 'agent'
       AND boa.status = 'active'
       AND u.status = 'active'
     GROUP BY
       u.id,
       u.username,
       u.display_name,
       u.phone,
       u.credits_user_id,
       u.status,
       boa.assigned_by_user_id,
       assigned_by.username,
       assigned_by.display_name,
       boa.status,
       boa.created_at,
       boa.updated_at
     ORDER BY boa.created_at DESC`,
  );

  return {
    items: rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      phone: row.phone,
      creditsUserId: row.credits_user_id,
      status: row.status,
      assignmentStatus: row.assignment_status,
      assignedByUserId: row.assigned_by_user_id,
      assignedByUsername: row.assigned_by_username,
      assignedByDisplayName: row.assigned_by_display_name,
      customerCount: toNumber(row.customer_count),
      leadCount: toNumber(row.lead_count),
      openTicketCount: toNumber(row.open_ticket_count),
      applications: row.applications_csv ? row.applications_csv.split(",").filter(Boolean) : [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    })),
  };
}
