import { Block, Page } from "@/types/notes";

export const DEFAULT_NOTE_TAGS = ["AnchorLab", "VISTA", "MEMIQ", "Pessoal", "Estudos", "Clientes", "Ideias"];
export const DEFAULT_NOTEBOOK_NAMES = ["Geral", "AnchorLab", "VISTA", "MEMIQ", "Pessoal", "Estudos", "Clientes", "Ideias"];
export const DEFAULT_NOTEBOOK_NAME = "Geral";

const NOTE_META_KEY = "vistaNoteMeta";

export function generateNoteId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getNoteTags(pageOrBlocks: Page | Block[] | undefined): string[] {
  const blocks = Array.isArray(pageOrBlocks) ? pageOrBlocks : pageOrBlocks?.content || [];
  const tags = blocks.find((block) => block.meta?.[NOTE_META_KEY])?.meta?.tags;
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0) : [];
}

export function setNoteTags(blocks: Block[], tags: string[]): Block[] {
  const cleanTags = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  const nextBlocks = blocks.length > 0 ? [...blocks] : [{ id: generateNoteId(), type: "paragraph" as const, content: "" }];
  const metaIndex = nextBlocks.findIndex((block) => block.meta?.[NOTE_META_KEY]);
  const targetIndex = metaIndex >= 0 ? metaIndex : 0;
  nextBlocks[targetIndex] = {
    ...nextBlocks[targetIndex],
    meta: {
      ...nextBlocks[targetIndex].meta,
      [NOTE_META_KEY]: true,
      tags: cleanTags,
    },
  };
  return nextBlocks;
}

export function blocksToText(blocks: Block[] = []) {
  return blocks
    .filter((block) => block.type !== "attachment")
    .map((block) => block.content || "")
    .filter(Boolean)
    .join("\n");
}

export function getNoteTitle(page: Page) {
  const title = page.title?.trim();
  if (title && title !== "Nova anota??o" && title !== "Nova anotação" && title !== "Untitled Page") return title;
  const firstLine = blocksToText(page.content).split("\n").find((line) => line.trim());
  return firstLine?.trim().slice(0, 80) || "Nova anota??o";
}

export function getNotePreview(page: Page, maxLength = 120) {
  const text = blocksToText(page.content).replace(/\s+/g, " ").trim();
  if (!text) return "Capture ideias, links e checklists.";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

export function pageHasChecklist(page: Page) {
  return page.content?.some((block) => block.type === "checklist") || false;
}

export function pageHasLink(page: Page) {
  return /https?:\/\/\S+/i.test(blocksToText(page.content));
}

export function makeNoteBlocks(content: string, checklistItems: { text: string; checked?: boolean }[], tags: string[]): Block[] {
  const textBlocks = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map<Block>((paragraph) => ({
      id: generateNoteId(),
      type: "paragraph",
      content: paragraph,
    }));

  const checklistBlocks = checklistItems
    .map((item) => item.text.trim())
    .filter(Boolean)
    .map<Block>((text) => ({
      id: generateNoteId(),
      type: "checklist",
      content: text,
      checked: false,
    }));

  return setNoteTags([...textBlocks, ...checklistBlocks], tags);
}

export function makeLineByLineNoteBlocks(content: string, checklistItems: { text: string; checked?: boolean }[], tags: string[]): Block[] {
  const textBlocks = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<Block>((line) => ({
      id: generateNoteId(),
      type: "paragraph",
      content: line,
    }));

  const checklistBlocks = checklistItems
    .map((item) => item.text.trim())
    .filter(Boolean)
    .map<Block>((text) => ({
      id: generateNoteId(),
      type: "checklist",
      content: text,
      checked: false,
    }));

  return setNoteTags([...textBlocks, ...checklistBlocks], tags);
}

export function makeFreeformNoteBlocks(content: string, checklistItems: { text: string; checked?: boolean }[], tags: string[]): Block[] {
  const textBlocks = content.trim()
    ? [{
        id: generateNoteId(),
        type: "freeform" as const,
        content: content.trim(),
      }]
    : [];

  const checklistBlocks = checklistItems
    .map((item) => item.text.trim())
    .filter(Boolean)
    .map<Block>((text) => ({
      id: generateNoteId(),
      type: "checklist",
      content: text,
      checked: false,
    }));

  return setNoteTags([...textBlocks, ...checklistBlocks], tags);
}

export function noteMatchesQuery(page: Page, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const searchable = [
    page.title,
    blocksToText(page.content),
    getNoteTags(page).join(" "),
  ].join(" ").toLowerCase();
  return searchable.includes(normalized);
}

export function noteMatchesQueryWithNotebook(page: Page, query: string, notebookTitle = "") {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const searchable = [
    page.title,
    blocksToText(page.content),
    getNoteTags(page).join(" "),
    notebookTitle,
  ].join(" ").toLowerCase();
  return searchable.includes(normalized);
}

export function taskTitleFromNote(page: Page) {
  return getNoteTitle(page).slice(0, 140);
}

export function getFirstTag(page: Page) {
  return getNoteTags(page)[0] || "";
}
