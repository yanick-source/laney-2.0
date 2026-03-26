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
  {
    id: "layout-1",
    name: "Single Full Page",
    thumbnail: "/layouts/single.svg",
    slots: [
      {
        id: "slot-1",
        x: 5,
        y: 5,
        width: 90,
        height: 90,
        aspectRatio: "4:3",
      },
    ],
  },
  {
    id: "layout-2h",
    name: "Two Column Grid",
    thumbnail: "/layouts/2h.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 5,
        width: 45,
        height: 90,
        aspectRatio: "3:4",
      },
      {
        id: "slot-2",
        x: 52.5,
        y: 5,
        width: 45,
        height: 90,
        aspectRatio: "3:4",
      },
    ],
  },
  {
    id: "layout-2v",
    name: "Two Row Stack",
    thumbnail: "/layouts/2v.svg",
    slots: [
      {
        id: "slot-1",
        x: 5,
        y: 2.5,
        width: 90,
        height: 45,
        aspectRatio: "16:9",
      },
      {
        id: "slot-2",
        x: 5,
        y: 52.5,
        width: 90,
        height: 45,
        aspectRatio: "16:9",
      },
    ],
  },
  {
    id: "layout-3",
    name: "Focus Left",
    thumbnail: "/layouts/3.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 5,
        width: 60,
        height: 90,
        aspectRatio: "3:4",
      },
      {
        id: "slot-2",
        x: 67.5,
        y: 5,
        width: 30,
        height: 42.5,
        aspectRatio: "4:3",
      },
      {
        id: "slot-3",
        x: 67.5,
        y: 52.5,
        width: 30,
        height: 42.5,
        aspectRatio: "4:3",
      },
    ],
  },
  {
    id: "layout-4",
    name: "2×2 Grid",
    thumbnail: "/layouts/4.svg",
    slots: [
      {
        id: "slot-1",
        x: 2.5,
        y: 2.5,
        width: 45,
        height: 45,
        aspectRatio: "1:1",
      },
      {
        id: "slot-2",
        x: 52.5,
        y: 2.5,
        width: 45,
        height: 45,
        aspectRatio: "1:1",
      },
      {
        id: "slot-3",
        x: 2.5,
        y: 52.5,
        width: 45,
        height: 45,
        aspectRatio: "1:1",
      },
      {
        id: "slot-4",
        x: 52.5,
        y: 52.5,
        width: 45,
        height: 45,
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
