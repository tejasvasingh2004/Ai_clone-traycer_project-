interface DiffViewerProps {
  diff: string;
  filename: string;
}

export default function DiffViewer({ diff, filename }: DiffViewerProps) {
  const lines = diff.split('\n');

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="font-mono text-sm font-semibold">{filename}</div>
      </div>
      <div className="p-0 font-mono text-xs overflow-x-auto">
        {lines.map((line, i) => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            return (
              <div key={i} className="px-5 py-0.5 bg-[#052e16] text-success block">
                {line}
              </div>
            );
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            return (
              <div key={i} className="px-5 py-0.5 bg-[#450a0a] text-error block">
                {line}
              </div>
            );
          } else if (line.startsWith('@@')) {
            return (
              <div key={i} className="px-5 py-0.5 bg-[#1e2035] text-[#60a5fa] block">
                {line}
              </div>
            );
          } else if (line.startsWith('+++') || line.startsWith('---')) {
            return (
              <div key={i} className="px-5 py-0.5 text-textDim block">
                {line}
              </div>
            );
          }
          return (
            <div key={i} className="px-5 py-0.5 text-textDim block">
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
