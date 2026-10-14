import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Paperclip,
  Trash2,
  Edit,
  Eye,
  Calendar,
  X,
  Upload,
  ArrowRight,
  Image as ImageIcon,
  Lock,
  History,
  Settings,
  Users,
  Check,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  MemoItem,
  MemoCreate,
  MemoUpdate,
  MemoGiaHan,
  MemoStats,
  AppUserOption,
  RoundRobinUserItem,
} from '../../types/memo';
import { memoService } from '../../services/memoService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { MemoTemplateManager } from '../../components/memo/MemoTemplateManager';
import { checkIsAdmin, checkIsAppRole } from '../../utils/authUtils';

// Helper tách ghi chú người dùng và nhật ký thay đổi IT
const parseNoteAndLogs = (rawNote?: string | null) => {
  if (!rawNote) return { noteText: '', logs: [] as string[] };
  const lines = rawNote.split('\n').map(l => l.trim()).filter(Boolean);
  const logs: string[] = [];
  const textLines: string[] = [];

  for (const line of lines) {
    if (/^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]/.test(line)) {
      logs.push(line);
    } else {
      textLines.push(line);
    }
  }
  return { noteText: textLines.join('\n'), logs };
};

// Helper tách bạch thông minh nội dung mail hệ thống và hướng dẫn setup của IT
const getMemoMailAndGuide = (item?: MemoItem | null) => {
  if (!item) return { mailContent: '', guideContent: '' };
  let mailContent = (item.noidung_mail || '').trim();
  let guideContent = (item.huong_dan || '').trim();
  const noteContent = (item.note || '').trim();

  // Kiểm tra xem trong huong_dan có nội dung mail từ Salesforce hoặc đợt bổ sung không
  const hasMailInGuide =
    guideContent.includes('Yêu cầu tạo nút RK từ Salesforce Loyalty:') ||
    (guideContent.includes('- Mã Memo:') && guideContent.includes('Danh sách Sub-Memo')) ||
    /\[bổ sung/i.test(guideContent);

  if (hasMailInGuide) {
    const parts = guideContent.split(/(\n\s*<img\b|\n\s*!\[)/);
    const extractedMail = parts[0].trim();
    const remainingGuide = parts.length > 1 ? ('\n' + parts.slice(1).join('')).trim() : '';

    if (!mailContent) {
      mailContent = extractedMail;
      guideContent = remainingGuide;
    } else {
      // Nếu mailContent đã có, nhưng extractedMail chứa đoạn bổ sung mà mailContent chưa có
      if (/\[bổ sung/i.test(extractedMail) && !/\[bổ sung/i.test(mailContent)) {
        mailContent = `${mailContent}\n\n${extractedMail}`.trim();
        guideContent = remainingGuide;
      }
    }
  }

  // Nếu trong huong_dan vẫn còn sót đoạn [BỔ SUNG... đưa sang mailContent để hiển thị nổi bật
  if (/\[bổ sung/i.test(guideContent) && !/\[bổ sung/i.test(mailContent)) {
    const suppMatch = guideContent.match(/\[bổ sung[\s\S]*/i);
    if (suppMatch) {
      mailContent = mailContent ? `${mailContent}\n\n${suppMatch[0]}`.trim() : suppMatch[0].trim();
      guideContent = guideContent.replace(/\[bổ sung[\s\S]*/i, '').trim();
    }
  }

  // Nếu trong mailContent vẫn chưa có [bổ sung, nhưng trong note có ghi chú bổ sung
  if (!/\[bổ sung/i.test(mailContent) && /\[bổ sung nút bấm từ mail/i.test(noteContent)) {
    const noteSuppMatch = noteContent.match(/\[bổ sung nút bấm từ mail[\s\S]*?\]/i);
    if (noteSuppMatch) {
      mailContent = mailContent ? `${mailContent}\n\n${noteSuppMatch[0]}`.trim() : noteSuppMatch[0];
    }
  }

  return { mailContent, guideContent };
};

export const MemoPage: React.FC = () => {
  const { user } = useAuth();

  // Roles
  const isAdmin = checkIsAdmin(user);
  const isAppRole = checkIsAppRole(user);

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<'list' | 'template'>('list');

  // Data states
  const [items, setItems] = useState<MemoItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [stats, setStats] = useState<MemoStats>({
    total: 0,
    cho_setup: 0,
    da_setup_nhap: 0,
    da_public: 0,
    gia_han: 0,
  });
  const [appUsers, setAppUsers] = useState<AppUserOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [trangthaiFilter, setTrangthaiFilter] = useState<string>('0');
  const [itSetupFilter, setItSetupFilter] = useState<string>('ALL');
  const [tungayFilter, setTungayFilter] = useState<string>('');
  const [denngayFilter, setDenngayFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Tự động đóng toast thông báo sau 5 giây (hoặc 8 giây nếu lỗi)
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, alert.type === 'success' ? 5000 : 8000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Modals
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'gia_han';
    item: MemoItem | null;
  }>({
    isOpen: false,
    mode: 'create',
    item: null,
  });

  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    item: MemoItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: MemoItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    isLoading: boolean;
    isSaving: boolean;
    users: RoundRobinUserItem[];
  }>({
    isOpen: false,
    isLoading: false,
    isSaving: false,
    users: [],
  });

  // Review Fail Modal state
  const [reviewFailModalMemo, setReviewFailModalMemo] = useState<MemoItem | null>(null);
  const [reviewFailNote, setReviewFailNote] = useState<string>('');
  const [reviewFailError, setReviewFailError] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Form data state
  const [formData, setFormData] = useState<{
    ma_memo: string;
    subject_mail: string;
    ngay_batdau: string;
    ngay_ketthuc: string;
    it_setup: string;
    trangthai: string;
    nguoi_gui: string;
    huong_dan: string;
    noidung_mail: string;
    note: string;
    ten_file_memo: string;
    hoanthanh: string;
  }>({
    ma_memo: '',
    subject_mail: '',
    ngay_batdau: '',
    ngay_ketthuc: '',
    it_setup: '',
    trangthai: '0',
    nguoi_gui: '',
    huong_dan: '',
    noidung_mail: '',
    note: '',
    ten_file_memo: '',
    hoanthanh: '',
  });

  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [huongDanTab, setHuongDanTab] = useState<'edit' | 'preview'>('edit');
  const [isUploadingHuongDanImage, setIsUploadingHuongDanImage] = useState<boolean>(false);
  const [currentLogs, setCurrentLogs] = useState<string[]>([]);

  // Trạng thái kiểm tra trùng mã Memo
  const [duplicateCheck, setDuplicateCheck] = useState<{
    isChecking: boolean;
    isDuplicate: boolean;
    duplicateInfo: {
      ma_memo?: string;
      it_setup?: string;
      subject_mail?: string;
      ngay_tiepnhan?: string;
    } | null;
    errorMessage: string;
  }>({
    isChecking: false,
    isDuplicate: false,
    duplicateInfo: null,
    errorMessage: '',
  });

  const [nextItInfo, setNextItInfo] = useState<{
    user: string;
    ma_tua?: string;
    is_reclaimed?: boolean;
    reclaimed_reason?: string;
  } | null>(null);

  // Xác định xem modal hiện tại có phải là Memo Gia Hạn (Gia hạn mới hoặc Chỉnh sửa bản ghi gia hạn)
  const isCurrentGiaHan = formModal.mode === 'gia_han' || (
    formModal.mode === 'edit' && (
      String(formModal.item?.giahan).trim() === '1' ||
      String(formModal.item?.giahan).toLowerCase() === 'true'
    )
  );

  // Kiểm tra trùng mã Memo tức thì khi nhập vào ô Mã Memo (bỏ qua với Memo Gia Hạn)
  useEffect(() => {
    if (!formModal.isOpen || isCurrentGiaHan) {
      setDuplicateCheck({ isChecking: false, isDuplicate: false, duplicateInfo: null, errorMessage: '' });
      return;
    }

    const code = formData.ma_memo.trim();
    if (!code) {
      setDuplicateCheck({ isChecking: false, isDuplicate: false, duplicateInfo: null, errorMessage: '' });
      return;
    }

    // Nếu đang edit thì bỏ qua chính ID hiện tại
    const excludeId = formModal.mode === 'edit' && formModal.item ? formModal.item.id : undefined;

    setDuplicateCheck(prev => ({ ...prev, isChecking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await memoService.checkMemoCode(code, excludeId);
        if (res.exists) {
          setDuplicateCheck({
            isChecking: false,
            isDuplicate: true,
            duplicateInfo: {
              ma_memo: res.ma_memo,
              it_setup: res.it_setup,
              subject_mail: res.subject_mail,
              ngay_tiepnhan: res.ngay_tiepnhan,
            },
            errorMessage: `Mã Memo '${res.ma_memo}' đã tồn tại trong hệ thống (Được phụ trách bởi: ${res.it_setup || 'Chưa rõ'}${res.ngay_tiepnhan ? ` - Ngày: ${res.ngay_tiepnhan}` : ''}). Vui lòng kiểm tra lại!`,
          });
        } else {
          setDuplicateCheck({
            isChecking: false,
            isDuplicate: false,
            duplicateInfo: null,
            errorMessage: '',
          });
        }
      } catch (e) {
        setDuplicateCheck(prev => ({ ...prev, isChecking: false }));
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.ma_memo, formModal.isOpen, formModal.mode, formModal.item]);

  // Xử lý dán hình ảnh trực tiếp từ Clipboard (Ctrl + V)
  const handlePasteHuongDan = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setIsUploadingHuongDanImage(true);
        try {
          const res = await memoService.uploadImage(file);
          const imageTag = `\n<img src="${res.url}" alt="Screenshot" style="max-width: 100%; border-radius: 8px; margin: 10px 0; display: block;" />\n`;
          setFormData(prev => ({
            ...prev,
            huong_dan: (prev.huong_dan || '') + imageTag,
          }));
          setAlert({
            type: 'success',
            message: 'Đã dán và lưu ảnh vào thư mục máy chủ thành công!',
          });
        } catch (err: any) {
          setAlert({
            type: 'error',
            message: err?.response?.data?.detail || 'Không thể tải ảnh dán lên máy chủ.',
          });
        } finally {
          setIsUploadingHuongDanImage(false);
        }
        break;
      }
    }
  };

  // Xử lý chọn ảnh từ máy để chèn vào hướng dẫn
  const handleSelectImageForHuongDan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingHuongDanImage(true);
    try {
      const res = await memoService.uploadImage(file);
      const imageTag = `\n<img src="${res.url}" alt="${file.name}" style="max-width: 100%; border-radius: 8px; margin: 10px 0; display: block;" />\n`;
      setFormData(prev => ({
        ...prev,
        huong_dan: (prev.huong_dan || '') + imageTag,
      }));
      setAlert({
        type: 'success',
        message: `Đã chèn ảnh ${file.name} vào hướng dẫn.`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải ảnh lên máy chủ.',
      });
    } finally {
      setIsUploadingHuongDanImage(false);
      e.target.value = '';
    }
  };

  // Click vào ảnh để xem phóng to full-screen
  const handleContentImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const src = (target as HTMLImageElement).src;
      if (src) {
        setPreviewImageUrl(src);
      }
    }
  };

  // Render nội dung Hướng Dẫn chi tiết (hỗ trợ HTML, markdown image, plain text)
  const renderHuongDanContent = (rawContent?: string | null) => {
    if (!rawContent) {
      return (
        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          Chưa có nội dung hướng dẫn cấu hình cụ thể cho Memo này.
        </span>
      );
    }

    let html = rawContent.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<img src="$2" alt="$1" style="max-width: 100%; border-radius: 8px; margin: 10px 0; display: block; box-shadow: 0 2px 8px rgba(0,0,0,0.12); cursor: pointer;" />'
    );

    if (!html.includes('<p>') && !html.includes('<div>') && !html.includes('<br')) {
      html = html.replace(/\n/g, '<br/>');
    }

    return (
      <div
        onClick={handleContentImageClick}
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          lineHeight: 1.6,
          fontSize: '13px',
          color: 'var(--text-primary)',
          wordBreak: 'break-word',
        }}
      />
    );
  };

  // Helper lọc bỏ các dòng thừa, làm sạch HTML tags, chỉ giữ nội dung cần thiết
  const formatCleanMailContent = (raw?: string | null): string => {
    if (!raw) return '';
    // Loại bỏ HTML tags & decode HTML entities nếu có (VD <p>, <br>, &nbsp;, &Atilde;, ...)
    const text = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&Atilde;/g, 'Ã')
      .replace(/&atilde;/g, 'ã')
      .replace(/&Agrave;/g, 'À')
      .replace(/&agrave;/g, 'à')
      .replace(/&Aacute;/g, 'Á')
      .replace(/&aacute;/g, 'á')
      .replace(/&Eacute;/g, 'É')
      .replace(/&eacute;/g, 'é')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

    const lines = text.split('\n');
    const result: string[] = [];

    for (const rawLine of lines) {
      const trimmed = rawLine.trim();
      if (trimmed.startsWith('Yêu cầu tạo nút RK từ Salesforce Loyalty:')) continue;
      if (trimmed.startsWith('- Tên Memo:')) continue;
      if (trimmed.startsWith('- Người gửi yêu cầu:')) continue;
      if (trimmed.startsWith('- Link Salesforce:')) continue;
      result.push(rawLine);
    }

    return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  // Render nội dung mail và làm nổi bật đợt bổ sung nút bấm (nếu có)
  const renderNoidungMail = (rawContent?: string | null) => {
    const cleanedRaw = formatCleanMailContent(rawContent);
    if (!cleanedRaw) {
      return (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--border-color)',
          fontSize: '12.5px',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
        }}>
          Chưa có nội dung ghi nhận từ email cho Memo này.
        </div>
      );
    }

    // Kiểm tra xem có đoạn bổ sung nút bấm không (hỗ trợ cả hoa lẫn thường)
    const hasSupplement = /\[bổ sung/i.test(cleanedRaw);

    if (!hasSupplement) {
      return (
        <div
          style={{
            marginBottom: '16px',
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, color: '#2563eb', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={15} />
            <span>Nội Dung Yêu Cầu Từ Mail / Salesforce:</span>
          </div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
            {cleanedRaw}
          </div>
        </div>
      );
    }

    // Tách nội dung gốc và các đợt bổ sung (case-insensitive)
    const firstSuppIdx = cleanedRaw.search(/\[bổ sung/i);
    const baseContent = firstSuppIdx > 0 ? cleanedRaw.substring(0, firstSuppIdx).trim() : '';
    const supplementContent = firstSuppIdx >= 0 ? cleanedRaw.substring(firstSuppIdx).trim() : cleanedRaw;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {/* Khung NỔI BẬT ĐẶC BIỆT: Nội dung mới bổ sung gần đây */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: 'rgba(219, 39, 119, 0.07)',
            border: '2px dashed #db2777',
            boxShadow: '0 2px 8px rgba(219, 39, 119, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={17} color="#db2777" />
              <span style={{ fontWeight: 800, color: '#be185d', fontSize: '13px', textTransform: 'uppercase' }}>
                ✨ Nội Dung Mới Bổ Sung Gần Đây (Cần Tạo Thêm Nút RK):
              </span>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: '#db2777',
                color: '#ffffff',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              MỚI BỔ SUNG
            </span>
          </div>
          <div
            style={{
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#831843',
              whiteSpace: 'pre-wrap',
              fontWeight: 500,
            }}
          >
            {supplementContent}
          </div>
        </div>

        {/* Khung nội dung gốc ban đầu (nếu có) */}
        {baseContent && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color)',
              fontSize: '12.5px',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} />
              <span>Nội Dung Yêu Cầu Gốc Ban Đầu:</span>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
              {baseContent}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Load App Users list once
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await memoService.getAppUsers();
        setAppUsers(users);
      } catch (e) {
        console.error('Lỗi tải danh sách người dùng App:', e);
      }
    };
    fetchUsers();
  }, []);

  // Load Memo List
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let ttParam = trangthaiFilter;
      let ghParam: string | undefined = undefined;

      if (trangthaiFilter === 'GIA_HAN') {
        ttParam = 'ALL';
        ghParam = '1';
      }

      const res = await memoService.getList({
        search: search.trim() || undefined,
        trangthai: ttParam !== 'ALL' ? ttParam : undefined,
        giahan: ghParam,
        it_setup: itSetupFilter !== 'ALL' ? itSetupFilter : undefined,
        tungay: tungayFilter || undefined,
        denngay: denngayFilter || undefined,
        page,
        page_size: pageSize,
      });

      setItems(res.items);
      setTotal(res.total);
      setStats(res.stats);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || err?.message || 'Không thể tải danh sách Memo.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, trangthaiFilter, itSetupFilter, tungayFilter, denngayFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreate = async () => {
    let suggestedUser = '';
    try {
      const res = await memoService.getNextItSetup();
      suggestedUser = res.next_user;
      setNextItInfo({
        user: res.next_user,
        ma_tua: res.next_ma_tua,
        is_reclaimed: res.is_reclaimed,
        reclaimed_reason: res.reclaimed_reason,
      });
    } catch (e) {
      console.error(e);
      setNextItInfo(null);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    setCurrentLogs([]);
    setFormData({
      ma_memo: '',
      subject_mail: '',
      ngay_batdau: todayStr,
      ngay_ketthuc: '',
      it_setup: suggestedUser,
      trangthai: '0',
      nguoi_gui: user?.username || '',
      huong_dan: '',
      noidung_mail: '',
      note: '',
      ten_file_memo: '',
      hoanthanh: '',
    });
    setFormModal({ isOpen: true, mode: 'create', item: null });
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MemoItem) => {
    setNextItInfo(null);
    const { noteText, logs } = parseNoteAndLogs(item.note);
    const { mailContent, guideContent } = getMemoMailAndGuide(item);
    setCurrentLogs(logs);
    setFormData({
      ma_memo: item.ma_memo || '',
      subject_mail: item.subject_mail || '',
      ngay_batdau: item.ngay_batdau || '',
      ngay_ketthuc: item.ngay_ketthuc || '',
      it_setup: item.it_setup || '',
      trangthai: item.trangthai || '0',
      nguoi_gui: item.nguoi_gui || '',
      huong_dan: guideContent,
      noidung_mail: mailContent,
      note: noteText,
      ten_file_memo: item.ten_file_memo || '',
      hoanthanh: item.hoanthanh || '',
    });
    setFormModal({ isOpen: true, mode: 'edit', item });
  };

  // Open Gia Han Modal
  const handleOpenGiaHan = async (item: MemoItem) => {
    let suggestedUser = '';
    try {
      const res = await memoService.getNextItSetup();
      suggestedUser = res.next_user;
      setNextItInfo({
        user: res.next_user,
        ma_tua: res.next_ma_tua,
        is_reclaimed: res.is_reclaimed,
        reclaimed_reason: res.reclaimed_reason,
      });
    } catch (e) {
      console.error(e);
      setNextItInfo(null);
    }
    const { mailContent, guideContent } = getMemoMailAndGuide(item);
    setCurrentLogs([]);
    setFormData({
      ma_memo: item.ma_memo || '',
      subject_mail: item.subject_mail || '',
      ngay_batdau: item.ngay_ketthuc || new Date().toISOString().split('T')[0],
      ngay_ketthuc: '',
      it_setup: suggestedUser,
      trangthai: '0',
      nguoi_gui: user?.username || item.nguoi_gui || '',
      huong_dan: guideContent,
      noidung_mail: mailContent,
      note: `Gia hạn từ Memo #${item.id}`,
      ten_file_memo: item.ten_file_memo || '',
      hoanthanh: '',
    });
    setFormModal({ isOpen: true, mode: 'gia_han', item });
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const res = await memoService.uploadFile(file);
      setFormData(prev => ({ ...prev, ten_file_memo: res.filename }));
      setAlert({
        type: 'success',
        message: `Đã tải lên tệp: ${res.original_name}`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải file lên hệ thống.',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ma_memo.trim()) {
      setAlert({ type: 'error', message: 'Vui lòng nhập Mã Memo.' });
      return;
    }

    if (!isCurrentGiaHan && duplicateCheck.isDuplicate) {
      setAlert({
        type: 'error',
        message: `Mã Memo '${formData.ma_memo}' đã tồn tại trong hệ thống. Không thể tạo trùng mã!`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (formModal.mode === 'create') {
        const payload: MemoCreate = {
          ma_memo: formData.ma_memo,
          subject_mail: formData.subject_mail || undefined,
          ngay_batdau: formData.ngay_batdau || undefined,
          ngay_ketthuc: formData.ngay_ketthuc || undefined,
          it_setup: formData.it_setup || undefined,
          trangthai: formData.trangthai || '0',
          nguoi_gui: formData.nguoi_gui || undefined,
          huong_dan: formData.huong_dan || undefined,
          noidung_mail: formData.noidung_mail || undefined,
          note: formData.note || undefined,
          ten_file_memo: formData.ten_file_memo || undefined,
        };
        await memoService.create(payload);
        setAlert({ type: 'success', message: `🎉 Đã lưu và thêm mới Memo [${formData.ma_memo}] thành công!` });
      } else if (formModal.mode === 'edit' && formModal.item) {
        // Hợp nhất note người dùng và các dòng logs cũ (nếu có)
        const combinedNote = currentLogs.length > 0
          ? (formData.note.trim() ? `${formData.note.trim()}\n${currentLogs.join('\n')}` : currentLogs.join('\n'))
          : (formData.note.trim() || undefined);

        // Đảm bảo không bao giờ làm mất nội dung bổ sung nút bấm từ mail khi lưu
        let safeNoidungMail = (formData.noidung_mail || '').trim();
        if (!safeNoidungMail && formModal.item.noidung_mail) {
          safeNoidungMail = formModal.item.noidung_mail.trim();
        }
        const itemFull = `${formModal.item.noidung_mail || ''} ${formModal.item.huong_dan || ''}`;
        if (/\[bổ sung/i.test(itemFull) && !/\[bổ sung/i.test(safeNoidungMail)) {
          const matchSupp = itemFull.match(/\[bổ sung[\s\S]*/i);
          if (matchSupp) {
            safeNoidungMail = safeNoidungMail ? `${safeNoidungMail}\n\n${matchSupp[0]}`.trim() : matchSupp[0].trim();
          }
        }

        const payload: MemoUpdate = {
          ma_memo: formData.ma_memo,
          subject_mail: formData.subject_mail,
          ngay_batdau: formData.ngay_batdau || undefined,
          ngay_ketthuc: formData.ngay_ketthuc || undefined,
          it_setup: formData.it_setup,
          trangthai: formData.trangthai,
          nguoi_gui: formData.nguoi_gui,
          huong_dan: formData.huong_dan,
          noidung_mail: safeNoidungMail || undefined,
          note: combinedNote,
          ten_file_memo: formData.ten_file_memo,
          hoanthanh: formData.hoanthanh || undefined,
        };
        await memoService.update(formModal.item.id, payload);
        const isCompleteAction = formData.trangthai === '2';
        setAlert({
          type: 'success',
          message: isCompleteAction
            ? `🎉 Đã đánh dấu HOÀN THÀNH (Đã Public trên POS) Memo [${formData.ma_memo}] thành công!`
            : `✅ Đã lưu và cập nhật Memo [${formData.ma_memo}] thành công!`,
        });
      } else if (formModal.mode === 'gia_han' && formModal.item) {
        const payload: MemoGiaHan = {
          ma_memo: formData.ma_memo,
          subject_mail: formData.subject_mail,
          ngay_batdau: formData.ngay_batdau || undefined,
          ngay_ketthuc: formData.ngay_ketthuc || undefined,
          it_setup: formData.it_setup,
          trangthai: formData.trangthai,
          nguoi_gui: formData.nguoi_gui,
          huong_dan: formData.huong_dan,
          noidung_mail: formData.noidung_mail,
          note: formData.note,
          ten_file_memo: formData.ten_file_memo,
        };
        await memoService.giaHan(formModal.item.id, payload);
        setAlert({ type: 'success', message: `⏱️ Đã gia hạn Memo [${formData.ma_memo}] thành công!` });
      }

      setFormModal({ isOpen: false, mode: 'create', item: null });
      loadData();
    } catch (err: any) {
      let errorMsg = 'Thao tác thất bại, vui lòng thử lại.';
      if (err?.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
        } else {
          errorMsg = JSON.stringify(err.response.data.detail);
        }
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setAlert({
        type: 'error',
        message: errorMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Round-Robin Configuration Modal (Admin only)
  const handleOpenConfigModal = async () => {
    setConfigModal(prev => ({ ...prev, isOpen: true, isLoading: true }));
    try {
      const res = await memoService.getRoundRobinConfig();
      setConfigModal(prev => ({
        ...prev,
        isLoading: false,
        users: res.users,
      }));
    } catch (err: any) {
      setConfigModal(prev => ({ ...prev, isLoading: false, isOpen: false }));
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải cấu hình xoay vòng IT.',
      });
    }
  };

  // Toggle user active status in round-robin
  const handleToggleUserActive = (username: string) => {
    setConfigModal(prev => ({
      ...prev,
      users: prev.users.map(u =>
        u.username.toLowerCase() === username.toLowerCase()
          ? { ...u, is_active: !u.is_active }
          : u
      ),
    }));
  };

  // Save Round-Robin Configuration
  const handleSaveConfig = async () => {
    setConfigModal(prev => ({ ...prev, isSaving: true }));
    try {
      const activeUsernames = configModal.users
        .filter(u => u.is_active)
        .map(u => u.username);
      const res = await memoService.updateRoundRobinConfig(activeUsernames);
      setConfigModal({
        isOpen: false,
        isLoading: false,
        isSaving: false,
        users: res.users,
      });
      setAlert({
        type: 'success',
        message: `Đã lưu cấu hình IT xoay vòng Memo (${res.active_count}/${res.total} nhân sự tham gia).`,
      });
    } catch (err: any) {
      setConfigModal(prev => ({ ...prev, isSaving: false }));
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể lưu cấu hình xoay vòng.',
      });
    }
  };

  // Xem chi tiết hướng dẫn & nội dung Memo (mở modal chi tiết đầy đủ cả mail, note và ảnh)
  const handleViewHuongDanImage = (item: MemoItem) => {
    setDetailModal({ isOpen: true, item });
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deleteModal.item) return;
    try {
      await memoService.delete(deleteModal.item.id);
      const isChoSetup = String(deleteModal.item.trangthai || '').trim() === '0';
      const msg = isChoSetup && deleteModal.item.ma_tua && deleteModal.item.it_setup
        ? `Đã xóa Memo ${deleteModal.item.ma_memo || ''}. Mã lượt (${deleteModal.item.ma_tua}) đã được bảo lưu để bù cho ${deleteModal.item.it_setup} ở lượt kế tiếp!`
        : `Đã xóa Memo ${deleteModal.item.ma_memo || ''}.`;
      setAlert({
        type: 'success',
        message: msg,
      });
      setDeleteModal({ isOpen: false, item: null });
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể xóa Memo.',
      });
    }
  };

  // Review Memo Handlers (Admin & Super Admin)
  const handleReviewMemo = async (item: MemoItem, status: 'ok' | 'fail' | null, note?: string | null) => {
    try {
      await memoService.review(item.id, {
        review_status: status,
        review_note: note || null,
      });
      setAlert({
        type: 'success',
        message: status === 'ok'
          ? `🎉 Đã đánh giá ĐẠT (OK) & hoàn thành Memo [${item.ma_memo || ''}] thành công!`
          : (status === 'fail' ? `⚠️ Đã đánh giá KHÔNG ĐẠT (Fail) cho Memo [${item.ma_memo || ''}]!` : `Đã hủy đánh giá cho Memo [${item.ma_memo || ''}]!`),
      });
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Lỗi khi cập nhật đánh giá Memo',
      });
    }
  };

  // Quick Mark Complete (Đã Public / Hoàn thành trên POS)
  const handleQuickComplete = async (item: MemoItem) => {
    if (!window.confirm(`Xác nhận đánh dấu Memo [${item.ma_memo}] là HOÀN THÀNH (Đã Public trên POS)?`)) {
      return;
    }
    try {
      await memoService.update(item.id, {
        trangthai: '2',
      });
      setAlert({
        type: 'success',
        message: `🎉 Đã đánh dấu HOÀN THÀNH (Đã Public trên POS) Memo [${item.ma_memo}] thành công!`,
      });
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || err?.message || 'Lỗi khi đánh dấu hoàn thành Memo.',
      });
    }
  };

  const handleOpenReviewFailModal = (item: MemoItem) => {
    setReviewFailModalMemo(item);
    setReviewFailNote(item.ReviewNote || '');
    setReviewFailError('');
  };

  const handleSubmitReviewFail = async () => {
    if (!reviewFailModalMemo) return;
    if (!reviewFailNote.trim()) {
      setReviewFailError('Vui lòng nhập lý do đánh giá không đạt (Fail)!');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await handleReviewMemo(reviewFailModalMemo, 'fail', reviewFailNote.trim());
      setReviewFailModalMemo(null);
      setReviewFailNote('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let ttParam = trangthaiFilter;
      let ghParam: string | undefined = undefined;
      if (trangthaiFilter === 'GIA_HAN') {
        ttParam = 'ALL';
        ghParam = '1';
      }

      const blob = await memoService.exportExcel({
        search: search.trim() || undefined,
        trangthai: ttParam !== 'ALL' ? ttParam : undefined,
        giahan: ghParam,
        it_setup: itSetupFilter !== 'ALL' ? itSetupFilter : undefined,
        tungay: tungayFilter || undefined,
        denngay: denngayFilter || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DANH_SACH_MEMO_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể xuất file Excel.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Helper check URL
  const isUrl = (text?: string | null) => {
    if (!text) return false;
    const trimmed = text.trim();
    return trimmed.startsWith('http://') || trimmed.startsWith('https://');
  };

  // Helper status badge
  const renderStatusBadge = (statusVal?: string | null) => {
    const s = String(statusVal || '0').trim();
    if (s === '0') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FDE68A',
          }}
        >
          <Clock size={12} />
          Chờ Setup
        </span>
      );
    }
    if (s === '1') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#EDE9FE',
            color: '#6D28D9',
            border: '1px solid #DDD6FE',
          }}
        >
          <AlertCircle size={12} />
          Đã setup nháp
        </span>
      );
    }
    if (s === '4' || s === 'bo_sung') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: '#FDF2F8',
            color: '#DB2777',
            border: '1px solid #FBCFE8',
          }}
        >
          <Sparkles size={12} />
          Bổ sung nút bấm
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#DCFCE7',
          color: '#15803D',
          border: '1px solid #BBF7D0',
        }}
      >
        <CheckCircle2 size={12} />
        Đã Public
      </span>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Floating Toast Notification (Luôn hiển thị nổi bật trên góc màn hình dù cuộn trang hoặc mở modal) */}
      {alert && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 99999,
            maxWidth: '480px',
            minWidth: '320px',
            backgroundColor: alert.type === 'success' ? '#065F46' : '#991B1B',
            color: '#FFFFFF',
            padding: '14px 20px',
            borderRadius: '10px',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: 600,
            fontSize: '14px',
            border: `1.5px solid ${alert.type === 'success' ? '#34D399' : '#F87171'}`,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 size={22} style={{ color: '#34D399', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={22} style={{ color: '#F87171', flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, lineHeight: '1.4' }}>{alert.message}</span>
          <button
            type="button"
            onClick={() => setAlert(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              opacity: 0.85,
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Đóng thông báo"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Alert notify (ở đầu trang) */}
      {alert && (
        <div style={{ marginBottom: '16px' }}>
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {/* Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid var(--border-color, #E2E8F0)',
          marginBottom: '22px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontWeight: activeTab === 'list' ? 700 : 500,
            fontSize: '14px',
            color: activeTab === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'list' ? '3px solid var(--color-primary, #F5B800)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={17} color={activeTab === 'list' ? 'var(--color-primary-hover, #DDA600)' : 'currentColor'} />
          <span>Danh Sách Memo</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'list' ? 'var(--color-primary-subtle, #FFFBEA)' : 'var(--bg-secondary)',
              color: activeTab === 'list' ? '#92400E' : 'var(--text-secondary)',
              fontWeight: 600,
              border: activeTab === 'list' ? '1px solid #FCD34D' : 'none',
            }}
          >
            {total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('template')}
          style={{
            padding: '10px 18px',
            border: 'none',
            background: 'transparent',
            fontWeight: activeTab === 'template' ? 700 : 500,
            fontSize: '14px',
            color: activeTab === 'template' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'template' ? '3px solid var(--color-primary, #F5B800)' : '3px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <Mail size={17} color={activeTab === 'template' ? 'var(--color-primary-hover, #DDA600)' : 'currentColor'} />
          <span>Template Mẫu Gửi Mail Memo</span>
        </button>
      </div>

      {activeTab === 'template' ? (
        <MemoTemplateManager />
      ) : (
        <>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Quản Lý Memo
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Theo dõi tiếp nhận, phân công IT setup (Round-Robin) và trạng thái các chiến dịch Memo
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleOpenConfigModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#c7d2fe',
                backgroundColor: '#EEF2FF',
                color: '#4338CA',
                fontWeight: 600,
              }}
              title="Cấu hình danh sách nhân sự IT App tham gia xoay vòng Memo (Admin only)"
            >
              <Settings size={16} />
              <span>Cấu Hình Xoay Vòng</span>
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleExportExcel}
            isLoading={isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={16} color="#16a34a" />
            <span>Xuất Excel</span>
          </Button>

          {isAppRole && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Thêm Memo Mới</span>
            </Button>
          )}
        </div>
      </div>


      {/* Main Filter & Tabs Card */}
      <Card style={{ padding: '18px', marginBottom: '20px' }}>
        {/* Tabs Trạng thái */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '12px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { id: 'ALL', label: 'Tất Cả', count: stats.total },
            { id: '0', label: 'Chờ Setup', count: stats.cho_setup, color: '#d97706' },
          ].map(tab => {
            const isActive = trangthaiFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setTrangthaiFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: isActive ? 600 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--bg-active, #2563eb)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-secondary, #f1f5f9)',
                    color: isActive ? '#ffffff' : (tab.color || 'inherit'),
                    fontWeight: 600,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter controls row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
              }}
            />
            <input
              type="text"
              placeholder="Tìm theo Mã Memo..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 30px 8px 32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* IT Setup selector */}
          <div>
            <select
              value={itSetupFilter}
              onChange={e => {
                setItSetupFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="ALL">-- Tất Cả Người Phụ Trách IT --</option>
              {appUsers.map(u => (
                <option key={u.id} value={u.username}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date range from */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Từ ngày:</span>
            <input
              type="date"
              value={tungayFilter}
              onChange={e => {
                setTungayFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
          </div>

          {/* Date range to */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Đến ngày:</span>
            <input
              type="date"
              value={denngayFilter}
              onChange={e => {
                setDenngayFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Table Card */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <TopScrollTable maxHeight="calc(100vh - 300px)">
          <table
            style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 5,
                backgroundColor: 'var(--bg-secondary, #f8fafc)',
              }}
            >
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  borderBottom: '2px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '12px 16px', width: '50px', textAlign: 'center', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>STT</th>
                <th style={{ padding: '12px 16px', minWidth: '150px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Mã Memo</th>
                <th style={{ padding: '12px 16px', minWidth: '130px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Người Setup</th>
                <th style={{ padding: '12px 16px', minWidth: '130px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Trạng Thái</th>
                <th style={{ padding: '12px 16px', minWidth: '180px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Thời Gian Hiệu Lực</th>
                <th style={{ padding: '12px 16px', minWidth: '140px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Tiếp Nhận</th>
                <th style={{ padding: '12px 16px', minWidth: '150px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Đánh Giá</th>
                <th style={{ padding: '12px 16px', minWidth: '140px', textAlign: 'center', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <div>Đang tải dữ liệu Memo...</div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <AlertCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                    <div>Không tìm thấy Memo nào phù hợp với bộ lọc.</div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isGiaHan = String(item.giahan).trim() === '1' || String(item.giahan).toLowerCase() === 'true';
                  const isMemoCompleted = item.trangthai === '2';
                  const rowNum = (page - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={item.id}
                      className="memo-table-row"
                      onClick={() => handleViewHuongDanImage(item)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary, #fafafa)',
                      }}
                      title="Bấm vào dòng để xem chi tiết / hướng dẫn cấu hình Memo"
                    >
                      {/* STT */}
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {rowNum}
                      </td>

                      {/* Mã Memo */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.ma_memo || '---'}
                          </span>
                          {(String(item.trangthai).trim() === '4' || String(item.trangthai).trim() === 'bo_sung') && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#FDF2F8',
                                color: '#DB2777',
                                border: '1px solid #FBCFE8',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Sparkles size={10} />
                              Bổ sung nút
                            </span>
                          )}
                          {isGiaHan && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: '#E0E7FF',
                                color: '#4338CA',
                                fontWeight: 700,
                              }}
                            >
                              Gia Hạn
                            </span>
                          )}
                        </div>
                        {item.note && (() => {
                          const { noteText, logs } = parseNoteAndLogs(item.note);
                          return (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {noteText && <span>{noteText}</span>}
                              {logs.length > 0 && (
                                <span
                                  title={logs.join('\n')}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    fontSize: '10px',
                                    color: '#6D28D9',
                                    backgroundColor: '#EDE9FE',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    width: 'fit-content',
                                    fontWeight: 500,
                                  }}
                                >
                                  <History size={10} />
                                  {logs.length} lượt đổi IT
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* IT Setup */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {(item.it_setup || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 500, fontSize: '13px' }}>{item.it_setup || 'Chưa gán'}</span>
                            {item.ma_tua && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#6366f1',
                                  fontWeight: 600,
                                  lineHeight: 1.2,
                                  marginTop: '2px',
                                  letterSpacing: '0.01em',
                                }}
                                title={`Mã tua xoay vòng: ${item.ma_tua}`}
                              >
                                {item.ma_tua}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '12px 16px' }}>
                        {renderStatusBadge(item.trangthai)}
                      </td>

                      {/* Hiệu lực */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <Calendar size={13} color="var(--text-secondary)" />
                          <span>{item.ngay_batdau || '...'}</span>
                          <ArrowRight size={12} color="var(--text-secondary)" />
                          <span>{item.ngay_ketthuc || '...'}</span>
                        </div>
                      </td>

                      {/* Tiếp nhận */}
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div>{item.ngay_tiepnhan ? item.ngay_tiepnhan.substring(0, 10) : '---'}</div>
                        {item.nguoi_gui && (
                          <div style={{ fontSize: '11px', opacity: 0.8 }}>Gửi: {item.nguoi_gui}</div>
                        )}
                      </td>

                      {/* Đánh Giá (Admin & Super Admin) */}
                      <td style={{ padding: '12px 16px' }}>
                        {isAdmin ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReviewMemo(item, item.ReviewStatus === 'ok' ? null : 'ok');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  border: item.ReviewStatus === 'ok' ? '1px solid #16A34A' : '1px solid #D1D5DB',
                                  backgroundColor: item.ReviewStatus === 'ok' ? '#DCFCE7' : '#FFFFFF',
                                  color: item.ReviewStatus === 'ok' ? '#15803D' : '#6B7280',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title={
                                  item.ReviewStatus === 'ok'
                                    ? `Đã đánh giá ĐẠT bởi ${item.ReviewedBy || 'Admin'}${item.ReviewedAt ? ` (${item.ReviewedAt.substring(0, 16)})` : ''}. Bấm để hủy.`
                                    : 'Bấm để đánh giá: Đạt (OK)'
                                }
                              >
                                <CheckCircle2 size={12} color={item.ReviewStatus === 'ok' ? '#15803D' : '#9CA3AF'} />
                                <span>OK</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReviewFailModal(item);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  border: item.ReviewStatus === 'fail' ? '1px solid #DC2626' : '1px solid #D1D5DB',
                                  backgroundColor: item.ReviewStatus === 'fail' ? '#FEE2E2' : '#FFFFFF',
                                  color: item.ReviewStatus === 'fail' ? '#B91C1C' : '#6B7280',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title={
                                  item.ReviewStatus === 'fail'
                                    ? `Đã đánh giá FAIL bởi ${item.ReviewedBy || 'Admin'}${item.ReviewedAt ? ` (${item.ReviewedAt.substring(0, 16)})` : ''}${item.ReviewNote ? ': ' + item.ReviewNote : ''}. Bấm để sửa hoặc hủy.`
                                    : 'Bấm để đánh giá: Không đạt (Fail)'
                                }
                              >
                                <XCircle size={12} color={item.ReviewStatus === 'fail' ? '#B91C1C' : '#9CA3AF'} />
                                <span>Fail</span>
                              </button>
                            </div>

                            {item.ReviewStatus === 'fail' && item.ReviewNote && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#DC2626',
                                  fontStyle: 'italic',
                                  maxWidth: '160px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`Lý do: ${item.ReviewNote}`}
                              >
                                ({item.ReviewNote})
                              </span>
                            )}

                            {!item.ReviewStatus && isMemoCompleted && (
                              <span style={{ fontSize: '11px', color: '#16A34A', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                (Mặc định: Thành công)
                              </span>
                            )}
                          </div>
                        ) : (
                          item.ReviewStatus === 'fail' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '12px',
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEE2E2',
                                color: '#B91C1C'
                              }}
                              title={item.ReviewNote ? `Lý do: ${item.ReviewNote}` : 'Đánh giá không đạt'}
                            >
                              <XCircle size={12} />
                              <span>Fail{item.ReviewNote ? `: ${item.ReviewNote}` : ''}</span>
                            </span>
                          ) : item.ReviewStatus === 'ok' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '12px',
                                border: '1px solid #86EFAC',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D'
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Đạt OK</span>
                            </span>
                          ) : isMemoCompleted ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '12px',
                                border: '1px solid #86EFAC',
                                backgroundColor: '#DCFCE7',
                                color: '#15803D'
                              }}
                            >
                              <CheckCircle2 size={12} />
                              <span>Hoàn thành thành công</span>
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>-</span>
                          )
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewHuongDanImage(item);
                            }}
                            title="Xem chi tiết hướng dẫn & nội dung Memo"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'transparent',
                              color: '#2563eb',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          {isAppRole && (
                            <>
                              {item.trangthai !== '2' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickComplete(item);
                                  }}
                                  title="Đánh dấu Hoàn thành (Đã Public) nhanh 1 chạm"
                                  style={{
                                    padding: '6px',
                                    borderRadius: '6px',
                                    border: '1px solid #86EFAC',
                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                    color: '#059669',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Check size={14} />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenGiaHan(item);
                                }}
                                title="Gia hạn Memo"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'transparent',
                                  color: '#7c3aed',
                                  cursor: 'pointer',
                                }}
                              >
                                <RefreshCw size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(item);
                                }}
                                title="Chỉnh sửa Memo"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'transparent',
                                  color: '#0284c7',
                                  cursor: 'pointer',
                                }}
                              >
                                <Edit size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({ isOpen: true, item });
                                }}
                                title="Xóa Memo"
                                style={{
                                  padding: '6px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'transparent',
                                  color: '#dc2626',
                                  cursor: 'pointer',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TopScrollTable>

        {/* Phân trang */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Hiển thị <strong>{items.length}</strong> / <strong>{total}</strong> Memo (Trang {page} / {totalPages})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            >
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Trước
            </Button>
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '0 4px' }}>
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>
      </>
      )}

      {/* ================= MODAL THÊM MỚI / CHỈNH SỬA / GIA HẠN ================= */}
      {formModal.isOpen && (
        <Modal
          isOpen={formModal.isOpen}
          onClose={() => setFormModal({ isOpen: false, mode: 'create', item: null })}
          title={
            formModal.mode === 'create'
              ? 'Thêm Memo Mới'
              : formModal.mode === 'gia_han'
              ? `Gia Hạn Memo: ${formModal.item?.ma_memo || ''}`
              : isCurrentGiaHan
              ? `Chỉnh Sửa Memo Gia Hạn: ${formModal.item?.ma_memo || ''}`
              : `Chỉnh Sửa Memo: ${formModal.item?.ma_memo || ''}`
          }
          maxWidth="850px"
        >
          <form onSubmit={handleSubmitForm}>
            {alert && alert.type === 'error' && (
              <div style={{ marginBottom: '16px' }}>
                <Alert type="error" message={alert.message} onClose={() => setAlert(null)} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              {/* Mã Memo */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600 }}>
                    Mã Memo <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  {isCurrentGiaHan ? (
                    <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Lock size={12} />
                      Memo Gia Hạn (Mã cố định)
                    </span>
                  ) : (
                    <>
                      {duplicateCheck.isChecking && (
                        <span style={{ fontSize: '11px', color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                          Đang kiểm tra...
                        </span>
                      )}
                      {!duplicateCheck.isChecking && duplicateCheck.isDuplicate && (
                        <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AlertCircle size={12} />
                          Đã trùng mã!
                        </span>
                      )}
                      {!duplicateCheck.isChecking && !duplicateCheck.isDuplicate && formData.ma_memo.trim() && (
                        <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={12} />
                          Mã hợp lệ
                        </span>
                      )}
                    </>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    readOnly={isCurrentGiaHan}
                    placeholder="VD: 402600GG046"
                    value={formData.ma_memo}
                    onChange={e => !isCurrentGiaHan && setFormData({ ...formData, ma_memo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: !isCurrentGiaHan && duplicateCheck.isDuplicate
                        ? '1.5px solid #DC2626'
                        : (!duplicateCheck.isChecking && formData.ma_memo.trim() && !isCurrentGiaHan ? '1.5px solid #16A34A' : '1px solid var(--border-color)'),
                      backgroundColor: isCurrentGiaHan
                        ? 'var(--bg-secondary, #F3F4F6)'
                        : (duplicateCheck.isDuplicate ? '#FEF2F2' : 'var(--bg-primary)'),
                      color: isCurrentGiaHan
                        ? 'var(--text-secondary, #4B5563)'
                        : (duplicateCheck.isDuplicate ? '#991B1B' : 'var(--text-primary)'),
                      fontSize: '13px',
                      fontWeight: isCurrentGiaHan ? 600 : (duplicateCheck.isDuplicate ? 700 : 'normal'),
                      cursor: isCurrentGiaHan ? 'not-allowed' : 'text',
                      outline: 'none',
                      transition: 'all 0.15s ease',
                    }}
                  />
                  {isCurrentGiaHan && (
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={11} /> Mã Memo của bản ghi gia hạn được giữ cố định theo Memo gốc.
                    </div>
                  )}
                </div>

                {/* Thông báo lỗi trùng mã trực quan ngay dưới ô nhập */}
                {!isCurrentGiaHan && duplicateCheck.isDuplicate && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      borderRadius: '6px',
                      border: '1px solid #FCA5A5',
                      fontSize: '12px',
                      color: '#991B1B',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontWeight: 600,
                      minWidth: 0,
                      maxWidth: '100%',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px', color: '#DC2626' }} />
                    <div style={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      <div>{duplicateCheck.errorMessage}</div>
                      {duplicateCheck.duplicateInfo?.subject_mail && (
                        <div style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 400, marginTop: '3px', wordBreak: 'break-all' }}>
                          Tiêu đề memo cũ: <em>{duplicateCheck.duplicateInfo.subject_mail}</em>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Người phụ trách IT Setup */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  IT Phụ Trách Setup
                </label>
                {formModal.mode === 'create' ? (
                  <div>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-secondary, #f8fafc)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#EDE9FE',
                            color: '#6D28D9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {(formData.it_setup || 'A').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {formData.it_setup || 'Đang tải phân công...'}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          backgroundColor: '#EDE9FE',
                          color: '#6D28D9',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Lock size={12} />
                        Tự động xoay vòng
                      </span>
                    </div>
                    {nextItInfo?.is_reclaimed ? (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          color: '#92400E',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>⭐ {nextItInfo.reclaimed_reason || `Lượt bù mã ${nextItInfo.ma_tua} cho @${formData.it_setup}`}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        🔒 Hệ thống tự động gán theo vòng xoay khi tạo mới{nextItInfo?.ma_tua ? ` (Mã lượt: ${nextItInfo.ma_tua})` : ''}. Sau khi lưu xong, bạn có thể chỉnh sửa để đổi người nếu cần.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <select
                      value={formData.it_setup}
                      onChange={e => setFormData({ ...formData, it_setup: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    >
                      <option value="">-- Chọn IT App --</option>
                      {appUsers.map(u => (
                        <option key={u.id} value={u.username}>
                          {u.label}
                        </option>
                      ))}
                      {/* Hỗ trợ giá trị tùy chỉnh nếu có trong dữ liệu cũ */}
                      {formData.it_setup && !appUsers.some(u => u.username === formData.it_setup) && (
                        <option value={formData.it_setup}>{formData.it_setup}</option>
                      )}
                    </select>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      💡 Bạn có thể chọn lại người phụ trách. Khi đổi, hệ thống sẽ ghi 1 dòng log ghi nhận tài khoản của bạn đổi IT.
                    </div>
                  </div>
                )}
              </div>

              {/* Trạng Thái Setup - HIGHLIGHT SÁNG NHẸ NHÀNG, KHÔNG LÒE LOẸT */}
              <div
                style={{
                  gridColumn: '1 / -1',
                  minWidth: 0,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary, #F8FAFC)',
                  border: '1px solid var(--border-color, #E2E8F0)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    Trạng Thái Setup <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '12px' }}>
                    {renderStatusBadge(formData.trangthai)}
                  </span>
                </div>

                {/* Dropdown Select Trạng Thái */}
                <select
                  value={formData.trangthai}
                  onChange={e => setFormData({ ...formData, trangthai: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #CBD5E1)',
                    backgroundColor: 'var(--bg-primary, #FFFFFF)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="0">⏳ Chờ Setup (Chưa thực hiện)</option>
                  <option value="4">✨ Bổ sung nút bấm (Cần tạo thêm nút RK)</option>
                  <option value="1">📝 Đã setup nháp (Đang làm dở / Chờ kiểm tra)</option>
                  <option value="2">🚀 Đã Public (Hoàn thành trên POS)</option>
                </select>
              </div>

              {/* Ngày Bắt Đầu */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ngày Bắt Đầu Áp Dụng
                </label>
                <input
                  type="date"
                  value={formData.ngay_batdau}
                  onChange={e => setFormData({ ...formData, ngay_batdau: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Ngày Kết Thúc */}
              <div style={{ minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ngày Kết Thúc Áp Dụng
                </label>
                <input
                  type="date"
                  value={formData.ngay_ketthuc}
                  onChange={e => setFormData({ ...formData, ngay_ketthuc: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Người gửi / Người yêu cầu */}
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Người Yêu Cầu / Gửi
                </label>
                <input
                  type="text"
                  placeholder="VD: marketing.lead@ggg.com.vn"
                  value={formData.nguoi_gui}
                  onChange={e => setFormData({ ...formData, nguoi_gui: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* Tiêu Đề / Link Campaign (Full width) */}
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Tiêu Đề / Đường Dẫn Link (Salesforce Campaign / GPMS)
                </label>
                <input
                  type="text"
                  placeholder="https://g-loyalty.lightning.force.com/... hoặc tiêu đề email"
                  value={formData.subject_mail}
                  onChange={e => setFormData({ ...formData, subject_mail: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* 1: Hướng dẫn setup của IT (Full width) */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                    🛠️ Hướng Dẫn Cấu Hình / Setup Chi Tiết (IT Nhập & Dán Ảnh)
                  </label>

                  {/* Actions & Tabs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Nút chọn file ảnh từ máy */}
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: '#2563eb',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      <ImageIcon size={13} />
                      <span>{isUploadingHuongDanImage ? 'Đang lưu ảnh...' : 'Chèn ảnh từ máy'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingHuongDanImage}
                        onChange={handleSelectImageForHuongDan}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {/* Tabs Soạn thảo / Xem trước */}
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary, #f1f5f9)', borderRadius: '6px', padding: '2px' }}>
                      <button
                        type="button"
                        onClick={() => setHuongDanTab('edit')}
                        style={{
                          padding: '3px 10px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: huongDanTab === 'edit' ? 600 : 500,
                          backgroundColor: huongDanTab === 'edit' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                          color: huongDanTab === 'edit' ? '#2563eb' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Soạn thảo
                      </button>
                      <button
                        type="button"
                        onClick={() => setHuongDanTab('preview')}
                        style={{
                          padding: '3px 10px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: huongDanTab === 'preview' ? 600 : 500,
                          backgroundColor: huongDanTab === 'preview' ? 'var(--bg-primary, #ffffff)' : 'transparent',
                          color: huongDanTab === 'preview' ? '#2563eb' : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Xem trước ảnh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner hướng dẫn dán ảnh */}
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    border: '1px dashed #93c5fd',
                    color: '#1d4ed8',
                    fontSize: '11px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>💡 <strong>Hỗ trợ dán ảnh:</strong> Bạn có thể chụp màn hình và nhấn <strong>Ctrl + V</strong> trực tiếp vào ô này để dán ảnh. Ảnh tự động lưu vào thư mục hệ thống.</span>
                  {isUploadingHuongDanImage && <span style={{ fontWeight: 600, color: '#2563eb' }}>Đang lưu ảnh...</span>}
                </div>

                {huongDanTab === 'edit' ? (
                  <textarea
                    rows={6}
                    placeholder="Nhập nội dung các bước cấu hình, hoặc nhấn Ctrl + V để dán ảnh chụp màn hình trực tiếp vào đây..."
                    value={formData.huong_dan}
                    onChange={e => setFormData({ ...formData, huong_dan: e.target.value })}
                    onPaste={handlePasteHuongDan}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      lineHeight: 1.5,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      minHeight: '140px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                    }}
                  >
                    {renderHuongDanContent(formData.huong_dan)}
                  </div>
                )}
              </div>

              {/* 2: Nội dung yêu cầu từ Mail (Salesforce Loyalty) */}
              <div style={{ gridColumn: '1 / -1', minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={14} color="#64748b" />
                    <span>Nội Dung Yêu Cầu Từ Mail / Salesforce</span>
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', backgroundColor: 'var(--bg-secondary, #e2e8f0)', padding: '1px 6px', borderRadius: '4px' }}>
                      Chỉ đọc (Bảo toàn tự động)
                    </span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ⚡ Tự động quét & bảo toàn nguyên vẹn khi có email mới
                  </span>
                </div>

                {/* Khối hiển thị nội dung Mail & làm nổi bật đợt bổ sung nút bấm (nếu có) */}
                {renderNoidungMail(formData.noidung_mail)}
              </div>

              {/* Tệp đính kèm Memo */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Tệp Đính Kèm (Excel, Word, PDF)
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px dashed var(--border-color)',
                      backgroundColor: 'var(--bg-secondary, #f8fafc)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                  >
                    <Upload size={14} />
                    <span>{uploadingFile ? 'Đang tải lên...' : 'Chọn file đính kèm'}</span>
                    <input
                      type="file"
                      disabled={uploadingFile}
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {formData.ten_file_memo && (
                    <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>
                      ✓ {formData.ten_file_memo}
                    </span>
                  )}
                </div>
              </div>

              {/* Ghi chú thêm */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ghi Chú Khác
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú thêm nếu có"
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Dòng Logs Nhật Ký Thay Đổi (Chỉ hiển thị khi chỉnh sửa hoặc khi có logs) */}
            {formModal.mode === 'edit' && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  <History size={14} />
                  <span>Nhật Ký Thay Đổi / Logs Ghi Nhận</span>
                </div>
                {currentLogs.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    Chưa có lịch sử thay đổi người phụ trách IT cho Memo này. (Nếu bạn thay đổi IT phụ trách ở trên, hệ thống sẽ tự động ghi 1 dòng log vào đây khi bấm Lưu).
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentLogs.map((log, lIdx) => (
                      <div
                        key={lIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '12px',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-primary, #ffffff)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#EDE9FE',
                            color: '#6D28D9',
                            whiteSpace: 'nowrap',
                            marginTop: '1px',
                          }}
                        >
                          LOG #{lIdx + 1}
                        </span>
                        <span style={{ color: 'var(--text-primary)', flex: 1, lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cảnh báo thay đổi IT phụ trách */}
                {formData.it_setup !== formModal.item?.it_setup && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#b45309',
                      backgroundColor: '#FEF3C7',
                      border: '1px dashed #FDE68A',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>
                      Ghi nhận thay đổi: Người dùng <strong>{user?.username}</strong> đổi IT phụ trách từ <strong>{formModal.item?.it_setup || 'Chưa gán'}</strong> sang <strong>{formData.it_setup}</strong>. Một dòng log mới sẽ tự động được ghi nhận sau khi bạn bấm Lưu.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '24px',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px',
              }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormModal({ isOpen: false, mode: 'create', item: null })}
              >
                Hủy Bỏ
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || (!isCurrentGiaHan && (duplicateCheck.isDuplicate || duplicateCheck.isChecking))}
              >
                {formModal.mode === 'create'
                  ? 'Tạo Memo'
                  : formModal.mode === 'gia_han'
                  ? 'Xác Nhận Gia Hạn'
                  : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL XEM HƯỚNG DẪN & HÌNH ẢNH SETUP ================= */}
      {detailModal.isOpen && detailModal.item && (
        <Modal
            isOpen={detailModal.isOpen}
            onClose={() => setDetailModal({ isOpen: false, item: null })}
            title={`Hướng Dẫn Cấu Hình Setup: ${detailModal.item.ma_memo || ''}`}
            maxWidth="1050px"
          >
            <div>
              {/* Thanh tóm tắt thông tin Memo */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-secondary, #f8fafc)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  marginBottom: '16px',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    {detailModal.item.ma_memo}
                  </span>
                  {renderStatusBadge(detailModal.item.trangthai)}
                  {(String(detailModal.item.giahan).trim() === '1' || String(detailModal.item.giahan).toLowerCase() === 'true') && (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#E0E7FF', color: '#4338CA', fontWeight: 700 }}>
                      Gia Hạn
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', color: 'var(--text-secondary)' }}>
                  {detailModal.item.it_setup && (
                    <span>
                      Phụ trách IT: <strong style={{ color: 'var(--text-primary)' }}>{detailModal.item.it_setup}</strong>
                      {detailModal.item.ma_tua ? ` (${detailModal.item.ma_tua})` : ''}
                    </span>
                  )}
                  {detailModal.item.nguoi_gui && (
                    <span>
                      Người yêu cầu: <strong style={{ color: 'var(--text-primary)' }}>{detailModal.item.nguoi_gui}</strong>
                    </span>
                  )}
                  {(detailModal.item.ngay_batdau || detailModal.item.ngay_ketthuc) && (
                    <span>
                      Hiệu lực: <strong style={{ color: 'var(--text-primary)' }}>{detailModal.item.ngay_batdau || '...'} → {detailModal.item.ngay_ketthuc || '...'}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Khối Hướng Dẫn Của IT & 2. Khối Nội Dung Yêu Cầu Từ Mail (Đưa IT lên trên) */}
              {(() => {
                const { mailContent, guideContent } = getMemoMailAndGuide(detailModal.item);
                return (
                  <>
                    {/* 1. Khối Hướng Dẫn Cấu Hình & Ghi Chú Của IT */}
                    <div
                      style={{
                        padding: '16px 20px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-primary, #ffffff)',
                        border: '1px solid var(--border-color)',
                        marginBottom: '16px',
                        maxHeight: '60vh',
                        overflowY: 'auto',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                          🛠️ Hướng Dẫn Cấu Hình & Ghi Chú Của IT:
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          💡 Bấm trực tiếp vào hình ảnh để xem phóng to chi tiết
                        </span>
                      </div>
                      {renderHuongDanContent(guideContent)}
                    </div>

                    {/* 2. Khối Nội Dung Yêu Cầu Từ Mail (Salesforce) */}
                    {renderNoidungMail(mailContent)}
                  </>
                );
              })()}

              {/* 3. Khối Ghi Chú / Lịch Sử Cập Nhật nếu có */}
              {detailModal.item.note && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary, #f8fafc)',
                    border: '1px solid var(--border-color)',
                    marginBottom: '16px',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', fontSize: '12px' }}>
                    📝 Ghi Chú & Lịch Sử Hệ Thống:
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {detailModal.item.note}
                  </div>
                </div>
              )}

              {/* Tệp đính kèm hoặc Link ngoài nếu có */}
              {(detailModal.item.ten_file_memo || isUrl(detailModal.item.subject_mail)) && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
                  {detailModal.item.ten_file_memo && (
                    <a
                      href={memoService.getFileDownloadUrl(detailModal.item.ten_file_memo)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <Paperclip size={14} />
                      <span>Tải file đính kèm: {detailModal.item.ten_file_memo}</span>
                    </a>
                  )}

                  {isUrl(detailModal.item.subject_mail) && (
                    <a
                      href={detailModal.item.subject_mail || undefined}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        color: '#059669',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>Mở link Campaign / GPMS</span>
                    </a>
                  )}
                </div>
              )}

              {/* Action buttons footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                <Button
                  variant="outline"
                  onClick={() => setDetailModal({ isOpen: false, item: null })}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </Modal>
      )}

      {/* ================= MODAL CẤU HÌNH XOAY VÒNG IT (ADMIN ONLY) ================= */}
      {configModal.isOpen && (
        <Modal
          isOpen={configModal.isOpen}
          onClose={() => setConfigModal(prev => ({ ...prev, isOpen: false }))}
          title="Cấu Hình Danh Sách IT Xoay Vòng Memo"
          maxWidth="680px"
        >
          <div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#EEF2FF',
                border: '1px solid #C7D2FE',
                color: '#3730A3',
                fontSize: '13px',
                lineHeight: 1.5,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={18} style={{ flexShrink: 0, color: '#4F46E5' }} />
              <div>
                Hệ thống chỉ tự động gán việc xoay vòng cho các nhân sự IT App được <strong>tích chọn (✓)</strong>. Bạn có thể bỏ tích để loại trừ các nhân sự không phụ trách nghiệp vụ Memo.
              </div>
            </div>

            {configModal.isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 8px' }} />
                <div>Đang tải danh sách nhân sự IT App...</div>
              </div>
            ) : configModal.users.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Không tìm thấy tài khoản nhân sự IT App nào.
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'var(--bg-secondary, #f8fafc)',
                        borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        textAlign: 'left',
                      }}
                    >
                      <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>Tham gia</th>
                      <th style={{ padding: '10px 14px' }}>Nhân sự IT App</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', width: '140px' }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configModal.users.map((u, uIdx) => {
                      return (
                        <tr
                          key={u.id || uIdx}
                          onClick={() => handleToggleUserActive(u.username)}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: u.is_active ? 'var(--bg-primary)' : 'rgba(241, 245, 249, 0.6)',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)')}
                          onMouseLeave={e =>
                            (e.currentTarget.style.backgroundColor = u.is_active ? 'var(--bg-primary)' : 'rgba(241, 245, 249, 0.6)')
                          }
                        >
                          {/* Checkbox */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={u.is_active}
                              onChange={() => handleToggleUserActive(u.username)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#4f46e5' }}
                              onClick={e => e.stopPropagation()}
                            />
                          </td>

                          {/* Info */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '50%',
                                  backgroundColor: u.is_active ? '#EDE9FE' : '#F1F5F9',
                                  color: u.is_active ? '#6D28D9' : '#94A3B8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              >
                                {(u.username || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: u.is_active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                  {u.full_name || u.username}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  @{u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Status badge */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {u.is_active ? (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#DCFCE7',
                                  color: '#15803D',
                                  border: '1px solid #BBF7D0',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={11} />
                                Đang xoay vòng
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#F1F5F9',
                                  color: '#64748B',
                                  border: '1px solid #E2E8F0',
                                }}
                              >
                                Đã loại trừ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Đang tham gia:{' '}
                <strong style={{ color: '#4338CA' }}>
                  {configModal.users.filter(u => u.is_active).length}
                </strong>{' '}
                / {configModal.users.length} nhân sự IT
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  onClick={() => setConfigModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={configModal.isSaving}
                >
                  Hủy Bỏ
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveConfig}
                  isLoading={configModal.isSaving}
                  style={{ backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}
                >
                  Lưu Cấu Hình
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}


      {/* ================= MODAL XÁC NHẬN XÓA ================= */}
      {deleteModal.isOpen && deleteModal.item && (
        <Modal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, item: null })}
          title="Xác Nhận Xóa Memo"
          maxWidth="450px"
        >
          <div>
            <p style={{ margin: '0 0 16px', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-primary)' }}>
              Bạn có chắc chắn muốn xóa Memo{' '}
              <strong style={{ color: '#dc2626' }}>{deleteModal.item.ma_memo}</strong> không?
            </p>
            {String(deleteModal.item.trangthai || '').trim() === '0' && deleteModal.item.ma_tua && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  color: '#92400E',
                  fontSize: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  lineHeight: 1.4,
                }}
              >
                <span>
                  ⚠️ Memo đang ở trạng thái <strong>Chờ Setup</strong>. Khi xóa, mã lượt <strong>{deleteModal.item.ma_tua}</strong> sẽ tự động được bảo lưu và gán bù cho nhân sự <strong>{deleteModal.item.it_setup}</strong> ở lượt tiếp theo để không bị mất lượt.
                </span>
              </div>
            )}
            <p style={{ margin: '0 0 24px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Bản ghi sẽ được chuyển sang trạng thái ẩn an toàn (soft delete) và có thể khôi phục khi cần.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ isOpen: false, item: null })}
              >
                Hủy
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm}>
                Xác Nhận Xóa
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL PHÓNG TO HÌNH ẢNH ================= */}
      {previewImageUrl && (
        <Modal
          isOpen={!!previewImageUrl}
          onClose={() => setPreviewImageUrl(null)}
          title="Xem Phóng To Hình Ảnh"
          maxWidth="90vw"
        >
          <div style={{ textAlign: 'center', maxHeight: '80vh', overflow: 'auto', padding: '10px' }}>
            <img
              src={previewImageUrl}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              }}
            />
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <Button variant="outline" size="sm" onClick={() => setPreviewImageUrl(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL NHẬP LÝ DO ĐÁNH GIÁ FAIL ================= */}
      {reviewFailModalMemo && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isSubmittingReview) {
              setReviewFailModalMemo(null);
              setReviewFailNote('');
              setReviewFailError('');
            }
          }}
          title={`Đánh Giá Không Đạt (Fail) - Memo: ${reviewFailModalMemo.ma_memo || ''}`}
        >
          <div>
            {reviewFailModalMemo.ReviewStatus === 'fail' ? (
              <p style={{ fontSize: '13px', color: '#DC2626', margin: '0 0 12px 0', fontWeight: 500 }}>
                Memo này hiện đang được đánh giá <strong>Fail</strong> bởi{' '}
                <strong>{reviewFailModalMemo.ReviewedBy || 'Admin'}</strong>
                {reviewFailModalMemo.ReviewedAt ? ` vào lúc ${reviewFailModalMemo.ReviewedAt.substring(0, 16)}` : ''}.
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Vui lòng nhập lý do đánh giá không đạt (Fail) cho chiến dịch Memo này để ghi nhận báo cáo:
              </p>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Lý do không đạt (Bắt buộc) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <textarea
                value={reviewFailNote}
                onChange={e => {
                  setReviewFailNote(e.target.value);
                  if (reviewFailError) setReviewFailError('');
                }}
                rows={3}
                placeholder="Ví dụ: Cấu hình sai giá trị khuyến mãi, lỗi logic voucher, trễ deadline public..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: reviewFailError ? '1px solid #DC2626' : '1px solid #D1D5DB',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              {reviewFailError && (
                <span style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
                  {reviewFailError}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <div>
                {reviewFailModalMemo.ReviewStatus === 'fail' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSubmittingReview(true);
                      try {
                        await handleReviewMemo(reviewFailModalMemo, null);
                        setReviewFailModalMemo(null);
                        setReviewFailNote('');
                      } finally {
                        setIsSubmittingReview(false);
                      }
                    }}
                    disabled={isSubmittingReview}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#6B7280',
                      cursor: 'pointer'
                    }}
                  >
                    Hủy đánh giá (Reset)
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setReviewFailModalMemo(null);
                    setReviewFailNote('');
                    setReviewFailError('');
                  }}
                  disabled={isSubmittingReview}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReviewFail}
                  disabled={isSubmittingReview}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    cursor: isSubmittingReview ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSubmittingReview ? 'Đang lưu...' : 'Xác nhận Đánh giá Fail'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
