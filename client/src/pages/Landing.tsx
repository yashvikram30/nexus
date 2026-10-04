import { Link } from "react-router-dom";
import AnswerSheet from "../components/landing/AnswerSheet";
import { CONTENT_TYPES } from "../contentTypes";

const STEPS = [
  { title: "Save", body: "Paste a link or write a note. Nexus works out whether it is an article, video, post or repo." },
  { title: "Read", body: "Nexus reads what you saved and indexes it, so you can search by meaning and not only by title." },
  { title: "Ask", body: "Ask in plain language. Every answer points back to the saved items it came from." },
];

const FEATURES = [
  { title: "Every format in one place", body: "Articles, videos, posts, repos and your own text sit side by side, with a filter for each source." },
  { title: "Answers you can check", body: "Each answer lists the saved items behind it, so the original is one click away." },
  { title: "Share a view of your brain", body: "Send someone a read-only link to what you have collected." },
];

const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-lichen";

export default function LandingPage() {
  const signedIn = Boolean(localStorage.getItem("token"));
  const startHref = signedIn ? "/dashboard" : "/signup";
  const sources = CONTENT_TYPES.filter((t) => t.hasLink && t.id !== "link");

  return (
    <div className="min-h-screen bg-lichen font-body text-bark">
      <header className="mx-auto flex max-w-6xl items-center px-5 py-5 sm:px-8">
        <Link to="/" className={`rounded font-display text-2xl ${focus}`}>
          Nexus
        </Link>
        <nav className="ml-auto flex items-center gap-5 text-sm font-medium sm:gap-7">
          <a href="#how" className={`rounded hover:underline underline-offset-4 ${focus}`}>
            How it works
          </a>
          <Link
            to={signedIn ? "/dashboard" : "/signin"}
            className={`rounded-md border border-bark px-4 py-2 transition-colors hover:bg-bark hover:text-lichen ${focus}`}
          >
            {signedIn ? "Open dashboard" : "Sign in"}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:px-8 md:pt-20">
          <h1 className="max-w-3xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Ask everything you have saved.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-bark/80">
            Paste links from Medium, YouTube, X, GitHub and Reddit. Nexus reads them, then answers your
            questions and shows you where each answer came from.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={startHref}
              className={`rounded-md bg-plum px-6 py-3 font-semibold text-chalk transition-colors hover:bg-bark ${focus}`}
            >
              {signedIn ? "Open your dashboard" : "Start saving links"}
            </Link>
            <a href="#how" className={`rounded px-2 py-3 font-medium underline underline-offset-4 ${focus}`}>
              See how it works
            </a>
          </div>

          <div className="mt-14">
            <AnswerSheet />
          </div>
        </section>

        <section aria-label="Supported sources" className="border-y border-moss">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-5 sm:px-8">
            <p className="font-medium">Save from</p>
            <ul className="flex flex-wrap gap-x-7 gap-y-3 text-bark/80">
              {sources.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <t.icon className="size-5" aria-hidden />
                  {t.label}
                </li>
              ))}
              <li>and any web page</li>
            </ul>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-4 px-5 py-20 sm:px-8 md:py-28">
          <h2 className="max-w-xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
            From a pile of links to a straight answer.
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`md:px-8 md:first:pl-0 md:last:pr-0 ${i > 0 ? "md:border-l md:border-moss" : ""}`}>
                <span className="font-display text-5xl text-plum" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-sm leading-7 text-bark/80">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-chalk">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1fr_1.4fr] md:gap-16 md:py-24">
            <h2 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              Built for people who save more than they reread.
            </h2>
            <dl className="divide-y divide-moss border-y border-moss">
              {FEATURES.map((f) => (
                <div key={f.title} className="py-6">
                  <dt className="text-xl font-semibold">{f.title}</dt>
                  <dd className="mt-2 max-w-md leading-7 text-bark/80">{f.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="bg-plum text-chalk">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:px-8 md:flex-row md:items-center md:justify-between md:py-24">
            <div>
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">Start with one link.</h2>
              <p className="mt-3 text-lg text-chalk/80">Save your first one in under a minute.</p>
            </div>
            <Link
              to={startHref}
              className="rounded-md bg-sodium px-7 py-3.5 font-semibold text-bark outline-none transition-colors hover:bg-chalk focus-visible:ring-2 focus-visible:ring-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-plum"
            >
              {signedIn ? "Open your dashboard" : "Create your account"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl items-center px-5 py-6 text-sm text-bark/70 sm:px-8">
        <p>© 2026 Nexus</p>
        {!signedIn && (
          <Link to="/signin" className={`ml-auto rounded underline underline-offset-4 ${focus}`}>
            Sign in
          </Link>
        )}
      </footer>
    </div>
  );
}
