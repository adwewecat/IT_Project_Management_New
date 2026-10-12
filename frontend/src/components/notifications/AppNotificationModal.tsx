import React, { useState, useEffect } from 'react';
import {
  Bell,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  AlertCircle,
  Pin,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AppNotificationItem } from '../../types/appNotification';
import { appNotificationService } from '../../services/appNotificationService';
import { personalTaskService } from '../../services/personalTaskService';

interface AppNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: AppNotificationItem | null;
}

const COMMON_CATEGORIES = [
  'Lưu ý vận hành',
  'Cấu hình hệ thống',
  'Quy trình - Quy định',
  'Hướng dẫn xử lý lỗi',
  'Chuẩn hóa Menu / POS',
  'Khác',
];

const PRIORITIES = [
  { value: 'Khẩn cấp', label: '🔴 Khẩn cấp', color: '#DC2626' },
  { value: 'Quan trọng', label: '🟡 Quan trọng', color: '#D97706' },
  { value: 'Bình thường', label: '⚪ Bình thường', color: '#4B5563' },
];

export const AppNotificationModal: React.FC<AppNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const isEditing = !!editItem;

  const [tieuDe, setTieuDe] = useState('');
  const [danhMuc, setDanhMuc] = useState(COMMON_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [mucDo, setMucDo] = useState('Quan trọng');
  const [noiDung, setNoiDung] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setTieuDe(editItem.tieu_de || '');
        if (COMMON_CATEGORIES.includes(editItem.danh_muc)) {
          setDanhMuc(editItem.danh_muc);
          setCustomCategory('');
        } else {
          setDanhMuc('Khác');
          setCustomCategory(editItem.danh_muc || '');
        }
        setMucDo(editItem.muc_do || 'Quan trọng');
        setNoiDung(editItem.noi_dung || '');
        setIsPinned(Boolean(editItem.is_pinned));
        setExistingImages(Array.isArray(editItem.images) ? editItem.images : []);
      } else {
        setTieuDe('');
        setDanhMuc(COMMON_CATEGORIES[0]);
        setCustomCategory('');
        setMucDo('Quan trọng');
        setNoiDung('');
        setIsPinned(false);
        setExistingImages([]);
      }
      setPastedImages([]);
      setSelectedFiles([]);
      setErrorMsg(null);
    }
  }, [isOpen, editItem]);

  // Xử lý dán hình ảnh từ Clipboard (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent) => {
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
          const newFile = new File([file], `notif_paste_${Date.now()}_${newImgs.length}.${ext}`, {
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

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tieuDe.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề thông báo / lưu ý!');
      return;
    }

    const finalCategory = danhMuc === 'Khác' ? customCategory.trim() : danhMuc;
    if (!finalCategory) {
      setErrorMsg('Vui lòng chọn hoặc nhập danh mục lưu ý!');
      return;
    }

    if (!noiDung.trim()) {
      setErrorMsg('Vui lòng nhập nội dung lưu ý chi tiết!');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let imagePaths: string[] = [...existingImages];

      const allUploadFiles = [...pastedImages, ...selectedFiles];
      if (allUploadFiles.length > 0) {
        const uploadedUrls = await personalTaskService.uploadFiles(allUploadFiles);
        imagePaths.push(...uploadedUrls);
      }

      const payload = {
        tieu_de: tieuDe.trim(),
        danh_muc: finalCategory,
        muc_do: mucDo,
        noi_dung: noiDung.trim(),
        images: imagePaths,
        is_pinned: isPinned,
      };

      if (isEditing && editItem) {
        await appNotificationService.updateNotification(editItem.id, payload);
      } else {
        await appNotificationService.createNotification(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi lưu thông báo:', err);
      setErrorMsg(err?.response?.data?.detail || 'Không thể lưu thông báo. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} style={{ color: 'var(--color-primary)' }} />
          <span>{isEditing ? 'Chỉnh Sửa Thông Báo / Lưu Ý' : 'Thêm Thông Báo / Lưu Ý Mới Cho Team App'}</span>
        </div>
      }
      maxWidth="750px"
    >
      <form onSubmit={handleSubmit} onPaste={handlePaste} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tiêu đề thông báo */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Tiêu Đề Thông Báo / Điều Cần Lưu Ý <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={tieuDe}
            onChange={(e) => setTieuDe(e.target.value)}
            placeholder="Ví dụ: Lưu ý khi cấu hình máy in bill Dcorp cho nhà hàng mới..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Hàng Danh mục, Mức độ & Ghim */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {/* Danh mục */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Danh Mục / Phân Loại
            </label>
            <select
              value={danhMuc}
              onChange={(e) => setDanhMuc(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                backgroundColor: '#fff',
                outline: 'none',
              }}
            >
              {COMMON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {danhMuc === 'Khác' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Nhập tên danh mục mới..."
                style={{
                  width: '100%',
                  marginTop: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          {/* Mức độ ưu tiên */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Mức Độ Ưu Tiên
            </label>
            <select
              value={mucDo}
              onChange={(e) => setMucDo(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                backgroundColor: '#fff',
                outline: 'none',
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ghim lên đầu */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '24px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                userSelect: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: isPinned ? 'var(--color-primary-subtle)' : '#F3F4F6',
                border: isPinned ? '1px solid var(--color-primary)' : '1px solid #E5E7EB',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
              />
              <Pin size={15} style={{ color: isPinned ? 'var(--color-primary-hover)' : '#6B7280' }} />
              <span>Ghim lên đầu trang (Ưu tiên hiển thị)</span>
            </label>
          </div>
        </div>

        {/* Nội dung chi tiết */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600 }}>
              Nội Dung Lưu Ý Chi Tiết <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              💡 Có thể bấm <kbd style={{ background: '#F3F4F6', padding: '2px 5px', borderRadius: '4px', border: '1px solid #D1D5DB' }}>Ctrl + V</kbd> để dán ảnh trực tiếp
            </span>
          </div>
          <textarea
            required
            rows={7}
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            placeholder="Mô tả chi tiết quy định, thao tác kỹ thuật, các bước cấu hình hoặc cách xử lý sự cố cần lưu ý..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Khu vực Dán & Tải Ảnh */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Hình Ảnh Minh Họa / Hướng Dẫn Kèm Theo
          </label>

          {/* Hộp nhận paste Ctrl + V */}
          <div
            tabIndex={0}
            onPaste={handlePaste}
            style={{
              border: '2px dashed #D1D5DB',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              backgroundColor: '#FAFAFA',
              cursor: 'pointer',
              marginBottom: '10px',
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.backgroundColor = '#FAFAFA';
            }}
          >
            <ImageIcon size={28} style={{ color: 'var(--color-primary)', margin: '0 auto 6px' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Nhấp vào đây rồi nhấn <span style={{ color: 'var(--color-primary-hover)', fontWeight: 700 }}>Ctrl + V</span> để dán ảnh chụp màn hình
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
              Hoặc chọn nút đính kèm tệp ảnh bên dưới (PNG, JPG, WEBP)
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                color: '#374151',
              }}
            >
              <Paperclip size={15} />
              <span>Chọn ảnh từ máy tính</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
            {(existingImages.length > 0 || pastedImages.length > 0 || selectedFiles.length > 0) && (
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                ✓ Tổng cộng: {existingImages.length + pastedImages.length + selectedFiles.length} hình ảnh
              </span>
            )}
          </div>

          {/* Danh sách ảnh xem trước */}
          {(existingImages.length > 0 || pastedImages.length > 0 || selectedFiles.length > 0) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: '10px',
                marginTop: '12px',
                padding: '10px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              {/* Ảnh đã lưu trước đó */}
              {existingImages.map((url, idx) => (
                <div
                  key={`exist-${idx}`}
                  style={{
                    position: 'relative',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#fff',
                    height: '90px',
                  }}
                >
                  <img
                    src={url}
                    alt={`Saved ${idx}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(220, 38, 38, 0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* Ảnh vừa dán qua Ctrl + V */}
              {pastedImages.map((file, idx) => (
                <div
                  key={`pasted-${idx}`}
                  style={{
                    position: 'relative',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '2px solid var(--color-primary)',
                    backgroundColor: '#fff',
                    height: '90px',
                  }}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Pasted ${idx}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      fontSize: '10px',
                      padding: '2px',
                      textAlign: 'center',
                    }}
                  >
                    Mới dán
                  </div>
                  <button
                    type="button"
                    onClick={() => setPastedImages((prev) => prev.filter((_, i) => i !== idx))}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(220, 38, 38, 0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {/* Ảnh vừa chọn từ máy tính */}
              {selectedFiles.map((file, idx) => (
                <div
                  key={`selected-${idx}`}
                  style={{
                    position: 'relative',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#fff',
                    height: '90px',
                  }}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Selected ${idx}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(220, 38, 38, 0.85)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '22px',
                      height: '22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '10px',
            paddingTop: '16px',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy Bỏ
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#111827',
              fontWeight: 600,
              border: 'none',
            }}
          >
            {submitting ? 'Đang Lưu...' : isEditing ? 'Cập Nhật Thông Báo' : 'Lưu Thông Báo / Lưu Ý'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
