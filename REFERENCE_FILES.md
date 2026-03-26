# Reference Files from Current Project

## Key Files to Copy/Reference

### Current Project Location: `/Users/yanicklandvreugd/CascadeProjects/memory-canvas/`

### Essential Files for New Backend:

1. **AI Creation Flow** (to simplify)
   - `src/pages/AICreationFlow.tsx` - Current 591-line upload flow
   - `src/lib/aiPhotobookPipeline.ts` - AI processing pipeline

2. **Editor Components** (to reuse)
   - `src/pages/PhotobookEditor.tsx` - Main editor page
   - `src/components/editor/PremiumCanvas.tsx` - Canvas component (excellent)
   - `src/components/editor/CanvasToolbar.tsx` - Toolbar
   - `src/components/editor/BottomPageRibbon.tsx` - Page navigation

3. **Shopify Integration** (to reuse)
   - `src/lib/shopify.ts` - Shopify API integration
   - `src/pages/Checkout.tsx` - Checkout flow
   - `src/stores/cartStore.ts` - Cart state management

4. **Supabase Integration** (to update)
   - `src/integrations/supabase/types.ts` - Database types
   - `src/integrations/supabase/client.ts` - Supabase client

5. **UI Components** (to reuse)
   - `src/components/ui/` - All shadcn/ui components
   - `src/lib/utils.ts` - Utility functions

### How to Use These References:

1. **Copy the files** you want to reuse directly into your Laney2.0 project
2. **Reference the implementations** to understand current logic
3. **Simplify complex flows** (like AICreationFlow.tsx)
4. **Keep excellent components** (like PremiumCanvas.tsx)
5. **Update database schemas** to match new requirements

### Integration Notes:

- **Keep the same Supabase project** - just add new tables
- **Keep the same Shopify store** - reuse existing integration
- **Keep the same design system** - reuse UI components
- **Simplify the complex parts** - focus on core functionality

### Quick Copy Commands:

```bash
# Copy essential editor components
cp -r /Users/yanicklandvreugd/CascadeProjects/memory-canvas/src/components/editor/ /Users/yanicklandvreugd/Laney2.0/src/components/

# Copy Shopify integration
cp /Users/yanicklandvreugd/CascadeProjects/memory-canvas/src/lib/shopify.ts /Users/yanicklandvreugd/Laney2.0/src/lib/

# Copy Supabase types
cp /Users/yanicklandvreugd/CascadeProjects/memory-canvas/src/integrations/supabase/types.ts /Users/yanicklandvreugd/Laney2.0/src/integrations/supabase/

# Copy UI components
cp -r /Users/yanicklandvreugd/CascadeProjects/memory-canvas/src/components/ui/ /Users/yanicklandvreugd/Laney2.0/src/components/
```

This way Windsurf can reference the existing implementations while building the simplified version.
