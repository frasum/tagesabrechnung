import { ReactNode, useState, useMemo } from 'react';
import { ManualUpdateButton } from '@/components/pwa/UpdateNotification';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  ChefHat,
  Clock,
  FileText, 
  History,
  UserCog,
  Menu,
  X,
  BarChart3,
  LogOut,
  Wallet,
  QrCode,
  ChevronDown,
  LucideIcon,
  Send,
  MessageCircle,
  CalendarDays,
  Palette,
  ShieldCheck
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

interface NavGroup {
  label: string;
  paths: string[];
  adminOnly?: boolean;
}

const allNavItems: NavItem[] = [
  { path: '', label: 'Mitarbeiter Abrechnung', icon: Users, minLevel: 'staff' },
  { path: 'kitchen', label: 'Küchen Trinkgeld', icon: ChefHat, minLevel: 'manager' },
  { path: 'summary', label: 'Tagesabrechnung', icon: FileText, minLevel: 'manager' },
  { path: 'zeiterfassung', label: 'Zeiterfassung', icon: Clock, minLevel: 'manager' },
  { path: 'dienstplan', label: 'Dienstplan', icon: CalendarDays, minLevel: 'manager' },
  { path: '/kueche-plan', label: 'Küchenplan', icon: ChefHat, minLevel: 'admin' },
  { path: 'qr-poster', label: 'QR-Code', icon: QrCode, minLevel: 'manager' },
  { path: 'statistics', label: 'Statistiken', icon: BarChart3, minLevel: 'manager' },
  { path: 'history', label: 'Verlauf', icon: History, minLevel: 'manager' },
  { path: 'cash-balance', label: 'Bargeldbestand', icon: Wallet, minLevel: 'manager' },
];

const adminNavItems: NavItem[] = [
  { path: '/staff', label: 'Mitarbeiter', icon: UserCog, minLevel: 'admin' },
  { path: '/sofortmeldung', label: 'Sofortmeldung', icon: ShieldCheck, minLevel: 'admin' },
  { path: '/telegram', label: 'Telegram', icon: Send, minLevel: 'admin' },
  { path: '/skill-settings', label: 'Farben', icon: Palette, minLevel: 'admin' },
  { path: 'chat', label: 'Chat', icon: MessageCircle, minLevel: 'admin' },
];

const navGroups: NavGroup[] = [
  { label: 'Tagesgeschäft', paths: ['', 'kitchen', 'summary', 'zeiterfassung', 'qr-poster'] },
  { label: 'Auswertung', paths: ['statistics', 'history', 'cash-balance'] },
  { label: 'Planung', paths: ['dienstplan', '/kueche-plan'] },
  { label: 'Verwaltung', paths: ['/staff', '/sofortmeldung', '/telegram', '/skill-settings', 'chat'], adminOnly: true },
];

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { restaurantName, restaurantSlug } = useRestaurant();
  const { data: restaurants = [] } = useRestaurants();
  
  const userLevel = user?.permissionLevel || 'staff';
  const isAdmin = hasPermission(userLevel, 'admin');
  const isManager = userLevel === 'manager';
  
  const { data: managerPaths = [], isLoading: isLoadingPermissions } = useManagerNavPermissions(
    isManager ? user?.staffId : undefined
  );
  const hasCustomPermissions = isManager && managerPaths.length > 0;
  const alwaysVisibleForManager = [''];

  // Combine all items and filter by permissions
  const allItems = useMemo(() => [...allNavItems, ...(isAdmin ? adminNavItems : [])], [isAdmin]);
  
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (isAdmin) return true;
      if (isManager && alwaysVisibleForManager.includes(item.path)) return true;
      if (isManager && isLoadingPermissions) return alwaysVisibleForManager.includes(item.path);
      if (isManager && hasCustomPermissions) {
        if (item.path === 'zeiterfassung') return managerPaths.some(p => p.startsWith('zeiterfassung'));
        return managerPaths.includes(item.path);
      }
      if (isManager) return item.minLevel !== 'admin';
      return item.minLevel === 'staff';
    });
  }, [userLevel, isAdmin, isManager, isLoadingPermissions, hasCustomPermissions, managerPaths, allItems]);

  // Build grouped navigation
  const groupedNav = useMemo(() => {
    return navGroups
      .filter(group => !group.adminOnly || isAdmin)
      .map(group => ({
        label: group.label,
        items: group.paths
          .map(path => filteredItems.find(item => item.path === path))
          .filter((item): item is NavItem => !!item),
      }))
      .filter(group => group.items.length > 0);
  }, [filteredItems, isAdmin]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRestaurantSwitch = (slug: string) => {
    const currentPath = location.pathname.replace(`/${restaurantSlug}`, '');
    navigate(`/${slug}${currentPath}`);
  };

  const getNavHref = (path: string) => {
    if (path.startsWith('/')) return path;
    return `/${restaurantSlug}/${path}`;
  };
  
  const isActive = (path: string) => {
    if (path.startsWith('/')) return location.pathname === path;
    const fullPath = `/${restaurantSlug}/${path}`;
    if (path === '') {
      return location.pathname === `/${restaurantSlug}` || location.pathname === `/${restaurantSlug}/`;
    }
    return location.pathname.startsWith(fullPath);
  };

  const linkClasses = (path: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      isActive(path)
        ? "border-l-3 border-primary bg-sidebar-accent/50 text-sidebar-foreground"
        : "text-sidebar-foreground hover:bg-sidebar-accent"
    );

  const iconClasses = (path: string) =>
    cn("w-5 h-5", isActive(path) && "text-primary");

  // Shared nav renderer for both desktop and mobile
  const renderNavGroups = (onClickLink?: () => void) => (
    <>
      {groupedNav.map((group, idx) => (
        <div key={group.label}>
          {idx > 0 && <div className="h-px bg-sidebar-border my-3" />}
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-3 mb-2">
            {group.label}
          </p>
          {group.items.map((item) => (
            <Link
              key={item.path}
              to={getNavHref(item.path)}
              onClick={onClickLink}
              className={linkClasses(item.path)}
            >
              <item.icon className={iconClasses(item.path)} />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </>
  );

  const renderRestaurantSwitcher = () =>
    restaurants.length > 1 ? (
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
    ) : (
      <span className="font-display font-semibold text-sidebar-foreground px-2">
        {restaurantName || 'Restaurant'}
      </span>
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
            {renderRestaurantSwitcher()}
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
            {renderNavGroups(() => setMobileMenuOpen(false))}
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
          {renderRestaurantSwitcher()}
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {renderNavGroups()}
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
          <ManualUpdateButton />
          <p className="text-xs text-sidebar-foreground/60">
            Restaurant Abrechnung v.3
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
