'use client';

import { useState } from 'react';
import FileUploader from '@/components/FileUploader';
import ConversationViewer from '@/components/ConversationViewer';
import { Conversation } from '@/types';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            XXtract & Clean
          </h1>
          <p className="text-gray-600">
            Hi X²! You’re in control here and your privacy matters to us. That’s why we built this tool to help you filter and clean your exported conversations. We hope it feels empowering to trim away anything personal, so what remains is one clear, shared set for the project.
          </p>

        </div>

        {conversations.length === 0 ? (
          <FileUploader 
            onConversationsLoaded={setConversations}
            setIsAnalyzing={setIsAnalyzing}
          />
        ) : (
          <ConversationViewer 
            conversations={conversations}
            setConversations={setConversations}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        )}
      </div>
    </main>
  );
}
