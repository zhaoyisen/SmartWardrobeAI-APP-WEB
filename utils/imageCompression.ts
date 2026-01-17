/**
 * 图片压缩工具
 * 自动调整图片分辨率和大小，确保符合要求
 */

/**
 * 压缩图片并自动调整分辨率
 * @param file 原始图片文件
 * @param maxSizeMB 最大文件大小（MB）
 * @param maxWidth 最大宽度（像素）
 * @param maxHeight 最大高度（像素）
 * @param minWidth 最小宽度（像素）
 * @param minHeight 最小高度（像素）
 * @returns 处理后的图片文件
 */
export async function compressImage(
  file: File,
  maxSizeMB: number = 3,
  maxWidth: number = 3000,
  maxHeight: number = 3000,
  minWidth: number = 50,
  minHeight: number = 50
): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // 读取图片
  const image = await loadImage(file);
  
  // 获取原始尺寸
  let { width, height } = image;
  
  // 计算目标尺寸（自动调整分辨率）
  const targetSize = calculateTargetSize(
    width,
    height,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight
  );
  
  // 如果尺寸需要调整
  if (targetSize.width !== width || targetSize.height !== height) {
    width = targetSize.width;
    height = targetSize.height;
  }
  
  // 创建Canvas并绘制图片
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }
  
  // 使用高质量缩放
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);
  
  // 智能估算初始压缩质量
  const initialQuality = estimateInitialQuality(file.size, maxSizeBytes);
  
  // 压缩到目标大小
  const compressedBlob = await compressToSize(
    canvas,
    maxSizeBytes,
    initialQuality
  );
  
  // 转换为File对象
  const compressedFile = new File(
    [compressedBlob],
    file.name,
    {
      type: 'image/jpeg',
      lastModified: Date.now()
    }
  );
  
  return compressedFile;
}

/**
 * 加载图片文件
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('无法加载图片文件'));
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('无法读取文件'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 计算目标尺寸（自动调整分辨率）
 */
function calculateTargetSize(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
  minWidth: number,
  minHeight: number
): { width: number; height: number } {
  let targetWidth = width;
  let targetHeight = height;
  
  // 如果尺寸太小，需要放大
  if (width < minWidth || height < minHeight) {
    const scaleX = minWidth / width;
    const scaleY = minHeight / height;
    const scale = Math.max(scaleX, scaleY);
    targetWidth = Math.round(width * scale);
    targetHeight = Math.round(height * scale);
  }
  
  // 如果尺寸太大，需要缩小
  if (targetWidth > maxWidth || targetHeight > maxHeight) {
    const scaleX = maxWidth / targetWidth;
    const scaleY = maxHeight / targetHeight;
    const scale = Math.min(scaleX, scaleY);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }
  
  return {
    width: targetWidth,
    height: targetHeight
  };
}

/**
 * 智能估算初始压缩质量
 */
function estimateInitialQuality(
  originalSize: number,
  targetSize: number
): number {
  const ratio = originalSize / targetSize;
  
  if (ratio > 5) {
    // 文件很大，从较低质量开始
    return 0.6;
  } else if (ratio > 2) {
    // 文件较大
    return 0.7;
  } else if (ratio > 1.5) {
    // 文件中等
    return 0.8;
  } else {
    // 文件接近目标大小
    return 0.9;
  }
}

/**
 * 压缩Canvas到目标大小
 * 最多尝试3次，每次降低质量0.1
 */
function compressToSize(
  canvas: HTMLCanvasElement,
  maxSizeBytes: number,
  initialQuality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let quality = initialQuality;
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryCompress = () => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('图片压缩失败'));
            return;
          }
          
          // 如果大小符合要求，或者已经尝试了最大次数
          if (blob.size <= maxSizeBytes || attempts >= maxAttempts) {
            resolve(blob);
            return;
          }
          
          // 继续尝试，降低质量
          attempts++;
          quality = Math.max(0.1, quality - 0.1);
          tryCompress();
        },
        'image/jpeg',
        quality
      );
    };
    
    tryCompress();
  });
}

