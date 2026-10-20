import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

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
