import { Suspense } from "react";
import { SocialView } from "@/components/social/SocialView";

export const dynamic = "force-dynamic";

export default function SocialPage() {
  return (
    <Suspense>
      <SocialView />
    </Suspense>
  );
}
