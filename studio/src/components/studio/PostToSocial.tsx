"use client";

import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { SocialComposer } from "./SocialComposer";
import { useSocialAccounts } from "./useSocialAccounts";

/** Post one output to connected Zernio accounts from a small popover. */
export function PostToSocial({ path, className }: { path: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const accounts = useSocialAccounts(open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button type="button" className={className} />}>Post</PopoverTrigger>
      <PopoverPopup side="top" align="end" sideOffset={8} className="w-[340px] rounded-2xl border-line bg-s2">
        <SocialComposer path={path} accounts={accounts} />
        <Link
          href={`/social?path=${encodeURIComponent(path)}`}
          className="mt-3 block text-caption text-t3 underline-offset-4 hover:text-t1 hover:underline"
        >
          Open Social
        </Link>
      </PopoverPopup>
    </Popover>
  );
}
