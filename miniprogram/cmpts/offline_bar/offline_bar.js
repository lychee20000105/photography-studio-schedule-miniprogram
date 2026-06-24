/**
 * Notes: 离线提示横条组件
 * Ver : v2.08
 * Date: 2026-06-25
 */
const NetworkHelper = require('../../helper/network_helper.js');

Component({
  data: {
    isOffline: false,
  },

  lifetimes: {
    attached() {
      // 初始状态
      this.setData({ isOffline: !NetworkHelper.isConnected() });

      this._onStatusChange = (isConnected) => {
        this.setData({ isOffline: !isConnected });
      };
      NetworkHelper.onStatusChange(this._onStatusChange);
    },

    detached() {
      if (this._onStatusChange) {
        NetworkHelper.offStatusChange(this._onStatusChange);
      }
    },
  },

  methods: {
    bindRetry() {
      wx.getNetworkType({
        success: (res) => {
          if (res.networkType !== 'none') {
            this.setData({ isOffline: false });
            wx.showToast({ title: '网络已恢复', icon: 'success', duration: 1500 });
          } else {
            wx.showToast({ title: '仍无网络连接', icon: 'none', duration: 1500 });
          }
        }
      });
    },
  },
});
