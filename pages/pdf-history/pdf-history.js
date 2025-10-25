Page({
  data: {
    historyList: [],
    pageStyleGlobal: {}
  },

  onLoad() {
    this.loadPageLayoutInfo();
    this.loadHistoryList();
  },

  onShow() {
    // 每次显示页面时重新加载历史列表
    this.loadHistoryList();
  },

  loadPageLayoutInfo() {
    const rect = wx.getMenuButtonBoundingClientRect()
    const windowInfo = wx.getWindowInfo();
    const pageStyleGlobal = `--status-bar-height: ${windowInfo.statusBarHeight}px;`
    this.setData({ pageStyleGlobal })
  },

  // 加载历史列表
  async loadHistoryList() {
    try {
      const pdfsDir = `${wx.env.USER_DATA_PATH}`;
      
      // 检查目录是否存在
      const dirExists = await this.checkDirExists(pdfsDir);
      if (!dirExists) {
        this.setData({ historyList: [] });
        return;
      }

      // 读取目录下的所有文件
      const files = await this.getDirFiles(pdfsDir);
      
      // 过滤PDF文件并获取文件信息
      const pdfFiles = [];
      for (const fileName of files.filter(file => file.endsWith('.pdf'))) {
        const filePath = `${pdfsDir}/${fileName}`;
        try {
          const stats = await this.getFileStats(filePath);
          const fileSize = stats.stats ? stats.stats.size : stats.size;
          const lastModifiedTime = stats.stats ? stats.stats.lastModifiedTime : stats.lastModifiedTime;
          
          pdfFiles.push({
            fileName,
            filePath,
            createTime: this.formatTimestamp(lastModifiedTime),
            fileSize: this.formatFileSize(fileSize)
          });
        } catch (error) {
          console.error(`获取文件 ${fileName} 信息失败:`, error);
          // 如果获取文件信息失败，使用文件名时间作为备选
          pdfFiles.push({
            fileName,
            filePath,
            createTime: this.formatFileTime(fileName),
            fileSize: '获取失败'
          });
        }
      }

      // 按修改时间降序排列，最新的在前
      pdfFiles.sort((a, b) => {
        // 如果两个文件都有有效的时间戳，按时间排序
        if (a.createTime !== '未知时间' && b.createTime !== '未知时间') {
          return b.createTime.localeCompare(a.createTime);
        }
        // 否则按文件名排序
        return b.fileName.localeCompare(a.fileName);
      });

      this.setData({ historyList: pdfFiles });
    } catch (error) {
      console.error('加载历史列表失败:', error);
      this.setData({ historyList: [] });
    }
  },

  // 检查目录是否存在
  checkDirExists(dirPath) {
    return new Promise((resolve) => {
      wx.getFileSystemManager().access({
        path: dirPath,
        success: () => resolve(true),
        fail: () => resolve(false)
      });
    });
  },

  // 获取目录下的所有文件
  getDirFiles(dirPath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readdir({
        dirPath,
        success: (res) => resolve(res.files),
        fail: reject
      });
    });
  },

  // 获取文件统计信息
  getFileStats(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().stat({
        path: filePath,
        success: resolve,
        fail: reject
      });
    });
  },

  // 格式化时间戳
  formatTimestamp(timestamp) {
    try {
      if (!timestamp) return '未知时间';
      
      const date = new Date(timestamp * 1000); // 时间戳是秒，需要转换为毫秒
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const second = String(date.getSeconds()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch (error) {
      console.error('格式化时间戳失败:', error);
      return '未知时间';
    }
  },

  // 格式化文件时间（从文件名解析，作为备选方案）
  formatFileTime(fileName) {
    try {
      // 从文件名中提取时间戳（格式：YYYYMMDDHHMMSS.pdf）
      const timeStr = fileName.replace('.pdf', '');
      if (timeStr.length === 14) {
        const year = timeStr.substring(0, 4);
        const month = timeStr.substring(4, 6);
        const day = timeStr.substring(6, 8);
        const hour = timeStr.substring(8, 10);
        const minute = timeStr.substring(10, 12);
        const second = timeStr.substring(12, 14);
        
        // 使用完整年份格式：YYYY-MM-DD HH:MM:SS
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
      return '未知时间';
    } catch (error) {
      return '未知时间';
    }
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    if (typeof bytes !== 'number' || isNaN(bytes)) return '未知大小';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  // 打开PDF文件
  openPDF(e) {
    const filePath = e.currentTarget.dataset.filePath;
    
    wx.openDocument({
      filePath: filePath,
      fileType: 'pdf',
      showMenu: true,
      success: () => {
        console.log('打开PDF成功');
      },
      fail: (err) => {
        console.error('打开PDF失败:', err);
        wx.showToast({
          title: '打开PDF失败',
          icon: 'none'
        });
      }
    });
  },

  // 删除单个PDF文件
  deletePDF(e) {
    const filePath = e.currentTarget.dataset.filePath;
    const fileName = e.currentTarget.dataset.fileName;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除文件"${fileName}"吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteFile(filePath);
        }
      }
    });
  },

  // 执行删除文件
  deleteFile(filePath) {
    wx.getFileSystemManager().unlink({
      filePath: filePath,
      success: () => {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        // 重新加载历史列表
        this.loadHistoryList();
      },
      fail: (err) => {
        console.error('删除文件失败:', err);
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      }
    });
  },

  // 清空所有历史
  clearAllHistory() {
    if (this.data.historyList.length === 0) {
      wx.showToast({
        title: '没有可删除的文件',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认清空',
      content: `确定要删除所有${this.data.historyList.length}个PDF文件吗？此操作不可恢复！`,
      confirmColor: '#ff4757',
      success: (res) => {
        if (res.confirm) {
          this.clearAllFiles();
        }
      }
    });
  },

  // 执行清空所有文件
  async clearAllFiles() {
    wx.showLoading({
      title: '正在删除...'
    });

    try {
      const pdfsDir = `${wx.env.USER_DATA_PATH}`;
      
      // 获取目录下的所有文件
      const files = await this.getDirFiles(pdfsDir);
      
      // 过滤PDF文件
      const pdfFiles = files.filter(file => file.endsWith('.pdf'));
      
      // 逐个删除PDF文件
      const deletePromises = pdfFiles.map(fileName => {
        const filePath = `${pdfsDir}/${fileName}`;
        return new Promise((resolve, reject) => {
          wx.getFileSystemManager().unlink({
            filePath: filePath,
            success: resolve,
            fail: (err) => {
              console.error(`删除文件 ${fileName} 失败:`, err);
              resolve(); // 继续删除其他文件，不中断整个过程
            }
          });
        });
      });
      
      // 等待所有删除操作完成
      await Promise.all(deletePromises);

      wx.hideLoading();
      wx.showToast({
        title: '清空成功',
        icon: 'success'
      });

      // 重新加载历史列表
      this.loadHistoryList();
    } catch (error) {
      wx.hideLoading();
      console.error('清空文件失败:', error);
      wx.showToast({
        title: '清空失败',
        icon: 'none'
      });
    }
  },

  // 返回生成页面
  goBack() {
    console.log('返回按钮被点击');
    // 直接跳转到PDF生成页面
    wx.redirectTo({
      url: '/pages/pdf-maker/pdf-maker',
      success: () => {
        console.log('跳转到PDF生成页面成功');
      },
      fail: (err) => {
        console.error('跳转失败:', err);
        wx.showToast({
          title: '跳转失败',
          icon: 'none'
        });
      }
    });
  }
});

