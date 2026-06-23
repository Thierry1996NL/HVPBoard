'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* Generieke data-hook voor één Supabase-tabel met een uuid 'id'.
   Anders dan useModuleData laadt deze GEEN werkpakketten (geen project-koppeling). */
export function useTableData<T extends { id: string }>(tableName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setData((rows ?? []) as unknown as T[]);
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
      const { data: inserted, error } = await supabase.from(tableName).insert(form as never).select();
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

  return { data, loading, save, remove, reload: load };
}
