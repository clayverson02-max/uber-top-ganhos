interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

export const ProgressBar = ({ current, total, label }: ProgressBarProps) => {
  const pct = Math.min(100, (current / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2 text-xs font-semibold">
        <span className="text-orange uppercase tracking-wide">{label ?? "Progresso"}</span>
        <span className="text-foreground/80">{current}/{total}</span>
      </div>
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full gradient-orange transition-all duration-500 ease-out rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
