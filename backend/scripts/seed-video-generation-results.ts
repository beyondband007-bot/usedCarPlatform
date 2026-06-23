import mysql from "mysql2/promise";

import { env } from "../src/config/env";

const VIDEO_URLS = [
  "https://aicar.facemini.com/results/video-generation/video-generation_5e8bc8560cfc403ea6630e63705c2311.mp4",
  "https://aicar.facemini.com/results/video-generation/video-generation_d106681b78dc4a9ebd6c32ffe37b344f.mp4",
  "https://aicar.facemini.com/results/video-generation/video-generation_d88033c1b1ed4344ad3eb754aa51c2dc.mp4",
] as const;

const VEHICLE_NAMES = ["BMW 3 Series", "Mercedes-Benz C-Class", "Audi A4L"] as const;
const TEMPLATE_IDS = ["ref-video-001", "ref-video-004", "ref-video-002"] as const;

function buildRequiredInputs(templateId: string, vehicleName: string) {
  return {
    vehicle: {
      name: vehicleName,
      language: "Chinese",
    },
    template: {
      templateId,
      type: templateId === "ref-video-001" ? "dealership" : "single-car",
    },
  };
}

async function resolveTargetUserIds(pool: mysql.Pool) {
  const userIdArg = process.argv.find((arg) => arg.startsWith("--user-id="))?.split("=")[1];
  if (userIdArg?.trim()) return [userIdArg.trim()];

  const [appUsers] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT id FROM app_users WHERE status = 'active' ORDER BY created_at ASC`,
  );
  if (appUsers.length) {
    return appUsers.map((row) => String(row.id));
  }

  const [taskUsers] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT DISTINCT user_id
     FROM generation_tasks
     ORDER BY user_id ASC`,
  );
  if (taskUsers.length) {
    return taskUsers.map((row) => String(row.user_id));
  }

  return ["user_admin"];
}

async function seedForUser(pool: mysql.Pool, userId: string, now: number) {
  const userKey = userId.replace(/^user_/, "").slice(0, 16);

  for (const [index, videoUrl] of VIDEO_URLS.entries()) {
    const fileName = videoUrl.split("/").pop() ?? `video-generation_seed_${index + 1}.mp4`;
    const videoKey = fileName
      .replace(/^video-generation_/, "")
      .replace(/\.mp4$/i, "")
      .slice(0, 24);
    const taskId = `task_vg_${userKey}_${videoKey}`;
    const scriptDraftId = `vsd_${userKey}_${index + 1}`;
    const vehicleName = VEHICLE_NAMES[index];
    const templateId = TEMPLATE_IDS[index];
    const createdAt = new Date(now - (VIDEO_URLS.length - index) * 60_000);

    await pool.execute(
      `INSERT INTO video_script_drafts
        (id, user_id, vehicle_name, digital_human_id, reference_material_id,
         duration_seconds, output_ratio, video_resolution, script_text,
         final_video_prompt, required_inputs_json, prompt_bundle_json, risk_notes_json,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 15, '9:16', '720p', ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        vehicle_name = VALUES(vehicle_name),
        reference_material_id = VALUES(reference_material_id),
        required_inputs_json = VALUES(required_inputs_json),
        updated_at = VALUES(updated_at)`,
      [
        scriptDraftId,
        userId,
        vehicleName,
        "dh-001",
        templateId,
        `${vehicleName} narration script sample.`,
        `${vehicleName} digital-human vehicle introduction video prompt.`,
        JSON.stringify(buildRequiredInputs(templateId, vehicleName)),
        JSON.stringify({ source: "seed-script" }),
        JSON.stringify([]),
        createdAt,
        createdAt,
      ],
    );

    const resultJson = JSON.stringify([
      {
        url: videoUrl,
        sourceUrl: videoUrl,
        contentType: "video/mp4",
      },
    ]);

    await pool.execute(
      `INSERT INTO generation_tasks
        (id, user_id, module_code, status, progress, option_id, output_ratio, resolution,
         prompt, result_json, attempt_count, poll_failure_count, created_at, updated_at)
       VALUES (?, ?, 'video-generation', 'success', 100, ?, '9:16', '720p', ?, ?, 1, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
        status = 'success',
        progress = 100,
        result_json = VALUES(result_json),
        option_id = VALUES(option_id),
        updated_at = VALUES(updated_at)`,
      [
        taskId,
        userId,
        scriptDraftId,
        `${vehicleName} digital-human vehicle introduction video.`,
        resultJson,
        createdAt,
        createdAt,
      ],
    );

    console.log(`seeded ${taskId} (${userId}) -> ${videoUrl}`);
  }
}

async function seedVideoGenerationResults() {
  const pool = mysql.createPool({
    host: env.mysql.host,
    port: env.mysql.port,
    database: env.mysql.database,
    user: env.mysql.user,
    password: env.mysql.password,
    connectionLimit: 2,
  });

  const userIds = await resolveTargetUserIds(pool);
  const now = Date.now();

  try {
    for (const userId of userIds) {
      await seedForUser(pool, userId, now);
    }

    for (const userId of userIds) {
      const [rows] = await pool.query<mysql.RowDataPacket[]>(
        `SELECT id, user_id, status, created_at
         FROM generation_tasks
         WHERE module_code = 'video-generation' AND user_id = ?
         ORDER BY created_at DESC
         LIMIT 10`,
        [userId],
      );

      console.log(`seed complete for user_id=${userId}`);
      console.log(JSON.stringify(rows, null, 2));
    }
  } finally {
    await pool.end();
  }
}

seedVideoGenerationResults()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
