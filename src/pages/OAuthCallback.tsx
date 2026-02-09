import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";


export default function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const start = Date.now();
    const timeoutMs = 12_000;

    const tick = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session?.user) {
          localStorage.removeItem("oauth_redirect_restaurant");
          navigate("/select-restaurant", { replace: true });
          return;
        }

        if (Date.now() - start >= timeoutMs) {
          navigate("/login", { replace: true });
          return;
        }

        window.setTimeout(tick, 250);
      } catch {
        if (!cancelled) navigate("/login", { replace: true });
      }
    };

    tick();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="text-muted-foreground animate-pulse">Anmeldung wird abgeschlossen…</div>
        <div className="text-xs text-muted-foreground">Bitte einen Moment warten</div>
      </div>
    </div>
  );
}
