import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { initializeDatabase } from "./db/database.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerAppRoutes } from "./routes/app.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: string;
      username: string;
      role: "admin" | "user";
    };
  }
}

export async function buildServer() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(multipart);
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "online-exam-secret",
  });

  initializeDatabase();

  app.get("/api/health", async () => ({ ok: true }));

  await registerAdminRoutes(app);
  await registerAppRoutes(app);

  return app;
}
