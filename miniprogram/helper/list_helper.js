class ListHelper {
  /**
   * 初始化分页状态
   */
  static initPage(page, pageSize = 20) {
    page._listPage = 1;
    page._listPageSize = pageSize;
    page._listNoMore = false;
    page._listLoading = false;
  }

  /**
   * 触底加载更多
   * @param {Page} page - 页面实例
   * @param {Function} loadFn - 加载函数 (page, size) => Promise<list>
   * @param {string} listKey - 列表数据 key
   */
  static async loadMore(page, loadFn, listKey) {
    if (page._listNoMore || page._listLoading) return;
    page._listLoading = true;
    page.setData({ listLoadingMore: true });

    try {
      const newItems = await loadFn(page._listPage, page._listPageSize);
      if (!newItems || newItems.length < page._listPageSize) {
        page._listNoMore = true;
      }

      const currentList = page.data[listKey] || [];
      page.setData({
        [listKey]: currentList.concat(newItems || []),
        listLoadingMore: false,
        listNoMore: page._listNoMore
      });
      page._listPage++;
    } catch (e) {
      console.error('[ListHelper] loadMore error:', e);
      page.setData({ listLoadingMore: false });
    } finally {
      page._listLoading = false;
    }
  }

  /**
   * 刷新列表（重置分页）
   */
  static refresh(page, loadFn, listKey) {
    this.initPage(page, page._listPageSize);
    page.setData({ [listKey]: [], listNoMore: false });
    return this.loadMore(page, loadFn, listKey);
  }
}
module.exports = ListHelper;
