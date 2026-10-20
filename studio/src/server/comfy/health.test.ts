import { describe, expect, it } from "vitest";
import { classifyProbe } from "./health";

describe("classifyProbe", () => {
  it("maps 404 to ok (reachable, hash just missing)", () => {
    expect(classifyProbe({ kind: "response", status: 404 }).status).toBe("ok");
  });

  it("maps 200 to ok", () => {
    expect(classifyProbe({ kind: "response", status: 200 }).status).toBe("ok");
  });

  it("maps 401 and 403 to unauthorized", () => {
    expect(classifyProbe({ kind: "response", status: 401 }).status).toBe("unauthorized");
    expect(classifyProbe({ kind: "response", status: 403 }).status).toBe("unauthorized");
  });

  it("maps a 500 upstream_error to upstream_down", () => {
    const result = classifyProbe({ kind: "response", status: 500, code: "upstream_error" });
    expect(result.status).toBe("upstream_down");
  });

  it("maps network errors to unreachable", () => {
    const result = classifyProbe({ kind: "thrown", error: new TypeError("fetch failed") });
    expect(result.status).toBe("unreachable");
  });

  it("maps timeouts to unreachable", () => {
    const timeout = new DOMException("The operation timed out", "TimeoutError");
    const result = classifyProbe({ kind: "thrown", error: timeout });
    expect(result.status).toBe("unreachable");
  });

  it("maps missing configuration to not_configured naming the env var", () => {
    const result = classifyProbe({ kind: "not_configured", envVar: "COMFY_API_KEY" });
    expect(result.status).toBe("not_configured");
    expect(result.message).toBe("Add your Comfy API key in Settings");
  });

  it("maps unexpected statuses to error", () => {
    expect(classifyProbe({ kind: "response", status: 418 }).status).toBe("error");
  });
});
