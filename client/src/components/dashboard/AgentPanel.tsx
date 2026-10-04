import { KeyboardEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, ArrowUp, X } from "lucide-react";
import { BACKEND_URL } from "../../config";
import { authHeaders, errorMessage } from "../../api";
import { getContentType } from "../../contentTypes";

export const MAX_AGENT_ITEMS = 25;

type Mode = "ask" | "summarize" | "compare";

export interface AgentItem {
  contentId: string;
  title: string;
  type: string;
}

interface AnswerSource {
  n: number;
  contentId: string;
  title: string;
  type: string;
  link: string | null;
  readable: boolean;
  note: string | null;
}

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; sources: AnswerSource[] };

interface AgentPanelProps {
  // Items from the selected folders plus individually selected items, already combined and de-duplicated
  items: AgentItem[];
  contentIds: string[];
  folderIds: string[];
  folderNames: string[];
  onClose: () => void;
}

const MODES: { id: Mode; label: string; hint: string; defaultPrompt?: string }[] = [
  { id: "ask", label: "Ask", hint: "Ask a question about the selection" },
  { id: "summarize", label: "Summarize", hint: "Add a focus (optional)", defaultPrompt: "Summarize the selected items." },
  { id: "compare", label: "Compare", hint: "Add a focus (optional)", defaultPrompt: "Compare the selected items." },
];

const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\](?!\()/g;

// Rewrites [1] or [1, 3] as Markdown links to #cite-N, which the "a" renderer below turns into numbered chips
function linkCitations(text: string): string {
  return text.replace(CITATION, (_, nums: string) =>
    nums
      .split(",")
      .map((n) => `[${n.trim()}](#cite-${n.trim()})`)
      .join("")
  );
}

const chipClass =
  "mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded bg-lichen px-1 align-text-top text-xs font-semibold text-plum no-underline outline-none hover:bg-plum hover:text-chalk focus-visible:ring-2 focus-visible:ring-plum";

function AnswerText({ text, sources }: { text: string; sources: AnswerSource[] }) {
  const components: Components = {
    a({ href, children }) {
      const cite = href && /^#cite-(\d+)$/.exec(href);
      if (cite) {
        const n = Number(cite[1]);
        const source = sources.find((s) => s.n === n);
        if (!source) return <>[{n}]</>;
        return source.link ? (
          <a href={source.link} target="_blank" rel="noopener noreferrer" title={source.title} className={chipClass}>
            {n}
          </a>
        ) : (
          <span title={source.title} className={chipClass}>
            {n}
          </span>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
          {children}
        </a>
      );
    },
    h1: ({ children }) => <h3 className="mb-2 mt-4 font-display text-xl first:mt-0">{children}</h3>,
    h2: ({ children }) => <h3 className="mb-2 mt-4 font-display text-lg first:mt-0">{children}</h3>,
    h3: ({ children }) => <h4 className="mb-1 mt-3 font-semibold first:mt-0">{children}</h4>,
    h4: ({ children }) => <h4 className="mb-1 mt-3 font-semibold first:mt-0">{children}</h4>,
    p: ({ children }) => <p className="mb-3 break-words leading-7 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 leading-7 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 leading-7 last:mb-0">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    code: ({ children }) => <code className="rounded bg-lichen px-1 py-0.5 text-[0.9em]">{children}</code>,
    hr: () => <hr className="my-4 border-moss" />,
    table: ({ children }) => (
      <div className="mb-3 overflow-x-auto last:mb-0">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border border-moss bg-lichen px-3 py-2 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border border-moss px-3 py-2 align-top">{children}</td>,
  };
  return (
    <div>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {linkCitations(text)}
      </ReactMarkdown>
    </div>
  );
}

function SourceList({ sources, answer }: { sources: AnswerSource[]; answer: string }) {
  const cited = new Set([...answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)].flatMap((m) => m[1].split(",").map((x) => Number(x.trim()))));
  const unreadable = sources.filter((s) => !s.readable);
  const used = sources.filter((s) => s.readable && cited.has(s.n));

  if (!used.length && !unreadable.length) return null;
  return (
    <div className="mt-3 border-t border-moss pt-3 text-sm">
      {used.length > 0 && (
        <>
          <p className="font-semibold text-bark/70">Sources</p>
          <ol className="mt-1 space-y-1">
            {used.map((s) => {
              const Icon = getContentType(s.type).icon;
              return (
                <li key={s.n} className="flex items-center gap-2">
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded bg-lichen px-1 text-xs font-semibold text-plum">
                    {s.n}
                  </span>
                  <Icon className="size-4 shrink-0 text-bark/60" aria-hidden />
                  {s.link ? (
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="truncate underline underline-offset-2">
                      {s.title}
                    </a>
                  ) : (
                    <span className="truncate">{s.title}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
      {unreadable.length > 0 && (
        <div className={`flex gap-2 text-bark/80 ${used.length ? "mt-3" : ""}`}>
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-bark/60" aria-hidden />
          <p>
            Couldn't read: {unreadable.map((s) => `${s.title}${s.note ? ` (${s.note})` : ""}`).join("; ")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AgentPanel({ items, contentIds, folderIds, folderNames, onClose }: AgentPanelProps) {
  const [mode, setMode] = useState<Mode>("ask");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const tooMany = items.length > MAX_AGENT_ITEMS;
  const modeConfig = MODES.find((m) => m.id === mode)!;
  const canSend = !loading && !tooMany && (mode !== "ask" ? true : input.trim().length > 0) && (mode !== "compare" || items.length >= 2);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, loading, error]);

  async function send() {
    if (!canSend) return;
    const text = input.trim() || modeConfig.defaultPrompt || "";
    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const res = await axios.post<{ answer: string; sources: AnswerSource[] }>(
        `${BACKEND_URL}/api/v1/agent/run`,
        {
          mode,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          contentIds,
          folderIds,
        },
        { headers: authHeaders() }
      );
      const data = res.data as { answer: string; sources: AnswerSource[] };
      setMessages([...history, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (e) {
      // keep the user's message in the thread and let them retry
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const folderText = folderNames.length
    ? ` from ${folderNames.length} ${folderNames.length === 1 ? "folder" : "folders"}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bark/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-title"
        className="flex h-full w-full max-w-xl flex-col bg-chalk text-bark shadow-xl"
      >
        <header className="flex items-start gap-4 border-b border-moss px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="agent-title" className="font-display text-2xl tracking-tight">
              Ask your selection
            </h2>
            <details className="mt-1 text-sm text-bark/80">
              <summary className="cursor-pointer rounded outline-none focus-visible:ring-2 focus-visible:ring-plum">
                Reading {items.length} {items.length === 1 ? "item" : "items"}
                {folderText}
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-2">
                {items.map((item) => {
                  const Icon = getContentType(item.type).icon;
                  return (
                    <li key={item.contentId} className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0 text-bark/60" aria-hidden />
                      <span className="truncate">{item.title}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 grid size-9 shrink-0 place-items-center rounded-md outline-none hover:bg-lichen focus-visible:ring-2 focus-visible:ring-plum"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="border-b border-moss px-5 py-3">
          <div role="radiogroup" aria-label="Agent" className="flex gap-2">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-chalk ${
                  mode === m.id ? "border-plum bg-plum text-chalk" : "border-bark/30 hover:border-bark hover:bg-lichen/60"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === "compare" && items.length < 2 && (
            <p className="mt-2 text-sm text-bark/80">Select at least two items to compare.</p>
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5" aria-live="polite">
          {tooMany && (
            <p role="alert" className="rounded-md border border-red-800/40 px-4 py-3 text-sm text-red-800">
              That selection has {items.length} items. Select up to {MAX_AGENT_ITEMS} at a time.
            </p>
          )}

          {messages.length === 0 && !loading && !error && !tooMany && (
            <p className="leading-7 text-bark/80">
              {mode === "ask"
                ? "Ask a question and the answer is built only from the items you selected, with numbered citations back to each one."
                : mode === "summarize"
                  ? "Press Run for a summary of each item and the themes they share, or add a focus first."
                  : "Press Run to see where the selected items agree, differ and add something the others don't."}
            </p>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-lichen px-4 py-3">
                {m.content}
              </div>
            ) : (
              <div key={i} className="max-w-full rounded-lg border border-moss bg-chalk px-4 py-3">
                <AnswerText text={m.content} sources={m.sources} />
                <SourceList sources={m.sources} answer={m.content} />
              </div>
            )
          )}

          {loading && (
            <p className="text-bark/70 motion-safe:animate-pulse">
              Reading {items.length} {items.length === 1 ? "item" : "items"} and writing an answer…
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-md border border-red-800/40 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-moss p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              maxLength={4000}
              autoFocus
              aria-label={modeConfig.hint}
              placeholder={modeConfig.hint}
              className="max-h-40 min-h-[3rem] flex-1 resize-y rounded-md border border-bark/40 bg-lichen/40 px-4 py-3 text-bark placeholder:text-bark/50 outline-none transition-colors focus:border-plum focus:ring-2 focus:ring-plum"
            />
            <button
              type="button"
              onClick={send}
              disabled={!canSend}
              aria-label={mode === "ask" ? "Send" : "Run"}
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-md bg-plum px-4 font-semibold text-chalk outline-none transition-colors hover:bg-bark focus-visible:ring-2 focus-visible:ring-plum focus-visible:ring-offset-2 focus-visible:ring-offset-chalk disabled:opacity-50"
            >
              {mode === "ask" ? <ArrowUp className="size-5" aria-hidden /> : "Run"}
            </button>
          </div>
          <p className="mt-2 text-xs text-bark/60">Enter to send, Shift+Enter for a new line.</p>
        </footer>
      </aside>
    </div>
  );
}
