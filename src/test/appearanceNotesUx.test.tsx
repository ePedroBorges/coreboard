import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeLibrary } from "@/components/settings/ThemeLibrary";
import { QuickCaptureModal } from "@/components/notes/QuickCaptureModal";

describe("appearance and notes experience", () => {
  it("keeps theme options grouped and collapsed until the category is opened", () => {
    const onSelect = vi.fn();
    render(
      <ThemeLibrary
        mode="dark"
        colorScheme="default"
        visualTheme="studio"
        isPro
        onSelect={onSelect}
      />,
    );

    expect(screen.queryByText("Anime Neon")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Coleções Pro/i }));
    fireEvent.click(screen.getByRole("button", { name: /Anime Neon/i }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "anime", pro: true }));
  });

  it("opens note creation as a writing-first workspace", () => {
    render(
      <QuickCaptureModal
        open
        onOpenChange={vi.fn()}
        mode="note"
        notebooks={[{ id: "folder-1", title: "Pessoal", user_id: "user-1", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), parent_id: null }]}
        defaultNotebookId="folder-1"
        onSave={vi.fn()}
        onSaveTask={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("h-svh");
    expect(screen.getByPlaceholderText("Comece a escrever...")).toHaveClass("min-h-[52svh]");
    expect(screen.getByText("Checklist")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar anota/i })).toBeInTheDocument();
  });
});
