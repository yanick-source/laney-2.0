import { useEffect, useRef } from 'react';
import { Copy, Trash2, Lock, Unlock, MoveUp, MoveDown, Layers } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  isLocked,
  onToggleLock
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems = [
    { label: 'Copy', icon: Copy, onClick: () => { onCopy(); onClose(); }, shortcut: 'Ctrl+C' },
    { label: 'Duplicate', icon: Copy, onClick: () => { onDuplicate(); onClose(); }, shortcut: 'Ctrl+D' },
    { label: 'Delete', icon: Trash2, onClick: () => { onDelete(); onClose(); }, shortcut: 'Del', danger: true },
    { type: 'separator' },
    { label: 'Bring to Front', icon: Layers, onClick: () => { onBringToFront(); onClose(); } },
    { label: 'Bring Forward', icon: MoveUp, onClick: () => { onBringForward(); onClose(); } },
    { label: 'Send Backward', icon: MoveDown, onClick: () => { onSendBackward(); onClose(); } },
    { label: 'Send to Back', icon: Layers, onClick: () => { onSendToBack(); onClose(); } },
  ];

  if (onToggleLock) {
    menuItems.push(
      { type: 'separator' },
      { 
        label: isLocked ? 'Unlock' : 'Lock', 
        icon: isLocked ? Unlock : Lock, 
        onClick: () => { onToggleLock(); onClose(); } 
      }
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-border/60 py-1 z-50 min-w-[200px]"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'separator') {
          return <div key={index} className="h-px bg-border/60 my-1" />;
        }

        const Icon = item.icon;
        return (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/80 transition-colors text-sm ${
              item.danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
            }`}
          >
            {Icon && <Icon size={16} />}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ContextMenu;
