# Laney AI Photobook - Backend Infrastructure Rebuild Prompt

## Mission
Rebuild the entire backend infrastructure for Laney AI Photobook with a simplified, scalable, and premium architecture. Focus only on core B2C AI functionalities: photo upload/analysis, Canva-quality editor, and Shopify checkout. The main home page will remain in Lovable.

## Current Architecture Analysis

### Existing Flow (Reference: `/src/pages/AICreationFlow.tsx`)
- **Multi-step process**: Upload → Format Selection → AI Processing → Preview
- **Complex pipeline**: `runPhotobookPipeline()` with photo analysis, deduplication, layout generation
- **Heavy UI**: 591 lines with extensive value props, trust builders, progress tracking
- **Data flow**: Photos → AI Analysis → Rich Layouts → BookPreview

### Current Editor (Reference: `/src/pages/PhotobookEditor.tsx`)
- **Canva-inspired**: PremiumCanvas with drag-and-drop, snapping, floating toolbars
- **Complex state management**: useEditorState hook with undo/redo, layers, zoom
- **Rich interactions**: Context menus, resize handles, rotation, image panning
- **Sidebar system**: CollapsibleLeftSidebar with Photos, Themes, Text, Stickers, Backgrounds, Elements

### Current Data Models (Reference: `/src/integrations/supabase/types.ts`)
```typescript
// Core Tables
photobooks: {
  id, user_id, title, status, book_format, pages, photos, analysis, metadata
}
profiles: { id, email, display_name, avatar_url }
templates: { id, name, category, cover_image_path, orientation, tag }
```

### Current Checkout (Reference: `/src/pages/Checkout.tsx` + `/src/lib/shopify.ts`)
- **Shopify Integration**: Storefront API with cart creation, product fetching
- **Product variants**: Multiple formats/prices
- **Cart state**: Zustand store with checkout URL generation

## New Simplified Architecture

### URL Structure
```
uselaney.com/start          # Photo upload (new simplified UI)
uselaney.com/:sessionId     # AI processing with progress
uselaney.com/editor/:id     # Canva-quality editor
uselaney.com/checkout/:id   # Shopify checkout
```

### Tech Stack Requirements
- **Frontend**: React + TypeScript + TailwindCSS (keep existing)
- **Backend**: Node.js/Express or Next.js API Routes
- **Database**: Supabase (keep existing)
- **Storage**: Supabase Storage for photos
- **AI**: OpenAI Vision API for photo analysis
- **Payments**: Shopify Storefront API (keep existing)
- **State Management**: Zustand or React Query

## Implementation Requirements

### 1. Photo Upload Flow (`/start`)

**Requirements:**
- Clean, minimal upload interface (remove complex value props)
- Drag-and-drop with progress indicators
- Direct upload to Supabase Storage with resumable uploads
- Photo validation (size, format, quality check)
- Create session and redirect to processing

**Key Components:**
```typescript
// New simplified upload component
interface UploadSession {
  id: string;
  userId: string;
  photos: PhotoFile[];
  status: 'uploading' | 'processing' | 'ready';
  createdAt: Date;
}

interface PhotoFile {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: Date;
}
```

**API Endpoints:**
```
POST /api/sessions          # Create upload session
POST /api/upload            # Upload photo to Supabase
POST /api/process           # Start AI analysis
```

### 2. AI Processing (`/:sessionId`)

**Requirements:**
- Real-time progress updates (WebSocket or Server-Sent Events)
- Photo analysis pipeline (simplified from current)
- Automatic layout generation
- Redirect to editor when complete

**Simplified Pipeline:**
```typescript
interface ProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
}

// Steps: Upload → Analyze → Layout → Generate → Complete
const steps = [
  { id: 'upload', name: 'Uploading photos' },
  { id: 'analyze', name: 'Analyzing memories' },
  { id: 'layout', name: 'Creating layouts' },
  { id: 'generate', name: 'Generating book' }
];
```

**AI Analysis (Simplified):**
- Use OpenAI Vision API for photo content analysis
- Generate basic metadata: people, places, events, mood
- Create simple layout suggestions
- Remove complex deduplication and quality scoring

### 3. Canva-Quality Editor (`/editor/:id`)

**Requirements:**
- Keep existing PremiumCanvas component (it's excellent)
- Simplify state management (remove complex undo/redo timeline)
- Focus on core editing: drag photos, add text, change backgrounds
- Auto-save to Supabase
- Real-time collaboration (optional future)

**Core Editor Features:**
```typescript
interface EditorState {
  bookId: string;
  pages: BookPage[];
  currentPage: number;
  selectedElement: string | null;
  zoom: number;
  tool: 'select' | 'text' | 'photo';
}

interface BookPage {
  id: string;
  layout: LayoutTemplate;
  elements: PageElement[];
  background: BackgroundStyle;
}
```

**Essential Tools Only:**
- **Photos**: Drag from sidebar, resize, crop, filters
- **Text**: Add headings, body text (basic fonts/colors)
- **Layouts**: 10-12 preset layouts (not infinite)
- **Backgrounds**: Solid colors, simple gradients
- **Export**: High-res PDF generation

**Remove Complexity:**
- Advanced undo/redo timeline
- Complex layering system
- Stickers library (for now)
- Elements library (for now)
- Advanced text effects

### 4. Checkout Flow (`/checkout/:id`)

**Requirements:**
- Keep existing Shopify integration (it works well)
- Simplify product options (3-4 formats max)
- Clean checkout flow
- Order confirmation

**Simplified Products:**
```typescript
const BOOK_FORMATS = [
  { id: 'small', name: 'Small Square', price: 29.99, size: '20x20cm' },
  { id: 'medium', name: 'Medium Landscape', price: 39.99, size: '30x21cm' },
  { id: 'large', name: 'Large Portrait', price: 49.99, size: '21x30cm' }
];
```

## Database Schema Updates

### New Tables
```sql
-- Upload sessions
CREATE TABLE upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'uploading',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Photos
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES upload_sessions(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processing jobs
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES upload_sessions(id),
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Plan

### Phase 1: Core Infrastructure 
1. **Setup new backend** (Next.js API Routes or Express)
2. **Database migrations** for new tables
3. **Upload API** with Supabase Storage integration
4. **Session management** system

### Phase 2: Upload & Processing 
1. **Simplified upload UI** at `/start`
2. **Real-time processing** with progress updates
3. **AI analysis pipeline** (OpenAI Vision)
4. **Layout generation** (simplified)

### Phase 3: Editor Integration 
1. **Integrate existing PremiumCanvas**
2. **Simplified state management**
3. **Auto-save functionality**
4. **Export to PDF**

### Phase 4: Checkout & Polish 
1. **Integrate existing Shopify checkout**
2. **Order management**
3. **Error handling & edge cases**
4. **Performance optimization**

## Code Quality Requirements

### Architecture Principles
- **Simplicity over features** (10x simpler)
- **Performance first** (fast loading, smooth interactions)
- **Mobile responsive** (works on all devices)
- **Accessible** (WCAG 2.1 AA)
- **TypeScript strict** (no any types)

### Performance Targets
- **Upload**: < 2 seconds for 50 photos
- **Processing**: < 30 seconds for 50 photos
- **Editor**: 60fps interactions
- **Page load**: < 3 seconds

### Error Handling
- **Graceful degradation** (AI fails → manual mode)
- **Retry mechanisms** for uploads
- **Clear error messages** for users
- **Fallback layouts** if AI fails

## Success Metrics

### Technical Metrics
- **Page load time**: < 3 seconds
- **Upload speed**: > 5MB/s
- **Processing time**: < 30 seconds
- **Error rate**: < 1%

### User Experience Metrics
- **Upload completion rate**: > 90%
- **Editor session time**: > 5 minutes
- **Checkout conversion**: > 60%
- **User satisfaction**: > 4.5/5

## Reference Implementation

### Key Files to Reference
- `/src/pages/AICreationFlow.tsx` - Current upload flow (simplify this)
- `/src/pages/PhotobookEditor.tsx` - Current editor (keep this)
- `/src/components/editor/PremiumCanvas.tsx` - Canvas component (use this)
- `/src/lib/shopify.ts` - Shopify integration (use this)
- `/src/integrations/supabase/types.ts` - Database types (update this)

### Design Inspiration
- **Canva**: Simple, powerful editor
- **Apple**: Clean, minimal interfaces
- **Notion**: Fast, responsive interactions
- **Vercel**: Great developer experience

## Next Steps

1. **Review this prompt** and adjust requirements
2. **Setup new project structure** alongside existing code
3. **Implement Phase 1** (core infrastructure)
4. **Test with real users** and iterate
5. **Migrate existing users** gradually

---

## Final Deliverable

A simplified, 10x better backend infrastructure that:
- Handles photo upload and AI analysis seamlessly
- Provides a Canva-quality editing experience
- Integrates with Shopify for payments
- Maintains the premium Laney brand experience
- Is maintainable and scalable for the future

The goal is to have a working MVP in 4 weeks that can handle the core B2C flow while maintaining the premium quality users expect from Laney.
