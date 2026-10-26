"use client";

import { useRef, useState, type DragEvent } from "react";
import { Icon, SECTION_ICONS } from "../icons";
import type { Uploaded } from "./useStudio";
import { useDemo } from "@/components/DemoProvider";

/** Drop card for one image input: 120px default, 64px tile with compact. */
export function UploadCard({
  label,
  required,
  uploaded,
  onUploaded,
  onClear,
  compact = false,
}: {
  label: string;
  required: boolean;
  uploaded?: Uploaded;
  onUploaded: (u: Uploaded) => void;
  onClear: () => void;
  compact?: boolean;
}) {
  const demo = useDemo();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  async function upload(file: File) {
    if (demo.enabled) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onUploaded({ uploadId: crypto.randomUUID(), previewUrl: reader.result, name: file.name });
        }
      };
      reader.readAsDataURL(file);
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok) {
        onUploaded({
          uploadId: data.uploadId,
          previewUrl: data.previewUrl,
          name: file.name,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  if (uploaded) {
    if (compact) {
      return (
        <div className="group relative h-16 w-16 flex-none overflow-hidden rounded-lg border border-line">
          <img
            src={uploaded.previewUrl}
            alt={uploaded.name}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            aria-label={`Remove ${label}`}
            onClick={onClear}
            className="absolute top-0.5 right-0.5 grid h-5 w-5 place-items-center rounded bg-black/60 text-t2 hover:text-t1"
          >
            <Icon d={SECTION_ICONS.x} className="h-3 w-3" />
          </button>
        </div>
      );
    }
    return (
      <div className="group relative h-[120px] overflow-hidden rounded-xl border border-line">
        <img
          src={uploaded.previewUrl}
          alt={uploaded.name}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onClear}
          className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-md bg-black/60 text-t2 hover:text-t1"
        >
          <Icon d={SECTION_ICONS.x} className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void upload(file);
        e.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <button
        type="button"
        disabled={busy}
        aria-label={`${label} (upload image)`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`relative grid h-16 w-16 flex-none place-items-center rounded-lg border bg-s3 transition-colors ${
          drag ? "border-ac" : "border-line hover:border-[#444]"
        } ${busy ? "opacity-60" : ""}`}
      >
        <span className="grid justify-items-center gap-0.5 px-1">
          <Icon d={SECTION_ICONS.upload} className="h-4 w-4 text-t3" />
          <span className="text-center text-caption leading-tight text-t2">
            {busy ? "…" : label}
          </span>
        </span>
        {fileInput}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`relative grid h-[120px] w-full place-items-center rounded-xl border bg-s2 transition-colors ${
        drag ? "border-ac" : "border-line hover:border-[#444]"
      } ${busy ? "opacity-60" : ""}`}
    >
      {!required && (
        <span className="absolute top-1.5 right-1.5 rounded bg-s3 px-1 py-px text-caption font-bold uppercase text-t2">
          Optional
        </span>
      )}
      <span className="grid justify-items-center gap-1.5">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-s3 text-t3">
          <Icon d={SECTION_ICONS.upload} className="h-4.5 w-4.5" />
        </span>
        <span className="text-body text-t1">
          {busy ? "Uploading…" : label}
        </span>
        <span className="text-caption text-t3">PNG, JPG or WebP</span>
      </span>
      {fileInput}
    </button>
  );
}
