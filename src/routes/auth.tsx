import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Genie Pro Music Studio" },
      {
        name: "description",
        content:
          "Clients sign in with Google to book studio time. Managers sign in with their studio account and invite code.",
      },
      { property: "og:title", content: "Sign in — Genie Pro Music Studio" },
      {
        property: "og:description",
        content: "Access your Genie Pro Music Studio bookings and studio management tools.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, refreshRole } = useAuth();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (user && role) {
      void navigate({ to: role === "manager" ? "/manager" : "/bookings" });
    }
  }, [user, role, navigate]);

  const googleSignIn = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/bookings" });
  };

  const managerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const normalized = email.includes("@") ? email.trim() : `${email.trim()}@geniepro.studio`;
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: normalized,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || normalized },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalized,
          password,
        });
        if (error) throw error;
      }

      let granted = false;
      if (invite.trim()) {
        const { data, error } = await supabase.rpc("redeem_manager_invite", {
          _code: invite.trim(),
        });
        if (error) throw error;
        if (!data) {
          toast.error("That invite code is not valid.");
        } else {
          granted = true;
          toast.success("Manager access granted.");
        }
      }
      await refreshRole();
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("role", "manager");
      const isManager = granted || (roleRows?.length ?? 0) > 0;
      void navigate({ to: isManager ? "/manager" : "/bookings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="display-title text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Clients use Google. Managers use their studio account plus the invite code.
        </p>

        <Tabs defaultValue="client" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client">Client</TabsTrigger>
            <TabsTrigger value="manager">Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="client" className="panel mt-4 space-y-4 p-5">
            <p className="text-sm text-muted-foreground">
              Sign in with your Google account — no extra password to manage.
            </p>
            <Button className="w-full" disabled={busy} onClick={googleSignIn}>
              Continue with Google
            </Button>
          </TabsContent>

          <TabsContent value="manager" className="panel mt-4 p-5">
            <form className="space-y-4" onSubmit={managerSubmit}>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Username or email</Label>
                <Input
                  id="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite">
                  Manager invite code {mode === "signin" && <span className="text-muted-foreground">(optional)</span>}
                </Label>
                <Input
                  id="invite"
                  value={invite}
                  onChange={(e) => setInvite(e.target.value)}
                  placeholder="Required for new managers"
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signup" ? "Create manager account" : "Sign in"}
              </Button>
              <button
                type="button"
                className="w-full text-xs text-primary hover:underline"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "New manager? Register with an invite code"}
              </button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              Signed in with Google already? Enter the invite code above with your Google email to
              upgrade that account to manager.
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
