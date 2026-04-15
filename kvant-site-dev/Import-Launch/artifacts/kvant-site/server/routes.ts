import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./auth";
import { registerAdminRoutes } from "./admin";
import { seedReviews } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  registerAdminRoutes(app);
  await seedReviews();
  return httpServer;
}
