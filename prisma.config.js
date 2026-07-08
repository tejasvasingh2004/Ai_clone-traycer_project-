import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "traycer-mini-frontend/prisma/schema.prisma",
  datasource: {
    url: env("NEON_DB_API"),
  },
});
