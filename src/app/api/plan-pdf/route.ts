import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { message: 'Missing sessionId' },
        { status: 400 },
      );
    }

    const data = await redis.get<{
      plan: string;
      childName?: string;
      startDate?: string;
      vibe?: string;
    }>(`elf:plan:${sessionId}`);

    if (!data || !data.plan) {
      return NextResponse.json(
        { message: 'Could not find your Elf plan. Please generate it again.' },
        { status: 404 },
      );
    }

    const childName = data.childName || 'your child';
    const startDate = data.startDate || '';
    const vibe = data.vibe || 'silly';
    const plan = data.plan;

    const pdfBytes = await createElfPlanPdf({
      childName,
      startDate,
      vibe,
      plan,
    });

    const filenameSafeName = childName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const fileName = `elf-plan-${filenameSafeName || 'magic'}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    console.error('Error generating plan PDF:', err);
    return NextResponse.json(
      { message: err?.message || 'Error generating PDF.' },
      { status: 500 },
    );
  }
}

async function createElfPlanPdf({
  childName,
  startDate,
  vibe,
  plan,
}: {
  childName: string;
  startDate: string;
  vibe: string;
  plan: string;
}): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const smallFontSize = 10;
  const bodyFontSize = 11;
  const titleFontSize = 18;

  const margin = 50;
  const lineHeight = 1.3 * bodyFontSize;
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const maxWidth = pageWidth - margin * 2;
  const bottomY = margin;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Header
  page.drawText('Elf on the Shelf Helper', {
    x: margin,
    y,
    size: smallFontSize,
    font,
    color: rgb(0.42, 0.45, 0.50), // slate-ish
  });

  y -= smallFontSize * 1.8;

  page.drawText(`Your Elf-on-the-Shelf plan for ${childName}`, {
    x: margin,
    y,
    size: titleFontSize,
    font,
    color: rgb(0.07, 0.09, 0.15),
  });

  y -= titleFontSize * 1.5;

  if (startDate) {
    page.drawText(`Starting: ${startDate}`, {
      x: margin,
      y,
      size: bodyFontSize,
      font,
      color: rgb(0.23, 0.26, 0.31),
    });
    y -= bodyFontSize * 1.3;
  }

  page.drawText(`Elf vibe: ${vibe}`, {
    x: margin,
    y,
    size: smallFontSize,
    font,
    color: rgb(0.02, 0.59, 0.40),
  });

  y -= smallFontSize * 2;

  const intro =
    'Each evening, set up the Elf as described below so your child wakes up to a little bit of magic.';

  ({ page, y } = drawParagraph({
    pdfDoc,
    page,
    font,
    text: intro,
    x: margin,
    y,
    fontSize: bodyFontSize,
    lineHeight,
    maxWidth,
    bottomY,
  }));

  y -= bodyFontSize * 1.2;

  // Plan body
  ({ page, y } = drawParagraph({
    pdfDoc,
    page,
    font,
    text: plan,
    x: margin,
    y,
    fontSize: bodyFontSize,
    lineHeight,
    maxWidth,
    bottomY,
  }));

  y -= bodyFontSize * 1.5;

  const footer =
    'Tip: tweak any ideas to fit your house, and skip nights if your Elf “forgets” to move. No guilt, just magic.';

  ({ page, y } = drawParagraph({
    pdfDoc,
    page,
    font,
    text: footer,
    x: margin,
    y,
    fontSize: smallFontSize,
    lineHeight: smallFontSize * 1.4,
    maxWidth,
    bottomY,
  }));

  return pdfDoc.save();
}

function drawParagraph({
  pdfDoc,
  page,
  font,
  text,
  x,
  y,
  fontSize,
  lineHeight,
  maxWidth,
  bottomY,
}: {
  pdfDoc: PDFDocument;
  page: any;
  font: any;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  bottomY: number;
}): { page: any; y: number } {
  const words = text.split(/\s+/);
  let line = '';

  const drawLine = (lineText: string) => {
    if (!lineText.trim()) return;
    if (y < bottomY + lineHeight) {
      // new page
      page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      y = height - bottomY;
    }
    page.drawText(lineText, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.07, 0.09, 0.15),
      maxWidth,
    });
    y -= lineHeight;
  };

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && line) {
      drawLine(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    drawLine(line);
  }

  return { page, y };
}
