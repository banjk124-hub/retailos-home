import { useCallback, useState } from 'react';
import { requestDeviceAccess, type DeviceAccessStatus } from '../../auth/services/deviceAccess';
import { subscribeForPushNotifications } from '../../notifications/pushNotifications';

type PushSetupStatus = 'idle' | 'loading' | 'ready' | 'prompt' | 'denied' | 'unsupported' | 'needs-install' | 'error';

export function useHomePushNotifications() {
  const [pushSetupStatus, setPushSetupStatus] = useState<PushSetupStatus>('idle');
  const [pushSetupError, setPushSetupError] = useState('');

  const enablePushNotifications = useCallback(async () => {
    if (pushSetupStatus === 'loading' || pushSetupStatus === 'ready') return;
    setPushSetupStatus('loading');
    setPushSetupError('');
    try {
      const permission: DeviceAccessStatus = await requestDeviceAccess('notifications');
      if (permission !== 'granted') {
        const permissionMessages: Record<DeviceAccessStatus, string> = {
          checking: 'Đang kiểm tra quyền thông báo. Thử lại sau giây lát.',
          prompt: 'Chưa cấp quyền thông báo trên trình duyệt.',
          granted: '',
          denied: 'Quyền thông báo đã bị chặn. Hãy đổi quyền của trang trong cài đặt trình duyệt.',
          unsupported: 'Trình duyệt này không hỗ trợ thông báo đẩy.',
          'needs-install': 'Trên iPhone/iPad, hãy thêm RetailOS vào Màn hình chính để bật thông báo.',
          error: 'Không thể yêu cầu quyền thông báo lúc này.',
        };
        setPushSetupError(permissionMessages[permission]);
        setPushSetupStatus(permission === 'checking' ? 'error' : permission);
        return;
      }
      const result = await subscribeForPushNotifications();
      if (result === 'ready') setPushSetupStatus('ready');
      else {
        setPushSetupError('Thông báo đẩy chưa được cấu hình.');
        setPushSetupStatus('error');
      }
    } catch (error) {
      console.error('Không thể thiết lập thông báo đẩy theo yêu cầu của người dùng:', error);
      setPushSetupError(error instanceof Error ? error.message : 'Không thể thiết lập thông báo đẩy lúc này.');
      setPushSetupStatus('error');
    }
  }, [pushSetupStatus]);

  return { pushSetupStatus, pushSetupError, enablePushNotifications };
}
