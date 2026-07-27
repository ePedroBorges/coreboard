import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeLibrary } from "@/components/settings/ThemeLibrary";
import { FontLibrary } from "@/components/settings/FontLibrary";
import { SoundLibrary } from "@/components/settings/SoundLibrary";
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

    expect(screen.getByLabelText("Prévia do tema AnchorLab Studio")).toBeInTheDocument();
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
        notebooks={[{ id: "folder-1", title: "Pessoal", user_id: "user-1", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), parent_id: null, description: null, position: 0 }]}
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

  it("groups font and sound options into expandable libraries", () => {
    const onFont = vi.fn();
    const onSound = vi.fn();
    const { rerender } = render(<FontLibrary value="inter" isPro onSelect={onFont} />);
    fireEvent.click(screen.getByRole("button", { name: /Expressivas Pro/i }));
    fireEvent.click(screen.getByRole("button", { name: /Pixel Code/i }));
    expect(onFont).toHaveBeenCalledWith("pixel", true);

    rerender(<SoundLibrary value="soft" isPro onSelect={onSound} onPreview={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Gaming Pro/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Synthwave/i }));
    expect(onSound).toHaveBeenCalledWith("synth", true);
  });
});
