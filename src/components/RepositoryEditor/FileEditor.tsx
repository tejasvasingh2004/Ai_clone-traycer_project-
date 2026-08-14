import { useState, useEffect, useRef } from 'react';
import { Save, File, AlertCircle, Sparkles } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';

export function FileEditor() {
  const { selectedFile, selectedRepository, setSelectedFile } = useApp();
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync scroll between textarea and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  useEffect(() => {
    if (selectedFile) {
      setEditedContent(selectedFile.content || '');
    }
  }, [selectedFile]);

  if (!selectedFile) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-[#0f0f15]">
        <div className="text-center">
          <File className="w-16 h-16 mx-auto mb-4 opacity-20 text-blue-400" />
          <p className="text-sm">Select a file from the tree to start editing</p>
        </div>
      </div>
    );
  }

  const isModified = editedContent !== (selectedFile.content || '');
  const lines = editedContent.split('\n');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setEditedContent(newValue);
      
      // Move cursor forward 2 spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg border text-sm transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2 ${
      type === 'success'
        ? 'bg-green-500/10 text-green-400 border-green-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20'
    }`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  };

  const handleSave = async () => {
    if (!selectedRepository) return;
    setIsSaving(true);
    try {
      await api.saveFileContent(selectedRepository.id, selectedFile.path, editedContent);
      setSelectedFile({ ...selectedFile, content: editedContent });
      showToast('File saved successfully!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast('Failed to save file: ' + (error.message || error), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Determine file language
  const ext = selectedFile.name.split('.').pop()?.toLowerCase() || '';
  const getLanguageLabel = () => {
    switch (ext) {
      case 'ts': case 'tsx': return 'TypeScript';
      case 'js': case 'jsx': return 'JavaScript';
      case 'css': return 'CSS';
      case 'html': return 'HTML';
      case 'json': return 'JSON';
      case 'md': return 'Markdown';
      case 'go': return 'Go';
      case 'py': return 'Python';
      case 'rs': return 'Rust';
      default: return ext.toUpperCase() || 'Plain Text';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0b0f] text-gray-300">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#12121a]">
        <div className="flex items-center gap-2 text-sm overflow-hidden">
          <File className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="font-medium text-white truncate">{selectedFile.name}</span>
          <span className="text-gray-500 text-xs truncate max-w-xs md:max-w-md hidden sm:inline">
            {selectedFile.path}
          </span>
          {isModified && (
            <span className="w-2 h-2 rounded-full bg-yellow-400" title="Unsaved changes" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {isModified && (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved Changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isSaving
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 cursor-not-allowed'
                : isModified
                ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-gray-300'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="flex-1 flex overflow-hidden font-mono text-sm relative">
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          className="w-12 py-3 bg-[#0d0d13] border-r border-white/5 text-right pr-3 text-gray-600 select-none overflow-hidden"
        >
          {lines.map((_, index) => (
            <div key={index} className="h-5 leading-5">
              {index + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 py-3 px-4 bg-transparent resize-none outline-none overflow-auto border-none focus:ring-0 text-gray-100 placeholder-gray-700 leading-5"
          placeholder="// Type your code here..."
          style={{ whiteSpace: 'pre', tabSize: 2, MozTabSize: 2 }}
        />
      </div>

      {/* Editor Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#07070a] border-t border-white/5 text-xs text-gray-500 font-sans select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-[#4f46e5]">
            <Sparkles className="w-3 h-3" />
            {getLanguageLabel()}
          </span>
          <span>{lines.length} lines</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
}
