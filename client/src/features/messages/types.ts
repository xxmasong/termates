export {};
export interface SendAgentMessageInput {
  fromAgentId: string;
  toAgentId: string;
  message: string;
}

export interface BroadcastMessageInput {
  fromAgentId: string;
  message: string;
}
