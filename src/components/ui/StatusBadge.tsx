import type { StatusValue } from '@/types';
import { statusClass } from '@/lib/constants';

interface Props {
  status: StatusValue | string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  if (!status) return <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>;
  const cls = statusClass(status);
  return (
    <span
      className={`badge badge-${cls}`}
      style={size === 'md' ? { fontSize: 11, padding: '3px 9px' } : undefined}
    >
      {status}
    </span>
  );
}
