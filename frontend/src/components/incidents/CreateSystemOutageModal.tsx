import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Image as ImageIcon,
  Paperclip,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Server,
  User,
  Search,
  Plus,
  ChevronDown,
  X,
  Clock,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { SystemIncidentItem } from '../../types/systemIncident';
import { systemIncidentService } from '../../services/systemIncidentService';
import { useAuth } from '../../contexts/AuthContext';

interface CreateSystemOutageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  incidentToEdit?: SystemIncidentItem | null;
}

const DEFAULT_SYSTEM_OPTIONS = [
  'SAP',
  'CO',
  'SO',
  'KDS',
  'GPOS',
  'GPOS-CO-SO',
  'GPOS-KDS',
  'PIM',
  'SSO / Portal',
  'Mạng / VPN Datacenter',
  'Internet Nhà Hàng',
  'App Golden Spoon',
  'Cổng Thanh Toán (VNPay, Momo, ZaloPay)',
  'Hệ thống Hóa Đơn Điện Tử',
  'Server Database & Dịch vụ Cloud',
  'Email & Office 365',
  'Wifi Marketing',
];

const IMPACT_SCOPE_OPTIONS = [
  {
    value: 'Cả Nước',
    label: 'Cả Nước',
    desc: 'Toàn bộ nhà hàng & user toàn quốc',
    badgeColor: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  {
    value: 'Miền Nam',
    label: 'Miền Nam',
    desc: 'Khu vực miền Nam',
    badgeColor: '#C2410C',
    bgColor: '#FFF7ED',
    borderColor: '#FB923C',
  },
  {
    value: '1 số user / Nhà hàng',
    label: '1 số user / Nhà hàng',
    desc: 'Phạm vi cục bộ, một số điểm/người dùng',
    badgeColor: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
];

export const CreateSystemOutageModal: React.FC<CreateSystemOutageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  incidentToEdit,
}) => {
  const isEditMode = !!incidentToEdit;

  const { user } = useAuth();

  // Kiểm tra quyền: Chỉ IT Application (app / 2) hoặc Quản trị viên (admin / 0 / 1) mới có quyền lưu/sửa sự cố hệ thống
  const hasOutagePermission = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    const uname = (user.username || '').toLowerCase().trim();
    if (['admin', 'administrator', 'dung.nguyenanh'].includes(uname)) return true;
    const roles = (user.roles || []).map((r) => String(r).toLowerCase().trim());
    const pq = String(user.phanquyen || '').toLowerCase().trim();
    const roleName = String(user.role_name || '').toLowerCase().trim();

    const isAdmin = roles.includes('admin') || ['0', '1'].includes(pq) || roleName.includes('admin');
    if (isAdmin) return true;

    const isApp =
      roles.includes('app') ||
      roles.includes('2') ||
      roles.some((r) => r.includes('app') || r.includes('application')) ||
      pq === '2' ||
      pq.includes('app') ||
      roleName.includes('app') ||
      roleName.includes('application');
    return isApp;
  }, [user]);

  const [tieude, setTieude] = useState('');
  const [availableSystems, setAvailableSystems] = useState<string[]>(DEFAULT_SYSTEM_OPTIONS);
  const [selectedSystems, setSelectedSystems] = useState<string[]>(['SAP']);
  const [systemSearch, setSystemSearch] = useState('');
  const [isSystemDropdownOpen, setIsSystemDropdownOpen] = useState(false);
  const [mucDo, setMucDo] = useState('Cả Nước');

  // Trạng thái sự cố
  const [trangThai, setTrangThai] = useState<'DANG_XU_LY' | 'DA_KHAC_PHUC' | 'THEO_DOI'>('DANG_XU_LY');

  // Thời gian bắt đầu
  const [startDateStr, setStartDateStr] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');

  // Thời gian kết thúc (khi đã khắc phục)
  const [endDateStr, setEndDateStr] = useState('');
  const [endTimeStr, setEndTimeStr] = useState('');

  // Thông tin khắc phục
  const [nguyenNhan, setNguyenNhan] = useState('');
  const [bienPhapKhacPhuc, setBienPhapKhacPhuc] = useState('');

  const [noiDung, setNoiDung] = useState('');
  const [nguoiXuLy, setNguoiXuLy] = useState('');
  const [initialNote, setInitialNote] = useState('');

  // Existing files & images when editing
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);

  // Newly added files & images
  const [pastedImages, setPastedImages] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load distinct systems from backend
  useEffect(() => {
    if (isOpen) {
      systemIncidentService
        .getSystems()
        .then((systems) => {
          if (systems && systems.length > 0) {
            const set = new Set([...systems, ...DEFAULT_SYSTEM_OPTIONS]);
            setAvailableSystems(Array.from(set));
          }
        })
        .catch((e) => console.warn('Failed to load systems list:', e));
    }
  }, [isOpen]);

  // Reset or populate form when modal opens or incidentToEdit changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setPastedImages([]);
      setSelectedFiles([]);
      setSystemSearch('');
      setIsSystemDropdownOpen(false);

      if (incidentToEdit) {
        // Mode: EDIT
        setTieude(incidentToEdit.tieude || '');
        if (incidentToEdit.he_thong) {
          const sysList = incidentToEdit.he_thong
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          setSelectedSystems(sysList.length > 0 ? sysList : ['SAP']);
        } else {
          setSelectedSystems(['SAP']);
        }

        setMucDo(incidentToEdit.muc_do || 'Cả Nước');
        const st = (incidentToEdit.trang_thai || 'DANG_XU_LY') as any;
        setTrangThai(st);

        // Bắt đầu
        if (incidentToEdit.thoi_gian_bat_dau) {
          const parts = incidentToEdit.thoi_gian_bat_dau.split(' ');
          setStartDateStr(parts[0] || '');
          setStartTimeStr(parts[1] ? parts[1].slice(0, 5) : '00:00');
        } else {
          const now = new Date();
          setStartDateStr(now.toISOString().split('T')[0]);
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          setStartTimeStr(`${hh}:${mm}`);
        }

        // Kết thúc
        if (incidentToEdit.thoi_gian_ket_thuc) {
          const parts = incidentToEdit.thoi_gian_ket_thuc.split(' ');
          setEndDateStr(parts[0] || '');
          setEndTimeStr(parts[1] ? parts[1].slice(0, 5) : '00:00');
        } else {
          const now = new Date();
          setEndDateStr(now.toISOString().split('T')[0]);
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          setEndTimeStr(`${hh}:${mm}`);
        }

        setNguyenNhan(incidentToEdit.nguyen_nhan || '');
        setBienPhapKhacPhuc(incidentToEdit.bien_phap_khac_phuc || '');
        setNoiDung(incidentToEdit.noi_dung || '');
        setNguoiXuLy(incidentToEdit.nguoi_xu_ly || '');
        setInitialNote('');

        // Parse existing images/files
        if (incidentToEdit.images) {
          try {
            setExistingImages(JSON.parse(incidentToEdit.images));
          } catch {
            setExistingImages([incidentToEdit.images]);
          }
        } else {
          setExistingImages([]);
        }

        if (incidentToEdit.files) {
          try {
            setExistingFiles(JSON.parse(incidentToEdit.files));
          } catch {
            setExistingFiles([incidentToEdit.files]);
          }
        } else {
          setExistingFiles([]);
        }
      } else {
        // Mode: CREATE
        setTieude('');
        setSelectedSystems(['SAP']);
        setMucDo('Cả Nước');
        setTrangThai('DANG_XU_LY');

        const now = new Date();
        const dateNow = now.toISOString().split('T')[0];
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const timeNow = `${hh}:${mm}`;

        setStartDateStr(dateNow);
        setStartTimeStr(timeNow);
        setEndDateStr(dateNow);
        setEndTimeStr(timeNow);

        setNoiDung('');
        setNguyenNhan('');
        setBienPhapKhacPhuc('');
        setNguoiXuLy('');
        setInitialNote('');
        setExistingImages([]);
        setExistingFiles([]);
      }
    }
  }, [isOpen, incidentToEdit]);

  // Calculate live downtime text
  const calculateDowntime = (startD: string, startT: string, endD: string, endT: string): string | null => {
    if (!startD || !startT || !endD || !endT) return null;
    const start = new Date(`${startD}T${startT}:00`);
    const end = new Date(`${endD}T${endT}:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (end < start) return 'Thời gian kết thúc nhỏ hơn thời gian bắt đầu';
    const diffMins = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    if (diffMins < 60) return `${diffMins} phút`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hrs} giờ ${mins} phút (${diffMins} phút)` : `${hrs} giờ (${diffMins} phút)`;
  };

  const currentDowntimeText = calculateDowntime(startDateStr, startTimeStr, endDateStr, endTimeStr);

  // Multi-system helpers
  const handleToggleSystem = (sys: string) => {
    const trimmed = sys.trim();
    if (!trimmed) return;
    setSelectedSystems((prev) => {
      if (prev.includes(trimmed)) {
        return prev.filter((s) => s !== trimmed);
      } else {
        return [...prev, trimmed];
      }
    });
  };

  const handleAddCustomSystem = (sys: string) => {
    const trimmed = sys.trim();
    if (!trimmed) return;
    if (!selectedSystems.includes(trimmed)) {
      setSelectedSystems((prev) => [...prev, trimmed]);
    }
    if (!availableSystems.includes(trimmed)) {
      setAvailableSystems((prev) => [trimmed, ...prev]);
    }
    setSystemSearch('');
    setIsSystemDropdownOpen(false);
  };

  const handleRemoveSystem = (sys: string) => {
    setSelectedSystems((prev) => prev.filter((s) => s !== sys));
  };

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
          const newFile = new File([file], `sys_paste_${Date.now()}_${newImgs.length}.${ext}`, {
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

  const handleRemovePastedImage = (index: number) => {
    setPastedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasOutagePermission) {
      setErrorMsg('Bạn không có quyền thực hiện chức năng này (Yêu cầu quyền IT Application hoặc Quản trị viên).');
      return;
    }

    if (!tieude.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề tóm tắt sự cố hệ thống!');
      return;
    }

    if (selectedSystems.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất một hệ thống / dịch vụ bị ảnh hưởng!');
      return;
    }

    if (!noiDung.trim()) {
      setErrorMsg('Vui lòng nhập nội dung chi tiết lỗi / phạm vi ảnh hưởng!');
      return;
    }

    if (!startDateStr) {
      setErrorMsg('Vui lòng chọn ngày phát sinh sự cố!');
      return;
    }

    const finalStartTimeStr = startTimeStr || '00:00';
    const combinedStart = `${startDateStr}T${finalStartTimeStr}:00`;

    let combinedEnd: string | undefined = undefined;
    if (trangThai === 'DA_KHAC_PHUC') {
      if (!endDateStr) {
        setErrorMsg('Sự cố đã khắc phục: Vui lòng chọn ngày hoàn thành khắc phục!');
        return;
      }
      const finalEndTimeStr = endTimeStr || '00:00';
      combinedEnd = `${endDateStr}T${finalEndTimeStr}:00`;

      const startMs = new Date(combinedStart).getTime();
      const endMs = new Date(combinedEnd).getTime();
      if (endMs < startMs) {
        setErrorMsg('Thời gian khắc phục (kết thúc) không thể nhỏ hơn thời gian bắt đầu phát sinh!');
        return;
      }
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      let newlyUploadedImages: string[] = [];
      let newlyUploadedFiles: string[] = [];

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
            newlyUploadedImages.push(url);
          } else {
            newlyUploadedFiles.push(url);
          }
        });
      }

      const allFinalImages = [...existingImages, ...newlyUploadedImages];
      const allFinalFiles = [...existingFiles, ...newlyUploadedFiles];
      const finalSystem = selectedSystems.join(', ');

      if (isEditMode && incidentToEdit) {
        // CẬP NHẬT SỰ CỐ
        await systemIncidentService.updateSystemIncident(incidentToEdit.id, {
          tieude: tieude.trim(),
          he_thong: finalSystem,
          muc_do: mucDo,
          thoi_gian_bat_dau: combinedStart,
          thoi_gian_ket_thuc: trangThai === 'DA_KHAC_PHUC' ? combinedEnd : null,
          trang_thai: trangThai,
          noi_dung: noiDung.trim(),
          nguyen_nhan: nguyenNhan.trim() || null,
          bien_phap_khac_phuc: bienPhapKhacPhuc.trim() || null,
          nguoi_xu_ly: nguoiXuLy.trim() || null,
          images: allFinalImages.length > 0 ? JSON.stringify(allFinalImages) : null,
          files: allFinalFiles.length > 0 ? JSON.stringify(allFinalFiles) : null,
        });
      } else {
        // TẠO MỚI SỰ CỐ (có thể hoàn thành luôn hoặc đang xử lý)
        await systemIncidentService.createSystemIncident({
          tieude: tieude.trim(),
          he_thong: finalSystem,
          muc_do: mucDo,
          thoi_gian_bat_dau: combinedStart,
          thoi_gian_ket_thuc: trangThai === 'DA_KHAC_PHUC' ? combinedEnd : undefined,
          trang_thai: trangThai,
          noi_dung: noiDung.trim(),
          nguyen_nhan: nguyenNhan.trim() || undefined,
          bien_phap_khac_phuc: bienPhapKhacPhuc.trim() || undefined,
          nguoi_xu_ly: nguoiXuLy.trim() || undefined,
          images: allFinalImages.length > 0 ? JSON.stringify(allFinalImages) : undefined,
          files: allFinalFiles.length > 0 ? JSON.stringify(allFinalFiles) : undefined,
          note: initialNote.trim() || undefined,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      const status = err.response?.status;
      const rawDetail = err.response?.data?.detail;
      let msg = '';
      if (status === 403) {
        msg =
          typeof rawDetail === 'string' && rawDetail.trim()
            ? rawDetail
            : 'Bạn không có quyền thực hiện chức năng này (Yêu cầu quyền IT Application hoặc Quản trị viên).';
      } else if (status === 401) {
        msg = 'Phiên làm việc đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.';
      } else if (status === 422) {
        if (Array.isArray(rawDetail)) {
          msg =
            'Dữ liệu nhập vào chưa hợp lệ: ' +
            rawDetail
              .map((d: any) => `${d.loc ? d.loc.slice(-1)[0] : 'Trường'}: ${d.msg}`)
              .join('; ');
        } else {
          msg = typeof rawDetail === 'string' ? rawDetail : 'Dữ liệu không đúng định dạng.';
        }
      } else if (typeof rawDetail === 'string' && rawDetail.trim()) {
        msg = rawDetail;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (status === 500) {
        msg = `Lỗi hệ thống máy chủ (500)${
          typeof err.response?.data === 'string' && err.response.data.length < 100
            ? ': ' + err.response.data
            : ''
        }. Vui lòng thử lại sau hoặc báo quản trị viên.`;
      } else {
        msg = err.message || 'Không thể lưu sự cố hệ thống. Vui lòng kiểm tra lại kết nối mạng.';
      }
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditMode
          ? `Chỉnh Sửa Sự Cố Toàn Hệ Thống (#SYS-${incidentToEdit?.id})`
          : 'Ghi Nhận Lỗi Toàn Hệ Thống / Lỗi Diện Rộng'
      }
      maxWidth="820px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {trangThai === 'DA_KHAC_PHUC' && (
              <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Ghi nhận dưới trạng thái Đã Khắc Phục (Hoàn thành)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={uploading}>
              Hủy Bỏ
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={uploading || !hasOutagePermission}
              leftIcon={<CheckCircle2 size={16} />}
              title={
                !hasOutagePermission
                  ? 'Bạn không có quyền thực hiện chức năng này (Yêu cầu IT Application hoặc Admin)'
                  : undefined
              }
              style={{
                opacity: !hasOutagePermission ? 0.6 : 1,
                cursor: !hasOutagePermission ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading
                ? 'Đang Lưu...'
                : isEditMode
                ? 'Lưu Thay Đổi Sự Cố'
                : 'Lưu Sự Cố Hệ Thống'}
            </Button>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {!hasOutagePermission && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #F87171',
              borderRadius: 'var(--radius-md, 8px)',
              color: '#991B1B',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              lineHeight: 1.5,
            }}
          >
            <ShieldAlert size={22} style={{ flexShrink: 0, color: '#DC2626' }} />
            <div>
              <strong>Thông báo phân quyền:</strong> Tài khoản của bạn (
              <strong>{user?.role_name || user?.username || 'Chưa phân quyền'}</strong>
              ) không có quyền ghi nhận hoặc chỉnh sửa sự cố toàn hệ thống. Chức năng này yêu cầu quyền{' '}
              <strong style={{ textDecoration: 'underline' }}>IT Application</strong> hoặc{' '}
              <strong style={{ textDecoration: 'underline' }}>Quản trị viên</strong>.
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #F87171',
              borderRadius: 'var(--radius-md, 8px)',
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

        {/* Tiêu đề */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Tiêu Đề Sự Cố Tóm Tắt <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <input
            type="text"
            value={tieude}
            onChange={(e) => setTieude(e.target.value)}
            placeholder="Ví dụ: Mất kết nối VPN Datacenter nhà hàng miền Nam / Gián đoạn thanh toán VNPay toàn quốc..."
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
            }}
            required
          />
        </div>

        {/* LỰA CHỌN NHIỀU HỆ THỐNG (Multi-select Systems) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Server size={15} />
              <span>Hệ Thống / Dịch Vụ Bị Ảnh Hưởng (Có thể chọn nhiều)</span>
              <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Đã chọn: <strong>{selectedSystems.length}</strong> hệ thống
            </span>
          </div>

          {/* Vùng hiển thị các tag đã chọn */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-secondary, #F8FAFC)',
              minHeight: '42px',
              alignItems: 'center',
            }}
          >
            {selectedSystems.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
                Chưa chọn hệ thống nào. Vui lòng bấm vào các gợi ý bên dưới hoặc tìm kiếm...
              </span>
            ) : (
              selectedSystems.map((sys) => (
                <span
                  key={sys}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '14px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #93C5FD',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <Server size={11} />
                  <span>{sys}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSystem(sys)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#60A5FA',
                      cursor: 'pointer',
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={`Bỏ chọn ${sys}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Input Tìm kiếm & Thêm hệ thống */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 'var(--radius-md, 6px)',
                border: isSystemDropdownOpen
                  ? '1px solid var(--color-primary, #F5B800)'
                  : '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                boxShadow: isSystemDropdownOpen ? '0 0 0 2px rgba(245,184,0,0.25)' : 'none',
              }}
            >
              <Search size={14} style={{ color: '#64748B', marginRight: '8px', flexShrink: 0 }} />
              <input
                type="text"
                value={systemSearch}
                onChange={(e) => {
                  setSystemSearch(e.target.value);
                  if (!isSystemDropdownOpen) setIsSystemDropdownOpen(true);
                }}
                onFocus={() => setIsSystemDropdownOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (systemSearch.trim()) {
                      handleAddCustomSystem(systemSearch.trim());
                    }
                  }
                }}
                placeholder="Gõ để tìm kiếm hoặc thêm hệ thống mới (nhấn Enter)..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '12px',
                  width: '100%',
                  color: 'var(--text-primary)',
                }}
              />
              {systemSearch && (
                <button
                  type="button"
                  onClick={() => setSystemSearch('')}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: '#94A3B8',
                  }}
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsSystemDropdownOpen(!isSystemDropdownOpen)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '2px 0 2px 4px',
                  color: '#64748B',
                }}
              >
                <ChevronDown size={15} />
              </button>
            </div>

            {/* Dropdown Menu Multi-select */}
            {isSystemDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 50,
                }}
              >
                {/* Option thêm mới nếu từ khóa chưa có trong danh sách */}
                {systemSearch.trim() &&
                  !availableSystems.some((s) => s.toLowerCase() === systemSearch.trim().toLowerCase()) && (
                    <div
                      onClick={() => handleAddCustomSystem(systemSearch.trim())}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                        color: '#92400E',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderBottom: '1px solid #FDE68A',
                      }}
                    >
                      <Plus size={15} />
                      <span>
                        Thêm hệ thống mới: <strong>"{systemSearch.trim()}"</strong>
                      </span>
                    </div>
                  )}

                {/* Danh sách hệ thống có sẵn kèm checkbox */}
                {availableSystems
                  .filter((s) => !systemSearch || s.toLowerCase().includes(systemSearch.toLowerCase()))
                  .map((sys) => {
                    const isSelected = selectedSystems.includes(sys);
                    return (
                      <div
                        key={sys}
                        onClick={() => handleToggleSystem(sys)}
                        style={{
                          padding: '7px 12px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: isSelected ? 700 : 500,
                          backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                          color: isSelected ? '#1D4ED8' : 'var(--text-primary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid #F1F5F9',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>{sys}</span>
                        </div>
                        {isSelected && <Check size={14} style={{ color: '#2563EB' }} />}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Quick toggle chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', alignSelf: 'center', marginRight: '2px' }}>
              Chọn nhanh:
            </span>
            {[
              'SAP',
              'CO',
              'SO',
              'KDS',
              'GPOS',
              'GPOS-CO-SO',
              'GPOS-KDS',
              'PIM',
              'Mạng / VPN Datacenter',
              'Internet Nhà Hàng',
              'App Golden Spoon',
              'Cổng Thanh Toán (VNPay, Momo, ZaloPay)',
              'Hệ thống Hóa Đơn Điện Tử',
              'Wifi Marketing',
            ].map((tag) => {
              const isSelected = selectedSystems.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleToggleSystem(tag)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: isSelected ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                    backgroundColor: isSelected ? '#DBEAFE' : '#F8FAFC',
                    color: isSelected ? '#1E40AF' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isSelected && <Check size={11} />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trạng thái sự cố & Phạm vi ảnh hưởng */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
          {/* TRẠNG THÁI SỰ CỐ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Trạng Thái Sự Cố <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Đang Xử Lý */}
              <div
                onClick={() => setTrangThai('DANG_XU_LY')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: trangThai === 'DANG_XU_LY' ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                  backgroundColor: trangThai === 'DANG_XU_LY' ? '#FFFBEB' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <input
                  type="radio"
                  name="system_incident_status"
                  checked={trangThai === 'DANG_XU_LY'}
                  onChange={() => setTrangThai('DANG_XU_LY')}
                  style={{ cursor: 'pointer', accentColor: '#F59E0B' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#B45309' }}>
                    ⏳ Đang Xử Lý
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Sự cố đang xảy ra, IT đang điều tra và xử lý
                  </span>
                </div>
              </div>

              {/* Đã Khắc Phục / Hoàn Thành */}
              <div
                onClick={() => setTrangThai('DA_KHAC_PHUC')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: trangThai === 'DA_KHAC_PHUC' ? '2px solid #10B981' : '1px solid #E2E8F0',
                  backgroundColor: trangThai === 'DA_KHAC_PHUC' ? '#ECFDF5' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <input
                  type="radio"
                  name="system_incident_status"
                  checked={trangThai === 'DA_KHAC_PHUC'}
                  onChange={() => setTrangThai('DA_KHAC_PHUC')}
                  style={{ cursor: 'pointer', accentColor: '#10B981' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#047857' }}>
                    ✅ Đã Khắc Phục / Hoàn Thành (Note Bù)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Sự cố đã được xử lý xong, ghi nhận bù thời gian và giải pháp
                  </span>
                </div>
              </div>

              {/* Đang Theo Dõi */}
              <div
                onClick={() => setTrangThai('THEO_DOI')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: trangThai === 'THEO_DOI' ? '2px solid #6366F1' : '1px solid #E2E8F0',
                  backgroundColor: trangThai === 'THEO_DOI' ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <input
                  type="radio"
                  name="system_incident_status"
                  checked={trangThai === 'THEO_DOI'}
                  onChange={() => setTrangThai('THEO_DOI')}
                  style={{ cursor: 'pointer', accentColor: '#6366F1' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#4338CA' }}>
                    🔍 Đang Theo Dõi
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    Đã áp dụng biện pháp tạm thời, đang theo dõi ổn định
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MỨC ĐỘ / PHẠM VI ẢNH HƯỞNG */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Mức Độ / Phạm Vi Ảnh Hưởng <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {IMPACT_SCOPE_OPTIONS.map((opt) => {
                const isSelected = mucDo === opt.value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => setMucDo(opt.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: isSelected ? `2px solid ${opt.badgeColor}` : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? opt.bgColor : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="radio"
                      name="impact_scope"
                      checked={isSelected}
                      onChange={() => setMucDo(opt.value)}
                      style={{ cursor: 'pointer', accentColor: opt.badgeColor }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: opt.badgeColor }}>
                        {opt.label}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{opt.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* THỜI GIAN PHÁT SINH & NGƯỜI XỬ LÝ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Thời gian bắt đầu */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Calendar size={15} />
              <span>
                Thời Gian Bắt Đầu Phát Sinh <span style={{ color: '#EF4444' }}>*</span>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <DateInput
                value={startDateStr}
                onChange={setStartDateStr}
                required
                compact
                containerStyle={{ flex: 1 }}
                style={{ height: '38px', fontSize: '13px' }}
              />
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  backgroundColor: 'var(--bg-primary, #FFFFFF)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  width: '110px',
                }}
                required
              />
            </div>
          </div>

          {/* Người / Team xử lý */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <User size={15} />
              <span>Người / Team Phụ Trách Xử Lý</span>
            </label>
            <input
              type="text"
              value={nguoiXuLy}
              onChange={(e) => setNguoiXuLy(e.target.value)}
              placeholder="VD: Team App / Team System Network / Đối tác VNPay..."
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        {/* KHỐI THÔNG TIN HOÀN THÀNH (Hiện khi chọn ĐÃ KHẮC PHỤC) */}
        {trangThai === 'DA_KHAC_PHUC' && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#F0FDF4',
              borderRadius: 'var(--radius-md, 8px)',
              border: '1px solid #86EFAC',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803D', fontWeight: 700, fontSize: '13px' }}>
                <CheckCircle2 size={16} />
                <span>THÔNG TIN HOÀN THÀNH KHẮC PHỤC SỰ CỐ</span>
              </div>
              {currentDowntimeText && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: currentDowntimeText.includes('nhỏ hơn') ? '#FEE2E2' : '#DCFCE7',
                    color: currentDowntimeText.includes('nhỏ hơn') ? '#DC2626' : '#166534',
                    border: currentDowntimeText.includes('nhỏ hơn') ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                  }}
                >
                  ⏱️ Gián đoạn: {currentDowntimeText}
                </span>
              )}
            </div>

            {/* Thời gian kết thúc */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Clock size={14} />
                <span>Thời Gian Khắc Phục Xong / Kết Thúc <span style={{ color: '#EF4444' }}>*</span></span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <DateInput
                  value={endDateStr}
                  onChange={setEndDateStr}
                  required={trangThai === 'DA_KHAC_PHUC'}
                  compact
                  containerStyle={{ flex: 1 }}
                  style={{
                    height: '38px',
                    fontSize: '13px',
                    borderColor: '#86EFAC',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => setEndTimeStr(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm, 4px)',
                    border: '1px solid #86EFAC',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    width: '110px',
                  }}
                  required={trangThai === 'DA_KHAC_PHUC'}
                />
              </div>
            </div>

            {/* Nguyên nhân sự cố */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                Nguyên Nhân Sự Cố Đã Xác Định (Root Cause)
              </label>
              <textarea
                rows={2}
                value={nguyenNhan}
                onChange={(e) => setNguyenNhan(e.target.value)}
                placeholder="VD: Do đứt tuyến cáp quang AAG, lỗi switch mạng tầng Datacenter, đối tác bên thứ 3 bảo trì đột xuất..."
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  border: '1px solid #86EFAC',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  lineHeight: 1.4,
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Biện pháp khắc phục */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                Biện Pháp Đã Xử Lý / Hành Động Khắc Phục (Action Taken)
              </label>
              <textarea
                rows={2}
                value={bienPhapKhacPhuc}
                onChange={(e) => setBienPhapKhacPhuc(e.target.value)}
                placeholder="VD: Đã kích hoạt đường truyền dự phòng (failover), restart cluster service, cập nhật cấu hình định tuyến..."
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm, 4px)',
                  border: '1px solid #86EFAC',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  lineHeight: 1.4,
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {/* Nội dung sự vụ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Nội Dung Chi Tiết Sự Cố & Phạm Vi Ảnh Hưởng <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <textarea
            rows={3}
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            placeholder="Mô tả cụ thể hiện tượng lỗi, số lượng nhà hàng/người dùng bị ảnh hưởng, ảnh hưởng đến nghiệp vụ bán hàng..."
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
            required
          />
        </div>

        {/* Ghi chú bước xử lý ban đầu (chỉ hiện khi tạo mới) */}
        {!isEditMode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Ghi Chú Tiến Độ / Bước Xử Lý Đầu Tiên (Tùy chọn)
            </label>
            <input
              type="text"
              value={initialNote}
              onChange={(e) => setInitialNote(e.target.value)}
              placeholder="VD: Đã báo cho NOC Datacenter kiểm tra; Đã thông báo kênh Zalo Quản lý nhà hàng..."
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 4px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>
        )}

        {/* VÙNG ẢNH ĐÃ CÓ (KHI EDIT) */}
        {isEditMode && existingImages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Hình Ảnh Đã Đính Kèm Trước Đó:
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {existingImages.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    overflow: 'hidden',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <img
                    src={url}
                    alt={`existing-${idx}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      backgroundColor: 'rgba(239, 68, 68, 0.9)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vùng dán ảnh Clipboard (Ctrl + V) */}
        <div
          tabIndex={0}
          onPaste={handlePaste}
          style={{
            border: '2px dashed #93C5FD',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '12px 16px',
            backgroundColor: '#F0F9FF',
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369A1' }}>
            <ImageIcon size={18} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>
              Dán Thêm Hình Ảnh Trực Tiếp (Ctrl + V)
            </span>
          </div>
          <span style={{ fontSize: '12px', color: '#0C4A6E' }}>
            Bấm vào đây hoặc nhấn <strong>Ctrl + V</strong> ở bất kỳ đâu trong form để dán ảnh chụp màn hình sự cố.
          </span>

          {/* Danh sách ảnh mới dán */}
          {pastedImages.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}>
              {pastedImages.map((file, idx) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      borderRadius: '6px',
                      border: '1px solid #BAE6FD',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt={`pasted-${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePastedImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      title="Xóa ảnh này"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* VÙNG TỆP TIN ĐÃ CÓ (KHI EDIT) */}
        {isEditMode && existingFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Tệp Tin Đã Đính Kèm Trước Đó:
            </label>
            {existingFiles.map((url, idx) => {
              const fileName = url.split('/').pop() || `Tệp đính kèm ${idx + 1}`;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '12px',
                  }}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}
                  >
                    {fileName}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingFile(idx)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Đính kèm file mới */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Paperclip size={15} />
            <span>Đính Kèm Tệp Tin / Tài Liệu (PDF, Excel, Word, Log...)</span>
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ fontSize: '13px', color: 'var(--text-secondary)' }}
          />

          {selectedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary, #F1F5F9)',
                    fontSize: '12px',
                  }}
                >
                  <span>
                    {f.name} ({(f.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(i)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
