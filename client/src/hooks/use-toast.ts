export function useToast() {
  return {
    toast: (_input: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => {
      return;
    },
  };
}
