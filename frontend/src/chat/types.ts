export interface ChatMessage {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId?: number;
  receiverUsername?: string;
  message: string;
  timestamp: number;
  type: 'global' | 'direct' | 'invite';
}

export interface ChatError {
  message: string;
}

export interface ChatUser {
  userId: number;
  username: string;
  socketId: string | null;
} 