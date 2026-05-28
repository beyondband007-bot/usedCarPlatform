import type { InjectionKey } from 'vue'

import type { useWorkbenchEntry } from '@/composables/useWorkbenchEntry'

export type WorkbenchEntryContext = ReturnType<typeof useWorkbenchEntry>

export const WORKBENCH_ENTRY_KEY: InjectionKey<WorkbenchEntryContext> = Symbol('workbenchEntry')
