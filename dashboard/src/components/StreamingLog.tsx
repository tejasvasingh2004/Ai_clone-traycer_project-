interface StreamingLogProps {
  messages?: Array<{ type: string; message?: string; error?: string }>;
  logs?: string[];
}

export default function StreamingLog({ messages, logs }: StreamingLogProps) {
  const items = messages || logs || [];

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
      {items.map((item, i) => {
        if (typeof item === 'string') {
          return (
            <div key={i} className="text-sm text-textMuted">
              <span className="text-primary">→ {item}</span>
            </div>
          );
        }
        return (
          <div key={i} className="text-sm text-textMuted">
            {item.type === 'progress' && <span className="text-primary">⏳ {item.message}</span>}
            {item.type === 'complete' && <span className="text-success">✓ Complete</span>}
            {item.type === 'error' && <span className="text-error">✗ Error: {item.error}</span>}
            {item.type === 'connected' && <span className="text-success">🔗 Connected</span>}
          </div>
        );
      })}
    </div>
  );
}
