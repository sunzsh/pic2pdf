const jsPDF = require('../../utils/my_jspdf.js');

Page({
  data: {
    images: [],
    isGenerating: false,
    user: {
      name: '小山',
      age: 36
    },
    itemWidth: 220,
    itemHeight: 220,
    draggingIndex: -1,
    draggingTarget: -1,
    pageStyleGlobal: {}
  },

  onLoad() {
    this.loadPageLayoutInfo();
  },
  loadPageLayoutInfo() {
    const rect = wx.getMenuButtonBoundingClientRect()
    const windowInfo = wx.getWindowInfo();
    const pageStyleGlobal = `--status-bar-height: ${windowInfo.statusBarHeight}px;`
    // console.log(pageStyleGlobal);
    this.setData({ pageStyleGlobal })
  },

  // 选择图片
  chooseImage() {
    wx.chooseMessageFile({
      count: 32 - this.data.images.length,
      type: 'image',
      success: (res) => {
        // 按照time字段排序
        const sortedFiles = res.tempFiles.sort((a, b) => a.time - b.time);
        
        // 计算新图片的位置
        const currentImages = this.data.images;
        const newImages = sortedFiles.map((file, index) => {
          return {
            path: file.path
          };
        });
        
        this.setData({
          images: [...currentImages, ...newImages]
        });
      },
      fail: () => {
      }
    });
  },

  // 预览图片
  previewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.images.map(img => img.path)
    });
  },

  // 删除图片
  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    
    this.setData({ images: images });
  },

  // 处理触摸开始
  onTouchStart(e) {
    const { index } = e.currentTarget.dataset;
    
    this.setData({
      draggingIndex: index
    });
  },

  // 处理触摸移动
  async onTouchMove(e) {
    if (this.data.draggingIndex === -1) return;
    
    // 从changedTouches中获取触摸坐标
    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    const newIndex = await this.calculateTargetIndex(x, y);
    this.setData({ draggingTarget: newIndex });
  },

  // 处理触摸结束
  onTouchEnd(e) {
    
    if (this.data.draggingIndex === -1) return;
    this.setData({ draggingTarget: -1, draggingIndex: -1 });
    
    const { index } = e.currentTarget.dataset;
    
    // 获取松手时的位置
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    this.updateToTarget(index, endX, endY);
  },

  calculateTargetIndex(x, y) {
    const query = wx.createSelectorQuery();
    query.selectAll('.image-item').boundingClientRect();
    
    return new Promise((resolve, reject) => {
      query.exec((res) => {
        if (!res || !res[0] || !res[0].length) {
          console.error('获取图片项位置失败');
          resolve(-1);
          return;
        }
        
        const imageRects = res[0];
        
        // 遍历所有图片项，判断是否拖拽到某一个上面了
        for (let i = 0; i < imageRects.length; i++) {
          const rect = imageRects[i];
          // 判断坐标是否在图片项范围内
          if (
            x >= rect.left && 
            x <= rect.right && 
            y >= rect.top && 
            y <= rect.bottom
          ) {
            resolve(i);
            return;
          }
        }
        resolve(-1);
      });
    });
  },
  
  updateToTarget(index, endX, endY) {

    this.calculateTargetIndex(endX, endY).then((targetIndex) => {
      if (targetIndex === -1) return;
      if (targetIndex === index) return;
      this.reorderImages(index, targetIndex);
    });

  },

  // 重新排序图片
  reorderImages(fromIndex, toIndex) {

    // 确保索引有效
    if (fromIndex < 0 || fromIndex >= this.data.images.length || 
        toIndex < 0 || toIndex >= this.data.images.length) {
      console.error('无效的索引:', { fromIndex, toIndex, totalImages: this.data.images.length });
      return;
    }
    
    const images = [...this.data.images];
    const [movedItem] = images.splice(fromIndex, 1);
    images.splice(toIndex, 0, movedItem);
    
    this.setData({ images: images, draggingTarget: -1 });
  },

  // 生成PDF
  async generatePDF() {
    if (this.data.images.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    this.setData({ isGenerating: true });
    wx.showLoading({
      title: '正在生成PDF...',
    });

    try {
      // 创建PDF文档
      const doc = new jsPDF();
      let currentPage = 1;

      // 处理所有图片
      for (let i = 0; i < this.data.images.length; i++) {
        const imagePath = this.data.images[i].path;

        // 获取图片信息
        const imageInfo = await new Promise((resolve, reject) => {
          wx.getImageInfo({
            src: imagePath,
            success: (res) => {
              resolve(res);
            },
            fail: (err) => {
              console.error('获取图片信息失败:', err);
              reject(err);
            }
          });
        });

        // 计算图片在PDF中的尺寸
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 10;
        const contentWidth = pageWidth - 2 * margin;
        const contentHeight = pageHeight - 2 * margin;

        // 计算图片缩放比例
        const scale = Math.min(
          contentWidth / imageInfo.width,
          contentHeight / imageInfo.height
        );
        
        const scaledWidth = imageInfo.width * scale;
        const scaledHeight = imageInfo.height * scale;

        // 计算图片位置（居中）
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        // 如果当前页面放不下，添加新页面
        if (i > 0) {
          doc.addPage();
        }

        // 读取图片数据
        const imageData = await new Promise((resolve, reject) => {
          wx.getFileSystemManager().readFile({
            filePath: imagePath,
            success: (res) => {
              resolve(res.data);
            },
            fail: (err) => {
              console.error('读取图片数据失败:', err);
              reject(err);
            }
          });
        });

        // 将图片添加到PDF
        try {
          // 调整图片位置和大小
          const adjustedX = Math.max(margin, x);
          const adjustedY = Math.max(margin, y);
          const adjustedWidth = Math.min(scaledWidth, contentWidth);
          const adjustedHeight = Math.min(scaledHeight, contentHeight);
          
          // 检测图片格式
          let uint8Array = new Uint8Array(imageData);
          const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50;
          const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;
          
          
          if (isPNG) {
            // 如果是PNG，需要先转换为JPEG
            // 创建临时canvas
            const canvas = wx.createOffscreenCanvas({ type: '2d', width: imageInfo.width, height: imageInfo.height });
            const ctx = canvas.getContext('2d');
            
            // 创建图片对象
            const img = canvas.createImage();
            
            // 等待图片加载完成
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = `data:image/png;base64,${wx.arrayBufferToBase64(imageData)}`;
            });
            
            // 绘制图片到canvas
            ctx.drawImage(img, 0, 0, imageInfo.width, imageInfo.height);
            
            // 转换为JPEG格式
            const jpegBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
            

            // jpegBase64转buff
            const buffer = wx.base64ToArrayBuffer(jpegBase64);
            // buff转uint8Array
            uint8Array = new Uint8Array(buffer);
          }
          // 添加到PDF
          doc.addImage(uint8Array, 'JPEG', adjustedX, adjustedY, adjustedWidth, adjustedHeight, '', 'NONE');
          
        } catch (err) {
          console.error('添加图片失败:', err);
          console.error('错误堆栈:', err.stack);
          throw err;
        }
        
      }
      
      const pdfData = doc.output('arraybuffer');
      
      const base64 = wx.arrayBufferToBase64(pdfData);
      const filePath = `${wx.env.USER_DATA_PATH}/output.pdf`;
      
      
      await new Promise((resolve, reject) => {
        wx.getFileSystemManager().writeFile({
          filePath: filePath,
          data: base64,
          encoding: 'base64',
          success: () => {
            resolve();
          },
          fail: (err) => {
            console.error('保存PDF文件失败:', err);
            reject(err);
          }
        });
      });

      // 打开PDF文件
      await new Promise((resolve, reject) => {
        wx.openDocument({
          filePath: filePath,
          fileType: 'pdf',
          showMenu: true,
          success: () => {
            resolve();
          },
          fail: (err) => {
            console.error('打开PDF文件失败:', err);
            reject(err);
          }
        });
      });

      wx.hideLoading();
      wx.showToast({
        title: 'PDF生成成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('生成PDF失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '生成PDF失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isGenerating: false });
    }
  }
}); 