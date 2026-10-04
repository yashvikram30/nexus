import http from "http";
import https from "https";
import dns from "dns";
import net from "net";
import zlib from "zlib";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import { Content } from "./db";

// ---------------------------------------------------------------------------
// Safe fetching. Saved links are user-controlled, so the server must never be
// tricked into reading internal services (localhost, private networks, cloud
// metadata endpoints). The address is checked at connect time, which also stops
// DNS rebinding, and every redirect hop is validated again.
// ---------------------------------------------------------------------------

const MAX_BYTES = 1.5 * 1024 * 1024; // stop reading a page after this much
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 4;
const USER_AGENT = "Mozilla/5.0 (compatible; NexusBot/1.0; +https://github.com/) like Gecko";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      a >= 224 // multicast and reserved
    );
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === "::1" || l === "::") return true;
    if (l.startsWith("fc") || l.startsWith("fd")) return true; // unique local
    if (/^fe[89ab]/.test(l)) return true; // link-local
    if (l.startsWith("::ffff:")) {
      // IPv4-mapped: judge the embedded IPv4 address when written in dotted form, block the hex form outright
      const m = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
      return m ? isPrivateIp(m[1]) : true;
    }
    return false;
  }
  return true; // not an IP at all: refuse
}

const guardedLookup = ((hostname: string, options: dns.LookupOptions, callback: (...args: any[]) => void) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) {
      return callback(new Error("Blocked address"));
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}) as net.LookupFunction;

interface RawResponse {
  status: number;
  location?: string;
  contentType: string;
  body: Buffer;
}

function requestOnce(url: URL, headers: Record<string, string>): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    // IP literals skip DNS lookup, so check them here
    if (net.isIP(host) && isPrivateIp(host)) return reject(new Error("Blocked address"));

    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate, br", ...headers },
        lookup: guardedLookup,
        timeout: TIMEOUT_MS,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType, body: Buffer.alloc(0) });
        }

        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        const stream =
          encoding === "gzip" ? res.pipe(zlib.createGunzip())
          : encoding === "deflate" ? res.pipe(zlib.createInflate())
          : encoding === "br" ? res.pipe(zlib.createBrotliDecompress())
          : res;

        const chunks: Buffer[] = [];
        let total = 0;
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve({ status, contentType, body: Buffer.concat(chunks) });
        };
        stream.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          total += chunk.length;
          if (total >= MAX_BYTES) {
            // plenty of text for retrieval; stop here instead of buffering a huge page
            req.destroy();
            finish();
          }
        });
        stream.on("end", finish);
        stream.on("error", (e) => (settled ? undefined : (settled = true, reject(e))));
        res.on("error", (e) => (settled ? undefined : (settled = true, reject(e))));
      }
    );
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", reject);
    req.end();
  });
}

export async function safeFetch(rawUrl: string, headers: Record<string, string> = {}) {
  let url = new URL(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported link type");
    const res = await requestOnce(url, headers);
    if (res.status >= 300 && res.status < 400 && res.location) {
      url = new URL(res.location, url);
      continue;
    }
    if (res.status < 200 || res.status >= 300) throw new Error(`The site returned ${res.status}`);
    return res;
  }
  throw new Error("Too many redirects");
}

function decode(body: Buffer, contentType: string): string {
  const charset = /charset=([^\s;]+)/i.exec(contentType)?.[1]?.replace(/["']/g, "") ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(body);
  } catch {
    return body.toString("utf8");
  }
}

// ---------------------------------------------------------------------------
// HTML to readable text
// ---------------------------------------------------------------------------

function tidy(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer, aside, form, button, template").remove();

  const title = ($('meta[property="og:title"]').attr("content") || $("title").text() || "").trim();
  const description = (
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    ""
  ).trim();

  const article = $("article").first();
  const main = $("main").first();
  const root = article.length ? article : main.length ? main : $("body");
  root.find("p, div, br, li, h1, h2, h3, h4, h5, h6, tr, blockquote, pre, section").each((_, el) => {
    $(el).append("\n");
  });

  const body = tidy(root.text());
  return tidy([title, description, body].filter(Boolean).join("\n\n"));
}

// ---------------------------------------------------------------------------
// Per-source extraction
// ---------------------------------------------------------------------------

const MAX_STORED_CHARS = 200_000;
const TEXT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // re-read a page after a week
const ERROR_TTL_MS = 60 * 60 * 1000; // retry a failed page after an hour

function hostOf(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Timed out")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function fetchPage(link: string): Promise<string> {
  const res = await safeFetch(link, { Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" });
  const type = res.contentType.toLowerCase();
  if (type.includes("html") || type.includes("xml")) return htmlToText(decode(res.body, res.contentType));
  if (type.startsWith("text/") || type.includes("json")) return tidy(decode(res.body, res.contentType));
  throw new Error("This kind of file can't be read yet");
}

async function fetchTweet(link: string): Promise<string> {
  const res = await safeFetch(
    `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(link)}`,
    { Accept: "application/json" }
  );
  const data = JSON.parse(decode(res.body, res.contentType)) as { html?: string; author_name?: string };
  const text = data.html ? htmlToText(data.html) : "";
  if (!text) throw new Error("Could not read this post");
  return data.author_name ? `Post by ${data.author_name}:\n${text}` : text;
}

async function fetchYoutube(link: string): Promise<string> {
  try {
    const parts = await withTimeout(YoutubeTranscript.fetchTranscript(link), 15_000);
    const transcript = tidy(parts.map((p) => p.text).join(" "));
    if (transcript) return transcript;
  } catch {
    // captions disabled or unavailable: fall back to the page's title and description below
  }
  return fetchPage(link);
}

async function fetchGithub(link: string): Promise<string> {
  const [owner, repo] = new URL(link).pathname.split("/").filter(Boolean);
  if (owner && repo) {
    try {
      const res = await safeFetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        Accept: "application/vnd.github.raw+json",
      });
      const readme = tidy(decode(res.body, res.contentType));
      if (readme) return `${owner}/${repo} README\n\n${readme}`;
    } catch {
      // not a repository, or rate limited: use the regular page
    }
  }
  return fetchPage(link);
}

async function readLink(type: string, link: string): Promise<string> {
  const host = hostOf(link);
  if (type === "youtube" && (host.endsWith("youtube.com") || host === "youtu.be")) return fetchYoutube(link);
  if (type === "twitter" && (host === "twitter.com" || host === "x.com")) return fetchTweet(link);
  if (type === "github" && host === "github.com") return fetchGithub(link);
  return fetchPage(link);
}

export interface ItemText {
  text: string;
  // Set when the text could not be read, so the UI can say why
  error?: string;
}

interface ContentLike {
  _id: unknown;
  type: string;
  link?: string | null;
  content?: string | null;
  extractedText?: string | null;
  extractedAt?: Date | null;
  extractError?: string | null;
}

// Returns the readable text for a saved item, using the cached copy when it is fresh
export async function getItemText(item: ContentLike): Promise<ItemText> {
  if (item.type === "document") {
    const text = tidy(item.content ?? "");
    return text ? { text } : { text: "", error: "This note is empty" };
  }
  if (!item.link) return { text: "", error: "This item has no link" };

  const age = item.extractedAt ? Date.now() - new Date(item.extractedAt).getTime() : Infinity;
  if (item.extractedText && age < TEXT_TTL_MS) return { text: item.extractedText };
  if (item.extractError && age < ERROR_TTL_MS) return { text: "", error: item.extractError };

  try {
    const text = (await readLink(item.type, item.link)).slice(0, MAX_STORED_CHARS);
    if (text.length < 40) throw new Error("No readable text found on this page");
    await Content.updateOne(
      { _id: item._id },
      { $set: { extractedText: text, extractedAt: new Date() }, $unset: { extractError: "" } }
    );
    return { text };
  } catch (e) {
    const raw = e instanceof Error ? e.message : "Could not read this link";
    // keep messages short and free of internals (an address block reads like a failed fetch to the user)
    const error = raw === "Blocked address" ? "This link can't be fetched" : raw;
    await Content.updateOne(
      { _id: item._id },
      { $set: { extractError: error, extractedAt: new Date() }, $unset: { extractedText: "" } }
    );
    return { text: "", error };
  }
}
