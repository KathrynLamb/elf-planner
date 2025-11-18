export function buildElfEmailHtml(args: {
  childName: string;
  planOverview?: string | null;
  day: {
    weekday?: string;
    date?: string;
    title: string;
    description: string;
    noteFromElf?: string | null;
  };
  imageCid?: string | null;
  imageUrl?: string | null;
}) {
  const { childName, planOverview, day, imageCid, imageUrl } = args;

  const imgSrc = imageCid ? `cid:${imageCid}` : imageUrl || null;

  return `
  <html>
    <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <h1 style="font-size:20px; margin-bottom:8px;">
        Tonight’s Elf-on-the-Shelf plan for ${childName}
      </h1>
      <p style="font-size:14px; color:#475569; margin-bottom:16px;">
        ${planOverview ?? ''}
      </p>

      <h2 style="font-size:18px; margin:16px 0 4px;">${day.weekday} · ${
    day.title
  }</h2>
      <p style="font-size:13px; color:#0f172a; white-space:pre-line; margin-bottom:12px;">
        ${day.description}
      </p>

      ${
        day.noteFromElf
          ? `<p style="font-size:13px; color:#22c55e; font-style:italic; margin-bottom:16px;">
               Note from Merry: “${day.noteFromElf}”
             </p>`
          : ''
      }

      ${
        imgSrc
          ? `<div style="margin:24px 0; text-align:center;">
               <img src="${imgSrc}"
                    alt="Tonight's Elf setup idea"
                    style="max-width:100%; border-radius:12px; display:inline-block;" />
             </div>`
          : ''
      }

      <p style="font-size:11px; color:#94a3b8; margin-top:24px;">
        You’re getting this because you asked Merry for nightly Elf reminders.
        If that was a mistake, you can reply “STOP” and I’ll unsubscribe you.
      </p>
    </body>
  </html>
  `;
}
