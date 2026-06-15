export interface PointsRechargePreset {
  amount: number;
  points: number;
}

export interface PointsRechargeOrderItem {
  orderNo: string;
  amountYuan: number;
  points: number;
  status: "pending" | "paid" | "failed";
  createdAt: string;
}

export const POINTS_PER_YUAN = 100;

export const pointsRechargePresets: PointsRechargePreset[] = [
  { amount: 100, points: 10000 },
  { amount: 200, points: 20000 },
  { amount: 500, points: 50000 },
  { amount: 1000, points: 100000 },
  { amount: 2000, points: 200000 },
];

export const defaultRecentRechargeOrders: PointsRechargeOrderItem[] = [
  {
    orderNo: "RC178040364972419F6139C",
    amountYuan: 100,
    points: 10000,
    status: "pending",
    createdAt: "2025-05-28 14:10:02",
  },
  {
    orderNo: "RC178040364972419F6138",
    amountYuan: 200,
    points: 20000,
    status: "pending",
    createdAt: "2025-05-27 09:22:18",
  },
  {
    orderNo: "RC178040364972419F6137",
    amountYuan: 500,
    points: 50000,
    status: "pending",
    createdAt: "2025-05-26 16:05:44",
  },
];

export function calcPointsFromAmount(amount: number) {
  const normalized = Math.max(1, Math.floor(amount));
  return normalized * POINTS_PER_YUAN;
}

export function createLocalRechargeOrder(amountYuan: number): PointsRechargeOrderItem {
  const amount = Math.max(1, Math.floor(amountYuan));

  return {
    orderNo: `RC${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    amountYuan: amount,
    points: calcPointsFromAmount(amount),
    status: "pending",
    createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
  };
}
