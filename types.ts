
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'error';
  imageUrl?: string;
  sources?: Array<{ title: string; uri: string }>;
}

export interface AppState {
  messages: ChatMessage[];
  isThinking: boolean;
  mode: 'chat' | 'image' | 'research';
}
