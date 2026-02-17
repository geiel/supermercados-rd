"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import posthog from "posthog-js";

type UserContextValue = {
  user: User | null;
  isLoading: boolean;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastIdentifiedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const identifyUser = (nextUser: User) => {
      if (lastIdentifiedUserIdRef.current === nextUser.id) return;

      posthog.identify(nextUser.id, {
        email: nextUser.email,
        name: nextUser.user_metadata?.name,
      });
      lastIdentifiedUserIdRef.current = nextUser.id;
    };
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        identifyUser(user);
      } else {
        lastIdentifiedUserIdRef.current = null;
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          identifyUser(session.user);
        } else {
          lastIdentifiedUserIdRef.current = null;
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
