import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

interface RetrievedContextItem {
  parentContent?: string;
  childContent?: string;
  snippet?: string;
  file_name?: string;
  similarityScore?: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "json").toLowerCase();
    const chatId = searchParams.get("chat_id");
    const onlyAnswered = searchParams.get("only_answered") === "true";

    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("conversation_history")
      .select("*")
      .order("created_at", { ascending: true });

    if (chatId) {
      query = query.eq("telegram_chat_id", Number(chatId));
    }
    if (onlyAnswered) {
      query = query.eq("was_answered", true);
    }

    const { data: rows, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transformasi data ke spesifikasi Ragas Dataset
    const dataset = (rows || []).map((row) => {
      const contexts: string[] = [];

      if (Array.isArray(row.retrieved_context)) {
        row.retrieved_context.forEach((ctx: RetrievedContextItem) => {
          const text = ctx.parentContent || ctx.childContent || ctx.snippet;
          if (text && typeof text === "string" && text.trim()) {
            contexts.push(text.trim());
          }
        });
      }

      return {
        id: row.id,
        user_id: row.telegram_chat_id,
        sender_name: row.sender_name || `User ${row.telegram_chat_id}`,
        question: row.user_message || "",
        answer: row.bot_response || "",
        contexts: contexts,
        ground_truth: "", // Tempat penampungan untuk evaluasi Ragas
        was_answered: row.was_answered ?? false,
        response_time_ms: row.response_time_ms ?? null,
        model_used: row.model_used ?? null,
        context_count: contexts.length,
        created_at: row.created_at,
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filenamePrefix = chatId ? `ragas_chat_${chatId}` : "ragas_dataset_all";

    // Format 1: JSON
    if (format === "json") {
      const jsonContent = JSON.stringify(dataset, null, 2);
      return new NextResponse(jsonContent, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenamePrefix}_${dateStr}.json"`,
        },
      });
    }

    // Format 2: JSONL (JSON Lines)
    if (format === "jsonl") {
      const jsonlContent = dataset.map((item) => JSON.stringify(item)).join("\n");
      return new NextResponse(jsonlContent, {
        headers: {
          "Content-Type": "application/x-jsonlines; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenamePrefix}_${dateStr}.jsonl"`,
        },
      });
    }

    // Format 3: CSV (Pandas/Excel Compatible)
    if (format === "csv") {
      const headers = [
        "id",
        "user_id",
        "sender_name",
        "question",
        "answer",
        "contexts",
        "ground_truth",
        "was_answered",
        "response_time_ms",
        "model_used",
        "context_count",
        "created_at",
      ];

      function escapeCsvCell(val: unknown): string {
        if (val === null || val === undefined) return '""';
        if (typeof val === "object") {
          const str = JSON.stringify(val).replace(/"/g, '""');
          return `"${str}"`;
        }
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }

      const csvRows = [
        headers.join(","),
        ...dataset.map((row) =>
          [
            escapeCsvCell(row.id),
            escapeCsvCell(row.user_id),
            escapeCsvCell(row.sender_name),
            escapeCsvCell(row.question),
            escapeCsvCell(row.answer),
            escapeCsvCell(row.contexts),
            escapeCsvCell(row.ground_truth),
            escapeCsvCell(row.was_answered),
            escapeCsvCell(row.response_time_ms),
            escapeCsvCell(row.model_used),
            escapeCsvCell(row.context_count),
            escapeCsvCell(row.created_at),
          ].join(",")
        ),
      ];

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenamePrefix}_${dateStr}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (err) {
    console.error("Export Ragas Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
