import UniWebSocket from './uni-websocket';

/**
 * WebSocket 多连接统一管理器（单例）
 * 职责：
 * 1. 按 name 注册/获取/销毁连接实例
 * 2. 定时扫描闲置连接并自动清理
 * 3. 提供全局状态查询
 */
class WsManager {
  constructor() {
    /** @type {Map<string, UniWebSocket>} */
    this.connections = new Map();

    /** 闲置清理定时器 */
    this._cleanupTimer = null;

    /** 默认闲置超时时间：5分钟无活动自动清理 */
    this._defaultIdleTimeout = 5 * 60 * 1000;

    /** 清理扫描间隔：每60秒扫描一次 */
    this._cleanupInterval = 60 * 1000;
  }

  /**
   * 创建并注册一个 WebSocket 连接
   * @param {string} name - 连接名称（唯一标识）
   * @param {Object} options - UniWebSocket 配置项（同 UniWebSocket constructor）
   * @param {number} [options.idleTimeout] - 该连接的闲置超时时间(ms)，不传则使用默认值
   * @returns {UniWebSocket} 连接实例
   */
  create(name, options) {
    if (this.connections.has(name)) {
      console.warn(`[WsManager] 连接 "${name}" 已存在，先销毁旧连接`);
      this.remove(name);
    }

    const ws = new UniWebSocket(options);
    ws._idleTimeout = options.idleTimeout ?? this._defaultIdleTimeout;
    ws._name = name;

    this.connections.set(name, ws);
    console.log(`[WsManager] 已注册连接 "${name}"，当前共 ${this.connections.size} 个`);

    // 启动闲置清理扫描（首次注册时启动）
    this._startCleanupScan();

    return ws;
  }

  /**
   * 获取指定名称的连接实例
   * @param {string} name
   * @returns {UniWebSocket|undefined}
   */
  get(name) {
    return this.connections.get(name);
  }

  /**
   * 判断指定连接是否存在
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.connections.has(name);
  }

  /**
   * 向指定连接发送消息
   * @param {string} name
   * @param {string|Object} data
   */
  send(name, data) {
    const ws = this.connections.get(name);
    if (ws) {
      ws.send(data);
    } else {
      console.warn(`[WsManager] 连接 "${name}" 不存在，无法发送消息`);
    }
  }

  /**
   * 销毁指定连接并从管理器中移除
   * @param {string} name
   */
  remove(name) {
    const ws = this.connections.get(name);
    if (ws) {
      ws.destroy();
      this.connections.delete(name);
      console.log(`[WsManager] 已移除连接 "${name}"，剩余 ${this.connections.size} 个`);
    }

    // 所有连接都已清理，停止扫描
    if (this.connections.size === 0) {
      this._stopCleanupScan();
    }
  }

  /**
   * 销毁所有连接
   */
  removeAll() {
    for (const [name, ws] of this.connections) {
      console.log(`[WsManager] 销毁连接 "${name}"`);
      ws.destroy();
    }
    this.connections.clear();
    this._stopCleanupScan();
    console.log('[WsManager] 所有连接已清理');
  }

  /**
   * 获取所有连接的状态快照
   * @returns {Object} 以 name 为 key 的状态对象
   */
  getAllState() {
    const states = {};
    for (const [name, ws] of this.connections) {
      states[name] = ws.getState();
    }
    return states;
  }

  /**
   * 获取指定连接的状态
   * @param {string} name
   * @returns {Object|null}
   */
  getState(name) {
    const ws = this.connections.get(name);
    return ws ? ws.getState() : null;
  }

  /**
   * 获取管理器摘要信息
   */
  getSummary() {
    let connected = 0;
    let reconnecting = 0;
    let idle = 0;

    for (const [, ws] of this.connections) {
      const state = ws.getState();
      if (state.isConnected) connected++;
      if (state.isReconnecting) reconnecting++;
      if (state.idleDuration > (ws._idleTimeout || this._defaultIdleTimeout)) idle++;
    }

    return {
      total: this.connections.size,
      connected,
      reconnecting,
      idle,
    };
  }

  // ==================== 闲置清理 ====================

  /**
   * 启动闲置连接扫描定时器
   */
  _startCleanupScan() {
    if (this._cleanupTimer) return;

    this._cleanupTimer = setInterval(() => {
      this._scanAndCleanIdle();
    }, this._cleanupInterval);

    console.log('[WsManager] 闲置清理扫描已启动');
  }

  /**
   * 停止闲置连接扫描定时器
   */
  _stopCleanupScan() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
      console.log('[WsManager] 闲置清理扫描已停止');
    }
  }

  /**
   * 扫描所有连接，清理超时的闲置连接
   */
  _scanAndCleanIdle() {
    const now = Date.now();
    const toRemove = [];

    for (const [name, ws] of this.connections) {
      const state = ws.getState();
      const idleTimeout = ws._idleTimeout || this._defaultIdleTimeout;
      const idleDuration = now - state.lastActiveTime;

      const isIdle = !state.isConnected && !state.isReconnecting && idleDuration > idleTimeout;

      if (isIdle) {
        console.log(
          `[WsManager] 连接 "${name}" 闲置 ${Math.round(idleDuration / 1000)}s（阈值 ${Math.round(idleTimeout / 1000)}s），自动清理`
        );
        toRemove.push(name);
      }
    }

    for (const name of toRemove) {
      this.remove(name);
    }

    if (toRemove.length > 0) {
      console.log(`[WsManager] 本轮清理了 ${toRemove.length} 个闲置连接`);
    }
  }
}

// 导出单例
const wsManager = new WsManager();
export default wsManager;
