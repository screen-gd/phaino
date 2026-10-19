import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  DeliveryOutcome,
  IdempotencyClaim,
  IdempotencyClaimInput,
  IdempotencyStore,
} from "@opencoredev/social-sdk";

type StoredClaim = {
  claimId: string;
  fingerprint: string;
  targetKeys: readonly string[];
  outcomes: Record<string, DeliveryOutcome>;
};

type StoreData = { claims: Record<string, StoredClaim> };

/** Serialized read-modify-write access to one JSON file: temp write, then rename. */
export class QueuedJsonFile<T extends object> {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly file: string,
    private readonly empty: () => T,
  ) {}

  private enqueue<R>(task: () => Promise<R>): Promise<R> {
    const run = this.queue.then(task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async read(): Promise<T> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as T;
    } catch {
      return this.empty();
    }
  }

  update<R>(fn: (data: T) => R | Promise<R>): Promise<R> {
    return this.enqueue(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });
  }

  private async write(data: T): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2));
    await fs.rename(tmp, this.file);
  }
}

/**
 * IdempotencyStore backed by ${dataDir}/social/idempotency.json.
 * Single-process only: the promise queue makes claim/saveOutcome atomic
 * inside this process; a second process could race on the same file.
 */
export class FileIdempotencyStore implements IdempotencyStore {
  private readonly data: QueuedJsonFile<StoreData>;

  constructor(file: string) {
    this.data = new QueuedJsonFile(file, () => ({ claims: {} }));
  }

  claim(input: IdempotencyClaimInput): Promise<IdempotencyClaim> {
    return this.data.update((d) => {
      const mapKey = JSON.stringify([input.scope, input.key]);
      const existing = d.claims[mapKey];
      if (existing) {
        if (
          existing.fingerprint !== input.fingerprint ||
          JSON.stringify(existing.targetKeys) !== JSON.stringify(input.targetKeys)
        ) {
          return { kind: "conflict" };
        }
        return {
          kind: "existing",
          claimId: existing.claimId,
          outcomes: structuredClone(existing.outcomes),
        };
      }
      const claimId = `claim-${crypto.randomUUID()}`;
      d.claims[mapKey] = {
        claimId,
        fingerprint: input.fingerprint,
        targetKeys: [...input.targetKeys],
        outcomes: {},
      };
      return { kind: "new", claimId, outcomes: {} };
    });
  }

  async saveOutcome(input: {
    readonly claimId: string;
    readonly targetKey: string;
    readonly outcome: DeliveryOutcome;
  }): Promise<void> {
    return this.data.update((d) => {
      const claim = Object.values(d.claims).find((c) => c.claimId === input.claimId);
      if (!claim) {
        throw new Error(`Unknown idempotency claim: ${input.claimId}`);
      }
      if (!claim.targetKeys.includes(input.targetKey)) {
        throw new Error(`Target does not belong to idempotency claim: ${input.targetKey}`);
      }
      claim.outcomes[input.targetKey] = structuredClone(input.outcome);
    });
  }
}
