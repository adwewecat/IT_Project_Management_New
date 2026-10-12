import React, { useState } from 'react';
import {
  CheckCircle2,
  Paperclip,
  Image as ImageIcon,
  Send,
  Trash2,
  Server,
  Activity,
  FileText,
  X,
  Edit3,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SystemIncidentItem } from '../../types/systemIncident';
import { systemIncidentService } from '../../services/systemIncidentService';
import { useModalStack } from '../../utils/modalStack';

interface SystemOutageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  incident: SystemIncidentItem | null;
  onUpdated: () => void;
  onEdit?: (incident: SystemIncidentItem) => void;
}

export const SystemOutageDetailModal: React.FC<SystemOutageDetailModalProps> = ({
  isOpen,
  onClose,
  incident,
  onUpdated,
  onEdit,
}) => {
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [rootCause, setRootCause] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lightbox preview for full image
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const previewZIndex = useModalStack(Boolean(previewImageUrl), () => setPreviewImageUrl(null));

  if (!incident) return null;

  const parsedImages: string[] = incident.images
    ? (() => {
        try {
          return JSON.parse(incident.images);
        } catch {
          return [incident.images];
        }
      })()
    : [];

  const parsedFiles: string[] = incident.files
    ? (() => {
        try {
          return JSON.parse(incident.files);
        } catch {
          return [incident.files];
        }
      })()
    : [];

  // Clipboard paste (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.stopPropagation();
    const items = e.clipboardData?.items;
    if (!items) return;

    const newImgs: File[] = [];
    const seenSizes = new Set<number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file && !seenSizes.has(file.size)) {
          seenSizes.add(file.size);
          const ext = file.type.split('/')[1] || 'png';
          const newFile = new File([file], `prog_paste_${Date.now()}_${newImgs.length}.${ext}`, {
            type: file.type,
          });
          newImgs.push(newFile);
        }
      }
    }
    if (newImgs.length > 0) {
      setPastedImages((prev) => [...prev, ...newImgs]);
      e.preventDefault();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() && pastedImages.length === 0 && selectedFiles.length === 0 && !newStatus) {
      setErrorMsg('Vui lòng nhập nội dung tiến độ hoặc đính kèm ảnh/file!');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let imagePaths: string[] = [];
      let otherFilePaths: string[] = [];

      const allUploadFiles = [...pastedImages, ...selectedFiles];
      if (allUploadFiles.length > 0) {
        const uploadedUrls = await systemIncidentService.uploadFiles(allUploadFiles);
        uploadedUrls.forEach((url) => {
          const lower = url.toLowerCase();
          if (
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.png') ||
            lower.endsWith('.gif') ||
            lower.endsWith('.webp')
          ) {
            imagePaths.push(url);
          } else {
            otherFilePaths.push(url);
          }
        });
      }

      const noteContent = newNote.trim() || 'Cập nhật tiến độ xử lý sự cố hệ thống.';

      await systemIncidentService.addSystemIncidentProgress(incident.id, {
        note: noteContent,
        images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : undefined,
        files: otherFilePaths.length > 0 ? JSON.stringify(otherFilePaths) : undefined,
        status: newStatus || undefined,
        nguyen_nhan: rootCause.trim() || undefined,
        bien_phap_khac_phuc: preventiveAction.trim() || undefined,
      });

      setNewNote('');
      setPastedImages([]);
      setSelectedFiles([]);
      setNewStatus('');
      setRootCause('');
      setPreventiveAction('');
      onUpdated();
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      const rawDetail = err.response?.data?.detail;
      if (status === 403) {
        setErrorMsg(
          typeof rawDetail === 'string' && rawDetail.trim()
            ? rawDetail
            : 'Bạn không có quyền thực hiện thao tác này (Yêu cầu quyền IT Application hoặc Quản trị viên).'
        );
      } else if (typeof rawDetail === 'string' && rawDetail.trim()) {
        setErrorMsg(rawDetail);
      } else {
        setErrorMsg(err.message || 'Lỗi khi cập nhật tiến độ.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (targetStatus: string) => {
    try {
      setSubmitting(true);
      await systemIncidentService.addSystemIncidentProgress(incident.id, {
        note: `Chuyển trạng thái sự cố sang: ${
          targetStatus === 'DA_KHAC_PHUC'
            ? 'Đã Khắc Phục'
            : targetStatus === 'THEO_DOI'
            ? 'Đang Theo Dõi'
            : 'Đang Xử Lý'
        }`,
        status: targetStatus,
      });
      onUpdated();
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      const rawDetail = err.response?.data?.detail;
      const msg =
        status === 403
          ? typeof rawDetail === 'string' && rawDetail.trim()
            ? rawDetail
            : 'Bạn không có quyền thay đổi trạng thái sự cố hệ thống (Yêu cầu quyền IT Application hoặc Quản trị viên).'
          : typeof rawDetail === 'string' && rawDetail.trim()
          ? rawDetail
          : 'Lỗi khi cập nhật trạng thái sự cố.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityBadge = (sev?: string | null) => {
    switch (sev) {
      case 'Cả Nước':
      case 'Khẩn cấp':
        return <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #F87171', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>🔴 Cả Nước</span>;
      case 'Miền Nam':
      case 'Cao':
        return <span style={{ backgroundColor: '#FFEDD5', color: '#C2410C', border: '1px solid #FB923C', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>🟠 Miền Nam</span>;
      case '1 số user / Nhà hàng':
      case 'Trung bình':
      case 'Thấp':
        return <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>🔵 1 số user / Nhà hàng</span>;
      default:
        return <span style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>{sev || 'Chung'}</span>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DA_KHAC_PHUC':
        return <span style={{ backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>✅ Đã Khắc Phục</span>;
      case 'THEO_DOI':
        return <span style={{ backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>🔍 Đang Theo Dõi</span>;
      default:
        return <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>⏳ Đang Xử Lý</span>;
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Chi Tiết Sự Cố Hệ Thống #SYS-${incident.id}`}
        maxWidth="840px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {incident.trang_thai !== 'DA_KHAC_PHUC' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleQuickStatusChange('DA_KHAC_PHUC')}
                  disabled={submitting}
                  leftIcon={<CheckCircle2 size={15} />}
                  style={{ backgroundColor: '#059669', borderColor: '#047857' }}
                >
                  Xác Nhận Đã Khắc Phục
                </Button>
              )}
              {incident.trang_thai !== 'THEO_DOI' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickStatusChange('THEO_DOI')}
                  disabled={submitting}
                >
                  Chuyển Theo Dõi
                </Button>
              )}
              {incident.trang_thai === 'DA_KHAC_PHUC' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickStatusChange('DANG_XU_LY')}
                  disabled={submitting}
                >
                  Mở Lại Sự Cố
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onEdit(incident);
                  }}
                  leftIcon={<Edit3 size={14} />}
                  style={{ color: '#B45309', borderColor: '#FDE68A', backgroundColor: '#FEF3C7' }}
                >
                  Chỉnh Sửa Thông Tin
                </Button>
              )}
            </div>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--bg-secondary, #F8FAFC)',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid var(--border-color, #E2E8F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  #SYS-{incident.id}
                </span>
                {getSeverityBadge(incident.muc_do)}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(incident.he_thong || 'Hệ thống khác')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((sys, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#1D4ED8',
                          backgroundColor: '#EFF6FF',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: '1px solid #BFDBFE',
                        }}
                      >
                        <Server size={12} />
                        <span>{sys}</span>
                      </span>
                    ))}
                </div>
              </div>

              <div>{getStatusBadge(incident.trang_thai)}</div>
            </div>

            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
              {incident.tieude}
            </h2>

            {/* Time & Downtime Stats Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-color, #E2E8F0)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                  BẮT ĐẦU PHÁT SINH:
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {incident.thoi_gian_bat_dau || '—'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                  HOÀN TẤT KHẮC PHỤC:
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: incident.thoi_gian_ket_thuc ? '#059669' : '#D97706' }}>
                  {incident.thoi_gian_ket_thuc || 'Đang khắc phục...'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                  THỜI GIAN GIÁN ĐOẠN:
                </span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#4B5563' }}>
                  {incident.thoi_gian_gian_doan_text || '0 phút'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                  PHỤ TRÁCH XỬ LÝ:
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {incident.nguoi_xu_ly || 'Chưa chỉ định'}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Nội Dung Chi Tiết Sự Cố & Phạm Vi Ảnh Hưởng:
            </span>
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, #E2E8F0)',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {incident.noi_dung}
            </div>
          </div>

          {/* Root Cause & Preventive Action (if any) */}
          {(incident.nguyen_nhan || incident.bien_phap_khac_phuc) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {incident.nguyen_nhan && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                    Nguyên Nhân Gốc Rễ (Root Cause):
                  </span>
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#FEF2F2',
                      borderRadius: '6px',
                      border: '1px solid #FECACA',
                      fontSize: '12px',
                      color: '#991B1B',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {incident.nguyen_nhan}
                  </div>
                </div>
              )}

              {incident.bien_phap_khac_phuc && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                    Biện Pháp Khắc Phục / Phòng Ngừa:
                  </span>
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#ECFDF5',
                      borderRadius: '6px',
                      border: '1px solid #A7F3D0',
                      fontSize: '12px',
                      color: '#065F46',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {incident.bien_phap_khac_phuc}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attached Images Gallery */}
          {parsedImages.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={14} />
                <span>Hình Ảnh Minh Họa ({parsedImages.length} ảnh):</span>
              </span>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {parsedImages.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setPreviewImageUrl(imgUrl)}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color, #E2E8F0)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    title="Click để phóng to ảnh"
                  >
                    <img
                      src={imgUrl}
                      alt={`attachment-${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attached Files List */}
          {parsedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={14} />
                <span>Tệp Tin Đính Kèm ({parsedFiles.length} tệp):</span>
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {parsedFiles.map((fUrl, idx) => {
                  const filename = fUrl.split('/').pop() || `File_${idx + 1}`;
                  return (
                    <a
                      key={idx}
                      href={fUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FileText size={14} />
                      <span>{filename}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Progress Notes Timeline */}
          {incident.ghi_chu_tien_do && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Nhật Ký Tiến Độ Xử Lý:
              </span>
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  fontSize: '12px',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {incident.ghi_chu_tien_do}
              </div>
            </div>
          )}

          {/* Update Box (Add Progress + Paste Images) */}
          <form
            onSubmit={handleAddProgress}
            onPaste={handlePaste}
            style={{
              padding: '14px',
              backgroundColor: '#F8FAFC',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={15} color="var(--color-primary)" />
                <span>Cập Nhật Tiến Độ & Bước Xử Lý Mới</span>
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Hỗ trợ dán ảnh trực tiếp từ Clipboard (<strong>Ctrl + V</strong>)
              </span>
            </div>

            {errorMsg && (
              <div style={{ fontSize: '12px', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '6px 10px', borderRadius: '4px' }}>
                {errorMsg}
              </div>
            )}

            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Ghi nhận diễn biến xử lý, kết quả kiểm tra, mốc thời gian... (Dán Ctrl+V ảnh trực tiếp)"
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                fontSize: '13px',
                lineHeight: 1.4,
                resize: 'vertical',
              }}
            />

            {/* Optional inputs: root cause & preventive action */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Cập nhật nguyên nhân gốc rễ (nếu đã tìm ra)..."
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-primary, #FFFFFF)',
                }}
              />
              <input
                type="text"
                value={preventiveAction}
                onChange={(e) => setPreventiveAction(e.target.value)}
                placeholder="Cập nhật biện pháp khắc phục / phòng ngừa..."
                style={{
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-primary, #FFFFFF)',
                }}
              />
            </div>

            {/* Pasted Images preview */}
            {pastedImages.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {pastedImages.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '60px',
                      height: '60px',
                      borderRadius: '4px',
                      border: '1px solid #E5E7EB',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="pasted"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => setPastedImages((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'rgba(239,68,68,0.9)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File attachments input & Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <Paperclip size={14} />
                  <span>Đính kèm file</span>
                  <input type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
                {selectedFiles.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({selectedFiles.length} file đã chọn)
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-primary, #FFFFFF)',
                  }}
                >
                  <option value="">-- Giữ nguyên trạng thái --</option>
                  <option value="DANG_XU_LY">Đang Xử Lý</option>
                  <option value="DA_KHAC_PHUC">Đã Khắc Phục</option>
                  <option value="THEO_DOI">Đang Theo Dõi</option>
                </select>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  leftIcon={<Send size={13} />}
                >
                  {submitting ? 'Đang Lưu...' : 'Lưu Tiến Độ'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Lightbox for full-size image */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: previewZIndex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewImageUrl}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                backgroundColor: '#EF4444',
                color: '#FFF',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
