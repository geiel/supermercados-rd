"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateListDialog } from "@/components/create-list-dialog";
import { LoginDialog } from "@/components/login-dialog";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";

export function CreateListCard() {
  const { user, isLoading } = useUser();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    if (user) {
      setCreateDialogOpen(true);
    } else {
      setLoginDialogOpen(true);
    }
  };

  const handleListCreated = () => {
    // Refresh the page to show the new list
    router.refresh();
  };

  if (isLoading) {
    return (
      <Card className="transition hover:shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card
        className="transition hover:shadow-md cursor-pointer border-dashed border-2 hover:border-primary/50"
        onClick={handleClick}
      >
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Crear nueva lista
          </CardTitle>
          <CardDescription>
            {user
              ? "Organiza tus compras en diferentes listas"
              : "Inicia sesión para crear listas personalizadas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {user ? "Haz clic para crear" : "Haz clic para iniciar sesión"}
          </div>
        </CardContent>
      </Card>

      {/* Create List Dialog - only for logged users */}
      <CreateListDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleListCreated}
      />

      {/* Login Dialog - for non-logged users */}
      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        hideTrigger
        customTitle="Logueate para crear una lista"
        customDescription="Inicia sesión o crea una cuenta para guardar tus listas de compras en la nube."
      />
    </>
  );
}
