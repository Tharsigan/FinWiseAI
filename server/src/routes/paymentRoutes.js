import { Router } from "express";

import { env } from "../config/env.js";
import { failure, success } from "../http/response.js";
import {
  createMpgsCheckoutSession,
  isMpgsConfigured,
} from "../services/mpgsService.js";

export const paymentRouter = Router();

paymentRouter.get("/status", (_req, res) => {
  const configured = isMpgsConfigured();
  success(
    res,
    {
      configured,
      provider: "mpgs",
      ...(configured ? { merchantId: env.mpgs.merchantId } : {}),
    },
    { source: "mpgs" },
  );
});

paymentRouter.post("/create-session", async (req, res, next) => {
  try {
    const session = await createMpgsCheckoutSession({
      amount: req.body?.amount,
      currency: req.body?.currency,
      reference: req.body?.reference,
      category: req.body?.category,
    });

    success(res, session, {
      source: "mpgs",
      meta: {
        provider: "mastercard_payment_gateway_services",
        operation: "CREATE_CHECKOUT_SESSION",
      },
    });
  } catch (error) {
    if (error?.status && error?.code && error?.message) {
      failure(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
});
