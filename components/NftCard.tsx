"use client";

import { GeneratedNft } from "@/lib/types";

export default function NftCard({ nft, namePrefix }: { nft: GeneratedNft; namePrefix: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="checker flex aspect-square items-center justify-center p-2">
        {/* APNGs animate natively in an <img>. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={nft.url}
          alt={`${namePrefix} #${nft.id}`}
          className="h-full w-full object-contain [image-rendering:pixelated]"
        />
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {namePrefix} #{nft.id}
          </span>
          <a
            href={nft.url}
            download={`${nft.id}.png`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-md bg-accent/20 px-2 py-1 text-xs font-medium text-accent hover:bg-accent/30"
          >
            Download
          </a>
        </div>
        <div className="flex flex-wrap gap-1">
          {nft.traits.length === 0 && (
            <span className="text-xs text-slate-500">base only</span>
          )}
          {nft.traits.map((t) => (
            <span
              key={t.category}
              className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
            >
              <span className="text-slate-500">{t.category}:</span> {t.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
