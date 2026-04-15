import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./auth";
import { registerAdminRoutes } from "./admin";
import { registerPaymentRoutes } from "./payments";
import { seedReviews } from "./seed";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  registerAuthRoutes(app);
  registerAdminRoutes(app);
  registerPaymentRoutes(app);
  await seedReviews();
  return httpServer;
}
