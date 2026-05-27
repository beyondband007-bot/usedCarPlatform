<template>
  <div class="p-6">
    <h2 class="text-xl font-bold mb-4">Lodash 工具函数演示</h2>
    
    <!-- debounce 防抖 -->
    <n-card title="debounce - 防抖" class="mb-4">
      <n-space vertical>
        <n-input 
          v-model:value="searchInput" 
          placeholder="输入搜索内容（防抖 500ms）"
          @input="debouncedSearch"
        />
        <div class="flex gap-4">
          <div class="flex-1 p-3 bg-gray-50 rounded">
            <div class="text-gray-500 text-sm">原始输入次数</div>
            <div class="text-2xl font-bold">{{ rawInputCount }}</div>
          </div>
          <div class="flex-1 p-3 bg-blue-50 rounded">
            <div class="text-blue-500 text-sm">实际搜索次数</div>
            <div class="text-2xl font-bold text-blue-600">{{ searchCount }}</div>
          </div>
        </div>
        <p class="text-gray-500">搜索结果: {{ searchResult || '等待输入...' }}</p>
      </n-space>
    </n-card>

    <!-- throttle 节流 -->
    <n-card title="throttle - 节流" class="mb-4">
      <n-space vertical>
        <div class="flex gap-4">
          <n-button @click="handleThrottledClick">
            点击按钮（节流 1000ms）
          </n-button>
          <n-tag type="info">点击次数: {{ throttleClickCount }}</n-tag>
          <n-tag type="success">实际执行: {{ throttleExecCount }}</n-tag>
        </div>
        <p class="text-gray-500">快速点击按钮，实际执行会被节流限制</p>
      </n-space>
    </n-card>

    <!-- cloneDeep 深克隆 -->
    <n-card title="cloneDeep - 深克隆" class="mb-4">
      <n-space vertical>
        <div class="flex gap-4">
          <n-button @click="testClone">
            测试深克隆
          </n-button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-gray-50 rounded">
            <div class="text-gray-500 text-sm mb-2">原始对象</div>
            <pre class="text-xs">{{ JSON.stringify(originalObj, null, 2) }}</pre>
          </div>
          <div class="p-3 bg-blue-50 rounded">
            <div class="text-blue-500 text-sm mb-2">克隆对象</div>
            <pre class="text-xs">{{ JSON.stringify(clonedObj, null, 2) }}</pre>
          </div>
        </div>
        <n-tag :type="isClonedEqual ? 'error' : 'success'">
          {{ isClonedEqual ? '浅克隆：修改会影响原对象' : '深克隆：修改不影响原对象' }}
        </n-tag>
      </n-space>
    </n-card>

    <!-- chunk / groupBy -->
    <n-card title="chunk / groupBy - 数组处理" class="mb-4">
      <n-tabs type="line">
        <n-tab-pane name="chunk" tab="chunk 分组">
          <n-space vertical>
            <n-slider v-model:value="chunkSize" :min="2" :max="10" />
            <p class="text-gray-500">每组 {{ chunkSize }} 个元素</p>
            <div class="space-y-2">
              <div 
                v-for="(group, index) in chunkedArray" 
                :key="index"
                class="flex gap-2"
              >
                <span class="text-gray-500">组 {{ index + 1 }}:</span>
                <n-tag v-for="item in group" :key="item" type="info">{{ item }}</n-tag>
              </div>
            </div>
          </n-space>
        </n-tab-pane>
        
        <n-tab-pane name="groupBy" tab="groupBy 分类">
          <div class="space-y-2">
            <div v-for="(items, key) in groupedUsers" :key="key">
              <div class="text-gray-500 mb-1">{{ key === 'true' ? '活跃用户' : '非活跃用户' }}</div>
              <div class="flex gap-2 flex-wrap">
                <n-tag v-for="user in items" :key="user.id" :type="user.active ? 'success' : 'default'">
                  {{ user.name }}
                </n-tag>
              </div>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- orderBy / uniqBy -->
    <n-card title="orderBy / uniqBy - 排序去重" class="mb-4">
      <n-space vertical>
        <div class="flex gap-4 mb-4">
          <n-button @click="sortOrder = 'asc'">升序</n-button>
          <n-button @click="sortOrder = 'desc'">降序</n-button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 bg-gray-50 rounded">
            <div class="text-gray-500 text-sm mb-2">原始数据</div>
            <div class="space-y-1">
              <div v-for="item in rawNumbers" :key="item" class="text-sm">
                {{ item }}
              </div>
            </div>
          </div>
          <div class="p-3 bg-green-50 rounded">
            <div class="text-green-500 text-sm mb-2">排序并去重</div>
            <div class="space-y-1">
              <div v-for="item in sortedUniqueNumbers" :key="item" class="text-sm">
                {{ item }}
              </div>
            </div>
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- get / pick / omit -->
    <n-card title="get / pick / omit - 对象操作" class="mb-4">
      <n-tabs type="line">
        <n-tab-pane name="get" tab="get 安全取值">
          <n-space vertical>
            <n-input v-model:value="getPath" placeholder="输入路径，如: a.b.c" />
            <div class="p-3 bg-gray-50 rounded">
              <div class="text-gray-500 text-sm mb-2">结果</div>
              <pre class="text-sm">{{ safeGetResult }}</pre>
            </div>
          </n-space>
        </n-tab-pane>
        
        <n-tab-pane name="pick" tab="pick 提取字段">
          <n-space vertical>
            <n-select 
              v-model:value="pickFields" 
              multiple 
              :options="fieldOptions"
              placeholder="选择要提取的字段"
            />
            <div class="p-3 bg-blue-50 rounded">
              <pre class="text-sm">{{ JSON.stringify(pickedObj, null, 2) }}</pre>
            </div>
          </n-space>
        </n-tab-pane>
        
        <n-tab-pane name="omit" tab="omit 排除字段">
          <n-space vertical>
            <n-select 
              v-model:value="omitFields" 
              multiple 
              :options="fieldOptions"
              placeholder="选择要排除的字段"
            />
            <div class="p-3 bg-orange-50 rounded">
              <pre class="text-sm">{{ JSON.stringify(omittedObj, null, 2) }}</pre>
            </div>
          </n-space>
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <!-- 实用工具 -->
    <n-card title="实用工具函数">
      <n-space vertical>
        <n-list>
          <n-list-item>
            <template #prefix>
              <Icon icon="mdi:identifier" class="text-blue-500" />
            </template>
            <n-thing title="generateId" description="生成唯一 ID">
              <template #description-extra>
                <n-tag>{{ generatedId }}</n-tag>
                <n-button text size="small" @click="generatedId = generateId()">
                  重新生成
                </n-button>
              </template>
            </n-thing>
          </n-list-item>
          
          <n-list-item>
            <template #prefix>
              <Icon icon="mdi:code-json" class="text-green-500" />
            </template>
            <n-thing title="safeJsonParse" description="安全的 JSON 解析">
              <template #description-extra>
                <n-input v-model:value="jsonInput" placeholder="输入 JSON 字符串" />
                <div class="mt-2">
                  <n-tag :type="jsonParseResult.success ? 'success' : 'error'">
                    {{ jsonParseResult.result }}
                  </n-tag>
                </div>
              </template>
            </n-thing>
          </n-list-item>
          
          <n-list-item>
            <template #prefix>
              <Icon icon="mdi:timer-sand" class="text-orange-500" />
            </template>
            <n-thing title="sleep" description="延迟执行">
              <template #description-extra>
                <n-button :loading="isSleeping" @click="testSleep">
                  {{ isSleeping ? '等待中...' : '延迟 2 秒执行' }}
                </n-button>
              </template>
            </n-thing>
          </n-list-item>
        </n-list>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import {
  debounce,
  throttle,
  chunk,
  groupBy,
  orderBy,
  uniq,
  cloneDeep,
  isEqual,
  get,
  pick,
  omit,
} from '@/utils/lodash'

// debounce 防抖
const searchInput = ref('')
const rawInputCount = ref(0)
const searchCount = ref(0)
const searchResult = ref('')

const debouncedSearch = debounce(() => {
  searchCount.value++
  searchResult.value = `搜索 "${searchInput.value}" 的结果`
}, 500)

watch(searchInput, () => {
  rawInputCount.value++
  debouncedSearch()
})

// throttle 节流
const throttleClickCount = ref(0)
const throttleExecCount = ref(0)

const throttledClick = throttle(() => {
  throttleExecCount.value++
}, 1000)

const handleThrottledClick = () => {
  throttleClickCount.value++
  throttledClick()
}

// cloneDeep 深克隆
const originalObj = ref({
  name: '张三',
  age: 25,
  address: {
    city: '北京',
    district: '朝阳区'
  },
  hobbies: ['读书', '游泳', '编程']
})

const clonedObj = ref({})
const isClonedEqual = ref(false)

const testClone = () => {
  // 浅克隆
  // clonedObj.value = { ...originalObj.value }
  
  // 深克隆
  clonedObj.value = cloneDeep(originalObj.value)
  
  // 修改克隆对象
  clonedObj.value.address.city = '上海'
  
  // 检查是否影响原对象
  isClonedEqual.value = isEqual(originalObj.value.address.city, '上海')
}

// chunk 分组
const chunkSize = ref(3)
const rawArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const chunkedArray = computed(() => chunk(rawArray, chunkSize.value))

// groupBy 分组
const users = [
  { id: 1, name: '张三', active: true },
  { id: 2, name: '李四', active: false },
  { id: 3, name: '王五', active: true },
  { id: 4, name: '赵六', active: true },
  { id: 5, name: '孙七', active: false },
]
const groupedUsers = computed(() => groupBy(users, 'active'))

// orderBy / uniq
const rawNumbers = [5, 2, 8, 2, 9, 5, 1, 3, 8]
const sortOrder = ref<'asc' | 'desc'>('asc')
const sortedUniqueNumbers = computed(() => {
  const sorted = orderBy(uniq(rawNumbers), [], [sortOrder.value])
  return sorted
})

// get / pick / omit
const testObj = {
  id: 1,
  name: '张三',
  email: 'zhangsan@example.com',
  phone: '13800138000',
  address: {
    city: '北京',
    district: '朝阳区'
  },
  createdAt: '2024-01-01',
  updatedAt: '2024-01-15'
}

const getPath = ref('address.city')
const safeGetResult = computed(() => {
  return get(testObj, getPath.value, '未找到')
})

const fieldOptions = [
  { label: 'ID', value: 'id' },
  { label: '姓名', value: 'name' },
  { label: '邮箱', value: 'email' },
  { label: '电话', value: 'phone' },
  { label: '地址', value: 'address' },
]

const pickFields = ref(['id', 'name', 'email'])
const pickedObj = computed(() => pick(testObj, pickFields.value))

const omitFields = ref(['phone', 'createdAt', 'updatedAt'])
const omittedObj = computed(() => omit(testObj, omitFields.value))

// 实用工具
const generateId = () => {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
const generatedId = ref(generateId())

const jsonInput = ref('{"name":"张三","age":25}')
const jsonParseResult = computed(() => {
  try {
    const result = JSON.parse(jsonInput.value)
    return { success: true, result: JSON.stringify(result, null, 2) }
  } catch {
    return { success: false, result: '解析失败，返回默认值: {}' }
  }
})

const isSleeping = ref(false)
const testSleep = async () => {
  isSleeping.value = true
  await new Promise(resolve => setTimeout(resolve, 2000))
  isSleeping.value = false
}
</script>