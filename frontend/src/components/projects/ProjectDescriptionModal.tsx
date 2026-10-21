import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  ClipboardPaste,
  Image as ImageIcon,
  Paperclip,
  X,
  FileSpreadsheet,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Project } from '../../types/project';
import { projectService } from '../../services/projectService';
import { useModalStack } from '../../utils/modalStack';

interface ProjectDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSuccess: (updatedProject: Project) => void;
}

export const ProjectDescriptionModal: React.FC<ProjectDescriptionModalProps> = ({
  isOpen,
  onClose,
  project,
  onSuccess
}) => {
  const [description, setDescription] = useState<string>('');
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview full size image
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const previewZIndex = useModalStack(Boolean(previewImage), () => setPreviewImage(null));

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing data when modal opens
  useEffect(() => {
    if (isOpen && project) {
      setDescription(project.Description || '');
      setPastedImages([]);
      setSelectedFiles([]);
      setErrorMsg(null);

      // Parse existing images
      if (project.Images) {
        try {
          const parsed = JSON.parse(project.Images);
          if (Array.isArray(parsed)) {
            setExistingImages(parsed);
          } else {
            setExistingImages([project.Images]);
          }
        } catch {
          setExistingImages([project.Images]);
        }
      } else {
        setExistingImages([]);
      }

      // Parse existing files
      if (project.Files) {
        try {
          const parsed = JSON.parse(project.Files);
          if (Array.isArray(parsed)) {
            setExistingFiles(parsed);
          } else {
            setExistingFiles([project.Files]);
          }
        } catch {
          setExistingFiles([project.Files]);
        }
      } else {
        setExistingFiles([]);
      }
    }
  }, [isOpen, project]);

  // Handle Ctrl + V paste
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
          const newFile = new File([file], `paste_${Date.now()}_${newImgs.length}.${ext}`, { type: file.type });
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

  const handleRemovePastedImage = (index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileName = (url: string) => {
    return url.split('/').pop() || url;
  };

  const getFileIcon = (filename: string) => {
    const l = filename.toLowerCase();
    if (l.endsWith('.xlsx') || l.endsWith('.xls') || l.endsWith('.csv')) {
      return <FileSpreadsheet size={16} color="#16A34A" />;
    }
    if (l.endsWith('.pdf')) {
      return <FileText size={16} color="#DC2626" />;
    }
    if (l.endsWith('.doc') || l.endsWith('.docx')) {
      return <FileText size={16} color="#2563EB" />;
    }
    return <FileIcon size={16} color="#6B7280" />;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!project) return;

    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập Nội Dung Chi Tiết diễn giải Sự Vụ / Dự Án!');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      let finalImages = [...existingImages];
      let finalFiles = [...existingFiles];

      // 1. Upload pasted images
      if (pastedImages.length > 0) {
        const uploadedImgUrls = await projectService.uploadFiles(pastedImages);
        finalImages.push(...uploadedImgUrls);
      }

      // 2. Upload selected files
      if (selectedFiles.length > 0) {
        const uploadedFileUrls = await projectService.uploadFiles(selectedFiles);
        finalFiles.push(...uploadedFileUrls);
      }

      // 3. Save to database
      const updated = await projectService.updateProjectDescription(project.ProjectID, {
        Description: description.trim(),
        Images: finalImages.length > 0 ? JSON.stringify(finalImages) : null,
        Files: finalFiles.length > 0 ? JSON.stringify(finalFiles) : null,
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi lưu mô tả dự án:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Lỗi khi lưu mô tả dự án. Vui lòng thử lại!');
    } finally {
      setUploading(false);
    }
  };

  if (!project) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Mô Tả Dự Án & Tài Liệu Đính Kèm"
        maxWidth="780px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <Button variant="secondary" onClick={onClose} disabled={uploading}>
              Hủy Bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={uploading}
              leftIcon={<CheckCircle2 size={16} />}
            >
              {uploading ? 'Đang Tải Lên & Lưu...' : 'Lưu Mô Tả & Đính Kèm'}
            </Button>
          </div>
        }
      >
        <form
          onSubmit={handleSubmit}
          onPaste={handlePaste}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #F87171',
                borderRadius: 'var(--radius-md)',
                color: '#B91C1C',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Header Info */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Dự Án Đang Thao Tác
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                {project.ProjectName}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {project.Deadline && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Hạn: {project.Deadline}
                </span>
              )}
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: project.Status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 184, 0, 0.18)',
                  color: project.Status === 'completed' ? '#22C55E' : '#F5B800'
                }}
              >
                {project.Status === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện'}
              </span>
            </div>
          </div>

          {/* 1. NỘI DUNG CHI TIẾT DIỄN GIẢI SỰ VỤ * */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} color="var(--color-primary, #60A5FA)" />
              <span>Nội Dung Chi Tiết diễn giải Sự Vụ <span style={{ color: '#EF4444' }}>*</span></span>
            </label>
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả cụ thể về mục tiêu dự án, phạm vi triển khai, diễn giải sự vụ, các lưu ý quan trọng hoặc ghi chú cần trao đổi... (Có thể dán Ctrl+V ảnh trực tiếp)"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13.5px',
                lineHeight: 1.5,
                resize: 'vertical'
              }}
              required
            />
          </div>

          {/* 2. DÁN HÌNH ẢNH TRỰC TIẾP (Ctrl + V) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardPaste size={15} color="var(--color-primary, #60A5FA)" />
              <span>Dán Hình Ảnh Trực Tiếp (Ctrl + V)</span>
            </label>
            <div
              tabIndex={0}
              style={{
                border: '2px dashed rgba(59, 130, 246, 0.45)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                textAlign: 'center',
                cursor: 'text',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--color-primary, #60A5FA)', fontSize: '13px', fontWeight: 600 }}>
                <ImageIcon size={18} />
                <span>Chụp ảnh màn hình và bấm <strong>Ctrl + V</strong> vào đây để dán ảnh</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hỗ trợ chụp từ Snipping Tool, PrintScreen, Zalo, Teams, Web...
              </div>
            </div>

            {/* Existing and newly pasted images */}
            {(existingImages.length > 0 || pastedImages.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                {/* Existing Images */}
                {existingImages.map((url, idx) => (
                  <div
                    key={`exist_${idx}`}
                    style={{
                      position: 'relative',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-primary)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      width: '105px',
                      height: '80px',
                      cursor: 'pointer'
                    }}
                    onClick={() => setPreviewImage(url)}
                  >
                    <img
                      src={url}
                      alt={`Saved ${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveExistingImage(idx);
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.65)',
                        border: 'none',
                        borderRadius: '50%',
                        color: '#FFFFFF',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Xóa ảnh này"
                    >
                      <X size={12} />
                    </button>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: '9px',
                        padding: '1px 4px',
                        textAlign: 'center'
                      }}
                    >
                      Đã lưu ({idx + 1})
                    </div>
                  </div>
                ))}

                {/* Newly Pasted Images */}
                {pastedImages.map((file, idx) => {
                  const objectUrl = URL.createObjectURL(file);
                  return (
                    <div
                      key={`paste_${idx}`}
                      style={{
                        position: 'relative',
                        border: '2px solid #2563EB',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        backgroundColor: 'var(--bg-primary)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        width: '105px',
                        height: '80px',
                        cursor: 'pointer'
                      }}
                      onClick={() => setPreviewImage(objectUrl)}
                    >
                      <img
                        src={objectUrl}
                        alt={`Pasted ${idx}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePastedImage(idx);
                        }}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(220, 38, 38, 0.85)',
                          border: 'none',
                          borderRadius: '50%',
                          color: '#FFFFFF',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Xóa ảnh vừa dán"
                      >
                        <X size={12} />
                      </button>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: '#2563EB',
                          color: '#fff',
                          fontSize: '9px',
                          padding: '1px 4px',
                          textAlign: 'center',
                          fontWeight: 700
                        }}
                      >
                        Mới dán {idx + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. ĐÍNH KÈM TỆP TIN / TÀI LIỆU KHÁC (PDF, Excel, Word...) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={15} color="#2563EB" />
                <span>Đính Kèm Tệp Tin / Tài Liệu Khác (PDF, Excel, Word...)</span>
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Paperclip size={13} />}
              >
                Chọn Tệp Tin...
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar,image/*"
              style={{ display: 'none' }}
            />

            {/* List of files */}
            {(existingFiles.length > 0 || selectedFiles.length > 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                {/* Existing files */}
                {existingFiles.map((url, idx) => (
                  <div
                    key={`exist_file_${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12.5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {getFileIcon(url)}
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--color-primary, #60A5FA)', fontWeight: 600, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {getFileName(url)}
                      </a>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={url}
                        download
                        style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '11.5px' }}
                      >
                        <Download size={13} /> Tải
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingFile(idx)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                        title="Xóa tệp này"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Newly selected files */}
                {selectedFiles.map((f, idx) => (
                  <div
                    key={`new_file_${idx}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 12px',
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      borderRadius: '6px',
                      fontSize: '12.5px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      {getFileIcon(f.name)}
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedFile(idx)}
                      style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
                      title="Bỏ tệp"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Lightbox Preview Image Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
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
            padding: '20px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewImage}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                backgroundColor: '#DC2626',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
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
