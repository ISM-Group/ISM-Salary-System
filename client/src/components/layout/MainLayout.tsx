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
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-20 right-[10%] h-[22rem] w-[22rem] rounded-full bg-indigo-400/30 blur-3xl dark:bg-indigo-600/10" />
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-600/8" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-600/8" />
      </div>
      <Sidebar />
      <div className="relative z-10 lg:pl-64 transition-all duration-300">
        <Header title={title} description={description} />
        <main className="p-4 sm:p-6 pb-10">{children}</main>
      </div>
    </div>
  );
}
