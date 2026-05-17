import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { apiRouteLines, buildMetaPayload } from "./http/meta.js";
import { success } from "./http/response.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { aiMoneyAdviceRouter } from "./routes/aiMoneyAdviceRoutes.js";
import { aiRouter } from "./routes/aiRoutes.js";
import { alertRouter } from "./routes/alertRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { bankRouter } from "./routes/bankRoutes.js";
import { intelligenceRouter } from "./routes/intelligenceRoutes.js";
import { mockRouter } from "./routes/mockRoutes.js";
import { paymentRouter } from "./routes/paymentRoutes.js";
import { savingsRouter } from "./routes/savingsRoutes.js";

/** @returns {import('express').Express} */
export function createFinwiseApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(requestIdMiddleware);
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "512kb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => {
    success(
      res,
      {
        service: "finwise-ai-api",
        uptimeSec: Math.round(process.uptime()),
        environment: process.env.NODE_ENV || "development",
        routes: apiRouteLines(),
      },
      { source: "control_plane" },
    );
  });

  app.get("/api/meta", (_req, res) => {
    success(res, buildMetaPayload(), { source: "control_plane" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/mock", mockRouter);
  app.use("/api/alerts", alertRouter);
  app.use("/api/bank", bankRouter);
  app.use("/api/payment", paymentRouter);
  app.use("/api/savings", savingsRouter);
  app.use("/api/intelligence", intelligenceRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/ai", aiMoneyAdviceRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
