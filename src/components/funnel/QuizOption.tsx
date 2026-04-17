import { Check } from "lucide-react";

interface QuizOptionProps {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export const QuizOption = ({ emoji, label, selected, onClick }: QuizOptionProps) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 active:scale-[0.98] ${
        selected
          ? "border-orange bg-orange/10 shadow-orange"
          : "border-border bg-card hover:border-orange/50"
      }`}
    >
      <div className="text-4xl flex-shrink-0">{emoji}</div>
      <div className="flex-1 font-semibold text-base leading-tight">{label}</div>
      {selected && (
        <div className="w-7 h-7 rounded-full bg-orange flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
};
