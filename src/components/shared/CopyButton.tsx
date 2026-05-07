import { Copy, Check } from "lucide-react";
import { useClipboard } from "@/hooks/useClipboard";

interface CopyButtonProps {
  text: string;
  fieldName: string;
  className?: string;
}

export function CopyButton({ text, fieldName, className }: CopyButtonProps) {
  const { copy, copiedField } = useClipboard();
  const isCopied = copiedField === fieldName;

  return (
    <button
      onClick={() => copy(text, fieldName)}
      className={`p-1 transition-colors ${
        isCopied
          ? "text-green-500"
          : "text-gray-400 hover:text-lockgrid-500"
      } ${className ?? ""}`}
      title={isCopied ? "Copied!" : "Copy"}
    >
      {isCopied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
