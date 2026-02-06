import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  ChefHat, 
  FileText, 
  History, 
  Menu,
  X,
  Euro
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/', label: 'Kellner Abrechnung', icon: Users },
  { href: '/manager', label: 'Manager Dashboard', icon: Settings },
  { href: '/kitchen', label: 'Küchen Trinkgeld', icon: ChefHat },
  { href: '/summary', label: 'Tagesabrechnung', icon: FileText },
  { href: '/history', label: 'Verlauf', icon: History },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Euro className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-sidebar-foreground">Tagesabrechnung</span>
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="px-4 pb-4 bg-sidebar border-b border-sidebar-border animate-slide-in">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col bg-sidebar border-r border-sidebar-border">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Euro className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sidebar-foreground">Tagesabrechnung</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-sidebar-border">
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
