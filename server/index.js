import dotenv from "dotenv";

dotenv.config({ override: true });

const { env } = await import("./src/config/env.js");
const { createFinwiseApp } = await import("./src/app.js");
const { warnForMissingSeylanEnv } = await import(
  "./src/services/seylanSandboxService.js"
);

const app = createFinwiseApp();

app.listen(env.port, () => {
  console.log(`FinWise AI API listening on http://localhost:${env.port}`);
  warnForMissingSeylanEnv();
});
