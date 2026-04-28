import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { usersAPI, getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageSkeleton, TableLoadingRows } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, UserCheck, UserX } from 'lucide-react';

export function UserManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.getAll();
      return response.data as any[];
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersAPI.setStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'User status updated' });
    },
    onError: (err) => toast({ title: getApiErrorMessage(err), variant: 'destructive' }),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersAPI.resetPassword(id, password),
    onSuccess: () => {
      setResetTargetId(null);
      setNewPassword('');
      toast({ title: 'Password reset successfully' });
    },
    onError: (err) => setResetError(getApiErrorMessage(err, 'Failed to reset password')),
  });

  const handleReset = () => {
    if (!resetTargetId) return;
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters');
      return;
    }
    setResetError('');
    resetMutation.mutate({ id: resetTargetId, password: newPassword });
  };

  return (
    <MainLayout title="User Management" description="Manage system users, reset passwords, activate or deactivate accounts">
      {isLoading && !data ? (
        <PageSkeleton variant="table" />
      ) : (
      <>
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRows rows={5} columns={5} />
              ) : (
                (data || []).map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.role === 'ADMIN' ? 'border-accent/50 text-accent' : 'border-info/50 text-info'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={user.isActive ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-500'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setResetTargetId(user.id); setNewPassword(''); setResetError(''); }}
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                          onClick={() => statusMutation.mutate({ id: user.id, isActive: !user.isActive })}
                          disabled={statusMutation.isPending}
                        >
                          {user.isActive ? <><UserX className="h-3.5 w-3.5 mr-1" />Deactivate</> : <><UserCheck className="h-3.5 w-3.5 mr-1" />Activate</>}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset Password Modal */}
      {resetTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-card p-6 text-card-foreground shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Reset Password</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Enter a new password for{' '}
              <span className="font-medium">{(data || []).find((u: any) => u.id === resetTargetId)?.fullName}</span>
            </p>
            <Input
              type="password"
              placeholder="New password (min 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mb-2"
            />
            {resetError && <p className="mb-2 text-sm text-red-600">{resetError}</p>}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleReset} disabled={resetMutation.isPending} className="flex-1">
                {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
              <Button variant="outline" onClick={() => setResetTargetId(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </MainLayout>
  );
}
