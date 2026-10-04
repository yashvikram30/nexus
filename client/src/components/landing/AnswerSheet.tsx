import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { getContentType } from "../../contentTypes";

type Segment = { t: string } | { c: number };

const QUESTION = "When should I use pgvector instead of a dedicated vector database?";

const ANSWER: Segment[] = [
  { t: "For most apps with up to a few million vectors, pgvector keeps embeddings next to the rest of your data, so there is no second system to run and keep in sync" },
  { c: 1 },
  { t: ". A dedicated store starts to pay off when you need heavy filtering at scale, or fast queries across tens of millions of vectors" },
  { c: 2 },
  { t: ". Either way, split documents by section instead of a fixed size, so the passages you retrieve still read well" },
  { c: 3 },
  { t: "." },
];

const SOURCES = [
  { n: 1, type: "medium", title: "Choosing a vector database", note: "“If you already run Postgres, start there.”", saved: "Saved 12 Mar" },
  { n: 2, type: "youtube", title: "Scaling retrieval in production", note: "Talk, from 24:10", saved: "Saved 3 Apr" },
  { n: 3, type: "github", title: "pgvector README", note: "Indexing and chunking notes", saved: "Saved 19 Apr" },
];

const TOTAL = ANSWER.reduce((sum, s) => sum + ("t" in s ? s.t.length : 1), 0);

export default function AnswerSheet() {
  const [reduceMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const [revealed, setRevealed] = useState(reduceMotion ? TOTAL : 0);
  const [active, setActive] = useState<number | null>(null);

  // The answer types out once on load; with reduced motion it is shown immediately
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= TOTAL) {
          clearInterval(id);
          return r;
        }
        return r + 2;
      });
    }, 22);
    return () => clearInterval(id);
  }, [reduceMotion]);

  let remaining = revealed;
  const citeVisible = (n: number) => {
    // a source appears once its citation has been typed
    let pos = 0;
    for (const s of ANSWER) {
      pos += "t" in s ? s.t.length : 1;
      if ("c" in s && s.c === n) return revealed >= pos;
    }
    return false;
  };

  return (
    <section
      aria-label="Example answer with sources"
      className="rounded-lg border border-moss bg-chalk"
    >
      <div className="flex items-center gap-3 border-b border-moss px-5 py-4 sm:px-8">
        <Search className="size-5 shrink-0 text-plum" aria-hidden />
        <p className="text-base font-medium text-bark sm:text-lg">{QUESTION}</p>
      </div>

      <div className="grid gap-8 px-5 py-7 sm:px-8 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <p className="max-w-[34rem] text-lg leading-8 text-bark">
          {ANSWER.map((seg, i) => {
            if ("t" in seg) {
              const shown = Math.max(0, Math.min(seg.t.length, remaining));
              remaining -= seg.t.length;
              return (
                <span key={i}>
                  {seg.t.slice(0, shown)}
                  <span className="invisible">{seg.t.slice(shown)}</span>
                </span>
              );
            }
            const visible = remaining >= 1;
            remaining -= 1;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Source ${seg.c}`}
                onMouseEnter={() => setActive(seg.c)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(seg.c)}
                onBlur={() => setActive(null)}
                className={`mx-0.5 inline-block -translate-y-1 rounded px-1.5 text-xs font-semibold leading-5 text-bark outline-none transition-colors focus-visible:ring-2 focus-visible:ring-plum ${
                  visible ? "" : "invisible"
                } ${active === seg.c ? "bg-plum text-chalk" : "bg-sodium"}`}
              >
                {seg.c}
              </button>
            );
          })}
        </p>

        <ol className="space-y-4">
          {SOURCES.map((s) => {
            const Icon = getContentType(s.type).icon;
            const on = active === s.n;
            return (
              <li
                key={s.n}
                onMouseEnter={() => setActive(s.n)}
                onMouseLeave={() => setActive(null)}
                className={`border-l-4 py-1 pl-4 transition-all duration-300 ${
                  citeVisible(s.n) ? "opacity-100" : "opacity-0"
                } ${on ? "border-sodium bg-sodium/25" : "border-moss"}`}
              >
                <div className="flex items-center gap-2 text-sm text-bark/70">
                  <Icon className="size-4" aria-hidden />
                  <span>{getContentType(s.type).label}</span>
                  <span className="ml-auto">{s.saved}</span>
                </div>
                <p className="mt-1 font-semibold text-bark">{s.title}</p>
                <p className="text-sm text-bark/70">{s.note}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="border-t border-moss px-5 py-3 text-sm text-bark/70 sm:px-8">
        Preview with sample links. Answers will cite your own saved items.
      </p>
    </section>
  );
}
