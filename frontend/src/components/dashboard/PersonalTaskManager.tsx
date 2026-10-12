import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Calendar,
  Image as ImageIcon,
  Sparkles,
  ListPlus,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  X,
  Key,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PersonalTaskItem } from '../../types/personalTask';
import { personalTaskService } from '../../services/personalTaskService';

export const PersonalTaskManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  // Task list states
  const [tasks, setTasks] = useState<PersonalTaskItem[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(false);

  // Quick single add state
  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Completed filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal
  const [editingTask, setEditingTask] = useState<PersonalTaskItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Batch / AI Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchTab, setBatchTab] = useState<'text' | 'ai'>('text');
  const [rawTextList, setRawTextList] = useState('');
  const [aiKey, setAiKey] = useState('');
  const [aiImageBase64, setAiImageBase64] = useState<string | null>(null);
  const [extractedLines, setExtractedLines] = useState<string[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  // Lightbox for image preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load saved AI Key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY') || '';
    setAiKey(savedKey);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await personalTaskService.getTasks({
        tab: activeTab,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: searchTerm || undefined,
        limit: 500,
      });
      setTasks(data.items);
      setTotalPending(data.total_pending);
      setTotalCompleted(data.total_completed);
    } catch (err) {
      console.error('Failed to load personal tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, fromDate, toDate, searchTerm]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Handle Quick Add
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsAdding(true);
    try {
      let imagePaths: string[] = [];
      if (newImages.length > 0) {
        imagePaths = await personalTaskService.uploadFiles(newImages);
      }

      await personalTaskService.createTask({
        noi_dung: newContent.trim(),
        images: imagePaths.length > 0 ? JSON.stringify(imagePaths) : undefined,
      });

      setNewContent('');
      setNewImages([]);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Không thể thêm công việc. Vui lòng thử lại!');
    } finally {
      setIsAdding(false);
    }
  };

  // Quick Paste image on quick add input
  const handleQuickAddPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setNewImages((prev) => [...prev, file]);
          e.preventDefault();
          break;
        }
      }
    }
  };

  // Toggle Complete / Reopen
  const handleToggleTask = async (task: PersonalTaskItem) => {
    try {
      await personalTaskService.toggleTask(task.id);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Thao tác không thành công!');
    }
  };

  // Delete Task
  const handleDeleteTask = async (task: PersonalTaskItem) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
      await personalTaskService.deleteTask(task.id);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Xóa công việc thất bại!');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (task: PersonalTaskItem) => {
    setEditingTask(task);
    setEditContent(task.noi_dung);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editContent.trim()) return;
    try {
      await personalTaskService.updateTask(editingTask.id, {
        noi_dung: editContent.trim(),
      });
      setIsEditModalOpen(false);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Cập nhật thất bại!');
    }
  };

  // AI & Batch Parse
  const handleExtractFromText = () => {
    setBatchError(null);
    if (!rawTextList.trim()) {
      setBatchError('Vui lòng dán danh sách công việc vào ô bên dưới!');
      return;
    }
    const lines = rawTextList
      .split('\n')
      .map((l) => l.replace(/^(\s*[-*•+]\s*|\s*\d+[\.\)]\s*)/, '').trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setBatchError('Không tìm thấy dòng công việc hợp lệ nào.');
      return;
    }
    setExtractedLines(lines);
  };

  const handleExtractFromAI = async () => {
    setBatchError(null);
    if (!aiImageBase64 && !rawTextList.trim()) {
      setBatchError('Vui lòng dán hình ảnh hoặc nhập văn bản cần A.I bóc tách!');
      return;
    }

    if (aiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', aiKey.trim());
    }

    setIsExtracting(true);
    try {
      const lines = await personalTaskService.extractTasksAI({
        text_content: rawTextList.trim() || undefined,
        image_base64: aiImageBase64 || undefined,
        ai_key: aiKey.trim() || undefined,
      });

      if (!lines || lines.length === 0) {
        setBatchError('A.I không trích xuất được công việc nào từ nội dung.');
      } else {
        setExtractedLines(lines);
      }
    } catch (err: any) {
      console.error(err);
      setBatchError(err.response?.data?.detail || 'Lỗi khi gọi A.I bóc tách.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePasteAiImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            setAiImageBase64(uploadEvent.target?.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSaveBatchTasks = async () => {
    if (extractedLines.length === 0) return;
    setIsSavingBatch(true);
    try {
      await personalTaskService.batchCreateTasks(extractedLines);
      setIsBatchModalOpen(false);
      setRawTextList('');
      setAiImageBase64(null);
      setExtractedLines([]);
      loadTasks();
    } catch (err) {
      console.error(err);
      alert('Không thể lưu danh sách công việc.');
    } finally {
      setIsSavingBatch(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner & Tab Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--bg-primary, #FFFFFF)',
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg, 8px)',
          border: '1px solid var(--border-color, #E5E7EB)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-md, 6px)',
              backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
              color: 'var(--color-primary-hover, #DDA600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--color-primary, #F5B800)',
            }}
          >
            <CheckSquare size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Sổ Tay Công Việc Cá Nhân (Riêng Tư)
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Khu vực note việc cần làm riêng cho Quản trị viên & user dung.nguyenanh
            </span>
          </div>
        </div>

        {/* Tab Buttons (Pending vs Completed) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-secondary, #F8F9FA)',
              padding: '3px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #E5E7EB)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'pending' ? 'var(--color-primary, #F5B800)' : 'transparent',
                color: activeTab === 'pending' ? 'var(--color-primary-text, #111827)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'pending' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>Cần Làm</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'pending' ? '#FFFFFF' : 'var(--border-color, #E5E7EB)',
                  color: '#111827',
                  fontWeight: 800,
                }}
              >
                {totalPending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm, 4px)',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'completed' ? 'var(--color-primary, #F5B800)' : 'transparent',
                color: activeTab === 'completed' ? 'var(--color-primary-text, #111827)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'completed' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <span>Đã Xong</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: activeTab === 'completed' ? '#FFFFFF' : 'var(--border-color, #E5E7EB)',
                  color: '#111827',
                  fontWeight: 800,
                }}
              >
                {totalCompleted}
              </span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBatchModalOpen(true)}
            leftIcon={<Sparkles size={14} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />}
          >
            Chuyển Đổi Hàng Loạt / A.I
          </Button>
        </div>
      </div>

      {/* Quick Add Bar (Always visible) */}
      <form
        onSubmit={handleQuickAdd}
        onPaste={handleQuickAddPaste}
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary, #FFFFFF)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg, 8px)',
          border: '1px solid var(--border-color, #E5E7EB)',
        }}
      >
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Gõ nội dung công việc cần làm... (Có thể dán trực tiếp ảnh Ctrl + V hoặc nhấn Enter để thêm)"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color-dark, #D1D5DB)',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Selected image badge */}
        {newImages.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
              border: '1px solid var(--color-primary, #F5B800)',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <ImageIcon size={14} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
            <span>{newImages.length} ảnh</span>
            <button
              type="button"
              onClick={() => setNewImages([])}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 2px' }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md, 6px)',
            border: '1px solid var(--border-color, #CBD5E1)',
            backgroundColor: 'var(--bg-secondary, #F8F9FA)',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
          title="Đính kèm ảnh hoặc dán Ctrl+V trực tiếp"
        >
          <ImageIcon size={15} />
          <span>Ảnh</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                setNewImages((prev) => [...prev, ...Array.from(e.target.files!)]);
              }
            }}
            style={{ display: 'none' }}
          />
        </label>

        <Button
          type="submit"
          variant="primary"
          disabled={isAdding || !newContent.trim()}
          leftIcon={<Plus size={15} />}
        >
          {isAdding ? 'Đang thêm...' : 'Thêm Việc'}
        </Button>
      </form>

      {/* Completed Filter Bar (Shown only in Completed Tab) */}
      {activeTab === 'completed' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            backgroundColor: 'var(--bg-primary, #FFFFFF)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md, 6px)',
            border: '1px solid var(--border-color, #E5E7EB)',
            fontSize: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Từ ngày xong:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Đến ngày xong:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm nội dung công việc..."
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
              }}
            />
          </div>

          {(fromDate || toDate || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setSearchTerm('');
              }}
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--color-error)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <RotateCcw size={12} />
              <span>Xóa lọc</span>
            </button>
          )}

          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '11px' }}>
            (Hiển thị tối đa 500 dòng gần nhất)
          </span>
        </div>
      )}

      {/* Task List */}
      <div
        style={{
          backgroundColor: 'var(--bg-primary, #FFFFFF)',
          borderRadius: 'var(--radius-lg, 8px)',
          border: '1px solid var(--border-color, #E5E7EB)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Đang tải danh sách công việc...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 8px', color: 'var(--border-color-dark)' }} />
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {activeTab === 'pending' ? 'Không có công việc nào đang chờ xử lý!' : 'Chưa có công việc nào hoàn thành trong kỳ này.'}
            </div>
            {activeTab === 'pending' && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Nhập công việc vào ô ở trên hoặc dùng tính năng Chuyển Đổi Hàng Loạt để thêm việc mới
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tasks.map((task, index) => {
              const isCompleted = task.trang_thai === 'COMPLETED';
              let taskImages: string[] = [];
              if (task.images) {
                try {
                  taskImages = JSON.parse(task.images);
                } catch {
                  taskImages = [task.images];
                }
              }

              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: index < tasks.length - 1 ? '1px solid var(--border-color, #E5E7EB)' : 'none',
                    backgroundColor: isCompleted ? '#FAFAFA' : '#FFFFFF',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #F8F9FA)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isCompleted ? '#FAFAFA' : '#FFFFFF')}
                >
                  {/* Checkbox Complete */}
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    title={isCompleted ? 'Bấm để mở lại việc' : 'Bấm để đánh dấu hoàn thành'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: isCompleted ? 'var(--color-success, #16A34A)' : 'var(--text-muted)',
                      marginTop: '2px',
                      flexShrink: 0,
                    }}
                  >
                    {isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>

                  {/* Task Content & Meta */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        lineHeight: 1.5,
                        fontWeight: isCompleted ? 400 : 500,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {task.noi_dung}
                    </div>

                    {/* Images thumbnail */}
                    {taskImages.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        {taskImages.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            onClick={() => setPreviewImage(imgUrl)}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              border: '1px solid var(--border-color, #CBD5E1)',
                              cursor: 'pointer',
                            }}
                          >
                            <img src={imgUrl} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamps */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {task.ngay_tao && <span>Tạo lúc: {task.ngay_tao.slice(0, 16)}</span>}
                      {task.ngay_hoan_thanh && (
                        <span style={{ color: 'var(--color-success, #16A34A)', fontWeight: 600 }}>
                          ✓ Hoàn thành: {task.ngay_hoan_thanh.slice(11, 16)} {task.ngay_hoan_thanh.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        title="Sửa nội dung"
                        style={{
                          border: '1px solid var(--border-color, #CBD5E1)',
                          background: 'var(--bg-primary, #FFFFFF)',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task)}
                      title="Xóa công việc"
                      style={{
                        border: '1px solid var(--border-color, #CBD5E1)',
                        background: 'var(--bg-primary, #FFFFFF)',
                        borderRadius: '4px',
                        padding: '4px 6px',
                        cursor: 'pointer',
                        color: 'var(--color-error, #DC2626)',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* MODAL: CHUYỂN ĐỔI HÀNG LOẠT & A.I OCR */}
      {/* =================================================================== */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Chuyển Đổi Danh Sách / Hình Ảnh Thành Công Việc Riêng Biệt"
        maxWidth="720px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Đã bóc tách được: <strong>{extractedLines.length}</strong> dòng công việc
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setIsBatchModalOpen(false)}>
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveBatchTasks}
                disabled={extractedLines.length === 0 || isSavingBatch}
                leftIcon={<CheckCircle2 size={15} />}
              >
                {isSavingBatch ? 'Đang Lưu...' : `Lưu ${extractedLines.length} Việc Vào Danh Sách`}
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Batch Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              backgroundColor: 'var(--bg-secondary, #F8F9FA)',
              padding: '3px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #E5E7EB)',
            }}
          >
            <button
              type="button"
              onClick={() => setBatchTab('text')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: batchTab === 'text' ? 'var(--color-primary, #F5B800)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Cách 1: Dán Danh Sách Văn Bản (List Text)
            </button>
            <button
              type="button"
              onClick={() => setBatchTab('ai')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '4px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: batchTab === 'ai' ? 'var(--color-primary, #F5B800)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Cách 2: Quét Từ Hình Ảnh Bằng A.I (Gemini OCR)
            </button>
          </div>

          {batchError && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-error-bg, #FEF2F2)',
                border: '1px solid var(--color-error-border, #FCA5A5)',
                borderRadius: '6px',
                color: 'var(--color-error-text, #991B1B)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={15} />
              <span>{batchError}</span>
            </div>
          )}

          {/* TAB 1: TEXT LIST */}
          {batchTab === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Dán danh sách công việc (mỗi dòng một việc, gạch đầu dòng hoặc đánh số đều được):
              </label>
              <textarea
                rows={7}
                value={rawTextList}
                onChange={(e) => setRawTextList(e.target.value)}
                placeholder={`Ví dụ:\n1. Kiểm tra máy in KDS Kichi Sư Vạn Hạnh\n2. Cập nhật version RK7 v2.4.0 cho nhà hàng Manwah\n- Phân quyền user app mới\n- Gặp PM trao đổi quy chuẩn in bill`}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color-dark, #D1D5DB)',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  resize: 'vertical',
                }}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExtractFromText}
                leftIcon={<ListPlus size={14} />}
                style={{ alignSelf: 'flex-start' }}
              >
                Tách Thành Từng Dòng Riêng Biệt
              </Button>
            </div>
          )}

          {/* TAB 2: AI OCR IMAGE */}
          {batchTab === 'ai' && (
            <div
              onPaste={handlePasteAiImage}
              style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
            >
              {/* API Key input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={13} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
                  <span>Google Gemini A.I Key (Lưu tự động vào trình duyệt):</span>
                </label>
                <input
                  type="password"
                  value={aiKey}
                  onChange={(e) => setAiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    fontSize: '12px',
                  }}
                />
              </div>

              {/* Paste or Upload image */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                  border: '1px dashed var(--color-primary, #F5B800)',
                  borderRadius: '6px',
                  textAlign: 'center',
                }}
              >
                <ImageIcon size={24} style={{ color: 'var(--color-primary-hover, #DDA600)', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Dán hình ảnh ghi chú trực tiếp (Ctrl + V) hoặc chọn tệp ảnh
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  A.I sẽ tự động nhận diện chữ viết tay, bảng chụp, ảnh màn hình và trích xuất thành danh sách việc
                </div>

                <div style={{ marginTop: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setAiImageBase64(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>

                {aiImageBase64 && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img src={aiImageBase64} alt="preview" style={{ maxHeight: '140px', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                    <button
                      type="button"
                      onClick={() => setAiImageBase64(null)}
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        backgroundColor: 'var(--color-error, #DC2626)',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExtractFromAI}
                disabled={isExtracting || (!aiImageBase64 && !rawTextList)}
                leftIcon={<Sparkles size={14} className={isExtracting ? 'animate-spin' : ''} />}
                style={{ alignSelf: 'flex-start' }}
              >
                {isExtracting ? 'A.I Đang Trích Xuất...' : 'Bắt Đầu Trích Xuất Bằng A.I'}
              </Button>
            </div>
          )}

          {/* Preview extracted lines */}
          {extractedLines.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Xem trước các dòng công việc sẽ được tạo ({extractedLines.length} việc):
              </span>
              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color, #E5E7EB)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary, #F8F9FA)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {extractedLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      padding: '4px 6px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <span>
                      {idx + 1}. {line}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExtractedLines((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ border: 'none', background: 'none', color: 'var(--color-error)', cursor: 'pointer' }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* =================================================================== */}
      {/* MODAL: SỬA NỘI DUNG CÔNG VIỆC */}
      {/* =================================================================== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Công Việc"
        maxWidth="500px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Lưu Thay Đổi
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Nội dung công việc:
          </label>
          <textarea
            rows={4}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #CBD5E1)',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />
        </div>
      </Modal>

      {/* Lightbox Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'zoom-out',
            padding: '20px',
          }}
        >
          <img
            src={previewImage}
            alt="full-preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
          />
        </div>
      )}
    </div>
  );
};
