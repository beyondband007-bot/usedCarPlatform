import batchTutorialGenerateResult from '@/assets/img/batch-new-tutorial/generate-result.png'
import batchTutorialOneClickOptimize from '@/assets/img/batch-new-tutorial/one-click-optimize.png'
import batchTutorialUploadCar from '@/assets/img/batch-new-tutorial/upload-car.png'
import { mediaUrls } from '@/constants/media-urls'

const {
  tutorialStepUpload: tutorialUploadCarImage,
  tutorialStepTemplate01: tutorialShowroomTemplate1,
  tutorialStepTemplate02: tutorialShowroomTemplate2,
  tutorialStepTemplate03: tutorialShowroomTemplate3,
  tutorialStepResult: tutorialResultImage,
  tutorialLogoSample: tutorialLogoImage,
} = mediaUrls.workspace.showroom

export type WorkspaceTutorialVariant = 'showroom' | 'batch-new'

export type WorkspaceTutorialStepLayout = 'cover' | 'mosaic' | 'logo'

export interface WorkspaceTutorialStepConfig {
  title: string
  icon: string
  image: string
  layout: WorkspaceTutorialStepLayout
}

const showroomTemplatePreviewImages = [
  tutorialShowroomTemplate1,
  tutorialShowroomTemplate2,
  tutorialShowroomTemplate3,
  tutorialUploadCarImage,
] as const

export const workspaceTutorialConfigs: Record<
  WorkspaceTutorialVariant,
  {
    steps: WorkspaceTutorialStepConfig[]
    templatePreviewImages?: readonly string[]
  }
> = {
  showroom: {
    steps: [
      {
        title: '上传车图',
        icon: 'mdi:cloud-upload-outline',
        image: tutorialUploadCarImage,
        layout: 'cover',
      },
      {
        title: '选择展厅模板',
        icon: 'mdi:view-gallery-outline',
        image: '',
        layout: 'mosaic',
      },
      {
        title: '选择 Logo',
        icon: 'mdi:badge-account-horizontal-outline',
        image: tutorialLogoImage,
        layout: 'logo',
      },
      {
        title: '生成效果',
        icon: 'mdi:car-select',
        image: tutorialResultImage,
        layout: 'cover',
      },
    ],
    templatePreviewImages: showroomTemplatePreviewImages,
  },
  'batch-new': {
    steps: [
      {
        title: '上传车图',
        icon: 'mdi:cloud-upload-outline',
        image: batchTutorialUploadCar,
        layout: 'cover',
      },
      {
        title: '选择展厅模板',
        icon: 'mdi:view-gallery-outline',
        image: '',
        layout: 'mosaic',
      },
      {
        title: '一键优化',
        icon: 'mdi:auto-fix',
        image: batchTutorialOneClickOptimize,
        layout: 'cover',
      },
      {
        title: '生成效果',
        icon: 'mdi:car-select',
        image: batchTutorialGenerateResult,
        layout: 'cover',
      },
    ],
    templatePreviewImages: showroomTemplatePreviewImages,
  },
}
