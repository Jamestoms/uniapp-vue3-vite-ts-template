/**
 * uni-app WebSocket 封装类
 * 职责：单条连接的生命周期管理（连接、心跳、重连、App后台恢复）
 * 不负责：多连接管理、闲置清理（由 WsManager 负责）
 */
class UniWebSocket {
  /**
   * @param {Object} options 配置项
   * @param {string} options.url - WebSocket 连接地址（必须使用 wss://）
   * @param {Object} [options.header] - 请求头
   * @param {string[]} [options.protocols] - 子协议
   * @param {number} [options.maxReconnectAttempts=10] - 最大重连次数
   * @param {number} [options.reconnectBaseDelay=1000] - 重连初始延迟(ms)
   * @param {number} [options.reconnectMaxDelay=30000] - 重连最大延迟(ms)
   * @param {number} [options.heartbeatInterval=30000] - 心跳间隔(ms)
   * @param {number} [options.heartbeatTimeout=5000] - 心跳超时时间(ms)
   * @param {string} [options.heartbeatMessage='ping'] - 心跳消息内容
   * @param {string} [options.heartbeatResponse='pong'] - 心跳响应内容
   * @param {boolean} [options.enableHeartbeat=true] - 是否启用心跳
   * @param {boolean} [options.enableReconnect=true] - 是否启用自动重连
   * @param {number} [options.foregroundCheckDelay=500] - 切回前台后延迟检测连接的时间(ms)
   * @param {Function} [options.onOpen] - 连接成功回调
   * @param {Function} [options.onMessage] - 收到消息回调
   * @param {Function} [options.onClose] - 连接关闭回调
   * @param {Function} [options.onError] - 连接错误回调
   * @param {Function} [options.onReconnect] - 重连回调
   */
  constructor(options) {
    this.url = options.url;
    this.header = options.header || {};
    this.protocols = options.protocols || [];

    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.reconnectBaseDelay = options.reconnectBaseDelay ?? 1000;
    this.reconnectMaxDelay = options.reconnectMaxDelay ?? 30000;
    this.enableReconnect = options.enableReconnect ?? true;

    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.heartbeatTimeout = options.heartbeatTimeout ?? 5000;
    this.heartbeatMessage = options.heartbeatMessage ?? 'ping';
    this.heartbeatResponse = options.heartbeatResponse ?? 'pong';
    this.enableHeartbeat = options.enableHeartbeat ?? true;

    this.foregroundCheckDelay = options.foregroundCheckDelay ?? 500;

    this._onOpen = options.onOpen || (() => {});
    this._onMessage = options.onMessage || (() => {});
    this._onClose = options.onClose || (() => {});
    this._onError = options.onError || (() => {});
    this._onReconnect = options.onReconnect || (() => {});

    this.socketTask = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.foregroundCheckTimer = null;
    this.isManualClose = false;
    this.isConnected = false;
    this.isReconnecting = false;
    this.isInBackground = false;
    this.wasConnectedBeforeBackground = false;

    // 最后活动时间（用于闲置检测）
    this.lastActiveTime = Date.now();

    this._bindAppLifecycle();
    this._bindNetworkListener();
  }

  connect() {
    if (this.isReconnecting) return;

    console.log(`[WS] 正在连接: ${this.url}`);

    this.socketTask = uni.connectSocket({
      url: this.url,
      header: this.header,
      protocols: this.protocols,
      multiple: true,
      // 注意：不要在这里写 success/fail 回调来判断连接结果
      // uni.connectSocket 的 success 只代表"请求发出成功"，不代表连接建立成功
      // 真正的连接结果由 socketTask.onOpen / onError 回调决定
    });

    this._bindEvents();
  }

  _bindEvents() {
    this.socketTask.onOpen(() => {
      console.log('[WS] 连接成功');
      this.isConnected = true;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.wasConnectedBeforeBackground = false;
      this.lastActiveTime = Date.now();

      if (this.enableHeartbeat) {
        this._startHeartbeat();
      }

      this._onOpen();
    });

    this.socketTask.onMessage((res) => {
      const data = res.data;

      if (data === this.heartbeatResponse) {
        console.log('[WS] 收到心跳响应');
        this._clearPongTimer();
        return;
      }

      this.lastActiveTime = Date.now();
      this._onMessage(data);
    });

    this.socketTask.onClose((res) => {
      console.log('[WS] 连接关闭', res);
      this.isConnected = false;
      this._stopHeartbeat();

      this._onClose(res);

      if (!this.isManualClose && this.enableReconnect) {
        this._scheduleReconnect();
      }
    });

    this.socketTask.onError((err) => {
      console.error('[WS] 连接错误', err);
      this.isConnected = false;
      this._stopHeartbeat();

      this._onError(err);
    });
  }

  _bindAppLifecycle() {
    uni.onAppHide(() => {
      console.log('[WS] App 进入后台');
      this.isInBackground = true;
      this.wasConnectedBeforeBackground = this.isConnected;
      this._stopHeartbeat();
    });

    uni.onAppShow(() => {
      console.log('[WS] App 回到前台');
      this.isInBackground = false;

      this._clearForegroundCheckTimer();
      this.foregroundCheckTimer = setTimeout(() => {
        this._checkConnectionOnForeground();
      }, this.foregroundCheckDelay);
    });
  }

  _bindNetworkListener() {
    uni.onNetworkStatusChange((res) => {
      console.log(`[WS] 网络状态变化: ${res.isConnected ? '有网' : '无网'} (${res.networkType})`);

      if (res.isConnected && !this.isConnected && !this.isManualClose) {
        console.log('[WS] 网络恢复，尝试重连');
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this._clearReconnectTimer();
        this.connect();
      }
    });
  }

  _checkConnectionOnForeground() {
    if (this.isManualClose) return;

    if (!this.isConnected) {
      console.log('[WS] 前台检测：连接已断开，立即重连');
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
      this._clearReconnectTimer();
      this.connect();
      return;
    }

    console.log('[WS] 前台检测：连接看似存活，发送心跳探测...');
    this._clearPongTimer();

    if (this.socketTask) {
      this.socketTask.send({
        data: this.heartbeatMessage,
        fail: () => {
          console.warn('[WS] 前台检测：心跳发送失败，连接已死，强制重连');
          this._forceReconnect();
        },
      });

      this.pongTimer = setTimeout(() => {
        console.warn('[WS] 前台检测：心跳超时，疑似假连接，强制重连');
        this._forceReconnect();
      }, this.heartbeatTimeout);
    } else {
      console.warn('[WS] 前台检测：状态异常，强制重连');
      this._forceReconnect();
    }
  }

  _forceReconnect() {
    console.log('[WS] 强制重连');
    this._stopHeartbeat();
    this._clearPongTimer();
    this._clearReconnectTimer();
    this.isConnected = false;
    this.isReconnecting = false;

    if (this.socketTask) {
      try {
        this.socketTask.close({});
      } catch (e) {
        console.warn('[WS] 关闭旧连接异常（可忽略）', e);
      }
      this.socketTask = null;
    }

    this.reconnectAttempts = 0;
    this.connect();
  }

  send(data) {
    const message = typeof data === 'object' ? JSON.stringify(data) : data;

    if (this.isConnected && this.socketTask) {
      this.lastActiveTime = Date.now();
      this.socketTask.send({
        data: message,
        fail: (err) => {
          console.error('[WS] 发送失败', err);
        },
      });
    } else {
      console.warn('[WS] 连接未就绪，消息丢弃');
    }
  }

  close() {
    console.log('[WS] 手动关闭连接');
    this.isManualClose = true;
    this._stopHeartbeat();
    this._clearReconnectTimer();
    this._clearForegroundCheckTimer();
    this.isReconnecting = false;

    if (this.socketTask) {
      this.socketTask.close({});
      this.socketTask = null;
    }

    this.isConnected = false;
  }

  reconnect() {
    this.close();
    this.isManualClose = false;
    this.reconnectAttempts = 0;
    this.connect();
  }

  stopReconnect() {
    console.log('[WS] 停止重连');
    this._clearReconnectTimer();
    this.isReconnecting = false;
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  destroy() {
    this.close();
  }

  /**
   * 获取连接状态快照
   */
  getState() {
    return {
      url: this.url,
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      isInBackground: this.isInBackground,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastActiveTime: this.lastActiveTime,
      idleDuration: Date.now() - this.lastActiveTime,
    };
  }

  // ==================== 内部方法 ====================

  _startHeartbeat() {
    this._stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.isInBackground) return;

      if (this.isConnected) {
        console.log('[WS] 发送心跳');
        this.socketTask.send({
          data: this.heartbeatMessage,
          fail: () => {
            console.warn('[WS] 心跳发送失败');
          },
        });

        this._clearPongTimer();
        this.pongTimer = setTimeout(() => {
          console.warn('[WS] 心跳超时，未收到 pong 响应，主动断开连接');
          if (this.socketTask) {
            this.socketTask.close({});
          }
        }, this.heartbeatTimeout);
      }
    }, this.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this._clearPongTimer();
  }

  _clearPongTimer() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  _clearForegroundCheckTimer() {
    if (this.foregroundCheckTimer) {
      clearTimeout(this.foregroundCheckTimer);
      this.foregroundCheckTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.isReconnecting) return;

    if (this.isInBackground) {
      console.log('[WS] 当前在后台，延迟到前台后再重连');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`[WS] 已达最大重连次数(${this.maxReconnectAttempts})，停止重连`);
      this._onReconnect({
        status: 'max_retries_reached',
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.isReconnecting = true;

    const exponentialDelay = this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts);
    const cappedDelay = Math.min(exponentialDelay, this.reconnectMaxDelay);
    const jitter = Math.random() * 1000;
    const delay = Math.floor(cappedDelay + jitter);

    this.reconnectAttempts++;

    console.log(`[WS] 第 ${this.reconnectAttempts} 次重连，${delay}ms 后尝试...`);

    this._onReconnect({
      status: 'reconnecting',
      attempts: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.isReconnecting = false;
      this.connect();
    }, delay);
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export default UniWebSocket;
