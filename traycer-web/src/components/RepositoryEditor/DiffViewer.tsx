import React from 'react';
import { FileDiff } from 'lucide-react';

interface Props {
  diff: string;
  fileName: string;
}

export function DiffViewer({ diff, fileName }: Props) {
  const lines = diff.split('\n');

  if (!diff) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-[#0f0f15]">
        No diff available.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0b0b0f] text-gray-300">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#12121a]">
        <FileDiff className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span className="font-medium text-white truncate">Diff: {fileName}</span>
      </div>
      <div className="flex-1 overflow-auto bg-[#0d0d13] font-mono text-sm leading-6">
        <div className="min-w-fit">
          {lines.map((line, i) => {
            let className = "text-gray-300";
            let bgColor = "bg-transparent";
            if (line.startsWith('+') && !line.startsWith('+++')) {
              className = "text-[#22863a]";
              bgColor = "bg-[#e6ffed]";
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              className = "text-[#cb2431]";
              bgColor = "bg-[#ffeef0]";
            } else if (line.startsWith('@@')) {
              className = "text-blue-400";
              bgColor = "bg-blue-900/30";
            }
            
            // Note: whitespace-pre-wrap ensures lines wrap and do not truncate at fixed width.
            return (
              <div key={i} className={`px-4 py-0.5 whitespace-pre-wrap break-all ${bgColor} ${className}`}>
                {line || ' '}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
