import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { Box, Button } from "@suid/material";
import { logService } from "./LogService";
import type { LogEntry } from "./types";

import CodeEditorComboBox from "./CodeEditorComboBox";
import SettingsBackupRestoreSharpIcon from '@suid/icons-material/SettingsBackupRestoreSharp';
export interface LogViewerProps {
  height?: number;
}

function highlightLogLine(line: string, searchTerm: string): JSX.Element {
  const patterns: Array<{ regex: RegExp; className: string }> = [
    {
      regex: /\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?/g,
      className: "text-gray-500",
    },
    { regex: /"[^"]*"/g, className: "text-purple-400" },
  ];

  const trimmed = searchTerm.trim();
  if (trimmed.length > 0) {
    const escapedTerm = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.unshift({
      regex: new RegExp(escapedTerm, "gi"),
      className: "bg-yellow-500 text-black font-semibold",
    });
  }

  let parts: Array<{ text: string; className?: string }> = [{ text: line }];

  for (const { regex, className } of patterns) {
    const newParts: Array<{ text: string; className?: string }> = [];
    for (const part of parts) {
      if (part.className) {
        newParts.push(part);
        continue;
      }

      let lastIndex = 0;
      const matches = Array.from(part.text.matchAll(regex));
      for (const match of matches) {
        const matchIndex = match.index ?? 0;
        if (matchIndex > lastIndex) {
          newParts.push({ text: part.text.slice(lastIndex, matchIndex) });
        }
        newParts.push({ text: match[0], className });
        lastIndex = matchIndex + match[0].length;
      }
      if (lastIndex < part.text.length) {
        newParts.push({ text: part.text.slice(lastIndex) });
      }
    }
    parts = newParts;
  }

  return (
    <span>
      <For each={parts}>
        {(part) => <span class={part.className ?? ""}>{part.text}</span>}
      </For>
    </span>
  );
}

export function LogViewer(props: LogViewerProps): JSX.Element {
  const [entries, setEntries] = createSignal<LogEntry[]>(logService.getEntries());
  const [filter, setFilter] = createSignal("");
  const [autoScroll, setAutoScroll] = createSignal(true);
  const [isPaused, setIsPaused] = createSignal(false);

  let scrollRef: HTMLDivElement | undefined;

  const filteredEntries = createMemo(() => {
    const text = filter().toLowerCase();
    if (!text) return entries();
    return entries().filter((entry) => entry.line.toLowerCase().includes(text));
  });

  const scrollToBottom = () => {
    if (!scrollRef) return;
    scrollRef.scrollTop = scrollRef.scrollHeight;
  };

  onMount(() => {
    const unsubscribe = logService.listen((event) => {
      if (event.type === "clear") {
        setEntries([]);
        return;
      }

      const entry = event.entry;
      setEntries((prev) => {
        const next = [...prev, entry];
        return next.length > 10000 ? next.slice(-10000) : next;
      });

      if (autoScroll() && !isPaused()) {
        requestAnimationFrame(scrollToBottom);
      }
    });

    onCleanup(() => {
      unsubscribe();
    });
  });

  createEffect(() => {
    if (!scrollRef) return;
    if (autoScroll()) {
      scrollToBottom();
    }
  });

  const formatTimestamp = (timestamp: number): string => {
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return "";
    }
  };

  return (
    <Box
      sx={{
        height: props.height ? `${props.height}px` : "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            backgroundColor: "#1a1c2e",
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 0.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <CodeEditorComboBox
              configId={'log_filter_'}
              placeholder={'Filter ...'}
              value={filter()}
              isDynamic={false}
              presetOptions={[]}
              saveChanges={(val) => setFilter(val)}
              onChange={(val) => setFilter(val)}
              fieldName="Filter"
              showDropdown={false}
              showClear={true}
              endPaddingPx={24}
            />
          </Box>
          <Button variant="text" onClick={() => logService.clear()} sx={{ whiteSpace: 'nowrap', minWidth: 'auto', flexShrink: 0, px: 1 }}>
            Clear
          </Button>
        </Box>

        <Show
          when={filteredEntries().length > 0}
          fallback={
            <Box sx={{ color: "text.secondary", py: 2, textAlign: "center" }}>
              No logs yet.
            </Box>
          }
        >
          <For each={filteredEntries()}>
            {(entry) => (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  py: 0.25,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  px: 1,
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {highlightLogLine(entry.line, filter())}
                </Box>
                <Box
                  sx={{
                    whiteSpace: "nowrap",
                    color: "text.secondary",
                    fontSize: 11,
                  }}
                >
                  {formatTimestamp(entry.timestamp)}
                </Box>
              </Box>
            )}
          </For>
        </Show>
      </Box>
    </Box>
  );
}
