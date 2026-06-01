'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Werkpakket, CelData } from '@/types';

export function useProjects() {
  const [projects, setProjects] = useState<Werkpakket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('werkpakketten')
        .select('*')
        .order('row_idx', { ascending: true });

      if (error) throw error;
      setProjects((data ?? []) as unknown as Werkpakket[]);
    } catch (err) {
      console.error('Fout bij laden werkpakketten:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateCell = useCallback(async (rowIdx: number, colIdx: number, value: string) => {
    const supabase = createClient();
    const project = projects.find(p => p.row_idx === rowIdx);
    if (!project) throw new Error('Project niet gevonden');

    const newData: CelData = { ...project.cel_data, [String(colIdx)]: value };
    const { error } = await supabase
      .from('werkpakketten')
      .update({ cel_data: newData as unknown as never, updated_at: new Date().toISOString() } as never)
      .eq('row_idx', rowIdx);

    if (error) throw new Error(error.message);

    setProjects(prev =>
      prev.map(p => p.row_idx === rowIdx ? { ...p, cel_data: newData } : p)
    );
  }, [projects]);

  const createProject = useCallback(async (data: CelData) => {
    const supabase = createClient();
    const maxIdx = projects.reduce((m, p) => Math.max(m, p.row_idx), 0);
    const row_idx = maxIdx + 1;
    const projectnaam = data['2'] ?? `Project ${row_idx}`;

    const { error } = await supabase
      .from('werkpakketten')
      .insert({ row_idx, projectnaam, cel_data: data } as never);

    if (error) throw new Error(error.message);
    await load();
  }, [projects, load]);

  const deleteProject = useCallback(async (rowIdx: number) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('werkpakketten')
      .delete()
      .eq('row_idx', rowIdx);

    if (error) throw new Error(error.message);
    setProjects(prev => prev.filter(p => p.row_idx !== rowIdx));
  }, []);

  return { projects, loading, updateCell, createProject, deleteProject, reload: load };
}
