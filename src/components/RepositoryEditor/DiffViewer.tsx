import React from 'react';
import { FileDiff } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface Props {
  oldValue: string;
  newValue: string;
  fileName: string;
}

export function DiffViewer({ oldValue, newValue, fileName }: Props) {
  if (!oldValue && !newValue) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-[#0f0f15]">
        No content available.
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
        <ReactDiffViewer
          oldValue={oldValue}
          newValue={newValue}
          splitView={true}
          useDarkTheme={true}
          styles={{
            variables: {
              dark: {
                diffViewerBackground: '#0d0d13',
                addedBackground: 'rgba(34, 134, 58, 0.2)',
                addedColor: '#34d058',
                removedBackground: 'rgba(203, 36, 49, 0.2)',
                removedColor: '#f97583',
                wordAddedBackground: 'rgba(34, 134, 58, 0.4)',
                wordRemovedBackground: 'rgba(203, 36, 49, 0.4)',
                addedGutterBackground: 'rgba(34, 134, 58, 0.1)',
                removedGutterBackground: 'rgba(203, 36, 49, 0.1)',
                gutterBackground: '#0d0d13',
                gutterBackgroundDark: '#0b0b0f',
                highlightBackground: '#0b0b0f',
                highlightGutterBackground: '#0b0b0f',
                codeFoldGutterBackground: '#12121a',
                codeFoldBackground: '#12121a',
                emptyLineBackground: '#0b0b0f',
                gutterColor: '#8b949e',
                addedGutterColor: '#8b949e',
                removedGutterColor: '#8b949e',
                codeFoldContentColor: '#8b949e',
              }
            }
          }}
        />
      </div>
    </div>
  );
}
