import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeft, FolderOpen, Home, Image, Menu, Settings, Sparkles, Users } from 'lucide-react';

type AdminNavItem = {
  name: string;
  href: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type AdminSidebarProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
};

export const AdminSidebar = ({ sidebarOpen, onToggleSidebar }: AdminSidebarProps) => {
  const router = useRouter();
  const { user } = useAuth();

  const navigationItems: AdminNavItem[] = useMemo(
    () => [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: Home,
        description: 'Admin overview',
      },
      {
        name: 'Upload Images',
        href: '/admin/upload-images',
        icon: Image,
        description: 'Manage images',
      },
      {
        name: 'Manage Users',
        href: '/admin/manage-users',
        icon: Users,
        description: 'User accounts',
      },
      {
        name: 'Manage Galleries',
        href: '/admin/manage-galleries',
        icon: FolderOpen,
        description: 'Gallery organization',
      },
      {
        name: 'Generate',
        href: '/admin/generate',
        icon: Sparkles,
        description: 'Generate content',
      },
      {
        name: 'Config',
        href: '/admin/config',
        icon: Settings,
        description: 'AI model settings',
      },
    ],
    []
  );

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-64' : 'w-20'
      } bg-neutral-900 text-white transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden flex-shrink-0`}
      aria-label="Admin sidebar"
    >
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        {sidebarOpen && (
          <h2 className="text-xl font-bold">
            Total<span className="text-[#4CAF50]">Toons34</span>
          </h2>
        )}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-neutral-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4CAF50]"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          tabIndex={0}
        >
          {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-[#4CAF50] text-white'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title={!sidebarOpen ? item.name : ''}
              aria-label={item.name}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs opacity-70 truncate">{item.description}</p>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {sidebarOpen && (
        <div className="p-4 border-t border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#4CAF50] flex items-center justify-center text-white font-semibold">
              {(user?.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.email}</p>
              <p className="text-xs text-neutral-400">Administrator</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

