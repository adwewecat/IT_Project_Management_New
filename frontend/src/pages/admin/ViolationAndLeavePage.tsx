import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertOctagon,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Image as ImageIcon,
  CalendarDays,
  Calendar,
  Search,
  RefreshCw,
  Settings,
  Check,
  CheckCheck,
  X,
  Upload,
  ClipboardPaste,
  Users,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { DateInput } from '../../components/ui/DateInput';
import { DateTimeInput } from '../../components/ui/DateTimeInput';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import { violationService } from '../../services/violationService';
import { incidentService } from '../../services/incidentService';
import { SearchableStaffSelect } from '../../components/common/SearchableStaffSelect';
import {
  ViolationItem,
  LeaveLogItem,
  LeaveTypeItem,
} from '../../types/violation';
import { IncidentAssignee } from '../../types/incident';

export const ViolationAndLeavePage: React.FC = () => {
  const { user } = useAuth();

  // Phân quyền: chỉ super_admin hoặc username dung.nguyenanh
  const isAllowed = checkIsDungOrSuperAdmin(user);

  const [activeTab, setActiveTab] = useState<'violations' | 'leaves'>('violations');

  // Assignees (Team App members)
  const [staffList, setStaffList] = useState<IncidentAssignee[]>([]);

  // Violations State
  const [violations, setViolations] = useState<ViolationItem[]>([]);
  const [loadingViolations, setLoadingViolations] = useState(false);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<ViolationItem | null>(null);

  // Form state for Violation
  const [vStaff, setVStaff] = useState('');
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [vType, setVType] = useState('miss_mail');
  const [vDate, setVDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [vContent, setVContent] = useState('');
  const [vFiles, setVFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [uploadingV, setUploadingV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leaves State & Filters
  const [leaves, setLeaves] = useState<LeaveLogItem[]>([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveLogItem | null>(null);

  // Filters for Leaves (Mặc định: Tháng hiện tại)
  const [leaveMonth, setLeaveMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [leaveYear, setLeaveYear] = useState<number>(() => new Date().getFullYear());
  const [leaveFilterStaff, setLeaveFilterStaff] = useState<string>('ALL');
  const [leaveFilterTypes, setLeaveFilterTypes] = useState<string[]>([]);
  const [isLeaveTypeDropdownOpen, setIsLeaveTypeDropdownOpen] = useState(false);
  const leaveTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [leaveSearch, setLeaveSearch] = useState<string>('');
  const [filterByMonthEnabled, setFilterByMonthEnabled] = useState<boolean>(true);

  // Helper lấy chuỗi ngày hiện tại (YYYY-MM-DD) theo múi giờ địa phương
  const getLocalDateStr = (d: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  // Form state for Leave
  const [lStaff, setLStaff] = useState('');
  const [lType, setLType] = useState('annual_leave');
  const [lStartTime, setLStartTime] = useState<string>(() => {
    return `${getLocalDateStr()}T08:30`;
  });
  const [lEndTime, setLEndTime] = useState<string>(() => {
    return `${getLocalDateStr()}T17:30`;
  });
  const [lReason, setLReason] = useState('');
  const [lNote, setLNote] = useState('');

  // Leave Types Configuration State
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeItem[]>([]);
  const [isLeaveTypeModalOpen, setIsLeaveTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCode, setNewTypeCode] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingTypeName, setEditingTypeName] = useState('');
  const [editingTypeCode, setEditingTypeCode] = useState('');
  const [savingLeaveType, setSavingLeaveType] = useState(false);

  // Selected Image Lightbox
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Danh mục loại nghỉ mặc định đảm bảo không bao giờ bị trống
  const DEFAULT_LEAVE_TYPES = useMemo(() => [
    { code: 'annual_leave', name: 'Nghỉ phép cả ngày' },
    { code: 'half_day_morning', name: 'Nghỉ nửa ngày ca sáng' },
    { code: 'half_day_afternoon', name: 'Nghỉ nửa ngày ca chiều' },
    { code: 'early_leave', name: 'Xin về sớm' },
    { code: 'unpaid_leave', name: 'Nghỉ không lương' },
    { code: 'other', name: 'Lý do khác' },
  ], []);

  const getLeaveTypeName = (type?: string | null) => {
    if (!type) return '—';
    const found = leaveTypes.find((t) => t.code === type);
    if (found) return found.name;
    switch (type) {
      case 'annual_leave':
        return 'Nghỉ phép cả ngày';
      case 'half_day_morning':
        return 'Nghỉ nửa ngày ca sáng';
      case 'half_day_afternoon':
        return 'Nghỉ nửa ngày ca chiều';
      case 'half_day':
        return 'Nghỉ nửa ngày';
      case 'early_leave':
        return 'Xin về sớm';
      case 'unpaid_leave':
        return 'Nghỉ không lương';
      case 'other':
        return 'Lý do khác';
      default:
        return type;
    }
  };

  const getLeaveTypeBadgeStyle = (type?: string | null) => {
    switch (type) {
      case 'annual_leave':
        return {
          backgroundColor: '#EFF6FF',
          color: '#1D4ED8',
          border: '1px solid #BFDBFE',
        };
      case 'half_day_morning':
        return {
          backgroundColor: '#F5F3FF',
          color: '#6D28D9',
          border: '1px solid #DDD6FE',
        };
      case 'half_day_afternoon':
        return {
          backgroundColor: '#FAF5FF',
          color: '#7E22CE',
          border: '1px solid #E9D5FF',
        };
      case 'half_day':
        return {
          backgroundColor: '#F5F3FF',
          color: '#6D28D9',
          border: '1px solid #DDD6FE',
        };
      case 'early_leave':
        return {
          backgroundColor: '#FFFBEB',
          color: '#B45309',
          border: '1px solid #FDE68A',
        };
      case 'unpaid_leave':
        return {
          backgroundColor: '#FEF2F2',
          color: '#B91C1C',
          border: '1px solid #FECACA',
        };
      default:
        return {
          backgroundColor: 'var(--color-primary-subtle)',
          color: 'var(--color-primary-text)',
          border: '1px solid var(--border-color)',
        };
    }
  };

  // Tổng hợp tất cả các loại nghỉ từ mặc định + backend + dữ liệu thực tế
  const allAvailableLeaveTypes = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    DEFAULT_LEAVE_TYPES.forEach((t) => map.set(t.code, { code: t.code, name: t.name }));
    leaveTypes.forEach((t) => map.set(t.code, { code: t.code, name: t.name }));
    leaves.forEach((l) => {
      if (l.leave_type && !map.has(l.leave_type)) {
        map.set(l.leave_type, { code: l.leave_type, name: getLeaveTypeName(l.leave_type) });
      }
    });
    return Array.from(map.values());
  }, [DEFAULT_LEAVE_TYPES, leaveTypes, leaves]);

  // Click outside listener for leave type dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (leaveTypeDropdownRef.current && !leaveTypeDropdownRef.current.contains(e.target as Node)) {
        setIsLeaveTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadLeaveTypes();
    incidentService
      .getAssignees()
      .then((data) => {
        setStaffList(data);
        if (data.length > 0) {
          setVStaff(data[0].username);
          setLStaff(data[0].username);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const loadLeaveTypes = async () => {
    try {
      const data = await violationService.getLeaveTypes();
      setLeaveTypes(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách loại nghỉ phép:', err);
    }
  };

  const loadViolations = async () => {
    setLoadingViolations(true);
    try {
      const data = await violationService.getViolations({ limit: 200 });
      setViolations(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingViolations(false);
    }
  };

  const loadLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const params: any = { limit: 200 };
      if (filterByMonthEnabled) {
        params.month = leaveMonth;
        params.year = leaveYear;
      }
      if (leaveFilterStaff !== 'ALL') {
        params.username = leaveFilterStaff;
      }
      if (leaveFilterTypes.length > 0) {
        params.leave_type = leaveFilterTypes.join(',');
      }
      if (leaveSearch.trim()) {
        params.search = leaveSearch.trim();
      }
      const data = await violationService.getLeaves(params);
      setLeaves(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'violations') {
      loadViolations();
    } else {
      loadLeaves();
    }
  }, [activeTab, leaveMonth, leaveYear, leaveFilterStaff, leaveFilterTypes, filterByMonthEnabled, leaveSearch]);

  if (!isAllowed) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#EF4444', marginBottom: '8px' }}>Không có quyền truy cập</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          Chức năng Quản trị này chỉ dành riêng cho Quản trị viên hoặc user dung.nguyenanh.
        </p>
      </div>
    );
  }

  // Helper memos for staff multi-select
  const filteredStaffForModal = useMemo(() => {
    if (!staffSearchQuery.trim()) return staffList;
    const q = staffSearchQuery.trim().toLowerCase();
    return staffList.filter(
      (s) =>
        s.username.toLowerCase().includes(q) ||
        (s.full_name && s.full_name.toLowerCase().includes(q))
    );
  }, [staffList, staffSearchQuery]);

  const excludedStaffList = useMemo(() => {
    if (selectedStaffs.length === 0 || selectedStaffs.length === staffList.length) return [];
    return staffList.filter((s) => !selectedStaffs.includes(s.username));
  }, [staffList, selectedStaffs]);

  // Handler for pasting images from clipboard
  const handlePasteFiles = (clipboardData: DataTransfer | null) => {
    if (!clipboardData) return;
    const items = clipboardData.items;
    if (!items || items.length === 0) return;

    const newFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const ext = blob.type.split('/')[1] || 'png';
          const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
          const file = new File([blob], `screenshot_${nowStr}_${i + 1}.${ext}`, { type: blob.type });
          newFiles.push(file);
        }
      }
    }

    if (newFiles.length > 0) {
      setVFiles((prev) => [...prev, ...newFiles]);
      setPasteToast(`Đã dán thành công ${newFiles.length} hình ảnh từ Clipboard!`);
      setTimeout(() => setPasteToast(null), 3000);
    }
  };

  // Global paste event listener for the Violation Modal
  useEffect(() => {
    if (!isViolationModalOpen) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      let hasImage = false;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          hasImage = true;
          break;
        }
      }
      if (hasImage) {
        handlePasteFiles(e.clipboardData);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isViolationModalOpen]);

  // ================= HANDLERS: VIOLATIONS =================

  const handleOpenCreateViolation = () => {
    setEditingViolation(null);
    setVStaff(staffList.length > 0 ? staffList[0].username : '');
    setSelectedStaffs(staffList.length > 0 ? [staffList[0].username] : []);
    setStaffSearchQuery('');
    setVType('miss_mail');
    setVDate(new Date().toISOString().split('T')[0]);
    setVContent('');
    setVFiles([]);
    setExistingImages([]);
    setExistingFiles([]);
    setPasteToast(null);
    setIsViolationModalOpen(true);
  };

  const handleSaveViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vContent.trim()) {
      alert('Vui lòng nhập nội dung vi phạm!');
      return;
    }

    if (!editingViolation && selectedStaffs.length === 0) {
      alert('Vui lòng chọn ít nhất một nhân viên vi phạm (hoặc bấm Chọn Cả Team)!');
      return;
    }

    setUploadingV(true);
    try {
      let imagePaths: string[] = [];
      let otherFilePaths: string[] = [];

      if (vFiles.length > 0) {
        const uploadedUrls = await violationService.uploadFiles(vFiles);
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

      const allImages = [...existingImages, ...imagePaths];
      const allFiles = [...existingFiles, ...otherFilePaths];

      if (editingViolation) {
        const targetStaff = staffList.find((s) => s.username === vStaff);
        await violationService.updateViolation(editingViolation.id, {
          nguoi_saipham: vStaff,
          ho_ten: targetStaff?.full_name || vStaff,
          loai_saipham: vType,
          date_saipham: vDate ? `${vDate}T00:00:00` : undefined,
          noidung: vContent.trim(),
          images: allImages.length > 0 ? JSON.stringify(allImages) : null,
          files: allFiles.length > 0 ? JSON.stringify(allFiles) : null,
        });
      } else {
        if (selectedStaffs.length === 1) {
          const targetStaff = staffList.find((s) => s.username === selectedStaffs[0]);
          await violationService.createViolation({
            nguoi_saipham: selectedStaffs[0],
            ho_ten: targetStaff?.full_name || selectedStaffs[0],
            loai_saipham: vType,
            date_saipham: vDate ? `${vDate}T00:00:00` : undefined,
            noidung: vContent.trim(),
            images: allImages.length > 0 ? JSON.stringify(allImages) : undefined,
            files: allFiles.length > 0 ? JSON.stringify(allFiles) : undefined,
          });
        } else {
          await violationService.createViolationsBatch({
            nguoi_saiphams: selectedStaffs,
            loai_saipham: vType,
            date_saipham: vDate ? `${vDate}T00:00:00` : undefined,
            noidung: vContent.trim(),
            images: allImages.length > 0 ? JSON.stringify(allImages) : undefined,
            files: allFiles.length > 0 ? JSON.stringify(allFiles) : undefined,
          });
        }
      }

      setIsViolationModalOpen(false);
      loadViolations();
    } catch (err: any) {
      console.error('Lỗi khi lưu vi phạm:', err);
      const detail = err.response?.data?.detail;
      let errMsg = 'Lỗi khi lưu vi phạm!';
      if (typeof detail === 'string') {
        errMsg = detail;
      } else if (Array.isArray(detail)) {
        errMsg = detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      } else if (err.message) {
        errMsg = `Lỗi kết nối / hệ thống: ${err.message}`;
      }
      alert(errMsg);
    } finally {
      setUploadingV(false);
    }
  };

  const handleOpenEditViolation = (item: ViolationItem) => {
    setEditingViolation(item);
    setVStaff(item.nguoi_saipham);
    setSelectedStaffs([item.nguoi_saipham]);
    setStaffSearchQuery('');
    setVType(item.loai_saipham || 'other');
    setVDate(item.date_saipham ? item.date_saipham.split('T')[0] : '');
    setVContent(item.noidung || '');
    setVFiles([]);
    setPasteToast(null);

    let imgUrls: string[] = [];
    let fUrls: string[] = [];
    try {
      if (item.images && item.images.startsWith('[')) imgUrls = JSON.parse(item.images);
      else if (item.images) imgUrls = [item.images];
      if (item.files && item.files.startsWith('[')) fUrls = JSON.parse(item.files);
      else if (item.files) fUrls = [item.files];
    } catch {}
    setExistingImages(imgUrls);
    setExistingFiles(fUrls);

    setIsViolationModalOpen(true);
  };

  const handleDeleteViolation = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi vi phạm này?')) return;
    try {
      await violationService.deleteViolation(id);
      loadViolations();
    } catch (err) {
      alert('Không thể xóa vi phạm.');
    }
  };

  // ================= HANDLERS: LEAVES =================

  const toDatetimeLocal = (dtStr?: string | null): string => {
    if (!dtStr) return '';
    if (dtStr.includes('T')) {
      return dtStr.substring(0, 16);
    }
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleOpenCreateLeave = () => {
    setEditingLeave(null);
    if (staffList.length > 0) setLStaff(staffList[0].username);
    setLType('annual_leave');
    const today = getLocalDateStr();
    setLStartTime(`${today}T08:30`);
    setLEndTime(`${today}T17:30`);
    setLReason('');
    setLNote('');
    setIsLeaveModalOpen(true);
  };

  // Xử lý khi thay đổi Loại Ghi Nhận
  const handleSelectLeaveType = (selectedType: string) => {
    setLType(selectedType);
    const currentDate = lStartTime && lStartTime.includes('T') ? lStartTime.split('T')[0] : getLocalDateStr();
    if (selectedType === 'annual_leave' || selectedType.includes('ca_ngay')) {
      // Nghỉ cả ngày: 8h30 đến 17h30
      setLStartTime(`${currentDate}T08:30`);
      setLEndTime(`${currentDate}T17:30`);
    } else if (selectedType === 'half_day_morning' || selectedType.includes('sang')) {
      // Nghỉ nửa ngày ca sáng: 8h30 đến 13h30
      setLStartTime(`${currentDate}T08:30`);
      setLEndTime(`${currentDate}T13:30`);
    } else if (selectedType === 'half_day_afternoon' || selectedType.includes('chieu')) {
      // Nghỉ nửa ngày ca chiều: 13h30 đến 17h30
      setLStartTime(`${currentDate}T13:30`);
      setLEndTime(`${currentDate}T17:30`);
    } else if (selectedType === 'half_day') {
      // Fallback: 8h30 đến 13h30
      setLStartTime(`${currentDate}T08:30`);
      setLEndTime(`${currentDate}T13:30`);
    }
  };

  // Xử lý khi thay đổi Thời Gian Bắt Đầu
  const handleStartTimeChange = (newStartTime: string) => {
    setLStartTime(newStartTime);
    if (!newStartTime) return;
    const newDate = newStartTime.split('T')[0];
    const prevDate = lStartTime && lStartTime.includes('T') ? lStartTime.split('T')[0] : '';
    // Khi người dùng đổi ngày ở ô Bắt Đầu: tự động đồng bộ ngày ở ô Kết Thúc theo loại nghỉ đã chọn
    if (newDate && newDate !== prevDate) {
      if (lType === 'annual_leave' || lType.includes('ca_ngay')) {
        setLEndTime(`${newDate}T17:30`);
      } else if (lType === 'half_day_morning' || lType.includes('sang')) {
        setLEndTime(`${newDate}T13:30`);
      } else if (lType === 'half_day_afternoon' || lType.includes('chieu')) {
        setLEndTime(`${newDate}T17:30`);
      } else {
        const curEndHour = lEndTime && lEndTime.includes('T') ? lEndTime.split('T')[1] : '17:30';
        setLEndTime(`${newDate}T${curEndHour}`);
      }
    }
  };

  const handleOpenEditLeave = (item: LeaveLogItem) => {
    setEditingLeave(item);
    setLStaff(item.username);
    setLType(item.leave_type);
    setLStartTime(toDatetimeLocal(item.start_time));
    setLEndTime(toDatetimeLocal(item.end_time));
    setLReason(item.reason || '');
    setLNote(item.note || '');
    setIsLeaveModalOpen(true);
  };

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lStartTime) {
      alert('Vui lòng chọn thời gian bắt đầu!');
      return;
    }

    try {
      const targetStaff = staffList.find((s) => s.username === lStaff);

      if (editingLeave) {
        await violationService.updateLeave(editingLeave.id, {
          username: lStaff,
          full_name: targetStaff?.full_name || lStaff,
          leave_type: lType,
          start_time: lStartTime,
          end_time: lEndTime || undefined,
          reason: lReason,
          note: lNote,
        });
      } else {
        await violationService.createLeave({
          username: lStaff,
          full_name: targetStaff?.full_name || lStaff,
          leave_type: lType,
          start_time: lStartTime,
          end_time: lEndTime || undefined,
          reason: lReason,
          note: lNote,
        });
      }

      setIsLeaveModalOpen(false);
      loadLeaves();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : (Array.isArray(detail) ? detail.map((d: any) => d.msg || JSON.stringify(d)).join('\n') : (err.message || 'Lỗi khi lưu thông tin nghỉ phép!'));
      alert(msg);
    }
  };

  const handleDeleteLeave = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi nghỉ phép này?')) return;
    try {
      await violationService.deleteLeave(id);
      loadLeaves();
    } catch (err) {
      alert('Không thể xóa ghi nhận.');
    }
  };

  // Handlers Quản lý Loại Ghi Nhận
  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      alert('Vui lòng nhập tên loại ghi nhận!');
      return;
    }
    setSavingLeaveType(true);
    try {
      await violationService.createLeaveType({
        name: newTypeName.trim(),
        code: newTypeCode.trim() || undefined,
      });
      setNewTypeName('');
      setNewTypeCode('');
      await loadLeaveTypes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể tạo loại ghi nhận.');
    } finally {
      setSavingLeaveType(false);
    }
  };

  const handleStartEditType = (type: LeaveTypeItem) => {
    setEditingTypeId(type.id);
    setEditingTypeName(type.name);
    setEditingTypeCode(type.code);
  };

  const handleCancelEditType = () => {
    setEditingTypeId(null);
    setEditingTypeName('');
    setEditingTypeCode('');
  };

  const handleSaveEditType = async (id: number) => {
    if (!editingTypeName.trim()) {
      alert('Tên loại không được để trống!');
      return;
    }
    setSavingLeaveType(true);
    try {
      await violationService.updateLeaveType(id, {
        name: editingTypeName.trim(),
        code: editingTypeCode.trim() || undefined,
      });
      setEditingTypeId(null);
      await loadLeaveTypes();
      if (activeTab === 'leaves') {
        loadLeaves();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể cập nhật loại ghi nhận.');
    } finally {
      setSavingLeaveType(false);
    }
  };

  const handleDeleteType = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa loại ghi nhận "${name}"?`)) return;
    try {
      await violationService.deleteLeaveType(id);
      await loadLeaveTypes();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể xóa loại ghi nhận.');
    }
  };

  const getViolationTypeName = (type?: string | null) => {
    switch (type) {
      case 'miss_mail':
        return 'Check miss mail';
      case 'late_processing':
        return 'Xử lý trễ vấn đề';
      case 'wrong_action':
        return 'Làm sai việc';
      default:
        return 'Sai phạm khác';
    }
  };

  const formatDate = (val?: string | null) => formatDateDDMMYYYY(val, '—');

  const formatDateTime = (val?: string | null) =>
    formatDateTimeDDMMYYYY(val, { fallback: '—' });

  return (
    <div className="page-container-fullheight" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: 0,
            }}
          >
            <AlertOctagon size={24} style={{ color: '#F59E0B' }} />
            <span>Quản Trị Ghi Nhận Lỗi & Nghỉ Phép Team App</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Theo dõi lỗi trong quá trình làm việc và lịch nghỉ phép, xin về sớm của nhân sự
          </p>
        </div>

        <div>
          {activeTab === 'violations' ? (
            <Button
              variant="primary"
              onClick={handleOpenCreateViolation}
              leftIcon={<Plus size={16} />}
              style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}
            >
              Ghi Nhận Lỗi Làm Việc
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleOpenCreateLeave}
              leftIcon={<Plus size={16} />}
            >
              Ghi Nhận Nghỉ Phép / Về Sớm
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--border-color)',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('violations')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'violations' ? 700 : 500,
            color: activeTab === 'violations' ? '#EF4444' : 'var(--text-secondary)',
            borderBottom: activeTab === 'violations' ? '3px solid #EF4444' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <AlertOctagon size={16} />
          <span>1. Ghi Nhận Lỗi Trong Quá Trình Làm Việc</span>
          <span
            style={{
              backgroundColor: activeTab === 'violations' ? '#FEE2E2' : 'var(--bg-secondary)',
              color: activeTab === 'violations' ? '#DC2626' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {violations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === 'leaves' ? 700 : 500,
            color: activeTab === 'leaves' ? 'var(--color-primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'leaves' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s',
          }}
        >
          <CalendarDays size={16} />
          <span>2. Ghi Nhận Ngày Nghỉ Phép & Xin Về Sớm</span>
          <span
            style={{
              backgroundColor: activeTab === 'leaves' ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
              color: activeTab === 'leaves' ? 'var(--color-primary-text)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
            }}
          >
            {leaves.length}
          </span>
        </button>
      </div>

      {/* Content for Tab 1: Violations */}
      {activeTab === 'violations' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '50px' }}>ID</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Nhân Viên Vi Phạm</th>
                  <th style={{ padding: '12px 14px', width: '160px' }}>Loại Lỗi</th>
                  <th style={{ padding: '12px 14px', width: '120px' }}>Ngày Vi Phạm</th>
                  <th style={{ padding: '12px 14px', minWidth: '300px' }}>Ghi Chú Vi Phạm</th>
                  <th style={{ padding: '12px 14px', width: '110px' }}>Đính Kèm</th>
                  <th style={{ padding: '12px 14px', width: '130px' }}>Người Ghi Nhận</th>
                  <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingViolations ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Đang tải danh sách lỗi...
                    </td>
                  </tr>
                ) : violations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có ghi nhận lỗi vi phạm nào.
                    </td>
                  </tr>
                ) : (
                  violations.map((v) => {
                    let imgUrls: string[] = [];
                    let fileUrls: string[] = [];
                    try {
                      if (v.images && v.images.startsWith('[')) imgUrls = JSON.parse(v.images);
                      if (v.files && v.files.startsWith('[')) fileUrls = JSON.parse(v.files);
                    } catch {}

                    return (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          #{v.id}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {v.ho_ten || v.nguoi_saipham}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                            {v.nguoi_saipham}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                            }}
                          >
                            {getViolationTypeName(v.loai_saipham)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                          {formatDate(v.date_saipham)}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                          {v.noidung}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {imgUrls.map((img, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setPreviewImage(img)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                title="Xem ảnh"
                              >
                                <ImageIcon size={16} color="#10B981" />
                              </button>
                            ))}
                            {fileUrls.map((f, i) => (
                              <a key={i} href={f} target="_blank" rel="noreferrer" title="Tải file">
                                <FileText size={16} color="var(--color-primary)" />
                              </a>
                            ))}
                            {imgUrls.length === 0 && fileUrls.length === 0 && (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {v.user_insert || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditViolation(v)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-primary-hover)',
                                padding: '4px',
                              }}
                              title="Chỉnh sửa"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteViolation(v.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#EF4444',
                                padding: '4px',
                              }}
                              title="Xóa"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content for Tab 2: Leaves */}
      {activeTab === 'leaves' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Toolbar Lọc Nghỉ Phép Theo Tháng / Ngày / Tìm Kiếm */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Toggle Lọc Theo Tháng */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filterByMonthEnabled}
                  onChange={(e) => setFilterByMonthEnabled(e.target.checked)}
                />
                <span>Lọc Theo Tháng:</span>
              </label>

              {filterByMonthEnabled && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} style={{ color: 'var(--color-primary)' }} />
                    <select
                      value={leaveMonth}
                      onChange={(e) => setLeaveMonth(Number(e.target.value))}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={leaveYear}
                    onChange={(e) => setLeaveYear(Number(e.target.value))}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* Lọc loại nghỉ bằng Checkbox Popover / Dropdown */}
              <div ref={leaveTypeDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setIsLeaveTypeDropdownOpen((prev) => !prev)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: leaveFilterTypes.length > 0 ? '1px solid #10B981' : '1px solid var(--border-color)',
                    backgroundColor: leaveFilterTypes.length > 0 ? '#ECFDF5' : 'var(--bg-secondary)',
                    color: leaveFilterTypes.length > 0 ? '#065F46' : 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: leaveFilterTypes.length > 0 ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Bấm để lọc theo checkbox một hoặc nhiều loại nghỉ phép"
                >
                  <Filter size={13} style={{ color: leaveFilterTypes.length > 0 ? '#10B981' : 'var(--text-muted)' }} />
                  <span>
                    {leaveFilterTypes.length === 0
                      ? `Tất cả loại nghỉ (${allAvailableLeaveTypes.length})`
                      : leaveFilterTypes.length === 1
                      ? getLeaveTypeName(leaveFilterTypes[0])
                      : `Loại nghỉ (${leaveFilterTypes.length} đã chọn)`}
                  </span>
                  <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
                </button>

                {/* Dropdown Menu với các Checkbox */}
                {isLeaveTypeDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      zIndex: 50,
                      minWidth: '250px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Chọn Loại Nghỉ Phép
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setLeaveFilterTypes([])}
                          style={{
                            border: 'none',
                            background: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                          title="Hiển thị tất cả các loại nghỉ"
                        >
                          Tất cả
                        </button>
                        <span style={{ color: 'var(--border-color)' }}>|</span>
                        <button
                          type="button"
                          onClick={() => setLeaveFilterTypes([])}
                          style={{
                            border: 'none',
                            background: 'none',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                          title="Xóa bộ lọc loại nghỉ"
                        >
                          Xóa lọc
                        </button>
                      </div>
                    </div>

                    {/* Danh sách checkbox */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}
                    >
                      {allAvailableLeaveTypes.map((t) => {
                        const isChecked = leaveFilterTypes.includes(t.code);
                        return (
                          <label
                            key={t.code}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              backgroundColor: isChecked ? '#F0FDF4' : 'transparent',
                              transition: 'background-color 0.15s ease',
                              userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setLeaveFilterTypes((prev) => prev.filter((c) => c !== t.code));
                                } else {
                                  setLeaveFilterTypes((prev) => [...prev, t.code]);
                                }
                              }}
                              style={{ cursor: 'pointer', accentColor: '#10B981' }}
                            />
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: isChecked ? 700 : 400,
                                color: isChecked ? '#065F46' : 'var(--text-primary)',
                              }}
                            >
                              {t.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Footer nhỏ */}
                    {leaveFilterTypes.length > 0 && (
                      <div
                        style={{
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '6px',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span>Đã chọn {leaveFilterTypes.length} loại</span>
                        <button
                          type="button"
                          onClick={() => setLeaveFilterTypes([])}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          Bỏ lọc
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lọc nhân viên */}
              <select
                value={leaveFilterStaff}
                onChange={(e) => setLeaveFilterStaff(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value="ALL">Tất cả nhân viên ({staffList.length})</option>
                {staffList.map((s) => (
                  <option key={s.username} value={s.username}>
                    {s.full_name} ({s.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Ô tìm kiếm từ khóa và các nút thao tác */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  width: '240px',
                }}
              >
                <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="text"
                  value={leaveSearch}
                  onChange={(e) => setLeaveSearch(e.target.value)}
                  placeholder="Tìm tên, lý do, ghi chú..."
                  style={{
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                  }}
                />
                {leaveSearch && (
                  <button
                    type="button"
                    onClick={() => setLeaveSearch('')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px' }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={loadLeaves}
                disabled={loadingLeaves}
                leftIcon={<RefreshCw size={13} className={loadingLeaves ? 'animate-spin' : ''} />}
              >
                Làm mới
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsLeaveTypeModalOpen(true)}
                leftIcon={<Settings size={13} />}
                title="Quản lý danh mục Loại Ghi Nhận (thêm mới, chỉnh sửa)"
              >
                Loại Ghi Nhận
              </Button>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
                <tr
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '12px 14px', width: '50px' }}>ID</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Nhân Viên</th>
                  <th style={{ padding: '12px 14px', width: '160px' }}>Loại Nghỉ</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Thời Gian Bắt Đầu</th>
                  <th style={{ padding: '12px 14px', width: '180px' }}>Thời Gian Kết Thúc</th>
                  <th style={{ padding: '12px 14px', minWidth: '260px' }}>Lý Do / Ghi Chú</th>
                  <th style={{ padding: '12px 14px', width: '130px' }}>Người Ghi Nhận</th>
                  <th style={{ padding: '12px 14px', width: '90px', textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loadingLeaves ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Đang tải lịch nghỉ phép...
                    </td>
                  </tr>
                ) : leaves.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có ghi nhận nghỉ phép nào.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l) => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        #{l.id}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {l.full_name || l.username}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                          {l.username}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'inline-block',
                            ...getLeaveTypeBadgeStyle(l.leave_type),
                          }}
                        >
                          {getLeaveTypeName(l.leave_type)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {formatDateTime(l.start_time)}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {formatDateTime(l.end_time)}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                        {l.reason || '—'}
                        {l.note && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Ghi chú: {l.note}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {l.user_insert || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditLeave(l)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-primary-hover)',
                              padding: '4px',
                            }}
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLeave(l.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#EF4444',
                              padding: '4px',
                            }}
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* Modal Thêm / Sửa Lỗi Vi Phạm */}
      <Modal
        isOpen={isViolationModalOpen}
        onClose={() => setIsViolationModalOpen(false)}
        title={editingViolation ? 'Chỉnh Sửa Ghi Nhận Lỗi' : 'Ghi Nhận Lỗi Trong Quá Trình Làm Việc'}
        maxWidth="720px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsViolationModalOpen(false)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveViolation}
              disabled={uploadingV}
              style={{ backgroundColor: '#EF4444', borderColor: '#EF4444' }}
            >
              {uploadingV
                ? 'Đang Lưu...'
                : editingViolation
                ? 'Cập Nhật'
                : selectedStaffs.length > 1
                ? `Lưu Vi Phạm (${selectedStaffs.length} nhân viên)`
                : 'Lưu Vi Phạm'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveViolation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* PHẦN 1: CHỌN NHÂN VIÊN VI PHẠM */}
          {editingViolation ? (
            <SearchableStaffSelect
              label="Nhân Viên Vi Phạm (Team App)"
              required
              staffList={staffList}
              value={vStaff}
              onChange={(u) => {
                setVStaff(u);
                setSelectedStaffs([u]);
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              {/* Header của mục chọn nhân viên */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Nhân Viên Vi Phạm (Team App) <span style={{ color: '#EF4444' }}>*</span>
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor:
                        selectedStaffs.length === 0
                          ? '#FEE2E2'
                          : selectedStaffs.length === staffList.length
                          ? '#DCFCE7'
                          : '#E0E7FF',
                      color:
                        selectedStaffs.length === 0
                          ? '#DC2626'
                          : selectedStaffs.length === staffList.length
                          ? '#15803D'
                          : '#4338CA',
                    }}
                  >
                    {selectedStaffs.length === 0
                      ? 'Chưa chọn ai'
                      : selectedStaffs.length === staffList.length
                      ? `Cả Team (${selectedStaffs.length}/${staffList.length} bạn)`
                      : `Đã chọn: ${selectedStaffs.length}/${staffList.length} nhân sự`}
                  </span>
                </div>

                {/* Các nút hành động nhanh: Chọn cả team / Bỏ chọn / Đảo chọn */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedStaffs(staffList.map((s) => s.username))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 9px',
                      borderRadius: '4px',
                      border: '1px solid #10B981',
                      backgroundColor:
                        selectedStaffs.length === staffList.length ? '#10B981' : '#ECFDF5',
                      color:
                        selectedStaffs.length === staffList.length ? '#FFFFFF' : '#047857',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Chọn tất cả nhân viên trong Team App"
                  >
                    <CheckCheck size={13} />
                    <span>Chọn Cả Team</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStaffs([])}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    title="Bỏ chọn tất cả"
                  >
                    <X size={13} />
                    <span>Bỏ chọn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStaffs((prev) =>
                        staffList.filter((s) => !prev.includes(s.username)).map((s) => s.username)
                      );
                    }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                    title="Đảo chọn danh sách nhân viên"
                  >
                    Đảo chọn
                  </button>
                </div>
              </div>

              {/* Ô tìm kiếm nhanh nhân viên trong modal */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên hoặc username để tick chọn / bỏ chọn nhân viên..."
                  style={{
                    border: 'none',
                    background: 'none',
                    outline: 'none',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    width: '100%',
                  }}
                />
                {staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStaffSearchQuery('')}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      fontSize: '11px',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Danh sách nhân viên checkbox */}
              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '6px',
                  padding: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {filteredStaffForModal.map((s) => {
                  const isChecked = selectedStaffs.includes(s.username);
                  return (
                    <label
                      key={s.username}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: isChecked ? '#FEF3C7' : 'transparent',
                        border: isChecked ? '1px solid #FDE68A' : '1px solid transparent',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedStaffs((prev) => prev.filter((u) => u !== s.username));
                          } else {
                            setSelectedStaffs((prev) => [...prev, s.username]);
                          }
                        }}
                        style={{ cursor: 'pointer', accentColor: '#D97706' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isChecked ? 700 : 500,
                            color: isChecked ? '#92400E' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {s.full_name}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            color: isChecked ? '#B45309' : 'var(--text-muted)',
                          }}
                        >
                          {s.username}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Tóm tắt: Loại trừ bạn nào (nếu chọn gần hết hoặc ghi nhận cả team trừ 1 số bạn) */}
              {excludedStaffList.length > 0 && selectedStaffs.length > 0 && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#B45309',
                    backgroundColor: '#FEF3C7',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>Trừ các bạn ({excludedStaffList.length}):</strong>
                  {excludedStaffList.map((s) => (
                    <span
                      key={s.username}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #FDE68A',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        color: '#92400E',
                      }}
                    >
                      {s.full_name}
                      <button
                        type="button"
                        onClick={() => setSelectedStaffs((prev) => [...prev, s.username])}
                        style={{
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          color: '#10B981',
                          padding: '0 2px',
                          fontWeight: 'bold',
                        }}
                        title="Thêm lại bạn này vào danh sách vi phạm"
                      >
                        +
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PHẦN 2: CHỌN LOẠI VI PHẠM & NGÀY VI PHẠM */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Loại Vi Phạm <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={vType}
                onChange={(e) => setVType(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value="miss_mail">Check miss mail</option>
                <option value="late_processing">Xử lý trễ vấn đề</option>
                <option value="wrong_action">Làm sai việc</option>
                <option value="other">Sai phạm khác</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Ngày Vi Phạm (Mặc định hôm nay)
              </label>
              <DateInput
                value={vDate}
                onChange={setVDate}
                style={{
                  height: '38px',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              />
            </div>
          </div>

          {/* PHẦN 3: NỘI DUNG GHI CHÚ VI PHẠM (HỖ TRỢ PASTE TRỰC TIẾP CTRL+V) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Nội Dung Ghi Chú Vi Phạm <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                (Có thể bấm <kbd style={{ padding: '1px 4px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '3px', fontSize: '10px' }}>Ctrl + V</kbd> dán ảnh vào đây)
              </span>
            </div>
            <textarea
              rows={4}
              value={vContent}
              onChange={(e) => setVContent(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (items) {
                  let hasImage = false;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                      hasImage = true;
                      break;
                    }
                  }
                  if (hasImage) {
                    handlePasteFiles(e.clipboardData);
                  }
                }
              }}
              placeholder="Chi tiết lỗi: miss mail gì, ticket nào, làm sai thao tác ở đâu... (Bấm Ctrl+V để dán ảnh chụp màn hình bất kỳ lúc nào)"
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
              required
            />
          </div>

          {/* PHẦN 4: ĐÍNH KÈM HÌNH ẢNH & TỆP TIN BẰNG CHỨNG (HỖ TRỢ PASTE CTRL+V) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Đính Kèm Bằng Chứng & Hình Ảnh:
              </label>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#10B981',
                  backgroundColor: '#ECFDF5',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid #A7F3D0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <ClipboardPaste size={12} />
                Hỗ trợ dán ảnh (Ctrl + V)
              </span>
            </div>

            {/* Thông báo Paste thành công */}
            {pasteToast && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #10B981',
                  color: '#065F46',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Check size={14} color="#10B981" />
                <span>{pasteToast}</span>
              </div>
            )}

            {/* Paste & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = '#10B981';
                e.currentTarget.style.backgroundColor = '#ECFDF5';
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                const droppedFiles = e.dataTransfer.files;
                if (droppedFiles && droppedFiles.length > 0) {
                  setVFiles((prev) => [...prev, ...Array.from(droppedFiles)]);
                }
              }}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  const selectedFiles = e.target.files;
                  if (selectedFiles && selectedFiles.length > 0) {
                    setVFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
                  }
                }}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardPaste size={22} color="#10B981" />
                <Upload size={18} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Bấm phím <kbd style={{ padding: '2px 5px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '3px', fontSize: '11px', fontFamily: 'monospace' }}>Ctrl + V</kbd> để dán ảnh chụp màn hình
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Hoặc click vào đây để chọn tệp từ máy / kéo thả file vào ô này
              </div>
            </div>

            {/* Ảnh hiện có khi chỉnh sửa */}
            {existingImages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Hình ảnh đã lưu trước đó ({existingImages.length}):
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {existingImages.map((img, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img
                        src={img}
                        alt="evidence"
                        onClick={() => setPreviewImage(img)}
                        style={{
                          width: '42px',
                          height: '42px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                        }}
                        title="Bấm để xem ảnh lớn"
                      />
                      <button
                        type="button"
                        onClick={() => setExistingImages((prev) => prev.filter((_, idx) => idx !== i))}
                        style={{
                          position: 'absolute',
                          top: '-5px',
                          right: '-5px',
                          backgroundColor: '#EF4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Gỡ ảnh này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách các file đính kèm mới được chọn hoặc paste */}
            {vFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Tệp / Hình ảnh mới sẽ tải lên ({vFiles.length}):
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '8px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    padding: '2px',
                  }}
                >
                  {vFiles.map((file, idx) => {
                    const isImg = file.type.startsWith('image/');
                    const previewUrl = isImg ? URL.createObjectURL(file) : null;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          position: 'relative',
                        }}
                      >
                        {isImg && previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={file.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(previewUrl);
                            }}
                            style={{
                              width: '36px',
                              height: '36px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                            title="Bấm để xem ảnh lớn"
                          />
                        ) : (
                          <FileText size={28} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={file.name}
                          >
                            {file.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#EF4444',
                            padding: '2px',
                            borderRadius: '3px',
                          }}
                          title="Xóa tệp này"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Modal Thêm / Sửa Nghỉ Phép / Về Sớm */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title={editingLeave ? 'Chỉnh Sửa Nghỉ Phép / Xin Về Sớm' : 'Ghi Nhận Nghỉ Phép / Xin Về Sớm'}
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsLeaveModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveLeave}>
              {editingLeave ? 'Cập Nhật' : 'Lưu Thông Tin'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SearchableStaffSelect
            label="Nhân Viên (Team App)"
            required
            staffList={staffList}
            value={lStaff}
            onChange={(u) => setLStaff(u)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Loại Ghi Nhận <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsLeaveTypeModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                title="Chỉnh sửa hoặc thêm loại ghi nhận mới"
              >
                <Settings size={13} />
                <span>+ Thêm / Sửa Loại Ghi Nhận</span>
              </button>
            </div>
            <select
              value={lType}
              onChange={(e) => handleSelectLeaveType(e.target.value)}
              style={{
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              {leaveTypes.length > 0 ? (
                leaveTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="annual_leave">Nghỉ phép cả ngày</option>
                  <option value="half_day_morning">Nghỉ nửa ngày ca sáng</option>
                  <option value="half_day_afternoon">Nghỉ nửa ngày ca chiều</option>
                  <option value="early_leave">Xin về sớm</option>
                  <option value="unpaid_leave">Nghỉ không lương</option>
                  <option value="other">Lý do khác</option>
                </>
              )}
            </select>
          </div>

          {/* Chọn nhanh khung giờ chuẩn theo ca */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '10px 12px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-color)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
              ⚡ Chọn nhanh khung giờ chuẩn:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectLeaveType('annual_leave')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: lType === 'annual_leave' ? '1.5px solid #3B82F6' : '1px solid var(--border-color)',
                  backgroundColor: lType === 'annual_leave' ? '#EFF6FF' : 'var(--bg-primary)',
                  color: lType === 'annual_leave' ? '#1D4ED8' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: lType === 'annual_leave' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                title="Tự động điền 08:30 đến 17:30"
              >
                <span>🌞 Nghỉ cả ngày</span>
                <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600 }}>(08:30 - 17:30)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLeaveType('half_day_morning')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: lType === 'half_day_morning' ? '1.5px solid #8B5CF6' : '1px solid var(--border-color)',
                  backgroundColor: lType === 'half_day_morning' ? '#F5F3FF' : 'var(--bg-primary)',
                  color: lType === 'half_day_morning' ? '#6D28D9' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: lType === 'half_day_morning' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                title="Tự động điền 08:30 đến 13:30"
              >
                <span>🌅 Nửa ngày ca sáng</span>
                <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600 }}>(08:30 - 13:30)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLeaveType('half_day_afternoon')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: lType === 'half_day_afternoon' ? '1.5px solid #A855F7' : '1px solid var(--border-color)',
                  backgroundColor: lType === 'half_day_afternoon' ? '#FAF5FF' : 'var(--bg-primary)',
                  color: lType === 'half_day_afternoon' ? '#7E22CE' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: lType === 'half_day_afternoon' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                title="Tự động điền 13:30 đến 17:30"
              >
                <span>🌇 Nửa ngày ca chiều</span>
                <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600 }}>(13:30 - 17:30)</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '14px' }}>
            <DateTimeInput
              label="Thời Gian Bắt Đầu"
              value={lStartTime}
              onChange={handleStartTimeChange}
              required
            />

            <DateTimeInput
              label="Thời Gian Kết Thúc"
              value={lEndTime}
              onChange={setLEndTime}
            />
          </div>

          {/* Tóm tắt ca nghỉ */}
          <div
            style={{
              fontSize: '12px',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span>
              {lType === 'annual_leave' && '🌞 Ca: Nghỉ cả ngày (08:30 - 17:30)'}
              {lType === 'half_day_morning' && '🌅 Ca: Nửa ngày ca sáng (08:30 - 13:30)'}
              {lType === 'half_day_afternoon' && '🌇 Ca: Nửa ngày ca chiều (13:30 - 17:30)'}
              {lType !== 'annual_leave' && lType !== 'half_day_morning' && lType !== 'half_day_afternoon' && `Loại: ${getLeaveTypeName(lType)}`}
            </span>
            {lStartTime && lEndTime && (
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {lStartTime.split('T')[0] === lEndTime.split('T')[0] ? (
                  <>Ngày {formatDate(lStartTime)} • {lStartTime.split('T')[1]} ➔ {lEndTime.split('T')[1]}</>
                ) : (
                  <>{formatDateTime(lStartTime)} ➔ {formatDateTime(lEndTime)}</>
                )}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Lý Do Nghỉ / Về Sớm
            </label>
            <textarea
              rows={3}
              value={lReason}
              onChange={(e) => setLReason(e.target.value)}
              placeholder="Lý do cá nhân, việc gia đình, đi khám bệnh..."
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Ghi Chú Thêm
            </label>
            <input
              type="text"
              value={lNote}
              onChange={(e) => setLNote(e.target.value)}
              placeholder="Ghi chú bổ sung nếu có..."
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>
        </form>
      </Modal>

      {/* Modal Quản Lý Loại Ghi Nhận */}
      <Modal
        isOpen={isLeaveTypeModalOpen}
        onClose={() => {
          setIsLeaveTypeModalOpen(false);
          handleCancelEditType();
        }}
        title="Quản Lý Danh Mục Loại Ghi Nhận"
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setIsLeaveTypeModalOpen(false);
                handleCancelEditType();
              }}
            >
              Đóng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card Thêm Loại Mới */}
          <form
            onSubmit={handleAddLeaveType}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              + Thêm Loại Ghi Nhận Mới
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Tên Loại Ghi Nhận <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="Ví dụ: Đi trễ, Công tác, Đi sự cố..."
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Mã Loại (tùy chọn)
                </label>
                <input
                  type="text"
                  value={newTypeCode}
                  onChange={(e) => setNewTypeCode(e.target.value)}
                  placeholder="Tự tạo slug nếu để trống"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={savingLeaveType}
                leftIcon={<Plus size={14} />}
                style={{ height: '37px', whiteSpace: 'nowrap' }}
              >
                {savingLeaveType ? 'Đang thêm...' : 'Thêm Mới'}
              </Button>
            </div>
          </form>

          {/* Danh Sách Các Loại Ghi Nhận Hiện Có */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Danh Sách Loại Hiện Có ({leaveTypes.length})
            </div>
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      fontSize: '11px',
                    }}
                  >
                    <th style={{ padding: '8px 12px', width: '45px' }}>STT</th>
                    <th style={{ padding: '8px 12px' }}>Tên Loại Ghi Nhận</th>
                    <th style={{ padding: '8px 12px', width: '140px' }}>Mã Code</th>
                    <th style={{ padding: '8px 12px', width: '110px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có loại ghi nhận nào.
                      </td>
                    </tr>
                  ) : (
                    leaveTypes.map((t, idx) => {
                      const isEditing = editingTypeId === t.id;
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingTypeName}
                                onChange={(e) => setEditingTypeName(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--color-primary)',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                }}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingTypeCode}
                                onChange={(e) => setEditingTypeCode(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '12px',
                                }}
                              />
                            ) : (
                              <code>{t.code}</code>
                            )}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {isEditing ? (
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditType(t.id)}
                                  disabled={savingLeaveType}
                                  style={{
                                    background: '#10B981',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                  }}
                                  title="Lưu thay đổi"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditType}
                                  style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    borderRadius: '4px',
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                  }}
                                  title="Hủy"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'inline-flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditType(t)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                  title="Chỉnh sửa tên loại này"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteType(t.id, t.name)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                  title="Xóa loại này"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={previewImage}
            alt="Preview"
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}
    </div>
  );
};
