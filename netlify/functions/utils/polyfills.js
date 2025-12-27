// Polyfill File and related globals for undici compatibility
// These are needed because undici expects browser globals that aren't available in Node.js
// This file must be imported before any modules that use undici/node-fetch

if (typeof File === 'undefined') {
  global.File = class File {
    constructor(fileBits, fileName, options = {}) {
      this.name = fileName
      this.lastModified = options.lastModified || Date.now()
      this.size = Array.isArray(fileBits) 
        ? fileBits.reduce((sum, bit) => sum + (bit?.size || bit?.byteLength || 0), 0) 
        : 0
      this.type = options.type || ''
      this.webkitRelativePath = ''
      this[Symbol.toStringTag] = 'File'
    }
    stream() {
      throw new Error('File.stream() is not implemented in polyfill')
    }
    text() {
      throw new Error('File.text() is not implemented in polyfill')
    }
    arrayBuffer() {
      throw new Error('File.arrayBuffer() is not implemented in polyfill')
    }
    slice() {
      throw new Error('File.slice() is not implemented in polyfill')
    }
  }
}

if (typeof FileReader === 'undefined') {
  global.FileReader = class FileReader {
    constructor() {
      this.readyState = 0
      this.result = null
      this.error = null
    }
    readAsArrayBuffer() {}
    readAsBinaryString() {}
    readAsDataURL() {}
    readAsText() {}
  }
}

export {}

