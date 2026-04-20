import { buildServer } from "./index.js";

async function start() {
  const app = await buildServer();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`server listening on http://localhost:${port}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
