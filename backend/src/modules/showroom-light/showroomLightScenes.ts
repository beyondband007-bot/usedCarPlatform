export interface ShowroomLightScene {
  optionId: string;
  title: string;
  referenceImageUrl: string;
}

export const showroomLightScenes: ShowroomLightScene[] = [
  {
    optionId: "white-studio",
    title: "经典白棚",
    referenceImageUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=90",
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
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=90",
  },
];

export const getShowroomLightScene = (optionId?: string | null) =>
  showroomLightScenes.find((scene) => scene.optionId === optionId) ?? showroomLightScenes[0];
