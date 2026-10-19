export async function captureJpegFrame(video: HTMLVideoElement, quality = 0.92): Promise<Blob> {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error('Camera chưa sẵn sàng. Chờ hình ảnh xuất hiện rồi chụp lại.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Thiết bị không hỗ trợ tạo ảnh từ camera.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Không thể tạo ảnh JPEG từ khung hình camera.');
  return blob;
}
