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
  imageUrl?: string | null;
}) {
  const { childName, day, imageUrl } = args;

  return `
<!DOCTYPE html>
<html lang="en" style="margin:0; padding:0;">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Tonight’s Elf plan for ${childName}</title>
    <style>
      @media only screen and (max-width: 600px) {
        .container {
          padding: 16px !important;
        }
        .card {
          padding: 20px !important;
        }
        .hero-image {
          border-radius: 18px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color:#0b1020; font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0; padding:0;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" class="container" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; padding:0 12px;">
            <tr>
              <td>
                <!-- Meta header -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
                  <tr>
                    <td align="left" style="font-size:11px; letter-spacing:0.12em; text-transform:uppercase; color:#c1c4ff;">
                      Merry the Elf · Nightly Magic
                    </td>
                    <td align="right" style="font-size:11px; color:#7579b8;">
                      Tonight’s plan
                    </td>
                  </tr>
                </table>

                <!-- Card -->
                <table role="presentation" class="card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff; border-radius:24px; padding:26px 28px 28px; box-shadow:0 18px 40px rgba(8,14,40,0.35);">
                  <tr>
                    <td>
                      <h1 style="margin:0 0 6px; font-size:24px; line-height:1.3; color:#151628;">
                        Here’s tonight’s Elf idea for ${childName}
                      </h1>
                      
                      <h2 style="margin:8px 0 8px; font-size:18px; line-height:1.4; color:#151628;">
                      ${(day.weekday ?? '').trim()}${day.weekday ? ' · ' : ''}${day.title}
                    </h2>


                      ${
                        imageUrl
                          ? `<div style="margin:0 0 20px; overflow:hidden; border-radius:20px;">
                               <img src="${imageUrl}"
                                    alt="Tonight's Elf setup idea"
                                    width="100%"
                                    style="display:block; width:100%; max-width:100%; border-radius:20px;"
                                    class="hero-image" />
                             </div>`
                          : ''
                      }

                    

                  
                      <p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#2b2d42; white-space:pre-line;">
                        ${day.description}
                      </p>

                      ${
                        day.noteFromElf
                          ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;">
                               <tr>
                                 <td style="background:linear-gradient(135deg,#e8ffe5,#f1fff6); border-radius:18px; padding:14px 16px; border:1px solid #b7e7b5;">
                                   <p style="margin:0 0 4px; font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#3f7b3e;">
                                     Note from Merry
                                   </p>
                                   <p style="margin:0; font-size:15px; line-height:1.6; color:#214021; font-style:italic;">
                                     “${day.noteFromElf}”
                                   </p>
                                 </td>
                               </tr>
                             </table>`
                          : ''
                      }

                      <p style="margin:0; font-size:14px; line-height:1.6; color:#6b6f85;">
                        When you’re done setting up, leave Merry where ${childName} can spot them in the morning — a tiny ritual that quietly says, “Night-time is safe, and you’re not alone.”
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Footer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
                  <tr>
                    <td style="font-size:11px; line-height:1.5; color:#8a8fbd; text-align:center;">
                      You’re getting this because you asked Merry for nightly Elf reminders.<br />
                      If that was a mistake, you can reply <strong>“STOP”</strong> and I’ll unsubscribe you.
                    </td>
                  </tr>
                </table>

              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
}
