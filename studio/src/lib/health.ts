import type { Backend } from "./backend";

export type HealthStatus =
  | "ok"
  | "unauthorized"
  | "upstream_down"
  | "unreachable"
  | "not_configured"
  | "error";

export type BackendHealth = {
  backend: Backend;
  status: HealthStatus;
  host: string | null;
  latencyMs: number | null;
  message?: string;
};
