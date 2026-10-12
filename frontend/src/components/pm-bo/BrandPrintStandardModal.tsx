import React, { useState, useEffect } from 'react';
import {
  Printer,
  Tag,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { BrandPrintStandardItem } from '../../types/pmBo';
import { pmBoService } from '../../services/pmBoService';
import { personalTaskService } from '../../services/personalTaskService';

interface BrandPrintStandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: BrandPrintStandardItem | null;
}

const COMMON_BRANDS = [
  'Kichi Kichi',
  'Gogi House',
  'Manwah',
  'Isushi',
  'Ashima',
  'Sumo BBQ',
  'Cowboy Jack\'s',
  'Vuvuzela',
  'Phố Ngon 37',
  'iCook',
  'Hutong',
  'Crystal Jade',
  'Shogun',
  'Yu Tang',
  'CloudPot',
];

const PRINT_TYPES = [
  'Chuẩn hóa in Dcorp (RK7)',
  'Chuẩn hóa in KDS',
  'Cả hai (Dcorp RK7 & KDS)',
];

export const BrandPrintStandardModal: React.FC<BrandPrintStandardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const isEditing = !!editItem;

  const [brandName, setBrandName] = useState(COMMON_BRANDS[0]);
  const [customBrand, setCustomBrand] = useState('');
  const [loaiIn, setLoaiIn] = useState(PRINT_TYPES[0]);
  const [tieuDe, setTieuDe] = useState('');
  const [ghiChu, setGhiChu] = useState('');

  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        if (COMMON_BRANDS.includes(editItem.brand_name)) {
          setBrandName(editItem.brand_name);
          setCustomBrand('');
        } else {
          setBrandName('Khác');
          setCustomBrand(editItem.brand_name);
        }
        setLoaiIn(editItem.loai_in || PRINT_TYPES[0]);
        setTieuDe(editItem.tieu_de || '');
        setGhiChu(editItem.ghi_chu || '');

        let imgs: string[] = [];
        if (editItem.images) {
          try {
            imgs = JSON.parse(editItem.images);
          } catch {
            imgs = [editItem.images];
          }
        }
        setExistingImages(imgs);
      } else {
        setBrandName(COMMON_BRANDS[0]);
        setCustomBrand('');
        setLoaiIn(PRINT_TYPES[0]);
        setTieuDe('');
        setGhiChu('');
        setExistingImages([]);
      }
      setPastedImages([]);
      setSelectedFiles([]);
      setErrorMsg(null);
    }
  }, [isOpen, editItem]);

  // Xử lý dán hình ảnh từ Clipboard (Ctrl + V)
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
          const newFile = new File([file], `print_paste_${Date.now()}_${newImgs.length}.${ext}`, {
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

    const finalBrand = brandName === 'Khác' ? customBrand.trim() : brandName;
    if (!finalBrand) {
      setErrorMsg('Vui lòng chọn hoặc nhập tên Brand!');
      return;
    }

    if (!loaiIn.trim()) {
      setErrorMsg('Vui lòng chọn loại chuẩn hóa in!');
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

      if (isEditing && editItem) {
        await pmBoService.updateBrandPrintStandard(editItem.id, {
          brand_name: finalBrand,
          loai_in: loaiIn,
          tieu_de: tieuDe.trim() || undefined,
          ghi_chu: ghiChu.trim() || undefined,
          images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : undefined,
        });
      } else {
        await pmBoService.createBrandPrintStandard({
          brand_name: finalBrand,
          loai_in: loaiIn,
          tieu_de: tieuDe.trim() || undefined,
          ghi_chu: ghiChu.trim() || undefined,
          images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin chuẩn hóa in Brand.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Cập Nhật Chuẩn Hóa In Brand ${editItem?.brand_name}` : 'Thêm Mới Chuẩn Hóa In Brand'}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy Bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            leftIcon={<CheckCircle2 size={16} />}
          >
            {submitting ? 'Đang Lưu...' : isEditing ? 'Lưu Thay Đổi' : 'Lưu Chuẩn Hóa In'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
      >
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--color-error-bg, #FEF2F2)',
              border: '1px solid var(--color-error-border, #F87171)',
              borderRadius: 'var(--radius-md, 6px)',
              color: 'var(--color-error-text, #B91C1C)',
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

        {/* Brand & Loại In */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={15} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
              <span>Tên Brand (Thương Hiệu)</span>
              <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {COMMON_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="Khác">-- Brand khác --</option>
            </select>

            {brandName === 'Khác' && (
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Nhập tên Brand khác..."
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-md, 6px)',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  fontSize: '13px',
                  marginTop: '4px',
                }}
                required
              />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={15} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
              <span>Dịch Vụ Chuẩn Hóa In</span>
              <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
              value={loaiIn}
              onChange={(e) => setLoaiIn(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {PRINT_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tiêu đề quy chuẩn */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Tiêu Đề / Tóm Tắt Quy Chuẩn In
          </label>
          <input
            type="text"
            value={tieuDe}
            onChange={(e) => setTieuDe(e.target.value)}
            placeholder="Ví dụ: Quy chuẩn in Bill thanh toán & Order Bếp KDS Kichi Kichi..."
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          />
        </div>

        {/* Ghi chú chi tiết */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} style={{ color: 'var(--text-secondary)' }} />
            <span>Nội Dung Ghi Chú / Cấu Hình Quy Chuẩn In</span>
          </label>
          <textarea
            rows={5}
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Ghi chú cấu hình máy in: dòng máy, driver, cổng in, template bill, phân line in bếp/bar, lưu ý kỹ thuật khi setup..."
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              resize: 'vertical',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Dán ảnh trực tiếp Ctrl + V & Upload */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
            border: '1px dashed var(--color-primary, #F5B800)',
            borderRadius: 'var(--radius-md, 6px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ImageIcon size={18} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Hình Ảnh Minh Họa / Mẫu In (Dán trực tiếp Ctrl + V)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                  Có thể chụp màn hình mẫu bill, cấu hình in rồi dán ngay tại đây
                </span>
              </div>
            </div>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <Paperclip size={13} />
              <span>Chọn ảnh</span>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Thumbnails existing */}
          {existingImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {existingImages.map((url, idx) => (
                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  <img src={url} alt="existing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
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

          {/* Thumbnails pasted */}
          {pastedImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {pastedImages.map((file, idx) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                  <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #F5B800' }}>
                    <img src={previewUrl} alt="pasted" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setPastedImages((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'rgba(220,38,38,0.85)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
