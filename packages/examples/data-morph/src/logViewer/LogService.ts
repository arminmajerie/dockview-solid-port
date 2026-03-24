import type { LogEntry } from "./types";

export type LogEvent =
  | { type: "entry"; entry: LogEntry }
  | { type: "clear" };

export type LogCallback = (event: LogEvent) => void;

interface CaptureOptions {
  filter?: (line: string) => boolean;
  source?: string;
}

class LogService {
  private subscribers: Set<LogCallback> = new Set();
  private entries: LogEntry[] = [];

  listen(callback: LogCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.subscribers.forEach((sub) => {
      try {
        sub({ type: "clear" });
      } catch (error) {
        console.error("[LogService] Subscriber callback error:", error);
      }
    });
  }

  pushLine(line: string, source = "script", timestamp = Date.now()): void {
    const entry: LogEntry = {
      source_file: source,
      line,
      timestamp,
    };

    this.entries.push(entry);
    if (this.entries.length > 10000) {
      this.entries = this.entries.slice(-10000);
    }

    this.subscribers.forEach((sub) => {
      try {
        sub({ type: "entry", entry });
      } catch (error) {
        console.error("[LogService] Subscriber callback error:", error);
      }
    });
  }

  pushLines(lines: string[], source = "script", timestamp = Date.now()): void {
    lines.forEach((line, idx) => {
      const lineTimestamp = timestamp + idx;
      this.pushLine(line, source, lineTimestamp);
    });
  }

  captureConsoleErrors(options: CaptureOptions = {}): () => void {
    const source = options.source ?? "script";
    const filter = options.filter ?? (() => true);
    const original = console.error;

    console.error = (...args: unknown[]) => {
      try {
        const rawLines = args
          .map((arg) => {
            if (typeof arg === "string") return arg;
            try {
              return JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          })
          .join(" ")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        for (const line of rawLines) {
          if (!filter(line)) {
            continue;
          }
          const normalized = LogService.normalizeLogLine(line);
          if (normalized) {
            this.pushLine(normalized, source);
          }
        }
      } catch (error) {
        original("[LogService] Failed to capture console error:", error);
      }

      original(...args);
    };

    return () => {
      console.error = original;
    };
  }

  static normalizeLogLine(raw: string): string | null {
    const line = raw.trim();
    if (!line) return null;

    const bracketMatch = line.match(/^\[([^\]]*)\]\s*(.*)$/s);
    if (bracketMatch) {
      const prefix = bracketMatch[1].trim();
      const rest = bracketMatch[2].trim();
      if (!rest) return null;
      return prefix ? `${prefix} - ${rest}` : rest;
    }

    const dashMatch = line.match(/^([A-Za-z0-9_\- ]+)\s-\s(.+)$/s);
    if (dashMatch) {
      return `${dashMatch[1].trim()} - ${dashMatch[2].trim()}`;
    }

    return line;
  }
}

export const logService = new LogService();
