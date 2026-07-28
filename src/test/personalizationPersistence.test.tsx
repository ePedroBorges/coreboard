import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

function ThemeProbe() {
  const theme = useTheme();
  return <div>
    <span>{theme.storageHydrated ? "pronto" : "carregando"}</span>
    <button onClick={() => { theme.setColorScheme("ocean"); theme.setFontFamily("rounded"); }}>Prévia</button>
    <button onClick={() => { theme.setColorScheme("focus"); theme.setVisualTheme("compact"); void theme.saveAppearance(); }}>Salvar imediato</button>
    <button onClick={() => void theme.saveAppearance()}>Salvar</button>
  </div>;
}

describe("personalization persistence", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } as Storage;
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });
  });

  it("only commits a live preview after the explicit save action", async () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    await screen.findByText("pronto");
    const before = JSON.parse(localStorage.getItem("vista_tasks_appearance_v2") || "{}") as { colorScheme?: string; fontFamily?: string };

    fireEvent.click(screen.getByRole("button", { name: "Prévia" }));
    expect(document.documentElement).toHaveClass("scheme-ocean", "font-rounded");
    expect(JSON.parse(localStorage.getItem("vista_tasks_appearance_v2") || "{}")).toMatchObject(before);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar" })); });
    await waitFor(() => expect(JSON.parse(localStorage.getItem("vista_tasks_appearance_v2") || "{}")).toMatchObject({ colorScheme: "ocean", fontFamily: "rounded" }));
  });

  it("saves the latest draft even when saving in the same interaction", async () => {
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    await screen.findByText("pronto");

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Salvar imediato" })); });

    await waitFor(() => expect(JSON.parse(localStorage.getItem("vista_tasks_appearance_v2") || "{}")).toMatchObject({
      colorScheme: "focus",
      visualTheme: "compact",
    }));
  });
});
