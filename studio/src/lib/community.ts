import { z } from "zod";

export const communityForkSchema = z.object({
  handle: z.string(),
  title: z.string(),
  presetId: z.string(),
  forkCount: z.number(),
  thumb: z.string(),
});

export const communityFeedSchema = z.object({
  sample: z.literal(true),
  forks: z.array(communityForkSchema),
});

export type CommunityFork = z.infer<typeof communityForkSchema>;
export type CommunityFeed = z.infer<typeof communityFeedSchema>;
