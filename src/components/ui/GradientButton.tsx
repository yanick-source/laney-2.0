import { cn } from "@/lib/utils";

export function GradientButton({
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "btn-gradient rounded-xl px-5 py-2.5 font-semibold text-sm",
        "flex items-center justify-center gap-2",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
