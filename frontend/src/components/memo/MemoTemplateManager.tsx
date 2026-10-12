import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Copy,
  Check,
  Edit2,
  Plus,
  RefreshCw,
  ExternalLink,
  Upload,
  FileSpreadsheet,
  Settings,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  ListFilter,
  FileText,
  ChevronDown,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { memoService } from '../../services/memoService';
import {
  MemoTemplateDataResponse,
  MemoTemplateBrandItem,
} from '../../types/memo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';

// Helper: Chuẩn hóa tiếng Việt có dấu thành không dấu để tìm kiếm
const removeVietnameseTones = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

export const MemoTemplateManager: React.FC = () => {
  const { user } = useAuth();

  // Admin permission check
  const rawRoles = user?.roles || (user?.phanquyen ? user.phanquyen.split(',').map(s => s.trim().toLowerCase()) : []);
  const isSuperAdmin = !!user?.is_super_admin || user?.username?.toLowerCase() === 'admin';
  const isAdmin = isSuperAdmin || rawRoles.includes('admin') || rawRoles.includes('1') || user?.phanquyen === '1' || user?.phanquyen === '0';

  // Core Data
  const [data, setData] = useState<MemoTemplateDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedBrand, setSelectedBrand] = useState<string>(''); // '' = none, '__ALL__' = all brands, or brand_name
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchBrandText, setSearchBrandText] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Copy status feedback
  const [copiedTo, setCopiedTo] = useState<boolean>(false);
  const [copiedCc, setCopiedCc] = useState<boolean>(false);
  const [copiedBody, setCopiedBody] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isEditToOpen, setIsEditToOpen] = useState<boolean>(false);
  const [editToValue, setEditToValue] = useState<string>('');

  const [isEditBaseCcOpen, setIsEditBaseCcOpen] = useState<boolean>(false);
  const [editBaseCcValue, setEditBaseCcValue] = useState<string>('');

  const [isEditLinkOpen, setIsEditLinkOpen] = useState<boolean>(false);
  const [editLinkValue, setEditLinkValue] = useState<string>('');

  const [isEditBodyOpen, setIsEditBodyOpen] = useState<boolean>(false);
  const [editBodyValue, setEditBodyValue] = useState<string>('');

  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [brandForm, setBrandForm] = useState<{ id?: number; brand_name: string; bm_emails: string }>({
    brand_name: '',
    bm_emails: '',
  });

  const [isBrandListModalOpen, setIsBrandListModalOpen] = useState<boolean>(false);
  const [brandSearch, setBrandSearch] = useState<string>('');

  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncTab, setSyncTab] = useState<'excel' | 'text'>('excel');
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [syncText, setSyncText] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ count: number; message: string } | null>(null);

  const bodyPreviewRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Fetch Template Data
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await memoService.getTemplateData();
      setData(res);
      setEditToValue(res.to_emails);
      setEditBaseCcValue(res.base_cc_emails);
      setEditLinkValue(res.mkt_link);
      setEditBodyValue(res.email_body);
    } catch (err: any) {
      console.error('Failed to load memo template data:', err);
      setError(err?.response?.data?.detail || 'Không thể tải dữ liệu Template Mẫu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sorted active brands
  const activeBrands = useMemo(() => {
    if (!data?.brands) return [];
    return [...data.brands]
      .filter(b => b.active)
      .sort((a, b) => a.brand_name.localeCompare(b.brand_name));
  }, [data?.brands]);

  // Filtered brands for searchable dropdown (hỗ trợ tìm kiếm cả tiếng Việt có dấu và không dấu)
  const filteredBrands = useMemo(() => {
    if (!searchBrandText.trim()) return activeBrands;
    const rawQ = searchBrandText.toLowerCase().trim();
    const normQ = removeVietnameseTones(searchBrandText);
    return activeBrands.filter(b => {
      const rawName = b.brand_name.toLowerCase();
      const normName = removeVietnameseTones(b.brand_name);
      const rawMail = b.bm_emails.toLowerCase();
      const normMail = removeVietnameseTones(b.bm_emails);
      return (
        rawName.includes(rawQ) ||
        normName.includes(normQ) ||
        rawMail.includes(rawQ) ||
        normMail.includes(normQ)
      );
    });
  }, [activeBrands, searchBrandText]);

  // Handle click outside to close brand dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Find currently selected brand object
  const currentBrandObj = useMemo(() => {
    if (!selectedBrand || selectedBrand === '__ALL__') return null;
    return activeBrands.find(b => b.brand_name.toLowerCase() === selectedBrand.toLowerCase()) || null;
  }, [selectedBrand, activeBrands]);

  // Dynamically compute the CC email string based on user's selection
  const computedCc = useMemo(() => {
    if (!data) return '';
    const base = data.base_cc_emails.trim();

    if (selectedBrand === '__ALL__') {
      const allBms = data.all_bm_emails.trim();
      return allBms ? `${allBms}; ${base}` : base;
    }

    if (currentBrandObj && currentBrandObj.bm_emails.trim()) {
      return `${currentBrandObj.bm_emails.trim()}; ${base}`;
    }

    return base;
  }, [data, selectedBrand, currentBrandObj]);

  // Copy TO to Clipboard
  const handleCopyTo = async () => {
    if (!data?.to_emails) return;
    try {
      await navigator.clipboard.writeText(data.to_emails);
      setCopiedTo(true);
      showToast('Đã sao chép danh sách TO vào Clipboard!');
      setTimeout(() => setCopiedTo(false), 2000);
    } catch (err) {
      showToast('Không thể sao chép TO.', 'error');
    }
  };

  // Copy CC to Clipboard
  const handleCopyCc = async () => {
    if (!computedCc) return;
    try {
      await navigator.clipboard.writeText(computedCc);
      setCopiedCc(true);
      showToast('Đã sao chép danh sách CC vào Clipboard!');
      setTimeout(() => setCopiedCc(false), 2000);
    } catch (err) {
      showToast('Không thể sao chép CC.', 'error');
    }
  };

  // Copy Rich HTML Body to Clipboard (for Outlook / Gmail)
  const handleCopyBody = async () => {
    if (!data?.email_body) return;
    try {
      const htmlContent = data.email_body;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const plainText = tempDiv.innerText || tempDiv.textContent || '';

      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        });
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // Fallback for older browsers
        const listener = (e: ClipboardEvent) => {
          e.clipboardData?.setData('text/html', htmlContent);
          e.clipboardData?.setData('text/plain', plainText);
          e.preventDefault();
        };
        document.addEventListener('copy', listener);
        document.execCommand('copy');
        document.removeEventListener('copy', listener);
      }

      setCopiedBody(true);
      showToast('Đã sao chép nội dung Email (sẵn sàng dán trực tiếp vào Outlook)!');
      setTimeout(() => setCopiedBody(false), 2500);
    } catch (err) {
      console.error('Copy HTML body error:', err);
      // Last resort fallback: plain text copy
      try {
        await navigator.clipboard.writeText(data.email_body);
        setCopiedBody(true);
        showToast('Đã sao chép nội dung Email dạng text vào Clipboard!');
        setTimeout(() => setCopiedBody(false), 2500);
      } catch (fallbackErr) {
        showToast('Không thể sao chép nội dung Email.', 'error');
      }
    }
  };

  // Save TO
  const handleSaveTo = async () => {
    try {
      await memoService.updateTemplateTo(editToValue);
      showToast('Cập nhật danh sách TO thành công!');
      setIsEditToOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi cập nhật TO', 'error');
    }
  };

  // Save Base CC
  const handleSaveBaseCc = async () => {
    try {
      await memoService.updateTemplateBaseCc(editBaseCcValue);
      showToast('Cập nhật Base CC thành công!');
      setIsEditBaseCcOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi cập nhật Base CC', 'error');
    }
  };

  // Save Link SharePoint
  const handleSaveLink = async () => {
    try {
      await memoService.updateTemplateLink(editLinkValue);
      showToast('Cập nhật Link BM MKT thành công!');
      setIsEditLinkOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi cập nhật link', 'error');
    }
  };

  // Save Email Body
  const handleSaveBody = async () => {
    try {
      await memoService.updateTemplateBody(editBodyValue);
      showToast('Cập nhật nội dung Email mẫu thành công!');
      setIsEditBodyOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi cập nhật Email Body', 'error');
    }
  };

  // Open Edit Brand modal
  const handleOpenEditBrand = (brand: MemoTemplateBrandItem) => {
    setBrandForm({
      id: brand.id,
      brand_name: brand.brand_name,
      bm_emails: brand.bm_emails,
    });
    setIsBrandModalOpen(true);
  };

  // Open Add Brand modal
  const handleOpenAddBrand = () => {
    setBrandForm({
      id: undefined,
      brand_name: '',
      bm_emails: '',
    });
    setIsBrandModalOpen(true);
  };

  // Save Brand
  const handleSaveBrand = async () => {
    if (!brandForm.brand_name.trim()) {
      showToast('Vui lòng nhập tên nhãn hàng!', 'error');
      return;
    }
    try {
      await memoService.upsertTemplateBrand({
        id: brandForm.id,
        brand_name: brandForm.brand_name.trim(),
        bm_emails: brandForm.bm_emails.trim(),
        active: true,
      });
      showToast(`Đã lưu nhãn hàng "${brandForm.brand_name}" thành công!`);
      setIsBrandModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi lưu nhãn hàng', 'error');
    }
  };

  // Delete Brand
  const handleDeleteBrand = async (brandId: number, brandName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhãn hàng "${brandName}" khỏi Template?`)) {
      return;
    }
    try {
      await memoService.deleteTemplateBrand(brandId);
      showToast(`Đã xóa nhãn hàng "${brandName}".`);
      if (selectedBrand.toLowerCase() === brandName.toLowerCase()) {
        setSelectedBrand('');
      }
      fetchData();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi xóa nhãn hàng', 'error');
    }
  };

  // Sync BM via Excel or Text
  const handleExecuteSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      if (syncTab === 'excel') {
        if (!syncFile) {
          showToast('Vui lòng chọn file Excel tải từ SharePoint!', 'error');
          setSyncLoading(false);
          return;
        }
        const res = await memoService.syncBmExcel(syncFile);
        setSyncResult({
          count: res.total_updated,
          message: `Đồng bộ thành công ${res.total_updated} nhãn hàng từ file Excel!`,
        });
        showToast(`Đồng bộ thành công ${res.total_updated} nhãn hàng!`);
        fetchData();
      } else {
        if (!syncText.trim()) {
          showToast('Vui lòng dán dữ liệu bảng từ SharePoint / Excel!', 'error');
          setSyncLoading(false);
          return;
        }
        const res = await memoService.syncBmText(syncText);
        setSyncResult({
          count: res.total_updated,
          message: `Đã cập nhật ${res.total_updated} nhãn hàng từ bảng dữ liệu!`,
        });
        showToast(`Đã cập nhật ${res.total_updated} nhãn hàng!`);
        fetchData();
      }
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Lỗi xử lý đồng bộ BM', 'error');
    } finally {
      setSyncLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
        <div style={{ fontSize: '15px', fontWeight: 500 }}>Đang tải cấu hình Template Mẫu Gửi Mail Memo...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'success' ? '#166534' : '#991B1B',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
            fontSize: '14px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Top Banner & Quick Controls */}
      <Card
        style={{
          padding: '20px 24px',
          borderLeft: '5px solid var(--color-primary, #F5B800)',
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary-hover, #DDA600)',
                }}
              >
                <Mail size={20} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Template Mẫu Gửi Mail Memo
              </h2>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Mẫu email tiêu chuẩn thông báo chiến dịch Memo gửi Dcorp Support và Brand Manager (BM) nhãn hàng.
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {data?.mkt_link && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <a
                  href={data.mkt_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderColor: '#CBD5E1',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                    title="Mở bảng Excel Quản lý BM trên SharePoint Golden Gate"
                  >
                    <ExternalLink size={15} color="#0284C7" />
                    <span>Danh sách BM MKT (SharePoint)</span>
                  </Button>
                </a>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditLinkValue(data?.mkt_link || '');
                      setIsEditLinkOpen(true);
                    }}
                    style={{
                      border: '1px solid #CBD5E1',
                      background: 'var(--bg-card)',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--text-secondary)',
                    }}
                    title="Chỉnh sửa link SharePoint BM MKT"
                  >
                    <Edit2 size={13} />
                  </button>
                )}
              </div>
            )}

            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSyncResult(null);
                    setSyncFile(null);
                    setSyncText('');
                    setIsSyncModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: 'var(--color-primary, #F5B800)',
                    backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                    color: '#92400E',
                    fontWeight: 600,
                  }}
                  title="Cập nhật tự động danh sách BM từ file Excel tải từ SharePoint hoặc dán trực tiếp"
                >
                  <Upload size={15} />
                  <span>Cập nhật BM</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBrandListModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: '#E2E8F0',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                  }}
                  title="Xem và quản lý tất cả 45+ nhãn hàng"
                >
                  <ListFilter size={15} />
                  <span>Quản lý Nhãn Hàng ({activeBrands.length})</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditBaseCcValue(data?.base_cc_emails || '');
                    setIsEditBaseCcOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: '#E2E8F0',
                    color: 'var(--text-secondary)',
                  }}
                  title="Cấu hình danh sách Base CC mặc định"
                >
                  <Settings size={15} />
                  <span>Sửa Base CC</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* SECTION 1: TO EMAILS */}
      <Card style={{ padding: '18px 22px', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: '#111827',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.5px',
              }}
            >
              TO:
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              (Người nhận chính - Dcorp Support & Quản lý)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditToValue(data?.to_emails || '');
                  setIsEditToOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  fontSize: '12px',
                }}
              >
                <Edit2 size={13} />
                <span>Sửa TO</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyTo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: copiedTo ? '#DCFCE7' : 'var(--bg-card)',
                borderColor: copiedTo ? '#86EFAC' : '#CBD5E1',
                color: copiedTo ? '#166534' : 'var(--text-primary)',
              }}
            >
              {copiedTo ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedTo ? 'Đã Chép TO' : 'Sao chép TO'}</span>
            </Button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-secondary, #F8FAFC)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: 'var(--text-primary, #0F172A)',
            lineHeight: 1.6,
            wordBreak: 'break-all',
            userSelect: 'all',
          }}
        >
          {data?.to_emails || 'Chưa cấu hình email TO.'}
        </div>
      </Card>

      {/* SECTION 2: CC EMAILS & BRAND SELECTOR */}
      <Card style={{ padding: '18px 22px', backgroundColor: 'var(--bg-card)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: '#E11D48',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.5px',
              }}
            >
              CC:
            </span>

            {/* Brand Dropdown (Searchable Combobox) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div ref={dropdownRef} style={{ position: 'relative' }}>
                {/* Trigger Button */}
                <div
                  onClick={() => {
                    const nextState = !isDropdownOpen;
                    setIsDropdownOpen(nextState);
                    if (nextState) {
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1.5px solid var(--color-primary, #F5B800)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minWidth: '280px',
                    maxWidth: '380px',
                    userSelect: 'none',
                    boxShadow: isDropdownOpen ? '0 0 0 2px rgba(245, 184, 0, 0.25)' : 'none',
                  }}
                  title="Nhấp để tìm kiếm hoặc chọn nhãn hàng"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Search size={14} color="var(--color-primary-hover, #DDA600)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedBrand === '__ALL__'
                        ? '⭐ All Brand (Toàn bộ BM các nhãn)'
                        : currentBrandObj
                        ? `${currentBrandObj.brand_name} ${currentBrandObj.bm_emails ? `(${currentBrandObj.bm_emails.split(';')[0]})` : ''}`
                        : '-- Chọn Nhãn Hàng --'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {selectedBrand && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBrand('');
                          setSearchBrandText('');
                        }}
                        style={{
                          padding: '2px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Bỏ chọn nhãn"
                      >
                        <X size={13} />
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      color="var(--text-secondary)"
                      style={{
                        transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Dropdown Menu with Sticky Search Input */}
                {isDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      width: '380px',
                      maxHeight: '380px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      zIndex: 200,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      animation: 'fadeIn 0.15s ease',
                    }}
                  >
                    {/* Sticky Search Input */}
                    <div
                      style={{
                        padding: '8px 10px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1.5px solid var(--color-primary, #F5B800)',
                          backgroundColor: 'var(--bg-card)',
                        }}
                      >
                        <Search size={14} color="var(--color-primary-hover, #DDA600)" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Gõ tìm nhãn hàng hoặc email BM..."
                          value={searchBrandText}
                          onChange={e => setSearchBrandText(e.target.value)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            width: '100%',
                            fontSize: '13px',
                            color: 'var(--text-primary)',
                          }}
                          autoFocus
                        />
                        {searchBrandText && (
                          <button
                            type="button"
                            onClick={() => setSearchBrandText('')}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: 0,
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* List of Options */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                      {/* Option: Default (None) */}
                      {(!searchBrandText || '-- chọn nhãn hàng --'.includes(searchBrandText.toLowerCase())) && (
                        <div
                          onClick={() => {
                            setSelectedBrand('');
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            color: selectedBrand === '' ? 'var(--color-primary-hover, #DDA600)' : 'var(--text-secondary)',
                            backgroundColor: selectedBrand === '' ? 'var(--color-primary-subtle, #FFFBEA)' : 'transparent',
                            fontWeight: selectedBrand === '' ? 700 : 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>-- Chọn Nhãn Hàng (Chỉ Base CC) --</span>
                          {selectedBrand === '' && <Check size={14} color="var(--color-primary-hover, #DDA600)" />}
                        </div>
                      )}

                      {/* Option: All Brands */}
                      {(!searchBrandText ||
                        'all brand toan bo bm cac nhan'.includes(removeVietnameseTones(searchBrandText)) ||
                        'all brand toàn bộ bm các nhãn'.includes(searchBrandText.toLowerCase())) && (
                        <div
                          onClick={() => {
                            setSelectedBrand('__ALL__');
                            setIsDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            color: '#D97706',
                            backgroundColor: selectedBrand === '__ALL__' ? 'var(--color-primary-subtle, #FFFBEA)' : 'transparent',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px dashed var(--border-color)',
                            marginBottom: '4px',
                          }}
                        >
                          <span>⭐ All Brand (Toàn bộ BM các nhãn)</span>
                          {selectedBrand === '__ALL__' && <Check size={14} color="#D97706" />}
                        </div>
                      )}

                      {/* Filtered Brands */}
                      {filteredBrands.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          Không tìm thấy nhãn nào với từ khóa "<strong>{searchBrandText}</strong>"
                        </div>
                      ) : (
                        filteredBrands.map(b => {
                          const isSelected = selectedBrand.toLowerCase() === b.brand_name.toLowerCase();
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSelectedBrand(b.brand_name);
                                setIsDropdownOpen(false);
                              }}
                              style={{
                                padding: '7px 10px',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? 'var(--color-primary-subtle, #FFFBEA)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background-color 0.15s',
                              }}
                              onMouseEnter={e => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                              }}
                              onMouseLeave={e => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span style={{ fontWeight: isSelected ? 700 : 600, color: isSelected ? 'var(--color-primary-hover, #DDA600)' : 'var(--text-primary)' }}>
                                  {b.brand_name}
                                </span>
                                {b.bm_emails ? (
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    BM: {b.bm_emails}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    (Chưa có BM)
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check size={14} color="var(--color-primary-hover, #DDA600)" />}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tag indicator for selected BM */}
              {selectedBrand === '__ALL__' && (
                <span
                  style={{
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    border: '1px solid #FCD34D',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Tất cả BM nhãn hàng
                </span>
              )}

              {currentBrandObj && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentBrandObj.bm_emails ? (
                    <span
                      style={{
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FCD34D',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                      title={`BM: ${currentBrandObj.bm_emails}`}
                    >
                      BM: {currentBrandObj.bm_emails}
                    </span>
                  ) : (
                    <span
                      style={{
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                      }}
                    >
                      (Chưa có BM)
                    </span>
                  )}

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditBrand(currentBrandObj)}
                      style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                      title="Sửa BM của nhãn này"
                    >
                      <Edit2 size={12} />
                      <span>Sửa</span>
                    </Button>
                  )}
                </div>
              )}

              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddBrand}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    gap: '4px',
                    borderColor: '#E2E8F0',
                  }}
                  title="Thêm một nhãn hàng mới"
                >
                  <Plus size={13} />
                  <span>Thêm Nhãn</span>
                </Button>
              )}
            </div>
          </div>

          {/* Copy CC button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCc}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: copiedCc ? '#DCFCE7' : 'var(--bg-card)',
              borderColor: copiedCc ? '#86EFAC' : '#CBD5E1',
              color: copiedCc ? '#166534' : 'var(--text-primary)',
            }}
          >
            {copiedCc ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCc ? 'Đã Chép CC' : 'Sao chép CC'}</span>
          </Button>
        </div>

        {/* Display computed CC string */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary, #F8FAFC)',
            border: '1px solid var(--border-color, #E2E8F0)',
            borderRadius: '6px',
            padding: '12px 14px',
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: 'var(--text-primary, #0F172A)',
            lineHeight: 1.6,
            wordBreak: 'break-all',
            userSelect: 'all',
          }}
        >
          {computedCc || 'Chưa cấu hình email CC.'}
        </div>
      </Card>

      {/* SECTION 3: EMAIL BODY (PREVIEW & RICH COPY) */}
      <Card style={{ padding: '20px 24px', backgroundColor: 'var(--bg-card)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '14px',
            borderBottom: '1px solid var(--border-color, #E2E8F0)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--color-primary-hover, #DDA600)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Nội dung Email (Bản xem trước & sao chép)
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Nhấn nút bên phải để chép nguyên định dạng (màu sắc, bảng biểu) để dán trực tiếp vào Outlook hoặc Gmail.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditBodyValue(data?.email_body || '');
                  setIsEditBodyOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                }}
              >
                <Edit2 size={14} />
                <span>Sửa Nội Dung HTML</span>
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={handleCopyBody}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: copiedBody ? '#16A34A' : 'var(--color-primary, #F5B800)',
                color: copiedBody ? '#FFFFFF' : '#111827',
                fontWeight: 700,
                fontSize: '13px',
                padding: '8px 18px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              }}
            >
              {copiedBody ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedBody ? 'Đã Chép Email (Outlook)' : 'Sao chép nội dung Email'}</span>
            </Button>
          </div>
        </div>

        {/* Rendered HTML Container */}
        <div
          ref={bodyPreviewRef}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '24px',
            minHeight: '350px',
            overflowX: 'auto',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
          }}
          dangerouslySetInnerHTML={{ __html: data?.email_body || '<em>Chưa có nội dung email mẫu.</em>' }}
        />
      </Card>

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* MODAL 1: EDIT TO */}
      <Modal
        isOpen={isEditToOpen}
        onClose={() => setIsEditToOpen(false)}
        title="Chỉnh sửa danh sách email TO"
        maxWidth="600px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsEditToOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveTo}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Nhập danh sách email người nhận TO mặc định (phân cách bởi dấu chấm phẩy <code>;</code>):
          </p>
          <textarea
            value={editToValue}
            onChange={e => setEditToValue(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </Modal>

      {/* MODAL 2: EDIT BASE CC */}
      <Modal
        isOpen={isEditBaseCcOpen}
        onClose={() => setIsEditBaseCcOpen(false)}
        title="Chỉnh sửa danh sách Base CC mặc định"
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsEditBaseCcOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveBaseCc}>
              Lưu Base CC
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Danh sách email CC mặc định sẽ tự động được ghép vào sau email BM của từng nhãn hàng (phân cách bởi dấu chấm phẩy <code>;</code>):
          </p>
          <textarea
            value={editBaseCcValue}
            onChange={e => setEditBaseCcValue(e.target.value)}
            rows={6}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </Modal>

      {/* MODAL 3: EDIT / ADD BRAND */}
      <Modal
        isOpen={isBrandModalOpen}
        onClose={() => setIsBrandModalOpen(false)}
        title={brandForm.id ? `Chỉnh sửa nhãn hàng: ${brandForm.brand_name}` : 'Thêm nhãn hàng mới'}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsBrandModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveBrand}>
              {brandForm.id ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Tên Nhãn Hàng: <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Manwah, GoGi House, Ashima..."
              value={brandForm.brand_name}
              onChange={e => setBrandForm({ ...brandForm, brand_name: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Email BM phụ trách:
            </label>
            <textarea
              placeholder="VD: duong.nt@ggg.com.vn (nếu nhiều email phân cách bằng ;)"
              value={brandForm.bm_emails}
              onChange={e => setBrandForm({ ...brandForm, bm_emails: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '13px',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 4: FULL BRAND LIST MANAGEMENT */}
      <Modal
        isOpen={isBrandListModalOpen}
        onClose={() => setIsBrandListModalOpen(false)}
        title={`Quản lý danh sách Nhãn Hàng (${activeBrands.length} nhãn)`}
        maxWidth="750px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAddBrand}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>Thêm Nhãn Mới</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsBrandListModalOpen(false)}>
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <Search size={15} color="var(--text-secondary)" />
              <input
                type="text"
                placeholder="Tìm kiếm nhãn hàng hoặc email BM..."
                value={brandSearch}
                onChange={e => setBrandSearch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Table */}
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Tên Nhãn Hàng</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Email BM Phụ Trách</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px', fontWeight: 600 }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {activeBrands
                  .filter(b => {
                    if (!brandSearch.trim()) return true;
                    const rawS = brandSearch.toLowerCase().trim();
                    const normS = removeVietnameseTones(brandSearch);
                    const rawName = b.brand_name.toLowerCase();
                    const normName = removeVietnameseTones(b.brand_name);
                    const rawMail = b.bm_emails.toLowerCase();
                    const normMail = removeVietnameseTones(b.bm_emails);
                    return (
                      rawName.includes(rawS) ||
                      normName.includes(normS) ||
                      rawMail.includes(rawS) ||
                      normMail.includes(normS)
                    );
                  })
                  .map(brand => (
                    <tr
                      key={brand.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {brand.brand_name}
                      </td>
                      <td style={{ padding: '8px 12px', color: brand.bm_emails ? 'var(--text-primary)' : '#94A3B8' }}>
                        {brand.bm_emails || '---'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditBrand(brand)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: 'var(--color-primary-hover, #DDA600)',
                              padding: '4px',
                            }}
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteBrand(brand.id, brand.brand_name)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#DC2626',
                              padding: '4px',
                            }}
                            title="Xóa nhãn"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* MODAL 5: SYNC BM FROM SHAREPOINT */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Cập nhật / Đồng bộ danh sách BM MKT"
        maxWidth="640px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsSyncModalOpen(false)} disabled={syncLoading}>
              Đóng
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteSync}
              isLoading={syncLoading}
              style={{
                backgroundColor: 'var(--color-primary, #F5B800)',
                color: '#111827',
                fontWeight: 600,
              }}
            >
              {syncTab === 'excel' ? 'Tải lên & Đồng bộ Excel' : 'Xử lý & Cập nhật Dữ Liệu'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quick instructions */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
              borderRadius: '6px',
              border: '1px solid #FCD34D',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#92400E',
            }}
          >
            <strong>Hướng dẫn:</strong> Dữ liệu BM nằm trên file SharePoint của công ty. Bạn có thể mở link SharePoint, sau đó:{' '}
            <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
              <li><strong>Cách 1:</strong> Chọn File &gt; Download a Copy (.xlsx) rồi tải file lên bên dưới.</li>
              <li><strong>Cách 2:</strong> Bôi đen các dòng trong bảng Excel SharePoint, nhấn Ctrl+C rồi dán vào ô bên dưới.</li>
            </ul>
          </div>

          {/* Tab Switcher */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              gap: '16px',
            }}
          >
            <button
              onClick={() => setSyncTab('excel')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                fontWeight: syncTab === 'excel' ? 700 : 500,
                color: syncTab === 'excel' ? 'var(--color-primary-hover, #DDA600)' : 'var(--text-secondary)',
                borderBottom: syncTab === 'excel' ? '2px solid var(--color-primary, #F5B800)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <FileSpreadsheet size={16} />
              <span>Cách 1: Tải file Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => setSyncTab('text')}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                fontWeight: syncTab === 'text' ? 700 : 500,
                color: syncTab === 'text' ? 'var(--color-primary-hover, #DDA600)' : 'var(--text-secondary)',
                borderBottom: syncTab === 'text' ? '2px solid var(--color-primary, #F5B800)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <Tag size={16} />
              <span>Cách 2: Dán bảng dữ liệu copy</span>
            </button>
          </div>

          {/* Tab 1 Content: Excel File Upload */}
          {syncTab === 'excel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                style={{
                  border: '2px dashed var(--border-color, #CBD5E1)',
                  borderRadius: '8px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Upload size={28} color="var(--color-primary-hover, #DDA600)" />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {syncFile ? syncFile.name : 'Nhấp để chọn file Excel (.xlsx) tải từ SharePoint'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Hệ thống tự động lọc các dòng có Vai trò là <strong>BM</strong> và cập nhật email vào từng nhãn hàng.
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setSyncFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}

          {/* Tab 2 Content: Text/TSV Paste */}
          {syncTab === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Copy các dòng trong Excel SharePoint và paste vào khung bên dưới:
              </div>
              <textarea
                placeholder={`VD:\nManwah\tBM\tduong.nt@ggg.com.vn\nGoGi House\tBM\thuong.nguyenngoc@ggg.com.vn\n...`}
                value={syncText}
                onChange={e => setSyncText(e.target.value)}
                rows={8}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          )}

          {/* Success Summary Result */}
          {syncResult && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#166534',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={18} />
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL 6: EDIT EMAIL BODY */}
      <Modal
        isOpen={isEditBodyOpen}
        onClose={() => setIsEditBodyOpen(false)}
        title="Chỉnh sửa nội dung Email mẫu (HTML)"
        maxWidth="800px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsEditBodyOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveBody}>
              Lưu nội dung
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Bạn có thể chỉnh sửa mã HTML của email mẫu. Bảng biểu, màu sắc và cấu trúc HTML sẽ được bảo toàn khi sao chép sang Outlook.
          </p>
          <textarea
            value={editBodyValue}
            onChange={e => setEditBodyValue(e.target.value)}
            rows={14}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </Modal>

      {/* MODAL 7: EDIT SHAREPOINT LINK */}
      <Modal
        isOpen={isEditLinkOpen}
        onClose={() => setIsEditLinkOpen(false)}
        title="Chỉnh sửa đường dẫn SharePoint BM MKT"
        maxWidth="600px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="outline" onClick={() => setIsEditLinkOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveLink}>
              Lưu đường dẫn
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Nhập đường dẫn SharePoint chứa danh sách quản lý Brand Manager:
          </p>
          <input
            type="text"
            value={editLinkValue}
            onChange={e => setEditLinkValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      </Modal>
    </div>
  );
};
