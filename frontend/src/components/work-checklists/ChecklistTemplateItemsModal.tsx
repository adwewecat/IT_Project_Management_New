import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  AlertCircle,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ChecklistTemplate } from '../../types/workChecklist';
import { workChecklistService } from '../../services/workChecklistService';

interface ChecklistTemplateItemsModalProps {
  template: ChecklistTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export const ChecklistTemplateItemsModal: React.FC<ChecklistTemplateItemsModalProps> = ({
  template,
  isOpen,
  onClose,
  onRefresh,
  isAdmin = false,
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<ChecklistTemplate | null>(template);

  // Mode: 'single' | 'batch'
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single');

  // Single add form
  const [singleTitle, setSingleTitle] = useState('');
  const [singleGroup, setSingleGroup] = useState('Chung');
  const [singleGuide, setSingleGuide] = useState('');

  // Batch add form
  const [batchGroup, setBatchGroup] = useState('Chung');
  const [batchText, setBatchText] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTemplateDetail = async () => {
    if (!template) return;
    try {
      const res = await workChecklistService.getTemplateDetail(template.id);
      setCurrentTemplate(res);
    } catch (err) {
      console.error('Lỗi tải chi tiết sườn:', err);
    }
  };

  useEffect(() => {
    if (isOpen && template) {
      setCurrentTemplate(template);
      loadTemplateDetail();
      setSingleTitle('');
      setSingleGroup('Chung');
      setSingleGuide('');
      setBatchText('');
      setErrorMsg(null);
    }
  }, [isOpen, template]);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate || !singleTitle.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await workChecklistService.addTemplateItem(currentTemplate.id, {
        tieu_de: singleTitle.trim(),
        nhom: singleGroup.trim() || 'Chung',
        huong_dan: singleGuide.trim() || undefined,
      });
      setSingleTitle('');
      await loadTemplateDetail();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Không thể thêm mục.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate || !batchText.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await workChecklistService.batchAddTemplateItems(currentTemplate.id, {
        nhom: batchGroup.trim() || 'Chung',
        raw_text: batchText.trim(),
      });
      setBatchText('');
      await loadTemplateDetail();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Không thể thêm danh sách mục.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục này khỏi sườn?')) return;
    try {
      await workChecklistService.deleteTemplateItem(itemId);
      await loadTemplateDetail();
      onRefresh();
    } catch (err) {
      alert('Không thể xóa mục.');
    }
  };

  if (!isOpen || !currentTemplate) return null;

  const items = currentTemplate.items || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={20} style={{ color: 'var(--color-primary)' }} />
          <span>{isAdmin ? `Quản Lý Các Mục Của Sườn: ${currentTemplate.ten_suon}` : `Xem Danh Sách Mục Sườn: ${currentTemplate.ten_suon}`}</span>
        </div>
      }
      maxWidth="800px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

        {/* Chuyển tab chế độ thêm: Thêm từng mục / Dán danh sách nhiều dòng (Chỉ Admin / Super Admin) */}
        {isAdmin && (
          <>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>
          <button
            type="button"
            onClick={() => setAddMode('single')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: addMode === 'single' ? 'var(--color-primary)' : '#F3F4F6',
              color: addMode === 'single' ? '#111827' : '#4B5563',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={14} />
            <span>+ Thêm Từng Mục Nhỏ</span>
          </button>

          <button
            type="button"
            onClick={() => setAddMode('batch')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: addMode === 'batch' ? 'var(--color-primary)' : '#F3F4F6',
              color: addMode === 'batch' ? '#111827' : '#4B5563',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={14} />
            <span>Dán Nhiều Dòng (Tự Bóc Tách)</span>
          </button>
        </div>

        {/* Form Single Add */}
        {addMode === 'single' && (
          <form
            onSubmit={handleAddSingle}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr auto',
              gap: '10px',
              alignItems: 'end',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Nhóm Mục
              </label>
              <input
                type="text"
                value={singleGroup}
                onChange={(e) => setSingleGroup(e.target.value)}
                placeholder="VD: Cài đặt, Order..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Tên Mục Cần Kiểm Tra <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={singleTitle}
                onChange={(e) => setSingleTitle(e.target.value)}
                placeholder="VD: Test cài đè bản mới vào bản cũ..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <Button type="submit" disabled={submitting} style={{ backgroundColor: 'var(--color-primary)', color: '#111827', fontWeight: 600 }}>
              + Thêm Mục
            </Button>
          </form>
        )}

        {/* Form Batch Add */}
        {addMode === 'batch' && (
          <form
            onSubmit={handleAddBatch}
            style={{
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Nhóm Mục Áp Dụng
              </label>
              <input
                type="text"
                value={batchGroup}
                onChange={(e) => setBatchGroup(e.target.value)}
                placeholder="VD: Order & Bán Hàng..."
                style={{ width: '100%', maxWidth: '300px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Dán Danh Sách Nhiều Dòng (Mỗi dòng sẽ thành 1 mục kiểm tra con)
              </label>
              <textarea
                rows={5}
                required
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={`1. Test cài đè bản mới vào bản cũ\n2. Test đăng nhập\n3. Test order món\n4. Test thanh toán thẻ...`}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={submitting} style={{ backgroundColor: 'var(--color-primary)', color: '#111827', fontWeight: 600 }}>
                {submitting ? 'Đang Phân Tách...' : 'Tự Động Thêm Danh Sách'}
              </Button>
            </div>
          </form>
        )}
      </>
    )}

        {/* Danh sách các mục con hiện có */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Danh Sách Các Mục Kiểm Tra Trong Sườn ({items.length} mục):
          </div>

          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}
          >
            {items.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                {isAdmin ? 'Sườn này hiện chưa có mục nào. Hãy dùng ô phía trên để thêm các mục kiểm tra!' : 'Sườn này hiện chưa có mục kiểm tra nào.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid #F3F4F6',
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ fontSize: '12px', color: '#9CA3AF', width: '24px', fontWeight: 600 }}>
                        #{idx + 1}
                      </span>
                      {it.nhom && (
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#E5E7EB',
                            color: '#374151',
                            fontWeight: 600,
                          }}
                        >
                          {it.nhom}
                        </span>
                      )}
                      <span style={{ fontSize: '13.5px', color: '#111827', fontWeight: 500 }}>
                        {it.tieu_de}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(it.id)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#DC2626',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Xóa mục này"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
          <Button variant="primary" onClick={onClose}>
            Hoàn Tất
          </Button>
        </div>
      </div>
    </Modal>
  );
};
