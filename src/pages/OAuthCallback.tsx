import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    let cancelled = false;

    const restaurant = localStorage.getItem("oauth_redirect_restaurant") || "spicery";

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
          navigate(isMobile ? `/${restaurant}/waiter` : `/${restaurant}`, { replace: true });
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
  }, [navigate, isMobile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-2">
        <div className="text-muted-foreground animate-pulse">Anmeldung wird abgeschlossen…</div>
        <div className="text-xs text-muted-foreground">Bitte einen Moment warten</div>
      </div>
    </div>
  );
}
