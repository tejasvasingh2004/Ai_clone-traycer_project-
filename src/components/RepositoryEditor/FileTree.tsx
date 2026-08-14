import { Folder, File, ChevronDown, ChevronRight } from 'lucide-react';
import { FileTreeNode } from '../../types';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';

interface FileTreeProps {
  nodes: FileTreeNode[];
}

export function FileTree({ nodes }: FileTreeProps) {
  const { selectedRepository, setSelectedFile, toggleFileTreeNode, selectedFile } = useApp();

  const handleNodeClick = async (node: FileTreeNode) => {
    if (node.type === 'folder') {
      toggleFileTreeNode(node.id);
    } else {
      if (!selectedRepository) return;
      try {
        const content = await api.getFileContent(selectedRepository.id, node.path);
        setSelectedFile({ ...node, content });
      } catch (error) {
        console.error('Error fetching file content:', error);
      }
    }
  };

  const renderTree = (treeNodes: FileTreeNode[], depth = 0) => {
    if (!Array.isArray(treeNodes)) return null;
    return treeNodes.map((node) => {
      const isSelected = selectedFile?.path === node.path;

      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => handleNodeClick(node)}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer hover:bg-white/5 text-sm transition-colors group ${
              isSelected ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-gray-300 hover:text-white'
            }`}
          >
            {node.type === 'folder' ? (
              <>
                <span className="text-gray-500 group-hover:text-gray-300">
                  {node.isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </span>
                <Folder className="w-4 h-4 text-blue-400/80 fill-blue-400/10" />
              </>
            ) : (
              <>
                <span className="w-4" />
                <File className="w-4 h-4 text-gray-400" />
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {node.type === 'folder' && node.isExpanded && node.children && (
            <div className="mt-0.5">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return <div className="space-y-0.5">{renderTree(nodes)}</div>;
}
