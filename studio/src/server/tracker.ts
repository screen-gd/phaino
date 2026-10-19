import "server-only";
import fs from "node:fs";
import { z } from "zod";
import { getEnv } from "./env";

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["done", "doing", "todo", "blocked"]),
  notes: z.string().optional(),
});

const milestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().optional(),
  tasks: z.array(taskSchema),
});

export const trackerSchema = z.object({
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  milestones: z.array(milestoneSchema),
});

export type Tracker = z.infer<typeof trackerSchema>;
export type TrackerMilestone = Tracker["milestones"][number];
export type TrackerTask = TrackerMilestone["tasks"][number];
export type TaskStatus = TrackerTask["status"];

/** Reads and validates tracker/tasks.json (TRACKER_FILE). */
export function loadTracker(): Tracker {
  const raw = fs.readFileSync(getEnv().trackerFile, "utf8");
  return trackerSchema.parse(JSON.parse(raw));
}
