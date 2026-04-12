// src/components/_shared/CodeEditorComboBox.tsx
import { Component, createSignal, createEffect, createMemo, onMount, onCleanup } from 'solid-js';
import { Box, IconButton, TextField } from '@suid/material';

import HighlightOffIcon from '@suid/icons-material/HighlightOff';
import ArrowDownwardRoundedIcon from '@suid/icons-material/ArrowDownwardRounded';

import { KeyboardManager } from '@arminmajerie/keyboard-manager';
import type { editor as monacoEditor } from 'monaco-editor';


interface CodeEditorComboBoxProps {
  configId: string;
  label?: string;
  value: string;
  isDynamic: boolean;
  presetOptions: string[];
  saveChanges: (value: string) => void;
  onChange?: (value: string) => void; // Called on every keystroke for tracking pending changes
  language?: string; // Monaco language (default: 'javascript')
  placeholder?: string;
  fieldName?: string; // Display name for the field (shown in dialog title)
  showDropdown?: boolean;
  showClear?: boolean;
  endPaddingPx?: number;
  type?: string;
  defaultTextRows?: number;
  defaultExpressionRows?: number;
  
  // Optional override if configId does not end with the actual node id
  dataMorphNodeId?: string;
}

/**
 * A combo box that switches between:
 * - A dropdown (CustomComboBox) when isDynamic is false
 * - An editable first-line input + expand button when isDynamic is true
 * 
 * The first line is directly editable in the input box.
 * The expand button opens a modal dialog with a full Monaco code editor for multi-line editing.
 */
const CodeEditorComboBox: Component<CodeEditorComboBoxProps> = (props) => {


  const [dialogOpen, setDialogOpen] = createSignal(false);
  const [dialogValue, setDialogValue] = createSignal(props.value);
  const [localFirstLine, setLocalFirstLine] = createSignal('');
  const [isInputFocused, setIsInputFocused] = createSignal(false);
  // Track current unsaved value for CustomComboBox (when isDynamic is false)
  const [comboBoxValue, setComboBoxValue] = createSignal(props.value);
  const [dataMorphContextJson, setDataMorphContextJson] = createSignal<string>('');
  let dialogEditorRef: monacoEditor.IStandaloneCodeEditor | undefined;
  let showDropdown = props.showDropdown ?? true;

  const reserveEndPaddingPx = () => {
    const perIcon = props.endPaddingPx ?? 24;
    const showClear = props.showClear ?? true;
    const showExpand = props.isDynamic && showDropdown !== false;
    const iconCount = (showClear ? 1 : 0) + (showExpand ? 1 : 0);
    // Caller asked for a fixed 24px reservation.
    return perIcon * iconCount;
  };

  const hasAnyValue = () => (localFirstLine() + getRemainingLines()).length > 0;

  const inferNodeIdFromConfigId = (configId: string): string => {
    const idx = configId.lastIndexOf('_');
    if (idx >= 0 && idx < configId.length - 1) return configId.slice(idx + 1);
    return configId;
  };

  const effectiveNodeId = () => props.dataMorphNodeId || inferNodeIdFromConfigId(props.configId);

  // Fetch DataMorph context for IntelliSense when dynamic
  createEffect(() => {
    const enabled = props.isDynamic;
    const nodeId = effectiveNodeId();


    if (!enabled) {
      setDataMorphContextJson('');
      return;
    }
    
    setDataMorphContextJson('');

    let cancelled = false;

    
    onCleanup(() => {
      cancelled = true;
    });
  });
  
  // Validation helper for number type
  const isValidValue = (val: string): boolean => {
    if (props.type === 'number') {
      // Allow empty string or valid integer
      return val === '' || /^\d+$/.test(val);
    }
    return true;
  };
  
  // Save function that works for both dynamic and non-dynamic modes
  const saveCurrentValue = () => {
    if (props.isDynamic) {
      // Dynamic mode: save first line + remaining lines
      const newValue = localFirstLine() + getRemainingLines();
      0&&console['log']('[CodeEditorComboBox] saveCurrentValue (dynamic) - newValue:', newValue.substring(0, 50), 'props.value:', props.value.substring(0, 50));
      if (isValidValue(newValue)) {
        props.saveChanges(newValue);
      }
    } else {
      // Non-dynamic mode: save combobox value
      const newValue = comboBoxValue();
      0&&console['log']('[CodeEditorComboBox] saveCurrentValue (non-dynamic) - newValue:', newValue.substring(0, 50), 'props.value:', props.value.substring(0, 50));
      if (isValidValue(newValue)) {
        props.saveChanges(newValue);
      }
    }
  };
  
  // Register keyboard shortcuts via KeyboardManager
  onMount(() => {
    // Register shortcut for saving inline field (when input is focused)
    KeyboardManager.registerShortcut({
      id: `codeEditorCombo.saveInline.${props.configId}`,
      command: 'Save Inline Field',
      defaultKey: 'Ctrl+S',
      when: `codeEditorInline_${props.configId}`,
      worksInTextInputs: true,
      handler: () => {
        // Context match already guarantees input is focused, no need to check isInputFocused
        0&&console['log']('[CodeEditorComboBox] Ctrl+S handler called for:', props.configId);
        saveCurrentValue();
      },
    });
    
    // Register shortcut for saving dialog (when dialog is open)
    KeyboardManager.registerShortcut({
      id: `codeEditorCombo.saveDialog.${props.configId}`,
      command: 'Save Dialog',
      defaultKey: 'Ctrl+S',
      when: 'dialogEditorFocus',
      worksInTextInputs: true,
      handler: () => {
        if (dialogOpen()) {
          handleDialogSave();
        }
      },
    });
    
    onCleanup(() => {
      KeyboardManager.unregisterShortcut(`codeEditorCombo.saveInline.${props.configId}`);
      KeyboardManager.unregisterShortcut(`codeEditorCombo.saveDialog.${props.configId}`);
    });
  });
  
  // Update local first line when props.value changes (external update)
  // Using explicit dependency to ensure proper reactivity
  createEffect(() => {
    // Access props.value to track it
    const val = props.value;
    // Update all internal state based on new value
    if (!val) {
      setLocalFirstLine('');
      setDialogValue('');
      setComboBoxValue('');
    } else {
      if (props.defaultExpressionRows && props.defaultExpressionRows > 1) {
        // Multi-line mode: localFirstLine holds the full value
        setLocalFirstLine(val);
      } else {
        // Single-line mode: split lines
        const lines = val.split('\n');
        setLocalFirstLine(lines[0] || '');
      }
      setDialogValue(val);
      setComboBoxValue(val);
    }
  });

  // Get the remaining lines (after first line)
  const getRemainingLines = () => {
    if (props.defaultExpressionRows && props.defaultExpressionRows > 1) return '';
    const val = props.value;
    if (!val) return '';
    const lines = val.split('\n');
    if (lines.length <= 1) return '';
    return '\n' + lines.slice(1).join('\n');
  };

  // Count lines in the current value
  const lineCount = createMemo(() => {
    const val = props.value;
    if (!val) return 1;
    return val.split('\n').length;
  });

  // Check if there are hidden lines (more than 1)
  const hasHiddenLines = createMemo(() => {
    if (props.defaultExpressionRows && props.defaultExpressionRows > 1) return false;
    return lineCount() > 1;
  });

  // Handle first line input change
  const handleFirstLineChange = (newFirstLine: string) => {
    if (props.defaultExpressionRows && props.defaultExpressionRows > 1) {
      // Multi-line mode: accept newlines
      setLocalFirstLine(newFirstLine);
      // Notify parent of change (for pending state tracking)
      props.onChange?.(newFirstLine + getRemainingLines());
    } else {
      // Remove any newlines from the input (single line only)
      const sanitized = newFirstLine.replace(/[\r\n]+/g, '');
      setLocalFirstLine(sanitized);
      // Notify parent of change (for pending state tracking)
      props.onChange?.(sanitized + getRemainingLines());
    }
  };

  // Save first line changes (combines with remaining lines)
  const saveFirstLine = () => {
    const newValue = localFirstLine() + getRemainingLines();
    if (newValue !== props.value) {
      props.saveChanges(newValue);
    }
  };

  const clearValue = () => {
    if (!localFirstLine() && !getRemainingLines()) return;
    setLocalFirstLine('');
    setDialogValue('');
    setComboBoxValue('');
    props.onChange?.('');
    props.saveChanges('');
  };

  // Dialog handlers
  const openDialog = () => {
    // Combine current first line with remaining lines for dialog
    const currentValue = localFirstLine() + getRemainingLines();
    setDialogValue(currentValue);
    setDialogOpen(true);
    // Set context to allow Ctrl+S to work in Monaco
    KeyboardManager.setContext('dialogEditorFocus');
  };

  const handleDialogSave = () => {
    const newValue = dialogEditorRef?.getValue() ?? dialogValue();
    props.saveChanges(newValue);
    KeyboardManager.clearContext('dialogEditorFocus');
    setDialogOpen(false);
  };

  const handleDialogCancel = () => {
    KeyboardManager.clearContext('dialogEditorFocus');
    setDialogOpen(false);
  };

  const handleDialogEditorMount = (monacoInstance: any, editor: monacoEditor.IStandaloneCodeEditor) => {
    dialogEditorRef = editor;
    
    // Add Ctrl+S handler to save and close
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      handleDialogSave();
    });
    
    // Focus the editor when mounted - delay to avoid aria-hidden conflict
    setTimeout(() => {
      editor.focus();
    }, 150);
  };

  const handleDialogEditorChange = (newValue: string) => {
    setDialogValue(newValue);
  };

  return (
    <>
      <Box sx={{  flex:1, minWidth: 250, maxWidth: 500 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minWidth: 250, maxWidth: 1200,
            width: '100%',
            flex:1,
          }}
        >
          <Box sx={{ position: 'relative', flexGrow: 1, flexBasis: 500, minWidth: 0 }}>
            {/* Editable first line input */}
            <TextField
              value={localFirstLine()}
              size="small"
              multiline={props.defaultExpressionRows && props.defaultExpressionRows > 1}
              minRows={props.defaultExpressionRows}
              onChange={(e) => {
                handleFirstLineChange(e.currentTarget.value);
              }}
              onFocus={() => {
                setIsInputFocused(true);
                KeyboardManager.setContext(`codeEditorInline_${props.configId}`);
              }}
              onBlur={() => {
                setIsInputFocused(false);
                KeyboardManager.clearContext(`codeEditorInline_${props.configId}`);
                saveFirstLine();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !(props.defaultExpressionRows && props.defaultExpressionRows > 1)) {
                  e.preventDefault();
                  saveFirstLine();
                  (e.target as HTMLInputElement).blur();
                }
                // Ctrl+S handled by KeyboardManager
              }}
              sx={{
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgb(241,237,237)',
                  color: 'rgb(28,22,22)',
                  '& fieldset': {
                    borderColor: 'rgb(255,255,255)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgb(185,204,220)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgb(225,228,231)',
                  },
                },
                '& .MuiOutlinedInput-input': {
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  padding: '4px 8px',
                  paddingRight: `${8 + reserveEndPaddingPx()}px`,
                },
              }}
              placeholder={props.placeholder || 'Filter expression2...'}
            />
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearValue();
              }}
              disabled={!hasAnyValue()}

              sx={{
                marginLeft: '-30px',
                paddingRight: '2px',
                minWidth: '20px',
                height: '20px',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                '&:hover': {
                  minWidth: '24px',
                  height: '24px',
                },
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                zIndex: 1000,
              
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'auto',
              }}
            
            >
              <HighlightOffIcon sx={{ fontSize: '16px'}}  />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Modal Dialog with full code editor */}

    </>
  );
};

export default CodeEditorComboBox;
