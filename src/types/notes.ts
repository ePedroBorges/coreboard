export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  page_count?: number;
}

export interface Page {
  id: string;
  notebook_id: string;
  user_id: string;
  title: string;
  content: Block[];
  position: number;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  usage_count: number;
  created_at: string;
}

export interface PageVersion {
  id: string;
  page_id: string;
  content: Block[];
  title: string | null;
  created_at: string;
}

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet-list"
  | "numbered-list"
  | "checklist"
  | "image"
  | "drawing"
  | "attachment";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  imageUrl?: string;
  // Attachment fields (PDFs / images)
  fileUrl?: string;     // signed URL or storage path
  filePath?: string;    // storage path inside bucket
  fileName?: string;
  fileType?: string;    // mime
  meta?: Record<string, unknown>;
}
