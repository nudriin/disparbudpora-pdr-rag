import * as xlsx from "xlsx";
import { parse } from "csv-parse/sync";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

/**
 * Mem-parsing buffer file menjadi string teks berdasarkan ekstensinya.
 * Mendukung: .txt, .pdf, .xlsx, .csv
 */
export async function parseFileContent(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return buffer.toString("utf-8");
  }

  if (ext === "pdf") {
    // Menggunakan PDFLoader dari LangChain yang lebih stabil.
    // Cast ke any untuk menghindari konflik tipe Buffer vs BlobPart di TS strict mode
    const blob = new Blob([buffer as any], { type: "application/pdf" });
    const loader = new PDFLoader(blob, { splitPages: false });
    const docs = await loader.load();
    return docs.map(doc => doc.pageContent).join("\n\n");
  }

  if (ext === "xlsx") {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    let text = "";
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      text += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
    }
    return text;
  }

  if (ext === "csv") {
    const csvString = buffer.toString("utf-8");
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
    }) as Array<Record<string, unknown>>;
    
    if (records.length === 0) return "";
    
    // Convert array of objects to a readable text format
    const headers = Object.keys(records[0] as Record<string, unknown>);
    let text = `Kolom: ${headers.join(", ")}\n\n`;
    
    for (const record of records) {
      const rowText = headers.map(h => `${h}: ${String(record[h] ?? "")}`).join(" | ");
      text += rowText + "\n";
    }
    return text;
  }

  throw new Error(`Format file tidak didukung: .${ext}`);
}
