import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { supabase } from "@/lib/supabase";
import { usersApi } from "@/services/usersApi";
import type { Me, Role } from "@/models/user";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** The signed-in user's app role and categories, from /api/me. */
  me: Me | null;
  role: Role | null;
  /** Why `me` couldn't be loaded — e.g. no role assigned yet. */
  accessError: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, sess) => {
      setSession(sess);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Keyed on the user id, not the session, so token refreshes don't refetch.
  const userId = session?.user.id;
  useEffect(() => {
    // Cached data belongs to whoever fetched it — never show one user's
    // results to the next person who signs in on this browser.
    queryClient.clear();
    setMe(null);
    setAccessError(null);
    if (!userId) {
      setMeLoading(false);
      return;
    }

    let cancelled = false;
    setMeLoading(true);
    usersApi
      .getMe()
      .then((data) => !cancelled && setMe(data))
      .catch((err) => {
        if (cancelled) return;
        setAccessError(
          isAxiosError(err) && err.response?.status === 403
            ? "Your account has not been given access yet. Ask an admin to assign you a role."
            : "Could not load your access. Please try again.",
        );
      })
      .finally(() => !cancelled && setMeLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId, queryClient]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        me,
        role: me?.role ?? null,
        accessError,
        // A signed-in user isn't ready until their role has loaded.
        loading: sessionLoading || meLoading || (!!userId && !me && !accessError),
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
