import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, Check, Download, FileSpreadsheet, FileText, ImageDown, LoaderCircle, Presentation,
  RefreshCw, Share2,
} from 'lucide-react';
import {
  MODULE_DATA_IDS, MODULE_SNAPSHOTS_UPDATED_EVENT, getCachedModuleSnapshot,
  type CachedModuleSnapshot, type ModuleDataId,
} from '../data/moduleDataService';
import {
  createCsvContent, createTextReport, downloadBlob, downloadXlsx, formatExportValue,
  openPdfPrintView, snapshotToExportTable,
} from '../data/exportFormats';
import { getCameraErrorMessage } from '../scanner/services/cameraErrors';

const moduleLabels: Record<ModuleDataId, string> = {
  inventory: 'Tồn kho',
  price: 'Giá & vốn',
  orders: 'Nhập / xuất hàng',
  sales: 'Doanh số',
  products: 'Danh mục hàng hóa',
  delivery: 'Điều chuyển hàng',
  'product-dates': 'Date sản phẩm',
  stocktake: 'Kiểm kê',
};

type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'txt' | 'pptx';

const exportFormats: Array<{ id: ExportFormat; label: string; detail: string; icon: typeof FileText }> = [
  { id: 'xlsx', label: 'Excel', detail: '.xlsx', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', detail: '.csv', icon: FileText },
  { id: 'pdf', label: 'PDF', detail: 'In / Lưu PDF', icon: FileText },
  { id: 'txt', label: 'Văn bản', detail: '.txt', icon: FileText },
  { id: 'pptx', label: 'PowerPoint', detail: '.pptx', icon: Presentation },
];

function makeFileStem(moduleId: ModuleDataId, snapshotDate: string): string {
  const date = snapshotDate.slice(0, 10).replace(/[^0-9-]/g, '');
  return `retailos-${moduleId}-${date || 'snapshot'}`;
}

function getExportError(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể tạo file. Vui lòng thử lại.';
}

export default function ExportTools() {
  const [snapshots, setSnapshots] = useState<CachedModuleSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedModule, setSelectedModule] = useState<ModuleDataId | ''>('');
  const [busyFormat, setBusyFormat] = useState<ExportFormat | null>(null);
  const [exportMessage, setExportMessage] = useState('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<{ blob: Blob; url: string; fileName: string } | null>(null);
  const [photoMessage, setPhotoMessage] = useState('');

  const loadSnapshots = async () => {
    setIsLoading(true);
    setLoadError('');
    const results = await Promise.allSettled(MODULE_DATA_IDS.map(getCachedModuleSnapshot));
    const failures = results.flatMap((result, index) => result.status === 'rejected'
      ? [{ moduleId: MODULE_DATA_IDS[index], reason: result.reason }]
      : []);
    if (failures.length > 0) {
      console.error('Không thể đọc snapshot cho công cụ xuất file:', failures);
      setLoadError('Một số snapshot không đọc được. Có thể xuất các snapshot đã tải thành công.');
    }
    const availableSnapshots = results.flatMap((result) =>
      result.status === 'fulfilled' && result.value ? [result.value] : [],
    );
    setSnapshots(availableSnapshots);
    setSelectedModule((current) => availableSnapshots.some((snapshot) => snapshot.moduleId === current)
      ? current
      : availableSnapshots[0]?.moduleId ?? '');
    setIsLoading(false);
  };

  useEffect(() => {
    void loadSnapshots();
    window.addEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshots);
    return () => window.removeEventListener(MODULE_SNAPSHOTS_UPDATED_EVENT, loadSnapshots);
  }, []);

  useEffect(() => {
    const stopCamera = () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setCameraStream(null);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') stopCamera();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', stopCamera);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', stopCamera);
      stopCamera();
    };
  }, []);

  useEffect(() => {
    const video = cameraVideoRef.current;
    if (!video || !cameraStream) return;
    video.srcObject = cameraStream;
    void video.play().catch((error: unknown) => {
      console.error('Không thể phát video camera chụp ảnh:', error);
      setCameraError('Camera đã mở nhưng không thể hiển thị video. Hãy thử lại.');
    });
  }, [cameraStream]);

  useEffect(() => () => {
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto.url);
  }, [capturedPhoto]);

  const selectedSnapshot = snapshots.find((snapshot) => snapshot.moduleId === selectedModule);
  const table = useMemo(
    () => selectedSnapshot ? snapshotToExportTable(selectedSnapshot.data) : { columns: [], rows: [] },
    [selectedSnapshot],
  );
  const previewRows = table.rows.slice(0, 4);

  const startCamera = () => {
    setCameraError('');
    setPhotoMessage('');
    setCapturedPhoto(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Chụp ảnh cần HTTPS hoặc localhost và trình duyệt hỗ trợ camera.');
      return;
    }
    if (cameraStreamRef.current) return;
    void navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    }).then((stream) => {
      cameraStreamRef.current = stream;
      setCameraStream(stream);
    }).catch((error: unknown) => {
      setCameraError(getCameraErrorMessage(error));
    });
  };

  const stopCamera = () => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraStream(null);
  };

  const capturePhoto = async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera chưa sẵn sàng. Chờ hình ảnh xuất hiện rồi chụp lại.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Thiết bị không hỗ trợ tạo ảnh từ camera.');
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', .92));
    if (!blob) {
      setCameraError('Không thể tạo ảnh JPEG từ khung hình camera.');
      return;
    }
    const fileName = `retailos-photo-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    setCapturedPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { blob, url: URL.createObjectURL(blob), fileName };
    });
    setPhotoMessage('Đã chụp ảnh JPEG. Tải xuống hoặc chia sẻ để lưu vào thiết bị.');
    stopCamera();
  };

  const downloadPhoto = () => {
    if (!capturedPhoto) return;
    downloadBlob(capturedPhoto.blob, capturedPhoto.fileName, 'image/jpeg');
    setPhotoMessage('Đã gửi ảnh JPEG về mục Tải xuống của trình duyệt.');
  };

  const sharePhoto = async () => {
    if (!capturedPhoto || !navigator.share) return;
    try {
      const file = new File([capturedPhoto.blob], capturedPhoto.fileName, { type: 'image/jpeg' });
      await navigator.share({ files: [file], title: 'Ảnh RetailOS' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Không thể chia sẻ ảnh JPEG:', error);
      setCameraError('Thiết bị không thể chia sẻ ảnh lúc này. Hãy tải ảnh xuống thay thế.');
    }
  };

  const exportSnapshot = async (format: ExportFormat) => {
    if (!selectedSnapshot || table.columns.length === 0) return;
    setBusyFormat(format);
    setExportMessage('');
    try {
      const title = moduleLabels[selectedSnapshot.moduleId];
      const fileStem = makeFileStem(selectedSnapshot.moduleId, selectedSnapshot.snapshotDate);
      if (format === 'csv') {
        downloadBlob(new Blob(['\uFEFF', createCsvContent(table)], { type: 'text/csv;charset=utf-8' }), `${fileStem}.csv`, 'text/csv;charset=utf-8');
      } else if (format === 'txt') {
        downloadBlob(new Blob([createTextReport(title, selectedSnapshot.snapshotDate, table)], { type: 'text/plain;charset=utf-8' }), `${fileStem}.txt`, 'text/plain;charset=utf-8');
      } else if (format === 'pdf') {
        openPdfPrintView(title, selectedSnapshot.snapshotDate, table);
      } else if (format === 'xlsx') {
        await downloadXlsx(table, `${fileStem}.xlsx`);
      } else {
        const PptxGenJS = (await import('pptxgenjs')).default;
        const presentation = new PptxGenJS();
        presentation.layout = 'LAYOUT_WIDE';
        presentation.author = 'RetailOS';
        presentation.subject = `Snapshot ${selectedSnapshot.snapshotDate}`;
        presentation.title = title;
        const chunks = Array.from({ length: Math.max(1, Math.ceil(table.rows.length / 16)) }, (_, index) =>
          table.rows.slice(index * 16, (index + 1) * 16),
        );
        chunks.forEach((rows, pageIndex) => {
          const slide = presentation.addSlide();
          slide.background = { color: 'F8F4F4' };
          slide.addText(title, { x: .55, y: .34, w: 10.8, h: .38, fontFace: 'Aptos', fontSize: 22, bold: true, color: '8F1E2B' });
          slide.addText(`Snapshot ${selectedSnapshot.snapshotDate} · ${table.rows.length} dòng · Trang ${pageIndex + 1}/${chunks.length}`, {
            x: .58, y: .82, w: 11, h: .22, fontFace: 'Aptos', fontSize: 9, color: '717987',
          });
          const tableRows = [
            table.columns.map((column) => ({ text: column, options: { bold: true, color: 'FFFFFF', fill: 'A92534' } })),
            ...rows.map((row) => table.columns.map((column) => ({ text: formatExportValue(row[column]) }))),
          ];
          slide.addTable(tableRows, {
            x: .55, y: 1.22, w: 12.2, h: 5.65, border: { type: 'solid', color: 'E2D8DA', pt: .5 },
            fontFace: 'Aptos', fontSize: 9, color: '35313A', margin: .07, rowH: .28,
          });
        });
        await presentation.writeFile({ fileName: `${fileStem}.pptx` });
      }
      setExportMessage(format === 'pdf'
        ? 'Đã mở hộp thoại in. Chọn “Lưu dưới dạng PDF” để tạo file.'
        : `Đã tạo file ${format.toUpperCase()} từ snapshot đang lưu trên thiết bị.`);
    } catch (error) {
      console.error(`Không thể xuất snapshot thành ${format}:`, error);
      setExportMessage(getExportError(error));
    } finally {
      setBusyFormat(null);
    }
  };

  return <section className="section-block export-tools-section" id="export-tools">
    <div className="section-heading">
      <div><span className="library-eyebrow">CÔNG CỤ THỬ NGHIỆM</span><h2 className="export-tools-title"><FileSpreadsheet size={20} /> Xuất dữ liệu & ảnh</h2><p>Dữ liệu chỉ đọc từ snapshot đã cache trên thiết bị.</p></div>
      <button type="button" className="export-refresh-button" onClick={() => { void loadSnapshots(); }} disabled={isLoading} aria-label="Làm mới danh sách snapshot">
        {isLoading ? <LoaderCircle size={16} className="export-spinning" /> : <RefreshCw size={16} />}<span>Làm mới</span>
      </button>
    </div>
    <div className="export-tools-grid">
      <article className="export-tool-card export-data-card">
        <div className="export-tool-heading"><span className="export-tool-icon"><FileSpreadsheet size={19} /></span><div><h3>Xuất snapshot</h3><p>Chọn snapshot và định dạng file.</p></div></div>
        {isLoading
          ? <p className="export-empty-state" role="status">Đang đọc dữ liệu cache…</p>
          : snapshots.length === 0
            ? <p className="export-empty-state">{loadError || 'Chưa có snapshot được cache. Đồng bộ dữ liệu trước khi xuất file.'}</p>
            : <>
              <label className="export-select-label" htmlFor="export-snapshot-select">Nguồn dữ liệu</label>
              <select id="export-snapshot-select" className="export-snapshot-select" value={selectedModule} onChange={(event) => setSelectedModule(event.target.value as ModuleDataId)}>
                {snapshots.map((snapshot) => <option key={snapshot.moduleId} value={snapshot.moduleId}>{moduleLabels[snapshot.moduleId]} · {snapshot.snapshotDate}</option>)}
              </select>
              {selectedSnapshot && <div className="export-snapshot-meta"><span>{table.rows.length.toLocaleString('vi-VN')} dòng</span><span>Snapshot {selectedSnapshot.snapshotDate}</span></div>}
              {loadError && <p className="export-inline-warning">{loadError}</p>}
              {table.columns.length > 0 && <div className="export-preview-wrap" role="region" aria-label="Bản xem trước dữ liệu">
                <table className="export-preview-table"><thead><tr>{table.columns.slice(0, 5).map((column) => <th key={column}>{column}</th>)}</tr></thead>
                  <tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex}>{table.columns.slice(0, 5).map((column) => <td key={column}>{formatExportValue(row[column]) || '—'}</td>)}</tr>)}</tbody>
                </table>
                {(table.columns.length > 5 || table.rows.length > previewRows.length) && <span className="export-preview-footnote">Xem trước tối đa 5 cột và 4 dòng · File xuất bao gồm toàn bộ dữ liệu</span>}
              </div>}
              <div className="export-format-grid">
                {exportFormats.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" className="export-format-button" onClick={() => { void exportSnapshot(id); }} disabled={!selectedSnapshot || table.columns.length === 0 || busyFormat !== null}>
                  {busyFormat === id ? <LoaderCircle size={17} className="export-spinning" /> : <Icon size={17} />}
                  <span><strong>{label}</strong><small>{detail}</small></span>
                </button>)}
              </div>
              {exportMessage && <p className="export-feedback" role="status"><Check size={15} />{exportMessage}</p>}
            </>}
      </article>

      <article className="export-tool-card export-photo-card">
        <div className="export-tool-heading"><span className="export-tool-icon export-photo-icon"><Camera size={19} /></span><div><h3>Chụp ảnh JPEG</h3><p>Chụp bằng camera thiết bị, không tải ảnh lên server.</p></div></div>
        {cameraStream
          ? <div className="photo-camera-view"><video ref={cameraVideoRef} autoPlay muted playsInline aria-label="Xem trước camera chụp ảnh" /><span className="photo-camera-live"><i /> CAMERA LIVE</span></div>
          : capturedPhoto
            ? <img className="photo-capture-preview" src={capturedPhoto.url} alt="Ảnh JPEG vừa chụp" />
            : <div className="photo-empty-preview"><Camera size={30} /><span>{cameraError || 'Camera sẽ bật khi bạn chạm nút bên dưới.'}</span></div>}
        {cameraError && <p className="export-inline-warning" role="alert">{cameraError}</p>}
        {cameraStream
          ? <div className="photo-action-row">
            <button type="button" className="photo-capture-button" onClick={() => { void capturePhoto(); }}><Camera size={17} />Chụp ảnh</button>
            <button type="button" className="photo-secondary-button" onClick={stopCamera}>Tắt camera</button>
          </div>
          : capturedPhoto
            ? <div className="photo-action-row">
              <button type="button" className="photo-capture-button" onClick={downloadPhoto}><Download size={17} />Tải JPEG</button>
              {typeof navigator.share === 'function' && <button type="button" className="photo-secondary-button" onClick={() => { void sharePhoto(); }}><Share2 size={17} />Chia sẻ</button>}
              <button type="button" className="photo-secondary-button" onClick={startCamera}><Camera size={17} />Chụp lại</button>
            </div>
            : <button type="button" className="photo-capture-button photo-start-button" onClick={startCamera}><Camera size={17} />Mở camera</button>}
        {photoMessage && <p className="export-feedback" role="status"><Check size={15} />{photoMessage}</p>}
        <p className="photo-privacy-note"><ImageDown size={14} />Ảnh được tạo trên thiết bị. Không có server upload.</p>
      </article>
    </div>
  </section>;
}
