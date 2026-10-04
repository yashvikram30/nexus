import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { focus } from "./authUtils";

interface AuthLayoutProps {
  headline: string;
  blurb: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthLayout({ headline, blurb, title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-lichen font-body text-bark md:grid md:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-plum p-12 text-chalk md:flex">
        <Link to="/" className="w-fit rounded font-display text-2xl outline-none focus-visible:ring-2 focus-visible:ring-chalk">
          Nexus
        </Link>
        <div>
          <p className="max-w-md font-display text-5xl leading-[1.1] tracking-tight">{headline}</p>
          <p className="mt-6 max-w-sm text-lg leading-8 text-chalk/80">{blurb}</p>
        </div>
        <p className="text-sm text-chalk/70">© 2026 Nexus</p>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 md:min-h-0 md:justify-center md:px-16">
        <Link to="/" className={`mb-10 w-fit rounded font-display text-2xl md:hidden ${focus}`}>
          Nexus
        </Link>

        <div className="mx-auto my-auto w-full max-w-sm md:my-0">
          <h1 className="font-display text-4xl tracking-tight">{title}</h1>
          <p className="mt-3 leading-7 text-bark/80">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
