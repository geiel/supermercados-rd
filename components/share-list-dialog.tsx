"use client";

import { useState, useCallback, useEffect } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ListSelect } from "@/db/schema";

const LIST_QUERY_KEY = ["user-lists"];
const USER_LIST_QUERY_KEY = ["user-list"];

type ShareListDialogProps = {
    list: ListSelect;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single
        .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

function getShareUrl(list: ListSelect): string {
    const slug = slugify(list.name);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/compartido/${list.id}-${slug}`;
}

export function ShareListDialog({
    list,
    open,
    onOpenChange,
}: ShareListDialogProps) {
    const [hideProfile, setHideProfile] = useState(list.hideProfile);
    const [copied, setCopied] = useState(false);
    const isMobile = useIsMobile();
    const queryClient = useQueryClient();

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setHideProfile(list.hideProfile);
            setCopied(false);
        }
    }, [open, list.hideProfile]);

    // Enable sharing mutation
    const enableShareMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/user/lists/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId: list.id }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Error al compartir la lista");
            }
            return response.json() as Promise<ListSelect>;
        },
        onSuccess: (updatedList) => {
            updateListCache(updatedList);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Update share settings mutation
    const updateShareMutation = useMutation({
        mutationFn: async (newHideProfile: boolean) => {
            const response = await fetch("/api/user/lists/share", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId: list.id, hideProfile: newHideProfile }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Error al actualizar configuración");
            }
            return response.json() as Promise<ListSelect>;
        },
        onSuccess: (updatedList) => {
            updateListCache(updatedList);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Disable sharing mutation
    const disableShareMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/user/lists/share", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ listId: list.id }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Error al desactivar compartir");
            }
            return response.json() as Promise<ListSelect>;
        },
        onSuccess: (updatedList) => {
            updateListCache(updatedList);
            toast.success("Enlace desactivado");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const updateListCache = useCallback(
        (updatedList: ListSelect) => {
            queryClient.setQueryData<ListSelect[]>(LIST_QUERY_KEY, (old) =>
                old?.map((l) => (l.id === updatedList.id ? updatedList : l)) ?? []
            );
            queryClient.setQueryData<ListSelect | null>(
                [...USER_LIST_QUERY_KEY, updatedList.id],
                updatedList
            );
        },
        [queryClient]
    );

    const handleCopyLink = useCallback(async () => {
        // Enable sharing if not already shared
        if (!list.isShared) {
            await enableShareMutation.mutateAsync();
        }

        const url = getShareUrl(list);
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Enlace copiado");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("No se pudo copiar el enlace");
        }
    }, [list, enableShareMutation]);

    const handleHideProfileChange = useCallback(
        async (checked: boolean) => {
            setHideProfile(checked);
            
            // Enable sharing if not already shared, then update hide profile
            if (!list.isShared) {
                await enableShareMutation.mutateAsync();
            }
            
            await updateShareMutation.mutateAsync(checked);
        },
        [list.isShared, enableShareMutation, updateShareMutation]
    );

    const handleDisableShare = useCallback(() => {
        disableShareMutation.mutate();
    }, [disableShareMutation]);

    const isLoading =
        enableShareMutation.isPending ||
        updateShareMutation.isPending ||
        disableShareMutation.isPending;

    const shareUrl = getShareUrl(list);

    const content = (
        <div className="grid gap-4 p-4 md:p-0">
            {/* Share URL */}
            <div className="grid gap-2 overflow-hidden">
                <Label>Enlace para compartir</Label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="overflow-hidden rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                        <span className="block truncate">{shareUrl}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                        disabled={isLoading}
                        aria-label="Copiar enlace"
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                        ) : isLoading && enableShareMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Copy className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Hide Profile Toggle */}
            <div className="flex items-center space-x-3">
                <Checkbox
                    id="hide-profile"
                    checked={hideProfile}
                    onCheckedChange={handleHideProfileChange}
                    disabled={isLoading}
                />
                <Label
                    htmlFor="hide-profile"
                    className="text-sm font-normal cursor-pointer"
                >
                    Ocultar mi perfil
                </Label>
            </div>

            {/* Info text */}
            <p className="text-xs text-muted-foreground">
                Las personas con el enlace podrán ver tu lista en modo lectura.
                {!hideProfile && " Tu perfil será visible."}
                {hideProfile && " Tu perfil estará oculto."}
            </p>

            {/* Disable sharing button (only if already shared) */}
            {list.isShared && (
                <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDisableShare}
                    disabled={isLoading}
                >
                    {disableShareMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Desactivar enlace
                </Button>
            )}
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle className="flex items-center gap-2">
                            <Share2 className="h-5 w-5" />
                            Compartir lista
                        </DrawerTitle>
                    </DrawerHeader>
                    {content}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Compartir lista
                    </DialogTitle>
                </DialogHeader>
                {content}
            </DialogContent>
        </Dialog>
    );
}
