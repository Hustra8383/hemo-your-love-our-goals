import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  pronoun_role: "her" | "him" | "they" | null;
};

type Couple = {
  id: string;
  user_a: string;
  user_b: string | null;
  relationship_start: string | null;
  her_nickname: string | null;
  him_nickname: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  couple: Couple | null;
  partnerProfile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partnerProfile, setPartner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async (uid: string) => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((prof as Profile) ?? null);
    const { data: c } = await supabase
      .from("couples")
      .select("*")
      .or(`user_a.eq.${uid},user_b.eq.${uid}`)
      .maybeSingle();
    setCouple((c as Couple) ?? null);
    if (c) {
      const partnerId = c.user_a === uid ? c.user_b : c.user_a;
      if (partnerId) {
        const { data: pp } = await supabase.from("profiles").select("*").eq("id", partnerId).maybeSingle();
        setPartner((pp as Profile) ?? null);
      } else setPartner(null);
    } else setPartner(null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => void loadAll(sess.user.id), 0);
      } else {
        setProfile(null); setCouple(null); setPartner(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadAll(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => { if (session?.user) await loadAll(session.user.id); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, profile, couple, partnerProfile, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
