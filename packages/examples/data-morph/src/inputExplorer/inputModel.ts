export type InputFormat = "JSON" | "XML" | "YAML" | "TEXT" | "DML" | "XLSX" | "XLS" | "PDF";
import { v4 as uuidv4 } from 'uuid';
export type PipelineInputItem = {
  id: string;
  format: InputFormat;
  value: string;
  locked?: boolean;
  scope?: "top" | "vars";
  /** Base64-encoded binary content for Excel files */
  binaryPayload?: string;
  /** Original file name for display purposes */
  fileName?: string;
};

export type ScriptItem = {
  id: string;
  name: string;
  content: string;
  isMain?: boolean;
};

export const RESERVED_INPUT_IDS = ["payload", "attributes", "vars", "correlationId"] as const;
export type ReservedInputId = (typeof RESERVED_INPUT_IDS)[number];

export function isReservedInputId(id: string): id is ReservedInputId {
  return (RESERVED_INPUT_IDS as readonly string[]).includes(id);
}

export function createUuid(): string {
  return uuidv4();
}
