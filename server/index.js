import dotenv from "dotenv";

dotenv.config({ override: true });

const { env } = await import("./src/config/env.js");
const { createFinwiseApp } = await import("./src/app.js");
const { warnForMissingSeylanEnv } = await import(
  "./src/services/seylanSandboxService.js"
);

const app = createFinwiseApp();

app.listen(env.port, "0.0.0.0", () => {
  console.log(`FinWise AI API listening on port ${env.port}`);
  warnForMissingSeylanEnv();
});
