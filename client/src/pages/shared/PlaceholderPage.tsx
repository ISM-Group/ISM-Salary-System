import { MainLayout } from '@/components/layout/MainLayout';
import { useLocation } from 'react-router-dom';

export function PlaceholderPage({ title }: { title: string }) {
  const location = useLocation();

  return (
    <MainLayout title={title} description="This module is ready for extension">
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Route <span className="font-mono text-foreground">{location.pathname}</span> is configured and secured.
        </p>
      </div>
    </MainLayout>
  );
}
