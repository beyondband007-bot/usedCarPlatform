/** 单张/短视频等生成任务轮询间隔 */
export const GENERATION_TASK_POLL_MS = 25_000

/** 单任务最长轮询时长（与 GENERATION_TASK_POLL_MS 联动） */
export const GENERATION_TASK_POLL_MAX_MS = 20 * 60 * 1000

/** 批量上新任务状态轮询间隔 */
export const BATCH_TASK_POLL_MS = 5_000

/** 成片交付任务列表静默刷新间隔 */
export const DELIVERY_REFRESH_MS = 15_000

/** 工作台右侧「最近生成」列表刷新间隔 */
export const RECENT_REFRESH_MS = 15_000
