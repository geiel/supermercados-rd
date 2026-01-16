"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import {
  LoginUserEmailPassword,
  LoginUserGoogle,
  RegisterUserEmailPassword,
} from "@/lib/authentication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LoginDialogProps = {
  /** Custom title to display in the dialog header */
  customTitle?: string;
  /** Custom description to display in the dialog header */
  customDescription?: string;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Hide the trigger button (for controlled mode) */
  hideTrigger?: boolean;
};

export function LoginDialog({
  customTitle,
  customDescription,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: LoginDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [view, setView] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailAction, setEmailAction] = useState<
    "signin" | "signup" | null
  >(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const isEmailLoading = emailAction !== null;

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailAction("signin");

    try {
      const result = await LoginUserEmailPassword(email, password);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setPassword("");
      router.refresh();
    } catch (error) {
      console.log(error);
      toast.error("Ocurrió un error al iniciar sesión");
    } finally {
      setEmailAction(null);
    }
  };

  const handleEmailRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !email || !password) {
      toast.error("Ingresa tu nombre, email y contraseña para crear una cuenta.");
      return;
    }

    setEmailAction("signup");

    try {
      const result = await RegisterUserEmailPassword(name.trim(), email, password);
      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.sessionCreated) {
        setOpen(false);
        setPassword("");
        setName("");
        router.refresh();
        return;
      }

      setPassword("");
      setName("");
      toast.success("Revisa tu email para confirmar tu cuenta.");
    } catch (error) {
      console.log(error);
      toast.error("Ocurrió un error durante el registro");
    } finally {
      setEmailAction(null);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await LoginUserGoogle();
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      toast.error(result?.error ?? "No se pudo iniciar sesión con Google");
    } catch (error) {
      console.log(error);
      toast.error("No se pudo iniciar sesión con Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Determine the title and description
  const defaultTitle = view === "signin" ? "Iniciar sesión" : "Crear cuenta";
  const defaultDescription =
    view === "signin"
      ? "Usa tu email y contraseña o continúa con Google."
      : "Ingresa tu nombre, email y contraseña para comenzar.";

  const title = customTitle ?? defaultTitle;
  const description = customDescription ?? defaultDescription;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button size="icon-lg" aria-label="Iniciar sesión">
            <LogIn />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {view === "signin" ? (
            <form onSubmit={handleEmailLogin} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="login-email">Correo electrónico</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>
              <Button type="submit" disabled={isEmailLoading || isGoogleLoading}>
                {emailAction === "signin" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Iniciar sesión
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                onClick={() => setView("signup")}
                disabled={isEmailLoading || isGoogleLoading}
              >
                Crear cuenta
              </Button>
            </form>
          ) : (
            <form onSubmit={handleEmailRegister} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="signup-name">Nombre</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-email">Correo electrónico</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signup-password">Contraseña</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Crea una contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isEmailLoading || isGoogleLoading}
                  required
                />
              </div>
              <Button type="submit" disabled={isEmailLoading || isGoogleLoading}>
                {emailAction === "signup" && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear cuenta
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto px-0"
                onClick={() => setView("signin")}
                disabled={isEmailLoading || isGoogleLoading}
              >
                Volver a iniciar sesión
              </Button>
            </form>
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O continúa con
              </span>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isEmailLoading || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Continuar con Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      role="img"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      ></path>
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      ></path>
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      ></path>
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      ></path>
      <path
        fill="none"
        d="M0 0h48v48H0z"
      ></path>
    </svg>
  );
}
