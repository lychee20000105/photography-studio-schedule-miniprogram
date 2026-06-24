/**
 * Notes: 网络状态监听工具
 * Ver : v2.08
 * Date: 2026-06-25
 */

class NetworkHelper {
  static _listeners = [];
  static _reconnectListeners = [];
  static _isConnected = true;
  static _inited = false;

  static init() {
    if (this._inited) return;
    this._inited = true;

    wx.getNetworkType({
      success: (res) => {
        this._isConnected = res.networkType !== 'none';
      }
    });

    wx.onNetworkStatusChange((res) => {
      let wasConnected = this._isConnected;
      this._isConnected = res.isConnected;
      this._listeners.forEach(fn => {
        try { fn(res.isConnected); } catch (e) { console.error('[Network] listener error', e); }
      });
      if (!wasConnected && res.isConnected) {
        this._onReconnect();
      }
    });
  }

  static isConnected() {
    return this._isConnected;
  }

  static onStatusChange(fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  }

  static offStatusChange(fn) {
    let idx = this._listeners.indexOf(fn);
    if (idx >= 0) this._listeners.splice(idx, 1);
  }

  static onReconnect(fn) {
    if (typeof fn === 'function') this._reconnectListeners.push(fn);
  }

  static offReconnect(fn) {
    let idx = this._reconnectListeners.indexOf(fn);
    if (idx >= 0) this._reconnectListeners.splice(idx, 1);
  }

  static _onReconnect() {
    console.log('[Network] Reconnected, notifying listeners');
    this._reconnectListeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('[Network] reconnect listener error', e); }
    });
  }
}

module.exports = NetworkHelper;
