import UniWebSocket from './uni-websocket'
import type { WsOptions, WsState } from './uni-websocket'

/** 管理器摘要信息 */
interface ManagerSummary {
  total: number
  connected: number
  reconnecting: number
  idle: number
}

/** 扩展的连接配置（增加 idleTimeout） */
interface WsManagerOptions extends WsOptions {
  /** 该连接的闲置超时时间(ms)，不传则使用默认值 */
  idleTimeout?: number
}

/**
 * WebSocket 多连接统一管理器（单例）
 * 职责：
 * 1. 按 name 注册/获取/销毁连接实例
 * 2. 定时扫描闲置连接并自动清理
 * 3. 提供全局状态查询
 */
class WsManager {
  /** 连接池：name -> UniWebSocket 实例 */
  private connections: Map<string, UniWebSocket> = new Map()

  /** 闲置清理定时器 */
  private _cleanupTimer: ReturnType<typeof setInterval> | null = null

  /** 默认闲置超时时间：5分钟无活动自动清理 */
  private _defaultIdleTimeout: number = 5 * 60 * 1000

  /** 清理扫描间隔：每60秒扫描一次 */
  private _cleanupInterval: number = 60 * 1000

  /**
   * 创建并注册一个 WebSocket 连接
   * @param name - 连接名称（唯一标识）
   * @param options - UniWebSocket 配置项
   * @returns 连接实例
   */
  create(name: string, options: WsManagerOptions): UniWebSocket {
    if (this.connections.has(name)) {
      console.warn(`[WsManager] 连接 "${name}" 已存在，先销毁旧连接`)
      this.remove(name)
    }

    const ws = new UniWebSocket(options)
    // 挂载闲置超时配置到实例上（供扫描时使用）
    ;(ws as any)._idleTimeout = options.idleTimeout ?? this._defaultIdleTimeout
    ;(ws as any)._name = name

    this.connections.set(name, ws)
    console.log(`[WsManager] 已注册连接 "${name}"，当前共 ${this.connections.size} 个`)

    // 启动闲置清理扫描（首次注册时启动）
    this._startCleanupScan()

    return ws
  }

  /**
   * 获取指定名称的连接实例
   */
  get(name: string): UniWebSocket | undefined {
    return this.connections.get(name)
  }

  /**
   * 判断指定连接是否存在
   */
  has(name: string): boolean {
    return this.connections.has(name)
  }

  /**
   * 向指定连接发送消息
   */
  send(name: string, data: string | Record<string, unknown>): void {
    const ws = this.connections.get(name)
    if (ws) {
      ws.send(data)
    } else {
      console.warn(`[WsManager] 连接 "${name}" 不存在，无法发送消息`)
    }
  }

  /**
   * 销毁指定连接并从管理器中移除
   */
  remove(name: string): void {
    const ws = this.connections.get(name)
    if (ws) {
      ws.destroy()
      this.connections.delete(name)
      console.log(`[WsManager] 已移除连接 "${name}"，剩余 ${this.connections.size} 个`)
    }

    // 所有连接都已清理，停止扫描
    if (this.connections.size === 0) {
      this._stopCleanupScan()
    }
  }

  /**
   * 销毁所有连接
   */
  removeAll(): void {
    for (const [name, ws] of this.connections) {
      console.log(`[WsManager] 销毁连接 "${name}"`)
      ws.destroy()
    }
    this.connections.clear()
    this._stopCleanupScan()
    console.log('[WsManager] 所有连接已清理')
  }

  /**
   * 获取所有连接的状态快照
   */
  getAllState(): Record<string, WsState> {
    const states: Record<string, WsState> = {}
    for (const [name, ws] of this.connections) {
      states[name] = ws.getState()
    }
    return states
  }

  /**
   * 获取指定连接的状态
   */
  getState(name: string): WsState | null {
    const ws = this.connections.get(name)
    return ws ? ws.getState() : null
  }

  /**
   * 获取管理器摘要信息
   */
  getSummary(): ManagerSummary {
    let connected = 0
    let reconnecting = 0
    let idle = 0

    for (const [, ws] of this.connections) {
      const state = ws.getState()
      if (state.isConnected) connected++
      if (state.isReconnecting) reconnecting++
      if (state.idleDuration > ((ws as any)._idleTimeout || this._defaultIdleTimeout)) idle++
    }

    return {
      total: this.connections.size,
      connected,
      reconnecting,
      idle,
    }
  }

  // ==================== 闲置清理 ====================

  /**
   * 启动闲置连接扫描定时器
   */
  private _startCleanupScan(): void {
    if (this._cleanupTimer) return

    this._cleanupTimer = setInterval(() => {
      this._scanAndCleanIdle()
    }, this._cleanupInterval)

    console.log('[WsManager] 闲置清理扫描已启动')
  }

  /**
   * 停止闲置连接扫描定时器
   */
  private _stopCleanupScan(): void {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer)
      this._cleanupTimer = null
      console.log('[WsManager] 闲置清理扫描已停止')
    }
  }

  /**
   * 扫描所有连接，清理超时的闲置连接
   */
  // ...（前面代码不变，从 _scanAndCleanIdle 方法继续）

  /**
   * 扫描所有连接，清理超时的闲置连接
   */
  private _scanAndCleanIdle(): void {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [name, ws] of this.connections) {
      const idleTimeout = (ws as any)._idleTimeout || this._defaultIdleTimeout
      const idleDuration = now - ws.lastActiveTime

      if (idleDuration > idleTimeout) {
        console.log(`[WsManager] 连接 "${name}" 闲置 ${Math.round(idleDuration / 1000)}s，超过阈值 ${Math.round(idleTimeout / 1000)}s，自动清理`)
        toRemove.push(name)
      }
    }

    for (const name of toRemove) {
      this.remove(name)
    }
  }
}

/** 导出单例管理器 */
const wsManager = new WsManager()
export default wsManager
