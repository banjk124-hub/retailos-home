export function getCameraErrorMessage(error: unknown): string {
  const errorName = error instanceof DOMException ? error.name : '';
  const details = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    NotAllowedError: 'Quyền camera đã bị từ chối hoặc bị chặn. Hãy cho phép camera trong quyền của trình duyệt cho trang này rồi thử lại.',
    PermissionDeniedError: 'Quyền camera đã bị từ chối hoặc bị chặn. Hãy cho phép camera trong quyền của trình duyệt cho trang này rồi thử lại.',
    NotFoundError: 'Không tìm thấy camera trên thiết bị.',
    DevicesNotFoundError: 'Không tìm thấy camera trên thiết bị.',
    NotReadableError: 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động. Hãy đóng ứng dụng đó rồi thử lại.',
    TrackStartError: 'Camera đang được ứng dụng khác sử dụng hoặc không thể khởi động. Hãy đóng ứng dụng đó rồi thử lại.',
    OverconstrainedError: 'Không thể dùng camera theo cấu hình yêu cầu. Hãy kiểm tra camera của thiết bị rồi thử lại.',
    SecurityError: 'Trình duyệt đang chặn camera. Hãy mở app qua HTTPS hoặc localhost và cho phép quyền camera.',
    AbortError: 'Camera bị ngắt khi đang khởi động. Hãy thử mở lại.',
  };
  if (messages[errorName]) return messages[errorName];
  return `Không thể mở camera${errorName ? ` (${errorName})` : ''}.${details ? ` ${details}` : ''}`;
}
