# Implementation Plan - Rebranding to CoreBoard & Rich Text Editor

This plan covers the rebranding of the project from "VISTA Task Control" to "CoreBoard" and the implementation of a rich text editor for notes with advanced formatting options.

## User Review Required

> [!IMPORTANT]
> **Renaming Scope**: The rebranding will affect the app name, website titles, meta tags, and internal storage keys. While internal IDs (like package names) will be updated, this might affect existing installations if they rely on deep links or specific bundle IDs. We will prioritize user-facing changes but also update package IDs for a complete port.

> [!WARNING]
> **Data Migration**: Converting existing plain-text notes to rich-text (HTML) should be seamless, but we will ensure that existing line breaks and spacing are preserved during the transition.

## Proposed Changes

### Rebranding (CoreBoard)

We will replace all occurrences of "VISTA Task Control", "VISTA Tasks Control", and "VISTA" (in the context of the app) with "CoreBoard".

#### [MODIFY] [index.html](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/index.html)
- Update `<title>` and meta tags.
- Update icon links.

#### [MODIFY] [package.json](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/package.json)
- Update `name`, `productName`, `description`.
- Update `appId` to `studio.anchorlab.coreboard`.

#### [MODIFY] [capacitor.config.ts](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/capacitor.config.ts)
- Update `appId` to `br.com.anchorlab.coreboard`.
- Update `appName` to `CoreBoard`.

#### [MODIFY] [android/app/src/main/res/values/strings.xml](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/android/app/src/main/res/values/strings.xml)
- Update `app_name` and `title_activity_main`.

#### [MODIFY] Multiple Source Files
- Search and replace in components, hooks, and lib files.

---

### Rich Text Editor

We will integrate TipTap to provide a modern rich text editing experience.

#### [NEW] [RichTextEditor.tsx](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/src/components/editor/RichTextEditor.tsx)
- New component using TipTap.
- Support for: **Bold**, *Italic* (optional), Font Size, Bullet Lists, Numbered Lists, Task Lists (Checkboxes), and Indentation.

#### [NEW] [EditorToolbar.tsx](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/src/components/editor/EditorToolbar.tsx)
- Toolbar for formatting options.
- **Mobile**: Positioned above the keyboard.
- **Desktop**: Fixed toolbar at the top of the editor.

#### [MODIFY] [BlockEditor.tsx](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/src/components/editor/BlockEditor.tsx)
- Replace `AutoResizeTextarea` with the new `RichTextEditor`.
- Remove standalone `checklist` block type as it will be handled within the rich text editor.
- Update `useEffect` that unifies blocks to handle HTML content.

---

### UI Tweaks

#### [MODIFY] [AppHeader.tsx](file:///C:/Users/pedro/OneDrive/Desktop/Programacao/smart-notes-brain/src/components/layout/AppHeader.tsx)
- Remove the search icon button for mobile (it remains in the bottom navigation).

---

## Verification Plan

### Automated Tests
- Run `npm run test` to ensure existing functionality isn't broken.
- Verify that block unification logic still works with HTML content.

### Manual Verification
- **Rebranding**: Check titles in Web, Android (strings), and Electron (package name).
- **Editor**: Test all formatting options (Bold, Lists, Checkboxes, Indentation) on both Desktop and Mobile.
- **UI**: Confirm search icon is gone from the top bar on mobile but remains in the bottom bar.
- **Checklist Migration**: Verify that clicking a checkbox within the text works as expected.
