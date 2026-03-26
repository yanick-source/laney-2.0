interface SelectionBoxProps {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export default function SelectionBox({ startX, startY, currentX, currentY }: SelectionBoxProps) {
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  return (
    <div
      className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  );
}
