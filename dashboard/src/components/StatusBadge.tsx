interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'create' | 'modify';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    pending: 'bg-[#422006] text-warning',
    approved: 'bg-[#052e16] text-success',
    rejected: 'bg-[#450a0a] text-error',
    create: 'bg-[#1e1b4b] text-primary',
    modify: 'bg-[#1c1917] text-textMuted',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}
