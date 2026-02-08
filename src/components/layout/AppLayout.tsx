import { ReactNode, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  ChefHat, 
  FileText, 
  History,
  UserCog,
  Menu,
  X,
  Euro,
  BarChart3,
  LogOut,
  ArrowUpDown,
  Wallet,
  ChevronDown,
  LucideIcon,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurant, useRestaurants } from '@/hooks/useRestaurant';
import { useManagerNavPermissions } from '@/hooks/useManagerNavPermissions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PermissionLevel } from '@/types/permissions';
import { hasPermission } from '@/types/permissions';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  minLevel: PermissionLevel;
}

const allNavItems: NavItem[] = [
  { path: '', label: 'Kellner Abrechnung', icon: Users, minLevel: 'staff' },
  { path: 'kitchen', label: 'Küchen Trinkgeld', icon: ChefHat, minLevel: 'manager' },
  { path: 'summary', label: 'Tagesabrechnung', icon: FileText, minLevel: 'manager' },
  { path: 'register-balance', label: 'Wechselgeldbestand', icon: ArrowUpDown, minLevel: 'manager' },
  { path: 'statistics', label: 'Statistiken', icon: BarChart3, minLevel: 'manager' },
  { path: 'history', label: 'Verlauf', icon: History, minLevel: 'manager' },
  { path: 'cash-balance', label: 'Bargeldbestand', icon: Wallet, minLevel: 'manager' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { restaurantName, restaurantSlug } = useRestaurant();
  const { data: restaurants = [] } = useRestaurants();
  
  // Get user's permission level
  const userLevel = user?.permissionLevel || 'staff';
  const isAdmin = hasPermission(userLevel, 'admin');
  const isManager = userLevel === 'manager';
  
  // Fetch manager-specific nav permissions (only for managers)
  const { data: managerPaths = [] } = useManagerNavPermissions(
    isManager ? user?.staffId : undefined
  );
  const hasCustomPermissions = isManager && managerPaths.length > 0;
  
  // Paths that managers ALWAYS see (core functionality)
  const alwaysVisibleForManager = ['', 'summary', 'kitchen', 'register-balance'];
  
  // Filter nav items based on permission level and manager-specific permissions
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      // Admin sees all
      if (isAdmin) return true;
      
      // Manager ALWAYS sees core navigation items
      if (isManager && alwaysVisibleForManager.includes(item.path)) return true;
      
      // Manager with custom permissions - check if path is allowed
      if (isManager && hasCustomPermissions) {
        return managerPaths.includes(item.path);
      }
      
      // Manager without custom permissions - sees all non-admin items
      if (isManager) {
        return item.minLevel !== 'admin';
      }
      
      // Staff - only staff level items
      return item.minLevel === 'staff';
    });
  }, [userLevel, isAdmin, isManager, hasCustomPermissions, managerPaths, alwaysVisibleForManager]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRestaurantSwitch = (slug: string) => {
    // Get current path relative to restaurant
    const currentPath = location.pathname.replace(`/${restaurantSlug}`, '');
    navigate(`/${slug}${currentPath}`);
  };

  const getNavHref = (path: string) => `/${restaurantSlug}/${path}`;
  
  const isActive = (path: string) => {
    const fullPath = `/${restaurantSlug}/${path}`;
    if (path === '') {
      return location.pathname === `/${restaurantSlug}` || location.pathname === `/${restaurantSlug}/`;
    }
    return location.pathname.startsWith(fullPath);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <Euro className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="font-display font-semibold text-sidebar-foreground gap-1 px-2">
                  {restaurantName || 'Restaurant'}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {restaurants.map((r) => (
                  <DropdownMenuItem
                    key={r.id}
                    onClick={() => handleRestaurantSwitch(r.slug)}
                    className={cn(r.slug === restaurantSlug && 'bg-accent')}
                  >
                    {r.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={getNavHref(item.path)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    active 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <>
                <Link
                  to="/staff"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === '/staff'
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <UserCog className="w-5 h-5" />
                  Mitarbeiter
                </Link>
                <Link
                  to="/permissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === '/permissions'
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Shield className="w-5 h-5" />
                  Berechtigungen
                </Link>
              </>
            )}
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
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Euro className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="font-display font-semibold text-sidebar-foreground gap-1 px-2">
                {restaurantName || 'Restaurant'}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {restaurants.map((r) => (
                <DropdownMenuItem
                  key={r.id}
                  onClick={() => handleRestaurantSwitch(r.slug)}
                  className={cn(r.slug === restaurantSlug && 'bg-accent')}
                >
                  {r.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={getNavHref(item.path)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <>
              <Link
                to="/staff"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === '/staff'
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <UserCog className="w-5 h-5" />
                Mitarbeiter
              </Link>
              <Link
                to="/permissions"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === '/permissions'
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Shield className="w-5 h-5" />
                Berechtigungen
              </Link>
            </>
          )}
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
