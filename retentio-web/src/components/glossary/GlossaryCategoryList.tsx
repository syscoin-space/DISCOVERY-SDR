import { GlossaryItemData, GlossaryItemCard } from "./GlossaryItemCard";

interface GlossaryCategoryProps {
  items: GlossaryItemData[];
  search: string;
}

export function GlossaryCategoryList({ items, search }: GlossaryCategoryProps) {
  if (items.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground italic">
        Nenhum resultado para &ldquo;{search}&rdquo;
      </p>
    );
  }

  return (
    <div className="space-y-3 lg:space-y-4">
      {items.map((item, i) => (
        <GlossaryItemCard key={i} item={item} />
      ))}
    </div>
  );
}
