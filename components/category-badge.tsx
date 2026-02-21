"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getImageProps } from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getGroupInitials(groupName: string): string {
  const initials = groupName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "?";
}

type CategoryBadgeProps = {
  groupId: number;
  groupName: string;
  groupHumanNameId: string;
  href?: string;
  groupImageUrl?: string | null;
  secondaryText?: string | null;
  showLabel?: boolean;
  isComparable?: boolean;
  addLabel?: string;
};

export function CategoryBadge({
  groupName,
  groupHumanNameId,
  href,
  groupImageUrl,
  secondaryText,
}: CategoryBadgeProps) {
  const [loadedImageSrc, setLoadedImageSrc] = useState<string | null>(null);
  const [erroredImageSrc, setErroredImageSrc] = useState<string | null>(null);
  const groupInitials = getGroupInitials(groupName);

  const avatarImageProps = groupImageUrl
    ? getImageProps({
        src: groupImageUrl,
        alt: groupName,
        width: 40,
        height: 40,
      }).props
    : null;
  const avatarImageSrc =
    typeof avatarImageProps?.src === "string" ? avatarImageProps.src : null;
  const isAvatarImageLoaded =
    !avatarImageSrc || loadedImageSrc === avatarImageSrc;
  const isAvatarImageError =
    !!avatarImageSrc && erroredImageSrc === avatarImageSrc;

  const handleAvatarImageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (!avatarImageSrc || !node?.complete) {
        return;
      }

      if (node.naturalWidth > 0) {
        setLoadedImageSrc(avatarImageSrc);
      } else {
        setErroredImageSrc(avatarImageSrc);
      }
    },
    [avatarImageSrc]
  );

  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:shadow">
      <Link
        href={href ?? `/grupos/${groupHumanNameId}`}
        className="pl-3 pr-5 py-2.5 w-full min-w-0"
        prefetch={false}
      >
        <span className="flex items-center gap-2 min-w-0">
          <Avatar className="size-9 shrink-0 bg-muted p-0.5">
            {avatarImageProps ? (
              <AvatarImage
                {...avatarImageProps}
                ref={handleAvatarImageRef}
                onLoadingStatusChange={(status) => {
                  if (!avatarImageSrc) {
                    return;
                  }

                  if (status === "loaded") {
                    setLoadedImageSrc(avatarImageSrc);
                    if (erroredImageSrc === avatarImageSrc) {
                      setErroredImageSrc(null);
                    }
                  } else if (status === "error") {
                    setErroredImageSrc(avatarImageSrc);
                  }
                }}
                className={`object-contain rounded-full transition-opacity duration-300 ${
                  isAvatarImageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : null}
            <AvatarFallback className="bg-muted text-slate-700 text-[10px] font-semibold">
              {groupImageUrl && !isAvatarImageError ? "" : groupInitials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate leading-tight">{groupName}</span>
            {secondaryText ? (
              <span className="block truncate text-xs text-muted-foreground leading-tight">
                {secondaryText}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </div>
  );
}
