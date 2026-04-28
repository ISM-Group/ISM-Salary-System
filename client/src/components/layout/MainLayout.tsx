import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function MainLayout({ children, title, description }: MainLayoutProps) {
  return (
    <div className="app-mesh min-h-screen text-foreground">
      <Sidebar />
      <div className="relative z-10 transition-all duration-300 lg:pl-64">
        <Header title={title} description={description} />
        <main className="content-enter p-4 pb-10 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
