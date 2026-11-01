import { decisionFilter } from "@e2e-dev/decision";
import { web } from "@e2e-dev/web";
import { gateway } from "ai";
import type { E2EConfig } from "e2e";

export default {
  targets: [
    {
      name: "chromium",
      engine: web(),
      app: {
        url: "http://localhost:3100",
        command: {
          executable: "pnpm",
          args: ["exec", "next", "dev", "-H", "127.0.0.1", "-p", "{port}"],
          env: { PHAINO_DEMO: "on" },
          startupTimeout: 120_000,
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  filters: [decisionFilter({ model: gateway.decisionModel("typesafe-ai/jev") })],
  reporters: ["list", "junit"],
} satisfies E2EConfig;
