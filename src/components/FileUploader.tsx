'use client';

import { useCallback } from 'react';
import { Conversation, Message } from '@/types';

interface FileUploaderProps {
  onConversationsLoaded: (conversations: Conversation[]) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export default function FileUploader({ onConversationsLoaded, setIsAnalyzing }: FileUploaderProps) {
  const extractMessageFromNode = (node: any): Message | null => {
    if (!node || !node.message) return null;
    
    const message = node.message;
    const content = message.content;
    
    if (!content || !content.parts || !content.parts[0]) return null;
    
    const text = content.parts[0];
    if (!text || typeof text !== 'string' || !text.trim()) return null;
    
    const role = message.author?.role;
    if (role !== 'user' && role !== 'assistant') return null;
    
    return {
      id: node.id || Math.random().toString(36),
      role: role,
      content: text.trim(),
      isMarkedForDeletion: false
    };
  };

  const reconstructConversationOrder = (mapping: any): Message[] => {
    // Trouver le nœud racine (sans parent)
    let rootId = null;
    for (const nodeId in mapping) {
      const node = mapping[nodeId];
      if (!node.parent || node.parent === '') {
        rootId = nodeId;
        break;
      }
    }
    
    if (!rootId) return [];
    
    // Parcourir l'arbre en suivant les enfants
    const messages: Message[] = [];
    let currentId = rootId;
    const visited = new Set<string>();
    
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = mapping[currentId];
      
      if (!node) break;
      
      const msg = extractMessageFromNode(node);
      if (msg) {
        messages.push(msg);
      }
      
      const children = node.children || [];
      if (children.length > 0) {
        currentId = children[0];
      } else {
        break;
      }
    }
    
    return messages;
  };

  const parseConversationsJSON = (jsonContent: string): Conversation[] => {
    try {
      const data = JSON.parse(jsonContent);
      const conversations: Conversation[] = [];
      
      for (const conv of data) {
        const mapping = conv.mapping || {};
        const messages = reconstructConversationOrder(mapping);
        
        if (messages.length > 0) {
          conversations.push({
            id: conv.id || `conv-${conversations.length}`,
            title: conv.title || `Conversation ${conversations.length + 1}`,
            messages: messages,
            isExpanded: false
          });
        }
      }
      
      return conversations;
    } catch (error) {
      console.error('Erreur parsing JSON:', error);
      return [];
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      let parsedConversations: Conversation[] = [];
      
      if (file.name.endsWith('.json')) {
        parsedConversations = parseConversationsJSON(content);
      }
      
      if (parsedConversations.length === 0) {
        alert('No conversations found in file. Please check the format.');
        return;
      }
      
      onConversationsLoaded(parsedConversations);
    };

    reader.readAsText(file);
  }, [onConversationsLoaded]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
      <div className="mb-6">
        <svg
          className="mx-auto h-24 w-24 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Import ChatGPT Export
      </h2>
      <p className="text-gray-600 mb-8">
        Select your conversations.json file
      </p>
      
      <label className="cursor-pointer">
        <span className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          Choose conversations.json
        </span>
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
    </div>
  );
}
