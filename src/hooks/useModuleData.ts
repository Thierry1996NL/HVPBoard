'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ProjectOption {
  id: number;
  label: string;
}

export function useModuleData<T extends { id: string; werkpakket_id: number }>(
  tableName: string,
  _primaryField: string
) {
  const [data, setData] = useState<T[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const [{ data: rows, error: rowsError }, { data: wps, error: wpsError }] =
        await Promise.all([
          supabase.from(tableName).select('*').order('created_at', { ascending: true }),
          supabase
            .from('werkpakketten')
            .select('row_idx, cel_data')
            .order('row_idx', { ascending: true }),
        ]);

      if (rowsError) throw rowsError;
      if (wpsError) throw wpsError;

      setData((rows ?? []) as unknown as T[]);
      setProjects(
        ((wps ?? []) as unknown as Array<{ row_idx: number; cel_data: Record<string, string> }>)
          .filter(w => w.cel_data?.['2'] !== '__config__')
          .map(w => ({
            id: w.row_idx,
            label: w.cel_data?.['2'] ?? `Project ${w.row_idx}`,
          }))
      );
    } catch (err) {
      console.error(`Fout bij laden ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (id: string | null, form: Partial<T>) => {
    const supabase = createClient();
    if (id) {
      const { error } = await supabase.from(tableName).update(form as never).eq('id', id);
      if (error) throw new Error(error.message);
      setData(prev => prev.map(r => r.id === id ? { ...r, ...form } : r));
    } else {
      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert(form as never)
        .select();
      if (error) throw new Error(error.message);
      if (inserted) setData(prev => [...prev, ...(inserted as unknown as T[])]);
    }
  }, [tableName]);

  const remove = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw new Error(error.message);
    setData(prev => prev.filter(r => r.id !== id));
  }, [tableName]);

  return { data, projects, loading, save, remove, reload: load };
}
