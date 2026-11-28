import { Suspense } from 'react';
import { AppErrorBoundary } from '../../shared/components/AppErrorBoundary';
import { getActiveJourneyDestination, getActiveJourneyKey } from './journeyController';
import { useJourneyController, useJourneySnapshot } from './JourneyControllerProvider';
import { resolveJourneyPage, type JourneyPageProps } from './journeyPageRegistry';

function PageLoadingSurface() {
  return <div className="home-loading-surface" role="status" aria-live="polite" aria-busy="true">
    <div className="home-loading-surface__panel">
      <span className="home-loading-surface__indicator" aria-hidden="true" />
      <strong>Đang mở không gian làm việc</strong>
      <span>Đang tải trang…</span>
    </div>
  </div>;
}

function UnavailablePage({ onReturnHome }: { onReturnHome: () => void }) {
  return <main role="alert" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
    <section>
      <h1>Trang chưa khả dụng</h1>
      <p>Chức năng này chưa có Page triển khai hoặc hiện chưa sẵn sàng.</p>
      <button type="button" onClick={onReturnHome}>Về trang chủ</button>
    </section>
  </main>;
}

export function ActivePageHost(props: JourneyPageProps) {
  const snapshot = useJourneySnapshot();
  const controller = useJourneyController();
  const destination = getActiveJourneyDestination(snapshot);
  const pageKey = getActiveJourneyKey(snapshot);
  const Page = resolveJourneyPage(destination);

  if (!Page) {
    return <UnavailablePage onReturnHome={() => {
      void controller.dispatch({ kind: 'replace', destination: { kind: 'home' } });
    }} />;
  }

  return <AppErrorBoundary key={pageKey} fallback={<main role="alert" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
    <section>
      <h1>Không thể mở trang</h1>
      <p>Trang gặp lỗi khi khởi tạo. Shell và phiên làm việc vẫn được giữ nguyên.</p>
      <button type="button" onClick={() => window.location.reload()}>Tải lại ứng dụng</button>
    </section>
  </main>}>
    <Suspense fallback={<PageLoadingSurface />}>
      <Page {...props} />
    </Suspense>
  </AppErrorBoundary>;
}
