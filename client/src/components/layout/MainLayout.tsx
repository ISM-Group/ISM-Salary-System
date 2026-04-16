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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-64 transition-all duration-300">
        <Header title={title} description={description} />
        <main className="p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
