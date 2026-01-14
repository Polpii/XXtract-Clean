'use client';

import { useState, useEffect } from 'react';
import { Conversation, Message } from '@/types';
import { detectSensitiveDataLocally } from '@/utils/piiDetection';

interface ConversationViewerProps {
  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export default function ConversationViewer({
  conversations,
  setConversations,
  isAnalyzing,
  setIsAnalyzing
}: ConversationViewerProps) {
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showSensitiveReview, setShowSensitiveReview] = useState(false);
  const [sensitiveMessages, setSensitiveMessages] = useState<Array<{
    convId: string;
    convTitle: string;
    msgId: string;
    message: Message;
  }>>([]);

  // Run local detection on mount
  useEffect(() => {
    // Only run if conversations don't have sensitivity data yet
    const needsDetection = conversations.some(conv => 
      conv.messages.some(msg => msg.hasSensitiveData === undefined)
    );
    
    if (!needsDetection) return;
    
    const conversationsWithLocalDetection = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.map(msg => {
        const text = msg.content;
        const localResult = detectSensitiveDataLocally(text);
        return {
          ...msg,
          hasSensitiveData: localResult.hasSensitiveData,
          sensitiveReason: localResult.reason || undefined
        };
      })
    }));
    setConversations(conversationsWithLocalDetection);
  }, [conversations.length]);

  const toggleConversation = (convId: string) => {
    setConversations(
      conversations.map(conv =>
        conv.id === convId ? { ...conv, isExpanded: !conv.isExpanded } : conv
      )
    );
  };

  const deleteConversation = (convId: string) => {
    if (confirm('Delete this entire conversation?')) {
      setConversations(conversations.filter(conv => conv.id !== convId));
    }
  };

  const toggleMessageDeletion = (convId: string, msgId: string) => {
    setConversations(
      conversations.map(conv =>
        conv.id === convId
          ? {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === msgId
                  ? { ...msg, isMarkedForDeletion: !msg.isMarkedForDeletion }
                  : msg
              )
            }
          : conv
      )
    );
  };

  const analyzeSensitiveData = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversations,
          apiKey
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setConversations(data.conversations);
      
      // Update sensitive messages list
      updateSensitiveMessagesList(data.conversations);
      
      alert('AI analysis complete! Click "Review Sensitive Messages" to see results.');
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert(`Error: ${error.message}. Check console for details.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateSensitiveMessagesList = (convs: Conversation[]) => {
    const sensitive: Array<{
      convId: string;
      convTitle: string;
      msgId: string;
      message: Message;
    }> = [];
    
    convs.forEach((conv: Conversation) => {
      conv.messages.forEach((msg: Message) => {
        if (msg.hasSensitiveData) {
          sensitive.push({
            convId: conv.id,
            convTitle: conv.title,
            msgId: msg.id,
            message: msg
          });
        }
      });
    });
    
    setSensitiveMessages(sensitive);
  };

  const openSensitiveReview = () => {
    updateSensitiveMessagesList(conversations);
    setShowSensitiveReview(true);
  };

  const deleteSensitiveMessage = (convId: string, msgId: string) => {
    toggleMessageDeletion(convId, msgId);
    setSensitiveMessages(prev => prev.filter(s => !(s.convId === convId && s.msgId === msgId)));
  };

  const deleteAllSensitive = () => {
    if (confirm(`Delete all ${sensitiveMessages.length} sensitive messages?`)) {
      sensitiveMessages.forEach(({ convId, msgId }) => {
        toggleMessageDeletion(convId, msgId);
      });
      setSensitiveMessages([]);
      setShowSensitiveReview(false);
    }
  };

  const keepAllSensitive = () => {
    setShowSensitiveReview(false);
  };

  const exportFilteredData = () => {
    const filteredConversations = conversations.map(conv => ({
      ...conv,
      messages: conv.messages.filter(msg => !msg.isMarkedForDeletion)
    })).filter(conv => conv.messages.length > 0);

    let textOutput = '='.repeat(80) + '\n';
    textOutput += 'CHATGPT CONVERSATIONS EXPORT - FILTERED\n';
    textOutput += '='.repeat(80) + '\n\n';

    filteredConversations.forEach((conv, idx) => {
      textOutput += `\n${'='.repeat(80)}\n`;
      textOutput += `CONVERSATION ${idx + 1}: ${conv.title}\n`;
      textOutput += `${'='.repeat(80)}\n\n`;

      conv.messages.forEach((msg, msgIdx) => {
        const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
        const content = msg.content;
        textOutput += `[${role}]:\n`;
        textOutput += `${content}\n\n`;
        textOutput += '-'.repeat(80) + '\n\n';
      });
    });

    const blob = new Blob([textOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt_export_filtered_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: conversations.reduce((acc, conv) => acc + conv.messages.length, 0),
    deleted: conversations.reduce(
      (acc, conv) => acc + conv.messages.filter(m => m.isMarkedForDeletion).length,
      0
    ),
    sensitive: conversations.reduce(
      (acc, conv) => acc + conv.messages.filter(m => m.hasSensitiveData).length,
      0
    )
  };

  return (
    <div className="space-y-6">
      {/* Sensitive Messages Review Modal */}
      {showSensitiveReview && sensitiveMessages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b bg-gray-50">
              <h2 className="text-2xl font-bold text-gray-900">
                Sensitive Data Detected
              </h2>
              <p className="text-gray-700 mt-2">
                Found {sensitiveMessages.length} message{sensitiveMessages.length > 1 ? 's' : ''} with potentially sensitive information.
                Review each one and decide what to delete.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {sensitiveMessages.map(({ convId, convTitle, msgId, message }) => {
                const content = message.content;
                return (
                  <div key={`${convId}-${msgId}`} className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">From: {convTitle}</p>
                        <span className="font-semibold text-sm">
                          {message.role === 'user' ? 'User' : 'Assistant'}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteSensitiveMessage(convId, msgId)}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Delete This
                      </button>
                    </div>
                    
                    <div className="mb-3 p-2 bg-blue-100 border border-blue-300 rounded text-sm text-blue-900">
                      <strong>Reason:</strong> {message.sensitiveReason}
                    </div>
                    
                    <p className="text-gray-700 text-sm whitespace-pre-wrap bg-white p-3 rounded border">
                      {content.length > 500 ? content.substring(0, 500) + '...' : content}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-4 justify-end">
              <button
                onClick={keepAllSensitive}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Keep All ({sensitiveMessages.length})
              </button>
              <button
                onClick={deleteAllSensitive}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Delete All ({sensitiveMessages.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center flex-wrap">
            {showApiKeyInput ? (
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="OpenAI API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => {
                    setShowApiKeyInput(false);
                    analyzeSensitiveData();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <button
                onClick={analyzeSensitiveData}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'AI Analysis Running...' : 'Deep AI Scan (Optional)'}
              </button>
            )}
            
            <button
              onClick={openSensitiveReview}
              disabled={stats.sensitive === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review Sensitive Messages ({stats.sensitive})
            </button>
            
            <button
              onClick={exportFilteredData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export to .txt
            </button>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <div>Total messages: <span className="font-semibold">{stats.total}</span></div>
            <div>To delete: <span className="font-semibold">{stats.deleted}</span></div>
            <div>Sensitive detected: <span className="font-semibold">{stats.sensitive}</span></div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          Basic sensitive messages detection runs automatically (emails, phones, addresses). 
          Use "Deep AI Scan" for pushing the detection further (it takes at least an hour maybe two depending on how much you interacted with chat GPT xD).
        </div>
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          <strong>How to use:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Review auto-detected sensitive messages</li>
            <li>(Optional) Run Deep AI Scan for better detection (take at least an hour)</li>
            <li>Delete entire conversations using "Delete Conv" button OR click on a conversation title to open it and select specific messages to delete</li>
            <li>Click "Review Sensitive Messages" to see all flagged data</li>
            <li>Export cleaned conversations to .txt</li>
          </ul>
        </div>
      </div>

      {/* Conversations list */}
      <div className="space-y-4">
        {conversations.map((conv) => (
          <div key={conv.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-4 bg-gray-50 flex justify-between items-center">
              <h3 
                onClick={() => toggleConversation(conv.id)}
                className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors flex-1"
              >
                {conv.title}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {conv.messages.length} messages
                </span>
                <button
                  onClick={() => deleteConversation(conv.id)}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  title="Delete entire conversation"
                >
                  Delete Conv
                </button>
                <button
                  onClick={() => toggleConversation(conv.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {conv.isExpanded ? '▼' : '▶'}
                </button>
              </div>
            </div>

            {conv.isExpanded && (
              <div className="p-4 space-y-4">
                {conv.messages.map((msg) => {
                  const content = msg.content;
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border-2 ${
                        msg.isMarkedForDeletion
                          ? 'bg-gray-100 border-gray-400 opacity-50'
                          : msg.hasSensitiveData
                          ? 'bg-blue-50 border-blue-300'
                          : msg.role === 'user'
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm">
                          {msg.role === 'user' ? 'User' : 'Assistant'}
                        </span>
                        <button
                          onClick={() => toggleMessageDeletion(conv.id, msg.id)}
                          className={`px-3 py-1 text-xs rounded ${
                            msg.isMarkedForDeletion
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-600 text-white hover:bg-gray-700'
                          }`}
                        >
                          {msg.isMarkedForDeletion ? 'Restore' : 'Delete'}
                        </button>
                      </div>
                      
                      {msg.hasSensitiveData && (
                        <div className="mb-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800">
                          Sensitive data detected: {msg.sensitiveReason}
                        </div>
                      )}
                      
                      <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
