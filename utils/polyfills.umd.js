// 确保global对象存在
if (typeof global === 'undefined') {
  global = {};
}

// 添加window对象
if (typeof window === 'undefined') {
  global.window = global;
}

// 添加document对象
if (typeof document === 'undefined') {
  global.document = {
    createElement: function(tagName) {
      if (tagName === 'canvas') {
        const canvas = {
          getContext: function(contextType) {
            if (contextType === '2d') {
              return {
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 0,
                lineCap: '',
                lineJoin: '',
                miterLimit: 0,
                globalAlpha: 1,
                globalCompositeOperation: 'source-over',
                shadowColor: '',
                shadowBlur: 0,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                lineDashOffset: 0,
                font: '',
                textAlign: 'start',
                textBaseline: 'alphabetic',
                direction: 'ltr',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'low',
                filter: 'none',
                save: function() {},
                restore: function() {},
                scale: function() {},
                rotate: function() {},
                translate: function() {},
                transform: function() {},
                resetTransform: function() {},
                createLinearGradient: function() {
                  return {
                    addColorStop: function() {}
                  };
                },
                createRadialGradient: function() {
                  return {
                    addColorStop: function() {}
                  };
                },
                createPattern: function() {},
                clearRect: function() {},
                fillRect: function() {},
                strokeRect: function() {},
                beginPath: function() {},
                closePath: function() {},
                moveTo: function() {},
                lineTo: function() {},
                stroke: function() {},
                fill: function() {},
                clip: function() {},
                isPointInPath: function() {},
                isPointInStroke: function() {},
                fillText: function() {},
                strokeText: function() {},
                measureText: function() {
                  return {
                    width: 0
                  };
                },
                drawImage: function() {},
                createImageData: function() {
                  return {
                    data: new Uint8ClampedArray(),
                    width: 0,
                    height: 0
                  };
                },
                putImageData: function() {},
                getImageData: function() {
                  return {
                    data: new Uint8ClampedArray(),
                    width: 0,
                    height: 0
                  };
                }
              };
            }
            return null;
          },
          width: 0,
          height: 0,
          style: {},
          toDataURL: function() {
            return '';
          }
        };

        // 确保canvas对象可以被jsPDF正确初始化
        canvas.getContext = canvas.getContext.bind(canvas);
        return canvas;
      }
      return {};
    }
  };
}

// 添加Base64编码解码函数
if (typeof global.atob === 'undefined') {
  global.atob = function(str) {
    return decodeURIComponent(escape(str));
  };
}

if (typeof global.btoa === 'undefined') {
  global.btoa = function(str) {
    return unescape(encodeURIComponent(str));
  };
}

// 添加ArrayBuffer相关方法
if (typeof global.ArrayBuffer === 'undefined') {
  global.ArrayBuffer = function() {};
}

if (typeof global.Uint8Array === 'undefined') {
  global.Uint8Array = function() {};
}

if (typeof global.Uint8ClampedArray === 'undefined') {
  global.Uint8ClampedArray = function() {};
}

// 添加Base64编码方法
if (typeof wx !== 'undefined' && !wx.arrayBufferToBase64) {
  wx.arrayBufferToBase64 = function(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return wx.arrayBufferToBase64(binary);
  };
}

// Promise polyfill
if (typeof global.Promise === 'undefined') {
  global.Promise = function(executor) {
    let resolve, reject;
    const promise = {
      then: function(onFulfilled, onRejected) {
        if (onFulfilled) resolve = onFulfilled;
        if (onRejected) reject = onRejected;
        return promise;
      },
      catch: function(onRejected) {
        return promise.then(null, onRejected);
      }
    };
    executor(resolve, reject);
    return promise;
  };
}

// Canvas polyfill
if (typeof global.CanvasRenderingContext2D === 'undefined') {
  global.CanvasRenderingContext2D = function() {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      lineJoin: '',
      miterLimit: 0,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      lineDashOffset: 0,
      font: '',
      textAlign: 'start',
      textBaseline: 'alphabetic',
      direction: 'ltr',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low',
      filter: 'none',
      save: function() {},
      restore: function() {},
      scale: function() {},
      rotate: function() {},
      translate: function() {},
      transform: function() {},
      resetTransform: function() {},
      createLinearGradient: function() {
        return {
          addColorStop: function() {}
        };
      },
      createRadialGradient: function() {
        return {
          addColorStop: function() {}
        };
      },
      createPattern: function() {},
      clearRect: function() {},
      fillRect: function() {},
      strokeRect: function() {},
      beginPath: function() {},
      closePath: function() {},
      moveTo: function() {},
      lineTo: function() {},
      stroke: function() {},
      fill: function() {},
      clip: function() {},
      isPointInPath: function() {},
      isPointInStroke: function() {},
      fillText: function() {},
      strokeText: function() {},
      measureText: function() {
        return {
          width: 0
        };
      },
      drawImage: function() {},
      createImageData: function() {
        return {
          data: new Uint8ClampedArray(),
          width: 0,
          height: 0
        };
      },
      putImageData: function() {},
      getImageData: function() {
        return {
          data: new Uint8ClampedArray(),
          width: 0,
          height: 0
        };
      }
    };
  };
}

// Image polyfill
if (typeof global.Image === 'undefined') {
  global.Image = function() {
    return {
      src: '',
      width: 0,
      height: 0,
      complete: false,
      naturalWidth: 0,
      naturalHeight: 0
    };
  };
}

// Blob polyfill
if (typeof global.Blob === 'undefined') {
  global.Blob = function(parts, options) {
    return {
      size: 0,
      type: options ? options.type : ''
    };
  };
}

// FileReader polyfill
if (typeof global.FileReader === 'undefined') {
  global.FileReader = function() {
    return {
      readAsArrayBuffer: function() {},
      readAsBinaryString: function() {},
      readAsDataURL: function() {},
      readAsText: function() {},
      abort: function() {}
    };
  };
}

// URL polyfill
if (typeof global.URL === 'undefined') {
  global.URL = {
    createObjectURL: function() {
      return '';
    },
    revokeObjectURL: function() {}
  };
}

// XMLHttpRequest polyfill
if (typeof global.XMLHttpRequest === 'undefined') {
  global.XMLHttpRequest = function() {
    return {
      open: function() {},
      send: function() {},
      setRequestHeader: function() {},
      getResponseHeader: function() {},
      getAllResponseHeaders: function() {
        return '';
      },
      abort: function() {}
    };
  };
}

// 导出global对象
module.exports = global;
