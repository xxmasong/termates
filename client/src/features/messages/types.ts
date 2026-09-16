export {};
export interface SendAgentMessageInput {
  fromAgentId: string;
  fromAgentName?: string;
  target: string;
  message: string;
}

export interface SendAgentMessageResponse {
  delivered: boolean;
  toAgentId: string;
  toAgentName: string;
}

export interface BroadcastMessageInput {
  text: string;
}

export interface BroadcastMessageResponse {
  delivered: string[];
  failed: string[];
}
