'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import Sidebar from './Sidebar';
import TableOfContents from './TableOfContents';

const MDXRenderer = dynamic(() => import('./MDXRenderer'), { ssr: false });

const MainAppLayout = () => {
  const [fileStructure, setFileStructure] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isTocVisible, setIsTocVisible] = useState(true);
  const { theme } = useTheme();

  const fetchFileStructure = useCallback(async () => {
    try {
      const response = await fetch('/api/file-structure');
      const data = await response.json();
      setFileStructure(data);
    } catch (error) {
      console.error('Error fetching file structure:', error);
    }
  }, []);

  const loadHomeContent = useCallback(async () => {
    try {
      const response = await fetch('/api/file-content?path=./_home.mdx');
      const content = await response.text();
      setFileContent(content);
    } catch (error) {
      console.error('Error loading home content:', error);
      setFileContent('Error loading home content');
    }
  }, []);

  useEffect(() => {
    fetchFileStructure();
    loadHomeContent();
  }, [fetchFileStructure, loadHomeContent]);

  const handleFileSelect = useCallback(async (file) => {
    if (file && file.path && file.name !== '_home.mdx') {
      setSelectedFile(file);
      try {
        const response = await fetch(`/api/file-content?path=${encodeURIComponent(file.path)}`);
        const content = await response.text();
        setFileContent(content);
      } catch (error) {
        console.error('Error fetching file content:', error);
        setFileContent('Error loading file content');
      }
    } else {
      setSelectedFile(null);
      loadHomeContent();
    }
  }, [loadHomeContent]);

  const handleCreateNew = useCallback(async (parentPath, name, type) => {
    console.log('Attempting to create new item:', { parentPath, name, type });
    try {
      const response = await fetch('/api/create-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentPath, name, type }),
      });
      if (response.ok) {
        console.log('Item created successfully, refreshing file structure');
        await fetchFileStructure();
      } else {
        console.error('Failed to create new item');
      }
    } catch (error) {
      console.error('Error creating new item:', error);
    }
  }, [fetchFileStructure]);

  const handleDelete = useCallback(async (path, type) => {
    console.log('Attempting to delete item:', { path, type });
    try {
      const response = await fetch('/api/delete-item', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type }),
      });
      if (response.ok) {
        console.log('Item deleted successfully, refreshing file structure');
        await fetchFileStructure();
        if (selectedFile && selectedFile.path === path) {
          setSelectedFile(null);
          loadHomeContent();
        }
      } else {
        console.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  }, [fetchFileStructure, loadHomeContent, selectedFile]);

  const toggleToc = useCallback(() => {
    setIsTocVisible((prev) => !prev);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex flex-1 z-1000">
        <Sidebar
          fileStructure={fileStructure}
          onSelect={handleFileSelect}
          onCreateNew={handleCreateNew}
          onDelete={handleDelete}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-scroll bg-background-light z-5">
          <div className="container mx-auto px-6 py-8 z-1">
            <MDXRenderer source={fileContent}/>
          </div>
          <div className={`fixed top-12 right-0 transition-transform duration-300 ease-in-out ${isTocVisible ? 'translate-x-0' : 'translate-x-full'}`}>
            <TableOfContents source={fileContent} isVisible={isTocVisible} />
          </div>
          <button
            onClick={toggleToc}
            className={`fixed top-14 right-2 z-10 p-2 rounded-full transition-colors duration-200
              ${theme === 'dark' 
                ? 'bg-primary text-white hover:bg-gray-600' 
                : 'text-black hover:text-gray dark:hover:bg-gray-600'}`}
          >
            <i className={`ri-${isTocVisible ? 'arrow-right-double-line text-white' : 'list-unordered'}`}></i>
          </button>
        </main>
      </div>
    </div>
  );
};

export default React.memo(MainAppLayout);
