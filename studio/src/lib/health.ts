export type HealthStatus =
  | "ok"
  | "unauthorized"
  | "upstream_down"
  | "unreachable"
  | "not_configured"
  | "error";

export type ComfyHealth = {
  status: HealthStatus;
  target: "cloud" | "custom";
  host: string;
  latencyMs: number | null;
  message?: string;
};
