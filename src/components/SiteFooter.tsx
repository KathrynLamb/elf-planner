// src/components/SiteFooter.tsx
export default function SiteFooter() {
    return (
      <footer className="mt-6 border-t border-slate-900 pt-4 text-[11px] text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-1 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Elf on the Shelf Helper – a project by Kathryn
            Lamb.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/privacy"
              className="hover:text-slate-300 hover:underline"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="hover:text-slate-300 hover:underline"
            >
              Terms
            </a>
            <a
              href="mailto:katylamb@gmail.com"
              className="hover:text-slate-300 hover:underline"
            >
              Contact
            </a>
          </div>
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-600">
          “Elf on the Shelf” is a registered trademark of The Lumistella Company. This site
          is an independent helper tool and not affiliated with them.
        </p>
      </footer>
    );
  }
  