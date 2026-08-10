"use client";

import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/workflowTemplates";

interface WorkflowTemplatePickerModalProps {
  onClose: () => void;
  onSelect: (template: WorkflowTemplate) => void;
}

export function WorkflowTemplatePickerModal({ onClose, onSelect }: WorkflowTemplatePickerModalProps) {
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-panel-enter max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-950 p-5 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Start from a Template</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Pick a pre-built automation and customize it from there.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WORKFLOW_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="hover-glow flex flex-col items-start gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 text-left hover:bg-zinc-900"
            >
              <span className="text-2xl">{template.icon}</span>
              <span className="text-sm font-semibold text-zinc-100">{template.name}</span>
              <span className="text-xs leading-relaxed text-zinc-400">{template.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
