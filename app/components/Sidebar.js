'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const Tooltip = ({ message, isVisible, position }) => {
  if (!isVisible) return null;
  
  return (
    <div 
      className="absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-sm tooltip dark:bg-gray-700"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: 'translate(10px, -50%)'
      }}
    >
      {message}
      <div className="tooltip-arrow"></div>
    </div>
  );
};

const FileItem = ({ item, onSelect, onCreateNew, onDelete, onRename, level = 0, isAuthenticated }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isInvalidTarget, setIsInvalidTarget] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const inputRef = useRef(null);
  const itemRef = useRef(null);

  useEffect(() => {
    if (isCreating) {
      document.addEventListener('click', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isCreating]);

  const handleCreateNew = () => {
    setIsCreating(true);
  };

  const handleOutsideClick = (e) => {
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (newItemName.trim()) {
      onCreateNew(item.path, newItemName.trim());
    }
    setIsCreating(false);
    setNewItemName('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.title}"?`)) {
      const deleteChildren = item.children && item.children.length > 0 && 
        window.confirm("Do you want to delete child items as well?");
      
      try {
        const response = await fetch('/api/delete-item', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: item.path, deleteChildren }),
        });

        if (response.ok) {
          onDelete(item.path);
        } else {
          console.error('Failed to delete item');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Helper function to check if an item is a descendant
  const isDescendant = (parentPath, childPath) => {
    const findItem = (items, path) => {
      for (const item of items) {
        if (item.path === path) return true;
        if (item.children && findItem(item.children, path)) return true;
      }
      return false;
    };

    return findItem(item.children || [], childPath);
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      path: item.path,
      title: item.title,
      children: item.children
    }));
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsInvalidTarget(false);
    setTooltipVisible(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Get the dragged item data
    const draggedData = e.dataTransfer.getData('text/plain');
    if (draggedData) {
      const draggedItem = JSON.parse(draggedData);
      
      // Check if target is a descendant of the dragged item
      if (isDescendant(draggedItem.path, item.path)) {
        setIsInvalidTarget(true);
        setTooltipVisible(true);
        setTooltipPosition({ x: e.clientX, y: e.clientY });
        return;
      }
    }

    setIsInvalidTarget(false);
    setIsDragOver(true);
    setTooltipVisible(false);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsInvalidTarget(false);
    setTooltipVisible(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setIsInvalidTarget(false);
    setTooltipVisible(false);

    const draggedItem = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (draggedItem.path === item.path) return; // Prevent dropping on itself

    // Check if target is a descendant of the dragged item
    if (isDescendant(draggedItem.path, item.path)) {
      return; // Silently fail as we've already shown the visual feedback
    }

    try {
      const response = await fetch('/api/file-structure/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: draggedItem.path,
          targetPath: item.path,
          moveToRoot: false
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder items');
      }

      // Refresh the file structure after successful reorder
      window.location.reload();
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  const displayName = item.title.replace(/\.mdx$/, '');

  return (
    <li ref={itemRef}>
      <button
        type="button"
        className={`flex items-center p-2 w-full text-base font-normal text-gray-900 rounded-lg transition duration-75 group 
          ${isDragOver && !isInvalidTarget ? 'bg-blue-100 dark:bg-blue-900' : ''}
          ${isInvalidTarget ? 'bg-red-100 dark:bg-red-900' : 'hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'}
          ${isDragging ? 'opacity-50' : ''}`}
        onClick={() => onSelect(item)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {item.children && item.children.length > 0 && (
          <i
            className={`mr-2 font-normal cursor-pointer ${isExpanded ? 'ri-checkbox-indeterminate-line' : 'ri-add-box-line'}`}
            onClick={toggleExpand}
          ></i>
        )}
        <span className="ml-1">{displayName}</span>
        {isHovered && isAuthenticated && (
          <span className="ml-auto flex items-center">
            <i
              className="ri-delete-bin-line mr-1 cursor-pointer text-gray-500 hover:text-red-500 font-normal"
              onClick={handleDelete}
            ></i>
            <i
              className="ri-add-line cursor-pointer text-gray-500 hover:text-green-500 font-normal"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNew();
              }}
            ></i>
          </span>
        )}
      </button>
      <Tooltip 
        message="Cannot move a parent item to its child"
        isVisible={tooltipVisible}
        position={tooltipPosition}
      />
      {isCreating && (
        <div className="fixed ml-1 mt-1 mb-1 overflow-visible flex shadow-lg z-[1001]" ref={inputRef}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 z-[1002]">
            <div className="flex items-center">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="New item name"
                className="border rounded px-2 py-1 pr-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-grow"
                autoFocus
              />
              <button
                onClick={() => setIsCreating(false)}
                className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              >
                <i className="ri-close-line shadow-sm"></i>
              </button>
            </div>
          </div>
        </div>
      )}
      {item.children && item.children.length > 0 && isExpanded && (
        <ul className="space-y-2 ml-4 border-l border-gray-200 dark:border-gray-700">
          {item.children.map((child, index) => (
            <FileItem key={index} item={child} onSelect={onSelect} onCreateNew={onCreateNew} onDelete={onDelete} onRename={onRename} level={level + 1} isAuthenticated={isAuthenticated} />
          ))}
        </ul>
      )}
    </li>
  );
};

const CreateItemInterface = ({ onCreateNew, onClose }) => {
  const [newItemName, setNewItemName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleOutsideClick = (e) => {
    if (inputRef.current && !inputRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleSubmit = () => {
    if (newItemName.trim()) {
      onCreateNew('/', newItemName.trim());
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="fixed ml-1 mt-1 mb-1 overflow-visible flex shadow-lg z-[1000]" ref={inputRef}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 z-[999]">
        <div className="flex items-center">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="New item name"
            className="border rounded px-2 py-1 pr-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white flex-grow"
            autoFocus
          />
          <button
            onClick={onClose}
            className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <i className="ri-close-line shadow-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

const filterItems = (items, isAuthenticated) => {
  return items.filter(item => !item.deleted && (isAuthenticated || item.isPublic)).map(item => ({
    ...item,
    children: item.children ? filterItems(item.children, isAuthenticated) : []
  }));
};

const Sidebar = ({ fileStructure, onSelect, onCreateNew, onDelete, onRename, refreshFileStructure, isAuthenticated }) => {
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  const handleCreateRoot = () => {
    setIsCreatingRoot(true);
  };

  const handleDelete = async (path) => {
    await onDelete(path);
    refreshFileStructure();
  };

  const handleRootDragOver = (e) => {
    e.preventDefault();
    setIsDragOverRoot(true);
  };

  const handleRootDragLeave = (e) => {
    e.preventDefault();
    setIsDragOverRoot(false);
  };

  const handleRootDrop = async (e) => {
    e.preventDefault();
    setIsDragOverRoot(false);

    const draggedItem = JSON.parse(e.dataTransfer.getData('text/plain'));

    try {
      const response = await fetch('/api/file-structure/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourcePath: draggedItem.path,
          targetPath: null,
          moveToRoot: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder items');
      }

      // Refresh the file structure after successful reorder
      window.location.reload();
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  const filteredFileStructure = filterItems(fileStructure, isAuthenticated);

  return (
    <div className="h-full overflow-hidden">
      <div className="overflow-y-auto py-5 px-3 h-full bg-white border-r border-gray-200 dark:bg-gray-800 dark:border-gray-700 flex flex-col">
        <div 
          className="flex items-center justify-between mb-4 p-2 rounded-lg transition duration-75 hover:bg-gray-100 dark:hover:bg-gray-700"
          onMouseEnter={() => setIsHeaderHovered(true)}
          onMouseLeave={() => setIsHeaderHovered(false)}
        >
          <h2 className="text-lg text-gray-900 dark:text-white">Pages</h2>
          {isAuthenticated && (
            <button
              onClick={handleCreateRoot}
              className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-opacity duration-200 ${isHeaderHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <i className="ri-add-line"></i>
            </button>
          )}
        </div>
        {isCreatingRoot && isAuthenticated && (
          <CreateItemInterface
            onCreateNew={onCreateNew}
            onClose={() => setIsCreatingRoot(false)}
          />
        )}
        <ul 
          className={`space-y-2 flex-grow ${isDragOverRoot ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          {filteredFileStructure.map((item, index) => (
            <FileItem key={index} item={item} onSelect={onSelect} onCreateNew={onCreateNew} onDelete={handleDelete} onRename={onRename} isAuthenticated={isAuthenticated} />
          ))}
        </ul>
        {isAuthenticated && (
          <Link href="/trash-bin" className="flex items-center p-2 text-base font-normal text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
            <i className="ri-delete-bin-7-line mr-2"></i>
            <span>Trash Bin</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
