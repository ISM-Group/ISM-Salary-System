import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { auditLogsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination } from '@/components/ui/pagination';

// PUBLIC_INTERFACE
/**
 * AuditLogsPage — Displays audit logs with passkey verification,
 * table name filtering, and server-side pagination.
 */
export function AuditLogsPage() {
  const [passkey, setPasskey] = useState('');
  const [verified, setVerified] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data: responseData, refetch } = useQuery({
    queryKey: ['audit-logs-admin', tableFilter, verified, page, limit],
    queryFn: async () => {
      if (!verified) {
        return { data: [], pagination: null };
      }
      const params: Record<string, unknown> = { page, limit };
      if (tableFilter) params.tableName = tableFilter;
      const response = await auditLogsAPI.getAll(params);
      return response;
    },
  });

  const logs = responseData?.data || [];
  const pagination = responseData?.pagination;

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    await auditLogsAPI.verifyPasskey(passkey);
    setVerified(true);
    await refetch();
  };

  return (
    <MainLayout title="Audit Logs" description="Review data change history">
      <div className="space-y-6">
        {!verified ? (
          <Card>
            <CardHeader>
              <CardTitle>Verify Passkey</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex gap-3" onSubmit={verify}>
                <Input
                  type="password"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  placeholder="Enter audit passkey"
                  required
                />
                <Button type="submit">Verify</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Filter by table name (optional)"
                value={tableFilter}
                onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.tableName}</TableCell>
                      <TableCell>{row.action}</TableCell>
                      <TableCell>{row.fullName || row.username || 'System'}</TableCell>
                      <TableCell>{new Date(row.changedAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {pagination && (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
