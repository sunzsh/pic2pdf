const jsPDF = require('../../utils/my_jspdf.js');

Page({
  data: {
    images: [],
    isGenerating: false,
    itemWidth: 220,
    itemHeight: 220,
    draggingIndex: -1,
    draggingTarget: -1,
    pageStyleGlobal: {},
    combineImages: false,
    margin: 10,
    customFilename: ''  // 添加自定义文件名
  },

  onLoad() {
    this.loadPageLayoutInfo();
  },
  loadPageLayoutInfo() {
    const rect = wx.getMenuButtonBoundingClientRect()
    const windowInfo = wx.getWindowInfo();
    const pageStyleGlobal = `--status-bar-height: ${windowInfo.statusBarHeight}px;`
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
            path: file.path,
            rotation: 0  // 添加旋转角度属性
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
    setTimeout(() => {
      this.setData({ draggingTarget: -1, draggingIndex: -1 });
    }, 200)

    
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

  onCombineImagesChange(e) {
    this.setData({
      combineImages: e.detail.value
    });
  },

  onMarginChange(e) {
    const margin = e.detail.value === '0' ? 0 : (parseInt(e.detail.value) || 10);
    this.setData({ margin });
  },

  // 旋转图片
  rotateImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images[index].rotation = (images[index].rotation + 90) % 360;
    this.setData({ images });
  },

  // 处理文件名变化
  onFilenameChange(e) {
    this.setData({
      customFilename: e.detail.value
    });
  },

  // 跳转到历史页面
  goToHistory() {
    wx.navigateTo({
      url: '/pages/pdf-history/pdf-history'
    });
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
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = this.data.margin;
      let currentY = margin; // 当前页面的Y坐标
      let maxContentWidth = pageWidth - 2 * margin;
      let maxContentHeight = pageHeight - 2 * margin;

      // 处理所有图片
      for (let i = 0; i < this.data.images.length; i++) {
        const imagePath = this.data.images[i].path;
        const rotation = this.data.images[i].rotation;

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
        let width = imageInfo.width;
        let height = imageInfo.height;

        
        // 如果图片需要旋转，交换宽高
        if (rotation === 90 || rotation === 270) {
          [width, height] = [height, width];
          // [maxContentWidth, maxContentHeight] = [maxContentHeight, maxContentWidth];
        }

        const scale = Math.min(
          maxContentWidth / width,
          maxContentHeight / height
        );
        
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;


        // 如果不合并图片，每张图片都从新页面开始
        if (!this.data.combineImages) {
          if (i > 0) {
            doc.addPage();
            currentPage++;
          }
          currentY = margin;
        } else {
          // 如果合并图片且当前页面放不下，添加新页面
          if (currentY + scaledHeight > maxContentHeight + 1) {
            doc.addPage();
            currentPage++;
            currentY = margin;
          }
        }

        // 计算图片位置（居中）
        const x = (pageWidth - scaledWidth) / 2;
        const y = this.data.combineImages ? currentY : (pageHeight - scaledHeight) / 2;

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
          const adjustedWidth = Math.min(scaledWidth, maxContentWidth);
          const adjustedHeight = Math.min(scaledHeight, maxContentHeight);
          
          // 检测图片格式
          let uint8Array = new Uint8Array(imageData);
          const isPNG = uint8Array[0] === 0x89 && uint8Array[1] === 0x50;
          const isJPEG = uint8Array[0] === 0xFF && uint8Array[1] === 0xD8;
          if (rotation === 90) {
            doc.addImage(uint8Array, isJPEG ? 'JPEG' : (isPNG ? 'PNG' : ''), adjustedX + adjustedWidth, adjustedY + (adjustedHeight - adjustedWidth), adjustedHeight, adjustedWidth, '', 'NONE', 90);
          } else if (rotation === 180) {
            doc.addImage(uint8Array, isJPEG ? 'JPEG' : (isPNG ? 'PNG' : ''), adjustedX + adjustedWidth, adjustedY - adjustedHeight, adjustedWidth, adjustedHeight, '', 'NONE', 180);
          } else if (rotation === 270) { 
            doc.addImage(uint8Array, isJPEG ? 'JPEG' : (isPNG ? 'PNG' : ''), adjustedX, adjustedY - adjustedWidth, adjustedHeight, adjustedWidth, '', 'NONE', 270);
          }else {
            doc.addImage(uint8Array, isJPEG ? 'JPEG' : (isPNG ? 'PNG' : ''), adjustedX, adjustedY, adjustedWidth, adjustedHeight, '', 'NONE', 0);
          }
          
          
          // 更新当前Y坐标（仅在合并图片时）
          if (this.data.combineImages) {
            currentY += adjustedHeight + margin;
          }
          
        } catch (err) {
          console.error('添加图片失败:', err);
          console.error('错误堆栈:', err.stack);
          throw err;
        }
      }
      
      const pdfData = doc.output('arraybuffer');
      
      const base64 = wx.arrayBufferToBase64(pdfData);
      // 生成文件名
      let fileName;
      if (this.data.customFilename) {
        fileName = `${this.data.customFilename}.pdf`;
      } else {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        fileName = `${year}${month}${day}${hours}${minutes}${seconds}.pdf`;
      }
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      
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
        title: '生成PDF失败，可能是历史文件太多了！',
        icon: 'none'
      });
    } finally {
      this.setData({ isGenerating: false });
    }
  }
}); 