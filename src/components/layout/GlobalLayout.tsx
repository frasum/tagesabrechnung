import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Menu,
  X,
  LogOut,
  Home,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface GlobalLayoutProps {
  children: ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClasses = (path: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      location.pathname === path
        ? "border-l-3 border-primary bg-sidebar-accent/50 text-sidebar-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent"
    );

  const iconClasses = (path: string) =>
    cn("w-5 h-5", location.pathname === path && "text-primary");

  const renderNav = (onClickLink?: () => void) => (
    <>
      <Link
        to="/spicery"
        onClick={onClickLink}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground hover:bg-sidebar-accent"
      >
        <Home className="w-5 h-5" />
        Zurück zur App
      </Link>
      <div className="h-px bg-sidebar-border my-3" />
      <p className="text-xs uppercase tracking-wider text-muted-foreground px-3 mb-2">
        Verwaltung
      </p>
      <Link
        to="/staff"
        onClick={onClickLink}
        className={linkClasses('/staff')}
      >
        <Users className={iconClasses('/staff')} />
        Mitarbeiter
      </Link>
      <Link
        to="/permissions"
        onClick={onClickLink}
        className={linkClasses('/permissions')}
      >
        <Shield className={iconClasses('/permissions')} />
      Berechtigungen
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar/80 backdrop-blur-sm border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden">
              <img src="/app-icon.png" alt="App" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-semibold text-sidebar-foreground">
              Mitarbeiterverwaltung
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <nav className="px-4 pb-4 bg-sidebar border-b border-sidebar-border animate-slide-in space-y-1">
            {renderNav(() => setMobileMenuOpen(false))}
            <div className="h-px bg-sidebar-border my-3" />
            <button
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-destructive hover:bg-sidebar-accent w-full"
            >
              <LogOut className="w-5 h-5" />
              Abmelden
            </button>
          </nav>
        )}
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-lg overflow-hidden">
            <img src="/app-icon.png" alt="App" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-semibold text-sidebar-foreground">
            Mitarbeiterverwaltung
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {renderNav()}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          {user && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-sidebar-foreground truncate">{user.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-sidebar-foreground/60">
            Restaurant Cash System v1.0
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}