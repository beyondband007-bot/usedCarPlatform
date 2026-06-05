import { Router } from "express";

import { asyncHandler } from "../../shared/asyncHandler";
import { ok } from "../../shared/response";
import { getEnterpriseCreditsOverview } from "./enterpriseCreditsService";
import { listEnterpriseChildMembers } from "./enterpriseMembersService";

export const enterpriseRoutes = Router();

enterpriseRoutes.get(
  "/members",
  asyncHandler(async (req, res) => {
    ok(res, {
      items: await listEnterpriseChildMembers(req.headers),
    });
  }),
);

enterpriseRoutes.get(
  "/credits/overview",
  asyncHandler(async (req, res) => {
    ok(res, await getEnterpriseCreditsOverview(req.headers));
  }),
);
