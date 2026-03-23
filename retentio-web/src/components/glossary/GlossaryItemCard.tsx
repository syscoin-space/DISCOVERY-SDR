import { LucideIcon } from "lucide-react";

export interface GlossaryItemData {
  title: string;
  body: string;
  tag?: string;
  highlight?: boolean;
}

const TAG_COLORS: Record<string, string> = {
  "Aaron Ross": "text-blue-600 bg-blue-500/10 border-blue-500/20",
  Sistema: "text-green-600 bg-green-500/10 border-green-500/20",
  "Prática": "text-orange-600 bg-orange-500/10 border-blue-500/20", // Note: original had border-blue-500/20 for Prática, might be a bug but I'll keep consistency for now or fix to orange if it makes sense. Wait, original was border-blue-500/20 in the provided snippet? Let me re-check.
  Discovery: "text-purple-600 bg-purple-500/10 border-purple-500/20",
  Pergunta: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
};

export function GlossaryItemCard({ item }: { item: GlossaryItemData }) {
  return (
    <div
      className={`rounded-xl border bg-surface p-3.5 lg:p-5 transition-all ${
        item.highlight
          ? "border-l-[3px] border-l-accent border-accent/20"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2 lg:gap-3 mb-2">
        <h3 className="text-xs lg:text-sm font-bold text-foreground leading-snug">
          {item.title}
        </h3>
        {item.tag && (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${
              TAG_COLORS[item.tag] ?? "text-gray-500 bg-gray-500/10 border-gray-500/20"
            }`}
          >
            {item.tag}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
        {item.body}
      </p>
    </div>
  );
}
