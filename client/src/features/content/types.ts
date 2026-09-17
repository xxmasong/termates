export interface CreateContentInput {
  filename: string;
  content?: string;
  createdBy?: string;
}

export interface UpdateContentInput {
  content: string;
}

export interface ContentTreeNode {
  by?: string;
  children?: ContentTreeNode[];
  ext?: string;
  kind: 'folder' | 'file';
  name: string;
  path: string;
  updatedAt?: string;
}
