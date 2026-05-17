import { Router } from "express";

import { failure, success } from "../http/response.js";
import {
  buildSavingsPlannerPlan,
  parseSavingsPlannerPayload,
} from "../services/savingsPlannerService.js";

export const savingsRouter = Router();

savingsRouter.post("/plan", (req, res) => {
  const parsed = parseSavingsPlannerPayload(req.body);
  if (!parsed.ok) {
    failure(res, 400, parsed.code, parsed.message);
    return;
  }

  const plan = buildSavingsPlannerPlan(parsed.value);
  success(
    res,
    {
      ...plan,
      deterministicNote:
        "Phase 9 engine computes savings math, scenarios, milestones, and recommendations without relying on AI.",
    },
    {
      source: "savings_engine",
      meta: {
        engine: "savings_planner_v1",
      },
    },
  );
});
