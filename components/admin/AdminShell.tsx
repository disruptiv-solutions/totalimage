import { ReactNode } from 'react';
import { AdminSidebar } from './AdminSidebar';

type AdminShellProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  leftPanel?: ReactNode;
  children: ReactNode;
  backgroundClassName?: string;
};

export const AdminShell = ({
  sidebarOpen,
  onToggleSidebar,
  leftPanel,
  children,
  backgroundClassName = 'bg-gray-100',
}: AdminShellProps) => {
  return (
    <div className={`h-full w-full overflow-hidden flex items-stretch ${backgroundClassName}`}>
      <AdminSidebar sidebarOpen={sidebarOpen} onToggleSidebar={onToggleSidebar} />
      {leftPanel}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

