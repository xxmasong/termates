export {};
export interface CreateContentInput {
  filename: string;
  content?: string;
  createdBy?: string;
}

export interface UpdateContentInput {
  content: string;
}
