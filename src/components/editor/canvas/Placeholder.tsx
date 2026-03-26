import { ImagePlus } from "lucide-react";

interface PlaceholderProps {
  slotId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onClick: () => void;
}

export default function Placeholder({
  slotId,
  x,
  y,
  width,
  height,
  onClick,
}: PlaceholderProps) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x}%`,
    top: `${y}%`,
    width: `${width}%`,
    height: `${height}%`,
    cursor: "pointer",
  };

  return (
    <div
      data-slot-id={slotId}
      data-placeholder="true"
      style={style}
      onClick={onClick}
      className="flex flex-col items-center justify-center bg-[#F5F5F5] border-2 border-dashed border-[#CCCCCC] rounded-lg hover:bg-[#EEEEEE] hover:border-[#AAAAAA] transition-colors"
    >
      <ImagePlus size={32} className="text-[#999999] mb-2" />
      <span className="text-xs font-medium text-[#666666]">Add photo</span>
    </div>
  );
}
