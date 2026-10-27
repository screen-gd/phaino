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

const ERROR_FALLBACKS = {
  unauthorized: "API key rejected",
  upstream_down: "Comfy Cloud is unavailable",
  unreachable: "Can't reach the host",
  error: "Unknown error",
} as const;

/** Human-readable status for badges and the Settings card. */
export function healthLabel(health: ComfyHealth | null): string {
  if (!health) return "Checking...";
  switch (health.status) {
    case "ok":
      return "Connected";
    case "not_configured":
      return "Not connected";
    case "unauthorized":
    case "upstream_down":
    case "unreachable":
    case "error":
      return `Error: ${health.message ?? ERROR_FALLBACKS[health.status]}`;
    default: {
      const _exhaustive: never = health.status;
      return _exhaustive;
    }
  }
}
