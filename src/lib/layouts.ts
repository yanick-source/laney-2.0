export type SlotDefinition = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: string;
};

export type LayoutDefinition = {
  id: string;
  name: string;
  thumbnail: string;
  slots: SlotDefinition[];
};

export const SNAP_LAYOUTS: LayoutDefinition[] = [
  // 1 slot layouts
  {
    id: "layout-1",
    name: "Single Full Page",
    thumbnail: "/layouts/single.svg",
    slots: [
      {
        id: "slot-1",
        x: 5,
        y: 2.5,
        width: 90,
        height: 95,
        aspectRatio: "4:3",
      },
    ],
  },
  // 2 slot layouts
  {
    id: "layout-2h",
    name: "Two Column",
    thumbnail: "/layouts/2h.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 2.5,
        width: 47.5,
        height: 95,
        aspectRatio: "3:4",
      },
      {
        id: "slot-2",
        x: 50,
        y: 2.5,
        width: 47.5,
        height: 95,
        aspectRatio: "3:4",
      },
    ],
  },
  {
    id: "layout-2v",
    name: "Two Row",
    thumbnail: "/layouts/2v.svg",
    slots: [
      {
        id: "slot-1",
        x: 5,
        y: 2.5,
        width: 90,
        height: 47.5,
        aspectRatio: "16:9",
      },
      {
        id: "slot-2",
        x: 5,
        y: 50,
        width: 90,
        height: 47.5,
        aspectRatio: "16:9",
      },
    ],
  },
  // 3 slot layouts
  {
    id: "layout-3-left",
    name: "Focus Left",
    thumbnail: "/layouts/3-left.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 2.5,
        width: 62.5,
        height: 95,
        aspectRatio: "3:4",
      },
      {
        id: "slot-2",
        x: 65,
        y: 2.5,
        width: 32.5,
        height: 47.5,
        aspectRatio: "4:3",
      },
      {
        id: "slot-3",
        x: 65,
        y: 50,
        width: 32.5,
        height: 47.5,
        aspectRatio: "4:3",
      },
    ],
  },
  {
    id: "layout-3-right",
    name: "Focus Right",
    thumbnail: "/layouts/3-right.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 2.5,
        width: 32.5,
        height: 47.5,
        aspectRatio: "4:3",
      },
      {
        id: "slot-2",
        x: 35,
        y: 2.5,
        width: 32.5,
        height: 47.5,
        aspectRatio: "4:3",
      },
      {
        id: "slot-3",
        x: 35,
        y: 2.5,
        width: 62.5,
        height: 95,
        aspectRatio: "3:4",
      },
    ],
  },
  // 4 slot layouts
  {
    id: "layout-4-grid",
    name: "2×2 Grid",
    thumbnail: "/layouts/4-grid.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 2.5,
        width: 47.5,
        height: 47.5,
        aspectRatio: "1:1",
      },
      {
        id: "slot-2",
        x: 50,
        y: 2.5,
        width: 47.5,
        height: 47.5,
        aspectRatio: "1:1",
      },
      {
        id: "slot-3",
        x: 2.5,
        y: 50,
        width: 47.5,
        height: 47.5,
        aspectRatio: "1:1",
      },
      {
        id: "slot-4",
        x: 50,
        y: 50,
        width: 47.5,
        height: 47.5,
        aspectRatio: "1:1",
      },
    ],
  },
  // 5 slot layouts
  {
    id: "layout-5-collage",
    name: "Collage Mix",
    thumbnail: "/layouts/5-collage.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 2.5,
        width: 47.5,
        height: 62.5,
        aspectRatio: "3:4",
      },
      {
        id: "slot-2",
        x: 50,
        y: 2.5,
        width: 47.5,
        height: 30,
        aspectRatio: "16:9",
      },
      {
        id: "slot-3",
        x: 50,
        y: 32.5,
        width: 47.5,
        height: 32.5,
        aspectRatio: "4:3",
      },
      {
        id: "slot-4",
        x: 2.5,
        y: 65,
        width: 47.5,
        height: 32.5,
        aspectRatio: "4:3",
      },
      {
        id: "slot-5",
        x: 50,
        y: 65,
        width: 47.5,
        height: 32.5,
        aspectRatio: "4:3",
      },
    ],
  },
  {
    id: "layout-5-hero",
    name: "Hero Top",
    thumbnail: "/layouts/5-hero.svg",
    slots: [
      {
        id: "slot-1",
        x: 5,
        y: 2.5,
        width: 90,
        height: 47.5,
        aspectRatio: "16:9",
      },
      {
        id: "slot-2",
        x: 2.5,
        y: 50,
        width: 23.75,
        height: 47.5,
        aspectRatio: "1:1",
      },
      {
        id: "slot-3",
        x: 26.25,
        y: 50,
        width: 23.75,
        height: 47.5,
        aspectRatio: "1:1",
      },
      {
        id: "slot-4",
        x: 50,
        y: 50,
        width: 23.75,
        height: 47.5,
        aspectRatio: "1:1",
      },
      {
        id: "slot-5",
        x: 73.75,
        y: 50,
        width: 23.75,
        height: 47.5,
        aspectRatio: "1:1",
      },
    ],
  },
];

export function getLayoutById(id: string): LayoutDefinition | undefined {
  return SNAP_LAYOUTS.find((layout) => layout.id === id);
}

export function getSlotById(layoutId: string, slotId: string): SlotDefinition | undefined {
  const layout = getLayoutById(layoutId);
  return layout?.slots.find((slot) => slot.id === slotId);
}
