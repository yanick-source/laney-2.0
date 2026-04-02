import { X } from 'lucide-react';

interface PhotoPickerModalProps {
  photos: Array<{ id: string; url: string; name: string }>;
  onSelectPhoto: (photoUrl: string) => void;
  onClose: () => void;
}

export default function PhotoPickerModal({ photos, onSelectPhoto, onClose }: PhotoPickerModalProps) {
  // Defensive check for photos array
  const validPhotos = Array.isArray(photos) ? photos.filter(p => p && p.id && p.url) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <h2 className="text-lg font-semibold text-foreground">Select a Photo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/80 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Photo Grid */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {validPhotos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No photos available. Upload photos first.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {validPhotos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    onSelectPhoto(photo.url);
                    onClose();
                  }}
                  className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                >
                  <img
                    src={photo.url}
                    alt={photo.name || 'Photo'}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
