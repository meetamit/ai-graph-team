"use client";

import GraphInputForm from "./graph-input-form";
import type { NeededInput, ProvidedInput } from "@/lib/graphSchema";

interface InputFormModalProps {
  onClose: () => void;
  neededInput: NeededInput[];
  onSubmit: (inputs: ProvidedInput[]) => void;
}

export default function InputFormModal({ onClose, neededInput, onSubmit }: InputFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-5/6 flex flex-col">
        <GraphInputForm 
          neededInput={neededInput} 
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
