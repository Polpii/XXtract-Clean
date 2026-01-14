export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isMarkedForDeletion?: boolean;
  hasSensitiveData?: boolean;
  sensitiveReason?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  isExpanded?: boolean;
}
