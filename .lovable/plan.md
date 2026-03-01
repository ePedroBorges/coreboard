

# SmartNotes — Implementation Plan

## Phase 1: Foundation & Core Structure

### 1. Supabase Setup & Authentication
- User auth with email/password (login, signup, password reset)
- User profiles table (username, avatar, preferences including theme)
- Dark theme as default with light/dark toggle

### 2. Database Schema
- **notebooks** table: id, user_id, title, description, position (for drag-and-drop ordering), created_at, updated_at
- **pages** table: id, notebook_id, user_id, title, content (JSONB for block-based content), position, is_favorite, created_at, updated_at
- **tags** table: id, user_id, name, color, usage_count
- **page_tags** junction table: page_id, tag_id
- **page_versions** table: id, page_id, content, created_at (for version history)
- **drawings** storage bucket for canvas images
- **page_images** storage bucket for inserted images
- RLS policies so users only access their own data

### 3. App Layout
- Collapsible sidebar with notebook list, page counts, and favorites section
- Main content area with page editor
- Top header with search, theme toggle, and focus mode button
- Dark-first modern dev aesthetic: sharp contrasts, monospace accents, subtle neon accent colors

---

## Phase 2: Notebooks & Pages

### 4. Notebook Management
- Create, rename, delete notebooks (with confirmation dialogs)
- Drag-and-drop reordering of notebooks in sidebar
- Notebook page count badges
- Export entire notebook as PDF

### 5. Page Management
- Create, rename, delete pages within notebooks
- Drag-and-drop reordering of pages
- Duplicate page functionality
- Favorite/unfavorite pages (star icon)
- Page metadata display (created, last modified)
- Auto-save with visual indicator (saved/unsaved status)

---

## Phase 3: Rich Editor & Canvas

### 6. Block-Based Rich Text Editor
- Paragraph, headings (H1-H3), bullet lists, numbered lists, checklists
- Bold, italic, strikethrough formatting
- Slash command menu (`/`) to insert block types
- Drag-and-drop block reordering
- Image block (upload to Supabase Storage)
- Content stored as structured JSON blocks

### 7. Drawing Canvas
- Integrated freehand drawing canvas within pages (as a block type)
- Pen tool with color and size options
- Eraser tool
- Clear canvas
- Save drawings as images to Supabase Storage

---

## Phase 4: Search, Tags & Links

### 8. Advanced Search
- Global search across all pages with highlighted results
- Filter by notebook, date range, and tags
- Search results with context snippets

### 9. Tag System
- Create custom tags with colors
- Assign multiple tags per page
- Tag autocomplete with frequently-used suggestions
- Quick filter by tag in sidebar

### 10. Internal Links
- Link between pages using `[[Page Name]]` syntax
- Autocomplete page picker when typing `[[`
- Clickable links that navigate to referenced pages

---

## Phase 5: Productivity & Safety

### 11. Version History
- Automatic version snapshots on save
- View and restore previous versions of a page

### 12. Export & Backup
- Export individual page as PDF
- Export full notebook as PDF
- Manual backup/restore (JSON export/import)

### 13. Focus Mode
- Toggle to hide sidebar and header
- Distraction-free writing experience
- Keyboard shortcut (Ctrl+Shift+F)

### 14. Keyboard Shortcuts
- Ctrl+N: New page
- Ctrl+S: Force save
- Ctrl+K: Quick search
- Ctrl+Shift+F: Focus mode
- Ctrl+B/I: Bold/Italic in editor

---

## Design Direction: Dark-First Dev Style
- Deep dark backgrounds (#0d1117-style)
- High-contrast text
- Accent color: electric blue or green for interactive elements
- Monospace font for metadata/timestamps
- Sharp borders, minimal rounded corners
- Subtle glow effects on focus states
- Smooth micro-animations on transitions

