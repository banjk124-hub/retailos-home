import { useCallback, useState } from 'react';
import { House, LibraryBig } from 'lucide-react';
import { MotionIcon } from '../../shared/icons';
import { useJourneyController } from '../journey/JourneyControllerProvider';
import { ShellModuleLibrary } from './ShellModuleLibrary';
import './FeatureMobileShortcuts.css';

export function FeatureMobileShortcuts() {
  const controller = useJourneyController();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [message, setMessage] = useState('');
  const closeLibrary = useCallback(() => setLibraryOpen(false), []);

  const returnHome = async () => {
    setMessage('');
    const moved = await controller.dispatch({ kind: 'popToHome' });
    if (!moved) setMessage('Chưa thể rời chức năng lúc này. Hãy hoàn tất hoặc đóng thao tác đang chạy trước.');
  };

  return (
    <>
      <nav className="feature-mobile-shortcuts" aria-label="Lối tắt chức năng">
        <button type="button" className="feature-mobile-shortcut feature-mobile-shortcut--home" aria-label="Về trang chủ" title="Trang chủ" onClick={() => { void returnHome(); }}>
          <span className="feature-mobile-shortcut__icon"><MotionIcon icon={House} variant="home" size={21} /></span>
          <span>Trang chủ</span>
        </button>
        <button type="button" className="feature-mobile-shortcut feature-mobile-shortcut--library" aria-label="Mở thư viện nghiệp vụ" title="Thư viện nghiệp vụ" onClick={() => { setMessage(''); setLibraryOpen(true); }}>
          <span className="feature-mobile-shortcut__icon"><MotionIcon icon={LibraryBig} variant="navigation" size={21} /></span>
          <span>Thư viện</span>
        </button>
      </nav>
      {message && <p className="feature-mobile-shortcuts__status" role="status">{message}</p>}
      {libraryOpen && <ShellModuleLibrary onClose={closeLibrary} />}
    </>
  );
}
