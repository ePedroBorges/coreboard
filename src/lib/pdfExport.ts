import jsPDF from "jspdf";
import { Block } from "@/types/notes";
import { format } from "date-fns";

export function generatePagePdf(
  title: string,
  blocks: Block[],
  createdAt: string,
  updatedAt: string
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 25;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(title || "Sem título", maxWidth);
  checkPageBreak(titleLines.length * 8);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 2;

  // Metadata
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128);
  doc.text(`Criado: ${format(new Date(createdAt), "dd/MM/yyyy HH:mm")}  |  Atualizado: ${format(new Date(updatedAt), "dd/MM/yyyy HH:mm")}`, margin, y);
  y += 8;
  doc.setTextColor(0);

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Blocks
  let listCounter = 0;
  for (const block of blocks) {
    const text = block.content || "";
    if (!text && block.type !== "checklist") continue;

    let fontSize = 11;
    let fontStyle: "normal" | "bold" = "normal";
    let prefix = "";

    switch (block.type) {
      case "heading1":
        fontSize = 18;
        fontStyle = "bold";
        break;
      case "heading2":
        fontSize = 15;
        fontStyle = "bold";
        break;
      case "heading3":
        fontSize = 13;
        fontStyle = "bold";
        break;
      case "bullet-list":
        prefix = "•  ";
        listCounter = 0;
        break;
      case "numbered-list":
        listCounter++;
        prefix = `${listCounter}.  `;
        break;
      case "checklist":
        prefix = block.checked ? "☑  " : "☐  ";
        break;
      default:
        listCounter = 0;
    }

    doc.setFontSize(fontSize);
    doc.setFont("helvetica", fontStyle);
    const fullText = prefix + text;
    const lines = doc.splitTextToSize(fullText, maxWidth);
    const lineHeight = fontSize * 0.5;
    checkPageBreak(lines.length * lineHeight + 2);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 3;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(
      `SmartNotes — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc;
}

export function generateNotebookPdf(
  notebookTitle: string,
  pages: { title: string; blocks: Block[]; createdAt: string; updatedAt: string }[]
): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  // Cover page
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  const coverLines = doc.splitTextToSize(notebookTitle, maxWidth);
  doc.text(coverLines, pageWidth / 2, 80, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128);
  doc.text(`${pages.length} página(s)`, pageWidth / 2, 95, { align: "center" });
  doc.text(`Exportado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, 102, { align: "center" });
  doc.setTextColor(0);

  for (const pg of pages) {
    doc.addPage();
    let y = 25;

    const checkPageBreak = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(pg.title, maxWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 4;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(128);
    doc.text(`Criado: ${format(new Date(pg.createdAt), "dd/MM/yyyy")}  |  Atualizado: ${format(new Date(pg.updatedAt), "dd/MM/yyyy")}`, margin, y);
    y += 6;
    doc.setTextColor(0);
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    let listCounter = 0;
    for (const block of pg.blocks) {
      const text = block.content || "";
      if (!text && block.type !== "checklist") continue;

      let fontSize = 11;
      let fontStyle: "normal" | "bold" = "normal";
      let prefix = "";

      switch (block.type) {
        case "heading1": fontSize = 16; fontStyle = "bold"; break;
        case "heading2": fontSize = 14; fontStyle = "bold"; break;
        case "heading3": fontSize = 12; fontStyle = "bold"; break;
        case "bullet-list": prefix = "•  "; listCounter = 0; break;
        case "numbered-list": listCounter++; prefix = `${listCounter}.  `; break;
        case "checklist": prefix = block.checked ? "☑  " : "☐  "; break;
        default: listCounter = 0;
      }

      doc.setFontSize(fontSize);
      doc.setFont("helvetica", fontStyle);
      const lines = doc.splitTextToSize(prefix + text, maxWidth);
      const lh = fontSize * 0.5;
      checkPageBreak(lines.length * lh + 2);
      doc.text(lines, margin, y);
      y += lines.length * lh + 3;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160);
    doc.text(
      `${notebookTitle} — SmartNotes — Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc;
}
