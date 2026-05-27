import { io, Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io-client/build/typed-events'

// Socket.IO 连接配置
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:3001'

// 事件类型定义
export interface ServerToClientEvents {
  // 连接相关
  'connect': () => void
  'disconnect': (reason: string) => void
  'connect_error': (error: Error) => void
  
  // 消息通知
  'notification': (data: NotificationData) => void
  
  // 任务相关
  'task:created': (data: TaskData) => void
  'task:updated': (data: TaskData) => void
  'task:completed': (data: TaskData) => void
  'task:failed': (data: TaskData & { error: string }) => void
  
  // 图片生成相关
  'image:progress': (data: ImageProgressData) => void
  'image:completed': (data: ImageCompletedData) => void
  
  // 批量处理相关
  'batch:progress': (data: BatchProgressData) => void
  'batch:completed': (data: BatchCompletedData) => void
  
  // 积分相关
  'credits:updated': (data: CreditsData) => void
  'credits:low': (data: { remaining: number }) => void
  
  // 系统广播
  'system:message': (data: { type: string; message: string }) => void
  'system:maintenance': (data: { startTime: string; duration: number }) => void
}

export interface ClientToServerEvents {
  // 用户相关
  'user:join': (userId: string) => void
  'user:leave': (userId: string) => void
  
  // 任务相关
  'task:subscribe': (taskId: string) => void
  'task:unsubscribe': (taskId: string) => void
  'task:cancel': (taskId: string) => void
  
  // 批量处理相关
  'batch:subscribe': (batchId: string) => void
  'batch:unsubscribe': (batchId: string) => void
  
  // 心跳
  'ping': () => void
  'pong': () => void
}

// 数据类型定义
interface NotificationData {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: string
  read?: boolean
}

interface TaskData {
  id: string
  type: 'image_generate' | 'image_edit' | 'batch_process' | 'showroom_generate'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

interface ImageProgressData {
  taskId: string
  progress: number
  currentStep: string
  totalSteps: number
  stepName: string
  estimatedTimeRemaining?: number
}

interface ImageCompletedData {
  taskId: string
  images: Array<{
    id: string
    url: string
    thumbnailUrl: string
    metadata: Record<string, any>
  }>
  creditsUsed: number
}

interface BatchProgressData {
  batchId: string
  total: number
  completed: number
  failed: number
  progress: number
  currentItem?: {
    index: number
    status: string
  }
}

interface BatchCompletedData {
  batchId: string
  total: number
  completed: number
  failed: number
  results: Array<{
    index: number
    status: 'success' | 'failed'
    imageUrl?: string
    error?: string
  }>
  creditsUsed: number
}

interface CreditsData {
  total: number
  used: number
  remaining: number
  updatedAt: string
}

// Socket.IO 连接实例
class SocketService {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private listeners: Map<string, Set<Function>> = new Map()
  
  // 连接状态
  public isConnected = false
  public connectionState: 'connected' | 'disconnected' | 'connecting' | 'reconnecting' = 'disconnected'
  
  /**
   * 初始化 Socket 连接
   */
  connect(userId?: string) {
    if (this.socket?.connected) {
      console.log('Socket 已连接')
      return
    }
    
    this.connectionState = 'connecting'
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token: localStorage.getItem('token'),
        userId,
      },
    })
    
    this.setupEventHandlers()
  }
  
  /**
   * 设置事件处理器
   */
  private setupEventHandlers() {
    if (!this.socket) return
    
    // 连接成功
    this.socket.on('connect', () => {
      console.log('Socket 连接成功')
      this.isConnected = true
      this.connectionState = 'connected'
      this.reconnectAttempts = 0
      
      // 重新订阅之前的任务
      this.restoreSubscriptions()
    })
    
    // 断开连接
    this.socket.on('disconnect', (reason) => {
      console.log('Socket 断开:', reason)
      this.isConnected = false
      this.connectionState = 'disconnected'
    })
    
    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('Socket 连接错误:', error)
      this.connectionState = 'reconnecting'
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('达到最大重连次数，停止重连')
        this.connectionState = 'disconnected'
      }
    })
    
    // 监听服务器事件并触发本地回调
    const serverEvents: Array<keyof ServerToClientEvents> = [
      'notification',
      'task:created',
      'task:updated',
      'task:completed',
      'task:failed',
      'image:progress',
      'image:completed',
      'batch:progress',
      'batch:completed',
      'credits:updated',
      'credits:low',
      'system:message',
      'system:maintenance',
    ]
    
    serverEvents.forEach(event => {
      this.socket?.on(event as any, (data: any) => {
        this.triggerListeners(event as string, data)
      })
    })
  }
  
  /**
   * 添加事件监听器
   */
  on<T = any>(event: string, callback: (data: T) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)?.add(callback)
    
    // 返回取消订阅函数
    return () => this.off(event, callback)
  }
  
  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback)
  }
  
  /**
   * 触发监听器
   */
  private triggerListeners(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`事件处理器错误 (${event}):`, error)
      }
    })
  }
  
  /**
   * 重新订阅之前的任务
   */
  private restoreSubscriptions() {
    const subscribedTasks = localStorage.getItem('subscribedTasks')
    if (subscribedTasks) {
      const taskIds = JSON.parse(subscribedTasks)
      taskIds.forEach((taskId: string) => {
        this.subscribeTask(taskId)
      })
    }
  }
  
  /**
   * 订阅任务
   */
  subscribeTask(taskId: string) {
    this.socket?.emit('task:subscribe', taskId)
    
    // 保存订阅状态
    const subscribedTasks = JSON.parse(localStorage.getItem('subscribedTasks') || '[]')
    if (!subscribedTasks.includes(taskId)) {
      subscribedTasks.push(taskId)
      localStorage.setItem('subscribedTasks', JSON.stringify(subscribedTasks))
    }
  }
  
  /**
   * 取消订阅任务
   */
  unsubscribeTask(taskId: string) {
    this.socket?.emit('task:unsubscribe', taskId)
    
    // 移除订阅状态
    const subscribedTasks = JSON.parse(localStorage.getItem('subscribedTasks') || '[]')
    const index = subscribedTasks.indexOf(taskId)
    if (index > -1) {
      subscribedTasks.splice(index, 1)
      localStorage.setItem('subscribedTasks', JSON.stringify(subscribedTasks))
    }
  }
  
  /**
   * 取消任务
   */
  cancelTask(taskId: string) {
    this.socket?.emit('task:cancel', taskId)
  }
  
  /**
   * 订阅批量任务
   */
  subscribeBatch(batchId: string) {
    this.socket?.emit('batch:subscribe', batchId)
  }
  
  /**
   * 取消订阅批量任务
   */
  unsubscribeBatch(batchId: string) {
    this.socket?.emit('batch:unsubscribe', batchId)
  }
  
  /**
   * 加入房间（用户ID）
   */
  joinUserRoom(userId: string) {
    this.socket?.emit('user:join', userId)
  }
  
  /**
   * 离开房间
   */
  leaveUserRoom(userId: string) {
    this.socket?.emit('user:leave', userId)
  }
  
  /**
   * 发送心跳
   */
  ping() {
    this.socket?.emit('ping')
  }
  
  /**
   * 断开连接
   */
  disconnect() {
    this.socket?.disconnect()
    this.socket = null
    this.isConnected = false
    this.connectionState = 'disconnected'
  }
  
  /**
   * 获取 Socket 实例（用于高级操作）
   */
  getSocket() {
    return this.socket
  }
}

// 导出单例
export const socketService = new SocketService()

// 导出类型
export type SocketServiceType = SocketService