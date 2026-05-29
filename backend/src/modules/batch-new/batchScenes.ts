export interface BatchScene {
  optionId: string;
  title: string;
  referenceImageUrl: string;
}

export const batchScenes: BatchScene[] = [
  {
    optionId: "white-studio",
    title: "经典白棚",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=90",
  },
  {
    optionId: "glass-hall",
    title: "玻璃展厅",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=90",
  },
  {
    optionId: "luxury-dark",
    title: "暗调豪华",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=90",
  },
  {
    optionId: "soft-top-light",
    title: "柔光顶灯",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=90",
  },
  {
    optionId: "city-night",
    title: "城市夜景",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1485291571154-772bc14410bb?auto=format&fit=crop&w=1600&q=90",
  },
  {
    optionId: "tree-park",
    title: "林荫户外",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=90",
  },
];

export const resolveBatchScene = (optionId?: string | null, sceneIndex?: number | null) =>
  batchScenes.find((scene) => scene.optionId === optionId) ??
  (typeof sceneIndex === "number" ? batchScenes[sceneIndex] : undefined) ??
  batchScenes[0];
