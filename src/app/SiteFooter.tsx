import Link from "next/link";

export function SiteFooter() {
    return (
      <footer className="flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
        <p>© {new Date().getFullYear()} Elf Planner. Wonder Without Worry</p>
        <div className="flex flex-wrap gap-4">
          <span className="text-slate-500">Secure checkout with PayPal.</span>
          <Link href="#faq" className="hover:text-slate-300">
            FAQs
          </Link>
        </div>
      </footer>
    );
  }