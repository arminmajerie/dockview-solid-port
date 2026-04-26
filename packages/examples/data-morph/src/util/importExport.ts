import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { PipelineInputItem, ScriptItem, InputFormat } from '../inputExplorer/inputModel';
import { createUuid } from '../inputExplorer/inputModel';

// File extension mapping for input formats
const FORMAT_EXTENSIONS: Record<InputFormat, string> = {
  JSON: 'json',
  XML: 'xml',
  YAML: 'yaml',
  TEXT: 'txt',
  DML: 'dml',
  XLSX: 'xlsx',
  XLS: 'xls',
  PDF: 'pdf',
};

// Reverse mapping from extension to format
const EXTENSION_FORMATS: Record<string, InputFormat> = {
  json: 'JSON',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
  txt: 'TEXT',
  dml: 'DML',
  xlsx: 'XLSX',
  xls: 'XLS',
  pdf: 'PDF',
};

type ExportedOutputFormat = 'json' | 'xml' | 'yaml' | 'csv' | 'text' | 'dml' | 'xlsx';

const OUTPUT_EXTENSIONS: Record<ExportedOutputFormat, string> = {
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  csv: 'csv',
  text: 'txt',
  dml: 'dml',
  xlsx: 'xlsx',
};

export interface ExportData {
  scripts: ScriptItem[];
  inputs: PipelineInputItem[];
}

export interface ExportedOutputData {
  value: string;
  format: ExportedOutputFormat;
}

/**
 * Export the current playground state to a zip file
 */
export async function exportPlayground(
  scripts: ScriptItem[],
  inputs: PipelineInputItem[],
  output?: ExportedOutputData
): Promise<void> {
  const zip = new JSZip();

  // Create scripts folder and add all scripts
  const scriptsFolder = zip.folder('scripts');
  if (scriptsFolder) {
    for (const script of scripts) {
      scriptsFolder.file(script.name, script.content);
    }
  }

  // Create inputs folder and add all inputs
  const inputsFolder = zip.folder('inputs');
  if (inputsFolder) {
    for (const input of inputs) {
      const ext = FORMAT_EXTENSIONS[input.format] ?? 'txt';
      // For Excel formats, store the binary payload as base64
      const content = (input.format === 'XLSX' || input.format === 'XLS' || input.format === 'PDF') && input.binaryPayload
        ? input.binaryPayload
        : input.value;
      
      if (input.id === 'payload') {
        // payload.{ext}
        inputsFolder.file(`payload.${ext}`, content);
      } else if (input.id === 'attributes') {
        // attributes.{ext}
        inputsFolder.file(`attributes.${ext}`, content);
      } else if (input.id === 'vars') {
        // vars is a folder container, skip the root vars object
        // Individual vars items are handled below
      } else if (input.id === 'correlationId') {
        // correlationId.txt - always text
        inputsFolder.file('correlationId.txt', content);
      } else if (input.scope === 'vars') {
        // vars.{varName}.{ext}
        inputsFolder.file(`vars.${input.id}.${ext}`, content);
      } else {
        // Top-level custom inputs: {inputName}.{ext}
        inputsFolder.file(`${input.id}.${ext}`, content);
      }
    }
  }

  if (output) {
    const outputFolder = zip.folder('output');
    if (outputFolder) {
      const ext = OUTPUT_EXTENSIONS[output.format] ?? 'txt';
      const fileName = `output.${ext}`;
      if (output.format === 'xlsx') {
        outputFolder.file(fileName, output.value, { base64: true });
      } else {
        outputFolder.file(fileName, output.value);
      }
    }
  }

  // Create a metadata file to preserve format information
  const metadata = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    inputs: inputs.map(input => ({
      id: input.id,
      format: input.format,
      scope: input.scope ?? 'top',
      locked: input.locked ?? false,
      ...(input.fileName ? { fileName: input.fileName } : {}),
    })),
    scripts: scripts.map(script => ({
      id: script.id,
      name: script.name,
      isMain: script.isMain ?? false,
    })),
    ...(output ? {
      output: {
        format: output.format,
        fileName: `output.${OUTPUT_EXTENSIONS[output.format] ?? 'txt'}`,
      },
    } : {}),
  };
  zip.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Generate and download the zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  saveAs(blob, `datamorph-playground-${timestamp}.zip`);
}

/**
 * Import playground state from a zip file
 */
export async function importPlayground(file: File): Promise<ExportData | null> {
  try {
    const zip = await JSZip.loadAsync(file);
    
    const scripts: ScriptItem[] = [];
    const inputs: PipelineInputItem[] = [];

    // Try to read metadata file
    let metadata: {
      inputs?: Array<{ id: string; format: InputFormat; scope: string; locked: boolean; fileName?: string }>;
      scripts?: Array<{ id: string; name: string; isMain: boolean }>;
    } | null = null;

    const metadataFile = zip.file('metadata.json');
    if (metadataFile) {
      try {
        const metadataContent = await metadataFile.async('string');
        metadata = JSON.parse(metadataContent);
      } catch (e) {
        console.warn('[importPlayground] Failed to parse metadata.json:', e);
      }
    }

    // Process scripts folder
    const scriptsFolder = zip.folder('scripts');
    if (scriptsFolder) {
      const scriptFiles = scriptsFolder.filter((_, file) => !file.dir);
      
      for (const scriptFile of scriptFiles) {
        const content = await scriptFile.async('string');
        const name = scriptFile.name.replace('scripts/', '');
        
        // Find metadata for this script
        const scriptMeta = metadata?.scripts?.find(s => s.name === name);
        
        scripts.push({
          id: scriptMeta?.id ?? createUuid(),
          name,
          content,
          isMain: scriptMeta?.isMain ?? name === 'main.dm',
        });
      }
    }

    // Ensure there's a main.dm script
    if (!scripts.some(s => s.isMain)) {
      if (scripts.length > 0) {
        // Mark the first script as main
        scripts[0].isMain = true;
      } else {
        // Create a default main.dm
        scripts.push({
          id: createUuid(),
          name: 'main.dm',
          content: `output application/json
---
payload`,
          isMain: true,
        });
      }
    }

    // Process inputs folder
    const inputsFolder = zip.folder('inputs');
    if (inputsFolder) {
      const inputFiles = inputsFolder.filter((_, file) => !file.dir);
      
      for (const inputFile of inputFiles) {
        const content = await inputFile.async('string');
        const fileName = inputFile.name.replace('inputs/', '');
        const ext = fileName.split('.').pop()?.toLowerCase() ?? 'txt';
        const format = EXTENSION_FORMATS[ext] ?? 'TEXT';
        
        // Parse the filename to determine input type
        if (fileName.startsWith('payload.')) {
          const inputMeta = metadata?.inputs?.find(i => i.id === 'payload');
          const resolvedFormat = inputMeta?.format ?? format;
          const isBinary = resolvedFormat === 'XLSX' || resolvedFormat === 'XLS' || resolvedFormat === 'PDF';
          const label = resolvedFormat === 'PDF' ? 'PDF' : 'Excel';
          inputs.push({
            id: 'payload',
            format: resolvedFormat,
            value: isBinary ? `[${label} file: ${inputMeta?.fileName ?? fileName}]` : content,
            locked: true,
            scope: 'top',
            ...(isBinary ? { binaryPayload: content, fileName: inputMeta?.fileName ?? fileName } : {}),
          });
        } else if (fileName.startsWith('attributes.')) {
          const inputMeta = metadata?.inputs?.find(i => i.id === 'attributes');
          inputs.push({
            id: 'attributes',
            format: inputMeta?.format ?? format,
            value: content,
            locked: true,
            scope: 'top',
          });
        } else if (fileName.startsWith('correlationId.')) {
          inputs.push({
            id: 'correlationId',
            format: 'TEXT',
            value: content,
            locked: true,
            scope: 'top',
          });
        } else if (fileName.startsWith('vars.')) {
          // vars.{varName}.{ext}
          const parts = fileName.split('.');
          if (parts.length >= 3) {
            const varName = parts[1];
            const inputMeta = metadata?.inputs?.find(i => i.id === varName && i.scope === 'vars');
            inputs.push({
              id: varName,
              format: inputMeta?.format ?? format,
              value: content,
              locked: false,
              scope: 'vars',
            });
          }
        } else {
          // Top-level custom input: {inputName}.{ext}
          const inputName = fileName.replace(/\.[^.]+$/, '');
          const inputMeta = metadata?.inputs?.find(i => i.id === inputName);
          inputs.push({
            id: inputName,
            format: inputMeta?.format ?? format,
            value: content,
            locked: inputMeta?.locked ?? false,
            scope: (inputMeta?.scope as 'top' | 'vars') ?? 'top',
          });
        }
      }
    }

    // Ensure required inputs exist
    if (!inputs.some(i => i.id === 'payload')) {
      inputs.unshift({
        id: 'payload',
        format: 'JSON',
        value: '{}',
        locked: true,
        scope: 'top',
      });
    }
    if (!inputs.some(i => i.id === 'attributes')) {
      inputs.push({
        id: 'attributes',
        format: 'JSON',
        value: '{}',
        locked: true,
        scope: 'top',
      });
    }
    if (!inputs.some(i => i.id === 'correlationId')) {
      inputs.push({
        id: 'correlationId',
        format: 'TEXT',
        value: createUuid(),
        locked: true,
        scope: 'top',
      });
    }

    // Add the vars container (it's a virtual container, not stored in files)
    inputs.splice(2, 0, {
      id: 'vars',
      format: 'JSON',
      value: '{}',
      locked: true,
      scope: 'vars',
    });

    return { scripts, inputs };
  } catch (error) {
    console.error('[importPlayground] Failed to import zip file:', error);
    return null;
  }
}

/**
 * Open a file picker and import the selected zip file
 */
export function openImportDialog(): Promise<ExportData | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      
      const result = await importPlayground(file);
      resolve(result);
    };
    
    input.oncancel = () => {
      resolve(null);
    };
    
    input.click();
  });
}
