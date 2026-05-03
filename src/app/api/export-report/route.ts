import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildWeeklyReport,
  formatReportFileName,
  renderReportDocxBuffer,
  renderReportPdfBuffer,
  type ExportFormat,
} from "@/lib/report";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const format = body?.format as ExportFormat;
    const requestedUserId = typeof body?.userId === "string" ? body.userId : session.user.email;

    if (requestedUserId !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (format !== "pdf" && format !== "docx") {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const report = await buildWeeklyReport(requestedUserId);
    const fileName = formatReportFileName(report.userName, report.generatedAt, format);
    const buffer = format === "pdf"
      ? await renderReportPdfBuffer(report)
      : await renderReportDocxBuffer(report);

    const contentType = format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("export-report failed", error);
    const message = error instanceof Error ? error.message : "Failed to export report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
