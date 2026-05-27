// lodash-es 常用工具函数导出
export {
  // 数组相关
  chunk,
  compact,
  concat,
  difference,
  drop,
  dropRight,
  fill,
  flatten,
  flattenDeep,
  intersection,
  pull,
  pullAll,
  reverse,
  slice,
  sortedIndex,
  sortedUniq,
  take,
  takeRight,
  union,
  uniq,
  without,
  xor,
  zip,
} from 'lodash-es'

export {
  // 对象相关
  assign,
  clone,
  cloneDeep,
  defaults,
  defaultsDeep,
  extend,
  findKey,
  forIn,
  get,
  has,
  invert,
  keys,
  mapKeys,
  mapValues,
  merge,
  omit,
  pick,
  result,
  set,
  toPairs,
  transform,
  values,
} from 'lodash-es'

export {
  // 函数相关
  bind,
  curry,
  debounce,
  defer,
  delay,
  flip,
  memoize,
  negate,
  once,
  partial,
  rest,
  spread,
  throttle,
  unary,
  wrap,
} from 'lodash-es'

export {
  // 字符串相关
  camelCase,
  capitalize,
  deburr,
  endsWith,
  escape,
  escapeRegExp,
  kebabCase,
  lowerCase,
  lowerFirst,
  pad,
  padEnd,
  padStart,
  parseInt,
  repeat,
  replace,
  snakeCase,
  split,
  startCase,
  startsWith,
  template,
  toLower,
  toUpper,
  trim,
  trimEnd,
  trimStart,
  truncate,
  unescape,
  upperCase,
  upperFirst,
  words,
} from 'lodash-es'

export {
  // 数学相关
  add,
  ceil,
  divide,
  floor,
  max,
  maxBy,
  mean,
  meanBy,
  min,
  minBy,
  multiply,
  random,
  round,
  subtract,
  sum,
  sumBy,
} from 'lodash-es'

export {
  // 集合相关
  countBy,
  each,
  every,
  filter,
  find,
  findLast,
  flatMap,
  forEach,
  forEachRight,
  groupBy,
  includes,
  invokeMap,
  keyBy,
  map,
  orderBy,
  partition,
  reduce,
  reject,
  sample,
  sampleSize,
  shuffle,
  size,
  some,
  sortBy,
} from 'lodash-es'

export {
  // 类型检查
  isArguments,
  isArray,
  isArrayBuffer,
  isArrayLike,
  isArrayLikeObject,
  isBoolean,
  isBuffer,
  isDate,
  isElement,
  isEmpty,
  isEqual,
  isError,
  isFinite,
  isFunction,
  isInteger,
  isLength,
  isMap,
  isMatch,
  isNaN,
  isNative,
  isNil,
  isNull,
  isNumber,
  isObject,
  isObjectLike,
  isPlainObject,
  isRegExp,
  isSafeInteger,
  isSet,
  isString,
  isSymbol,
  isTypedArray,
  isUndefined,
  isWeakMap,
  isWeakSet,
} from 'lodash-es'

export {
  // 其他实用函数
  castArray,
  conformsTo,
  constant,
  defaultTo,
  eq,
  flow,
  flowRight,
  gt,
  gte,
  identity,
  iteratee,
  lt,
  lte,
  matches,
  matchesProperty,
  method,
  methodOf,
  mixin,
  noop,
  nthArg,
  over,
  overEvery,
  overSome,
  property,
  propertyOf,
  range,
  rangeRight,
  stubArray,
  stubFalse,
  stubObject,
  stubString,
  stubTrue,
  times,
  toPath,
  uniqueId,
} from 'lodash-es'

// 常用组合工具函数
import { debounce, throttle, cloneDeep, isEmpty, get, pick, omit } from 'lodash-es'

/**
 * 安全的 JSON 解析
 */
export const safeJsonParse = <T = any>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str) as T
  } catch {
    return defaultValue
  }
}

/**
 * 创建防抖函数（默认 300ms）
 */
export const createDebounce = <T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
) => {
  return debounce(fn, wait)
}

/**
 * 创建节流函数（默认 300ms）
 */
export const createThrottle = <T extends (...args: any[]) => any>(
  fn: T,
  wait = 300
) => {
  return throttle(fn, wait)
}

/**
 * 深度克隆
 */
export const deepClone = <T>(obj: T): T => {
  return cloneDeep(obj)
}

/**
 * 检查值是否为空（null, undefined, '', [], {}）
 */
export const isNilOrEmpty = (value: any): boolean => {
  return value == null || isEmpty(value)
}

/**
 * 安全获取对象属性
 */
export const safeGet = <T = any>(obj: any, path: string, defaultValue?: T): T => {
  return get(obj, path, defaultValue) as T
}

/**
 * 从对象中提取指定字段
 */
export const extractFields = <T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> => {
  return pick(obj, fields)
}

/**
 * 从对象中排除指定字段
 */
export const excludeFields = <T extends object, K extends keyof T>(
  obj: T,
  fields: K[]
): Omit<T, K> => {
  return omit(obj, fields)
}

/**
 * 生成随机 ID
 */
export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 数组去重（根据指定字段）
 */
export const uniqueBy = <T>(arr: T[], key: keyof T): T[] => {
  const seen = new Set()
  return arr.filter((item) => {
    const val = item[key]
    if (seen.has(val)) return false
    seen.add(val)
    return true
  })
}

/**
 * 延迟执行
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 重试函数
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000
): Promise<T> => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxAttempts - 1) throw err
      await sleep(delay)
    }
  }
  throw new Error('Max retry attempts reached')
}

export default {
  debounce,
  throttle,
  cloneDeep,
  isEmpty,
  get,
  pick,
  omit,
}