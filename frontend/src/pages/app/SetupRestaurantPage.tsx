import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  Calendar,
  MessageSquare,
  Upload,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Monitor,
  Server,
  Activity,
  Settings,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  SetupRestaurant,
  RestaurantChecklistResponse,
  ChecklistMasterResponse,
  ChecklistMasterItem,
} from '../../types/setupRestaurant';
import { setupRestaurantService } from '../../services/setupRestaurantService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsAdmin } from '../../utils/authUtils';

// Helper: Normalize string for Vietnamese diacritics-insensitive search
const removeVietnameseTones = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// Helper: Format ISO datetime string to DD/MM/YYYY HH:mm
const formatDisplayDateTime = (dtStr?: string | null): string => {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins} ${day}/${month}/${year}`;
  } catch {
    return dtStr;
  }
};

// Helper: Get icon for major group
const getGroupIcon = (name: string) => {
  const norm = name.toUpperCase();
  if (norm.includes('RK7')) return <Settings size={18} style={{ color: '#6366f1' }} />;
  if (norm.includes('POS THU') || norm.includes('THU NGÂN')) return <Store size={18} style={{ color: '#10b981' }} />;
  if (norm.includes('POS PHỤ') || norm.includes('PHỤ')) return <Monitor size={18} style={{ color: '#06b6d4' }} />;
  if (norm.includes('PC QUẢN') || norm.includes('QUẢN LÝ')) return <Server size={18} style={{ color: '#8b5cf6' }} />;
  if (norm.includes('GMONITER') || norm.includes('MONITOR')) return <Activity size={18} style={{ color: '#f59e0b' }} />;
  if (norm.includes('QUAN TRỌNG') || norm.includes('ĐI KÈM')) return <AlertTriangle size={18} style={{ color: '#ec4899' }} />;
  if (norm.includes('KIỂM TRA') || norm.includes('TEST')) return <CheckSquare size={18} style={{ color: '#14b8a6' }} />;
  return <CheckSquare size={18} style={{ color: 'var(--color-primary)' }} />;
};

// Helper: Highlight matching search query in text
const renderHighlightedText = (text: string, query: string) => {
  if (!query.trim() || !text) return text;
  const q = query.trim();
  const normQ = removeVietnameseTones(q);
  const normT = removeVietnameseTones(text);
  const idx = normT.indexOf(normQ);
  if (idx === -1) return text;

  const start = idx;
  const matchLen = Math.min(q.length, text.length - start);
  const before = text.substring(0, start);
  const matched = text.substring(start, start + matchLen);
  const after = text.substring(start + matchLen);

  return (
    <>
      {before}
      <mark style={{ backgroundColor: '#fef08a', color: '#854d0e', padding: '0 2px', borderRadius: '2px', fontWeight: 600 }}>
        {matched}
      </mark>
      {after}
    </>
  );
};

export const SetupRestaurantPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user);

  // --- List State ---
  const [restaurants, setRestaurants] = useState<SetupRestaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // --- Filter State ---
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIt, setSelectedIt] = useState<string>('all');
  const [itUsers, setItUsers] = useState<any[]>([]);

  // --- Alert / Toast State ---
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- Add / Edit Modal State ---
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingRestaurant, setEditingRestaurant] = useState<SetupRestaurant | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formTenNh, setFormTenNh] = useState<string>('');
  const [formNgayKhaiTruong, setFormNgayKhaiTruong] = useState<string>('');
  const [formItPhutrach, setFormItPhutrach] = useState<string>('');
  const [formAmPhutrach, setFormAmPhutrach] = useState<string>('');
  const [formNoteThem, setFormNoteThem] = useState<string>('');
  const [formTrangThai, setFormTrangThai] = useState<string>('Mới - Đang Setup');
  const [formBrand, setFormBrand] = useState<'GGG' | 'Thecoffeehouse'>('GGG');

  // --- Checklist Modal State ---
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState<boolean>(false);
  const [checklistData, setChecklistData] = useState<RestaurantChecklistResponse | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState<boolean>(false);
  const [checklistSearch, setChecklistSearch] = useState<string>('');
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Group Note State & Toggling State
  const [editingGroupNote, setEditingGroupNote] = useState<string | null>(null);
  const [groupNoteInput, setGroupNoteInput] = useState<string>('');
  const [savingGroupNote, setSavingGroupNote] = useState<boolean>(false);
  const [togglingGroupName, setTogglingGroupName] = useState<string | null>(null);

  // --- Master Checklist SOP Modal State ---
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<boolean>(false);
  const [masterData, setMasterData] = useState<ChecklistMasterResponse | null>(null);
  const [loadingMaster, setLoadingMaster] = useState<boolean>(false);
  const [masterSearch, setMasterSearch] = useState<string>('');
  const [expandedSopGroups, setExpandedSopGroups] = useState<Record<string, boolean>>({});

  const toggleSopGroup = (groupName: string) => {
    setExpandedSopGroups((prev) => ({
      ...prev,
      [groupName]: prev[groupName] !== undefined ? !prev[groupName] : true
    }));
  };

  const handleExpandAllSop = (expand: boolean) => {
    if (!masterData) return;
    const newMap: Record<string, boolean> = {};
    masterData.groups.forEach((g) => {
      newMap[g.nhom] = expand;
    });
    setExpandedSopGroups(newMap);
  };

  const openMasterModal = async (initialSearch?: string) => {
    setIsMasterModalOpen(true);
    if (initialSearch !== undefined) {
      setMasterSearch(initialSearch);
      setExpandedSopGroups((prev) => ({
        ...prev,
        [initialSearch]: true
      }));
    }
    if (!masterData) {
      setLoadingMaster(true);
      try {
        const data = await setupRestaurantService.getMasterChecklist();
        setMasterData(data);
      } catch (err: any) {
        setAlertInfo({
          type: 'error',
          message: err?.response?.data?.detail || 'Không thể tải sổ tay checklist chuẩn SOP.'
        });
      } finally {
        setLoadingMaster(false);
      }
    }
  };

  // --- Master SOP Management State (Admin / Super Admin only) ---
  const [isSopItemModalOpen, setIsSopItemModalOpen] = useState<boolean>(false);
  const [sopItemModalMode, setSopItemModalMode] = useState<'create' | 'edit'>('create');
  const [editingSopItem, setEditingSopItem] = useState<ChecklistMasterItem | null>(null);
  const [sopFormGroupMode, setSopFormGroupMode] = useState<'existing' | 'new'>('existing');
  const [sopFormNhom, setSopFormNhom] = useState<string>('');
  const [sopFormNhomCustom, setSopFormNhomCustom] = useState<string>('');
  const [sopFormNoidung, setSopFormNoidung] = useState<string>('');
  const [sopFormGhichu, setSopFormGhichu] = useState<string>('');
  const [sopFormStt, setSopFormStt] = useState<string>('');
  const [isSubmittingSopItem, setIsSubmittingSopItem] = useState<boolean>(false);
  const [sopItemError, setSopItemError] = useState<string>('');

  // Group Rename Modal State
  const [isSopGroupModalOpen, setIsSopGroupModalOpen] = useState<boolean>(false);
  const [sopGroupOldName, setSopGroupOldName] = useState<string>('');
  const [sopGroupNewName, setSopGroupNewName] = useState<string>('');
  const [isSubmittingSopGroup, setIsSubmittingSopGroup] = useState<boolean>(false);
  const [sopGroupError, setSopGroupError] = useState<string>('');

  // Delete SOP Item Confirm State
  const [deletingSopItem, setDeletingSopItem] = useState<ChecklistMasterItem | null>(null);
  const [isDeletingSopItem, setIsDeletingSopItem] = useState<boolean>(false);

  // Main table top horizontal scroll synchronization
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);

  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [showTopScroll, setShowTopScroll] = useState<boolean>(false);

  const isSyncingTop = React.useRef(false);
  const isSyncingBottom = React.useRef(false);

  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (bottomScrollRef.current && topScrollRef.current) {
      isSyncingBottom.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topScrollRef.current && bottomScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (bottomScrollRef.current && tableRef.current) {
        const scrollW = tableRef.current.scrollWidth;
        const clientW = bottomScrollRef.current.clientWidth;
        setTableScrollWidth(scrollW);
        setShowTopScroll(scrollW > clientW);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (bottomScrollRef.current) {
      resizeObserver.observe(bottomScrollRef.current);
    }
    if (tableRef.current) {
      resizeObserver.observe(tableRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [restaurants, loading, currentPage]);

  // Handlers for SOP Management
  const handleOpenCreateSopItem = (defaultGroup?: string) => {
    setSopItemModalMode('create');
    setEditingSopItem(null);
    setSopItemError('');
    if (defaultGroup) {
      setSopFormNhom(defaultGroup);
      setSopFormGroupMode('existing');
    } else if (masterData && masterData.groups.length > 0) {
      setSopFormNhom(masterData.groups[0].nhom);
      setSopFormGroupMode('existing');
    } else {
      setSopFormNhom('');
      setSopFormGroupMode('new');
    }
    setSopFormNhomCustom('');
    setSopFormNoidung('');
    setSopFormGhichu('');
    setSopFormStt('');
    setIsSopItemModalOpen(true);
  };

  const handleOpenEditSopItem = (item: ChecklistMasterItem) => {
    setSopItemModalMode('edit');
    setEditingSopItem(item);
    setSopItemError('');
    setSopFormGroupMode('existing');
    setSopFormNhom(item.nhom);
    setSopFormNhomCustom('');
    setSopFormNoidung(item.noidung);
    setSopFormGhichu(item.ghichu || '');
    setSopFormStt(item.stt !== undefined && item.stt !== null ? String(item.stt) : '');
    setIsSopItemModalOpen(true);
  };

  const handleSubmitSopItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetGroup = (sopFormGroupMode === 'new' ? sopFormNhomCustom : sopFormNhom).trim().toUpperCase();
    if (!targetGroup) {
      setSopItemError('Vui lòng chọn hoặc nhập tên mục lớn / nhóm SOP.');
      return;
    }
    if (!sopFormNoidung.trim()) {
      setSopItemError('Vui lòng nhập nội dung bước kỹ thuật.');
      return;
    }

    setIsSubmittingSopItem(true);
    setSopItemError('');
    try {
      if (sopItemModalMode === 'create') {
        await setupRestaurantService.createMasterItem({
          nhom: targetGroup,
          noidung: sopFormNoidung.trim(),
          ghichu: sopFormGhichu.trim() || undefined,
          stt: sopFormStt ? parseInt(sopFormStt, 10) : undefined,
        });
        setAlertInfo({
          type: 'success',
          message: `Đã thêm thành công bước mới vào mục [${targetGroup}] của Sổ tay SOP!`
        });
      } else if (editingSopItem) {
        await setupRestaurantService.updateMasterItem(editingSopItem.id, {
          nhom: targetGroup,
          noidung: sopFormNoidung.trim(),
          ghichu: sopFormGhichu.trim() || undefined,
          stt: sopFormStt ? parseInt(sopFormStt, 10) : undefined,
        });
        setAlertInfo({
          type: 'success',
          message: `Đã cập nhật thành công bước #${editingSopItem.id} trong Sổ tay SOP!`
        });
      }

      // Reload SOP master checklist
      const updated = await setupRestaurantService.getMasterChecklist();
      setMasterData(updated);
      setExpandedSopGroups((prev) => ({ ...prev, [targetGroup]: true }));
      setIsSopItemModalOpen(false);
    } catch (err: any) {
      setSopItemError(err?.response?.data?.detail || 'Có lỗi xảy ra khi lưu bước SOP.');
    } finally {
      setIsSubmittingSopItem(false);
    }
  };

  const handleOpenRenameGroup = (groupName: string) => {
    setSopGroupOldName(groupName);
    setSopGroupNewName(groupName);
    setSopGroupError('');
    setIsSopGroupModalOpen(true);
  };

  const handleSubmitRenameGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNew = sopGroupNewName.trim().toUpperCase();
    if (!cleanNew) {
      setSopGroupError('Vui lòng nhập tên mới cho mục lớn.');
      return;
    }
    if (cleanNew === sopGroupOldName.trim().toUpperCase()) {
      setIsSopGroupModalOpen(false);
      return;
    }

    setIsSubmittingSopGroup(true);
    setSopGroupError('');
    try {
      const res = await setupRestaurantService.updateMasterGroup({
        old_nhom: sopGroupOldName,
        new_nhom: cleanNew,
      });
      setAlertInfo({
        type: 'success',
        message: `Đã đổi tên mục lớn '${sopGroupOldName}' thành '${cleanNew}' (${res.updated_count} bước)!`
      });

      const updated = await setupRestaurantService.getMasterChecklist();
      setMasterData(updated);
      setExpandedSopGroups((prev) => {
        const next = { ...prev };
        next[cleanNew] = prev[sopGroupOldName] ?? true;
        delete next[sopGroupOldName];
        return next;
      });
      setIsSopGroupModalOpen(false);
    } catch (err: any) {
      setSopGroupError(err?.response?.data?.detail || 'Có lỗi khi đổi tên mục lớn SOP.');
    } finally {
      setIsSubmittingSopGroup(false);
    }
  };

  const handleConfirmDeleteSopItem = async () => {
    if (!deletingSopItem) return;
    setIsDeletingSopItem(true);
    try {
      await setupRestaurantService.deleteMasterItem(deletingSopItem.id);
      setAlertInfo({
        type: 'success',
        message: `Đã xóa bước kỹ thuật khỏi Sổ tay SOP thành công!`
      });
      const updated = await setupRestaurantService.getMasterChecklist();
      setMasterData(updated);
      setDeletingSopItem(null);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err?.response?.data?.detail || 'Có lỗi xảy ra khi xóa bước SOP.'
      });
    } finally {
      setIsDeletingSopItem(false);
    }
  };


  // --- Add Task Modal State (Admin / Super Admin) ---
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [addTaskGroupMode, setAddTaskGroupMode] = useState<'existing' | 'new'>('existing');
  const [addTaskSelectedGroup, setAddTaskSelectedGroup] = useState<string>('');
  const [addTaskNewGroup, setAddTaskNewGroup] = useState<string>('');
  const [addTaskContent, setAddTaskContent] = useState<string>('');
  const [addTaskNote, setAddTaskNote] = useState<string>('');
  const [addTaskSaveToMaster, setAddTaskSaveToMaster] = useState<boolean>(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);
  const [addTaskError, setAddTaskError] = useState<string>('');

  // --- Import Excel Modal State (Admin / Super Admin) ---
  const [isImportExcelModalOpen, setIsImportExcelModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSaveToMaster, setImportSaveToMaster] = useState<boolean>(false);
  const [isImportingExcel, setIsImportingExcel] = useState<boolean>(false);
  const [importExcelError, setImportExcelError] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);

  // --- Review Fail Modal State ---
  const [reviewFailModalRes, setReviewFailModalRes] = useState<SetupRestaurant | null>(null);
  const [reviewFailNote, setReviewFailNote] = useState<string>('');
  const [reviewFailError, setReviewFailError] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Auto-dismiss alert
  useEffect(() => {
    if (alertInfo) {
      const timer = setTimeout(() => setAlertInfo(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertInfo]);

  // Load IT Users for dropdowns
  useEffect(() => {
    setupRestaurantService.getItUsers()
      .then((users) => setItUsers(users))
      .catch(() => {});
  }, []);

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await setupRestaurantService.getRestaurants(
        statusFilter,
        searchQuery.trim() || undefined,
        selectedIt !== 'all' ? selectedIt : undefined,
        currentPage,
        pageSize
      );
      setRestaurants(res.items);
      setTotalCount(res.total);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể tải danh sách nhà hàng setup.'
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, selectedIt, currentPage]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchRestaurants();
  };

  // Open Add Modal
  const openAddModal = async () => {
    setFormBrand('GGG');
    setFormTenNh('');
    const today = new Date().toISOString().split('T')[0];
    setFormNgayKhaiTruong(today);
    setFormAmPhutrach('');
    setFormNoteThem('');
    try {
      const rr = await setupRestaurantService.getNextItSetup();
      setFormItPhutrach(rr?.next_it || '');
    } catch {
      setFormItPhutrach('');
    }
    setIsAddModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTenNh.trim()) {
      setAlertInfo({ type: 'error', message: 'Vui lòng nhập tên nhà hàng.' });
      return;
    }
    setSubmitting(true);
    try {
      const newRes = await setupRestaurantService.createRestaurant({
        ten_nh: formTenNh.trim(),
        ngay_dukien_khaitruong: formNgayKhaiTruong ? formNgayKhaiTruong.slice(0, 10) + ' 00:00:00' : null,
        it_phutrach: formItPhutrach.trim() || null,
        am_phutrach: formAmPhutrach.trim() || null,
        note_them: formNoteThem.trim() || null,
        brand: formBrand
      });
      setIsAddModalOpen(false);
      setAlertInfo({
        type: 'success',
        message: formBrand === 'GGG'
          ? `Đã tạo thành công nhà hàng "${newRes.ten_nh}" (GGG) và tự động khởi tạo 83 hạng mục checklist!`
          : `Đã tạo thành công nhà hàng "${newRes.ten_nh}" (The Coffee House) - tạm thời chưa có checklist.`
      });
      fetchRestaurants();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi tạo nhà hàng mới.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (res: SetupRestaurant) => {
    setEditingRestaurant(res);
    const rawBrand = (res.brand || res.BRAND || 'GGG').toLowerCase();
    setFormBrand(rawBrand.includes('coffee') || rawBrand === 'tch' ? 'Thecoffeehouse' : 'GGG');
    setFormTenNh(res.ten_nh || res.TEN_NH || '');
    const rawDate = res.ngay_dukien_khaitruong || res.NGAY_DUKIEN_KHAITRUONG || '';
    const dateVal = rawDate ? String(rawDate).slice(0, 10) : '';
    setFormNgayKhaiTruong(dateVal);
    setFormItPhutrach(res.it_phutrach || res.IT_PHUTRACH || '');
    setFormAmPhutrach(res.am_phutrach || res.AM_PHUTRACH || '');
    setFormNoteThem(res.note_them || res.NOTE_THEM || '');
    setFormTrangThai(res.trangthai || res.TRANGTHAI || 'Mới - Đang Setup');
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRestaurant) return;
    if (!formTenNh.trim()) {
      setAlertInfo({ type: 'error', message: 'Vui lòng nhập tên nhà hàng.' });
      return;
    }
    setSubmitting(true);
    try {
      await setupRestaurantService.updateRestaurant(editingRestaurant.id, {
        ten_nh: formTenNh.trim(),
        ngay_dukien_khaitruong: formNgayKhaiTruong ? formNgayKhaiTruong.slice(0, 10) + ' 00:00:00' : null,
        it_phutrach: formItPhutrach.trim() || null,
        am_phutrach: formAmPhutrach.trim() || null,
        note_them: formNoteThem.trim() || null,
        trangthai: formTrangThai,
        brand: formBrand
      });
      setIsEditModalOpen(false);
      setAlertInfo({
        type: 'success',
        message: 'Cập nhật thông tin nhà hàng thành công!'
      });
      fetchRestaurants();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi cập nhật nhà hàng.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Restaurant
  const handleDelete = async (res: SetupRestaurant) => {
    const resName = res.ten_nh || res.TEN_NH || '';
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhà hàng "${resName}" và toàn bộ dữ liệu checklist liên quan?`)) {
      return;
    }
    try {
      await setupRestaurantService.deleteRestaurant(res.id);
      setAlertInfo({
        type: 'success',
        message: `Đã xóa nhà hàng "${resName}" thành công.`
      });
      fetchRestaurants();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi xóa nhà hàng.'
      });
    }
  };

  // --- Open Checklist Modal ---
  const openChecklistModal = async (restaurantId: number) => {
    setIsChecklistModalOpen(true);
    setLoadingChecklist(true);
    setChecklistSearch('');
    setChecklistFilter('all');
    setEditingGroupNote(null);
    try {
      const data = await setupRestaurantService.getChecklist(restaurantId);
      setChecklistData(data);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể tải chi tiết checklist.'
      });
      setIsChecklistModalOpen(false);
    } finally {
      setLoadingChecklist(false);
    }
  };

  // Refresh checklist data
  const refreshCurrentChecklist = async (restaurantId: number) => {
    try {
      const data = await setupRestaurantService.getChecklist(restaurantId);
      setChecklistData(data);
      fetchRestaurants();
    } catch {}
  };

  // Toggle single major group (done / undone)
  const handleToggleGroup = async (groupName: string, targetCompleted: boolean) => {
    if (!checklistData) return;
    const resId = checklistData.restaurant?.id || checklistData.restaurant_id;
    if (!resId) return;

    setIsBulkUpdating(true);
    setTogglingGroupName(groupName);
    try {
      await setupRestaurantService.bulkToggleChecklist(resId, {
        is_completed: targetCompleted,
        group_name: groupName
      });

      setAlertInfo({
        type: 'success',
        message: targetCompleted
          ? `✅ Đã hoàn thành mục [${groupName}]! Ngày giờ và người làm đã được ghi nhận.`
          : `Đã mở lại trạng thái chưa xong cho mục [${groupName}].`
      });

      await refreshCurrentChecklist(resId);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi cập nhật mục lớn.'
      });
    } finally {
      setIsBulkUpdating(false);
      setTogglingGroupName(null);
    }
  };

  // Save note for a single major group
  const handleSaveGroupNote = async (groupName: string, noteText: string) => {
    if (!checklistData) return;
    const resId = checklistData.restaurant?.id || checklistData.restaurant_id;
    if (!resId) return;

    const grp = checklistData.groups.find((g) => (g.nhom || g.group_name) === groupName);
    const isDone = grp?.is_completed ?? ((grp?.completed ?? 0) === (grp?.total ?? 0) && (grp?.total ?? 0) > 0);

    setSavingGroupNote(true);
    try {
      await setupRestaurantService.bulkToggleChecklist(resId, {
        is_completed: isDone,
        group_name: groupName,
        note: noteText.trim()
      });

      setEditingGroupNote(null);
      setAlertInfo({
        type: 'success',
        message: `Đã lưu ghi chú cho mục [${groupName}] thành công!`
      });
      await refreshCurrentChecklist(resId);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err?.response?.data?.detail || 'Lỗi khi lưu ghi chú.'
      });
    } finally {
      setSavingGroupNote(false);
    }
  };

  // Export Excel
  const handleExportExcel = async (resId: number, resName: string) => {
    try {
      await setupRestaurantService.exportChecklistExcel(resId, resName);
      setAlertInfo({
        type: 'success',
        message: `Đã xuất file Excel checklist nhà hàng "${resName}" thành công!`
      });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Lỗi khi xuất file Excel.';
      setAlertInfo({
        type: 'error',
        message: msg
      });
    }
  };

  // --- Add Task Handlers (Admin & Super Admin) ---
  const openAddTaskModal = (defaultGroup?: string) => {
    const existingGroups = (checklistData?.groups || [])
      .map((g) => g.nhom || g.group_name || '')
      .filter(Boolean);

    if (defaultGroup) {
      setAddTaskGroupMode('existing');
      setAddTaskSelectedGroup(defaultGroup);
    } else if (existingGroups.length > 0) {
      setAddTaskGroupMode('existing');
      setAddTaskSelectedGroup(existingGroups[0]);
    } else {
      setAddTaskGroupMode('new');
      setAddTaskSelectedGroup('');
    }

    setAddTaskNewGroup('');
    setAddTaskContent('');
    setAddTaskNote('');
    setAddTaskSaveToMaster(false);
    setAddTaskError('');
    setIsAddTaskModalOpen(true);
  };

  const handleCreateTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddTaskError('');

    const targetGroup = (addTaskGroupMode === 'new' ? addTaskNewGroup : addTaskSelectedGroup).trim();
    if (!targetGroup) {
      setAddTaskError('Vui lòng chọn hoặc nhập tên nhóm lớn cho task!');
      return;
    }

    const content = addTaskContent.trim();
    if (!content) {
      setAddTaskError('Vui lòng nhập nội dung công việc / task!');
      return;
    }

    const rId = checklistData?.restaurant?.id || checklistData?.restaurant_id;
    if (!rId) {
      setAddTaskError('Không tìm thấy thông tin nhà hàng hiện tại!');
      return;
    }

    setIsSubmittingTask(true);
    try {
      await setupRestaurantService.addChecklistItem(rId, {
        nhom: targetGroup,
        noidung: content,
        ghichu: addTaskNote.trim() || null,
        save_to_master: addTaskSaveToMaster
      });

      setIsAddTaskModalOpen(false);
      setAlertInfo({
        type: 'success',
        message: `Đã thêm task "${content}" vào nhóm [${targetGroup}] thành công!`
      });

      // Refresh checklist & list
      refreshCurrentChecklist(rId);
      fetchRestaurants();
    } catch (err: any) {
      setAddTaskError(err?.response?.data?.detail || err?.message || 'Lỗi khi thêm task vào checklist.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // --- Import Excel Handlers (Admin & Super Admin) ---
  const openImportExcelModal = () => {
    setImportFile(null);
    setImportSaveToMaster(false);
    setImportExcelError('');
    setIsImportExcelModalOpen(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      await setupRestaurantService.downloadChecklistTemplateExcel();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err?.response?.data?.detail || err?.message || 'Lỗi khi tải file mẫu Excel.'
      });
    }
  };

  const handleImportExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setImportExcelError('Vui lòng chọn file Excel (.xlsx hoặc .xls) để tải lên!');
      return;
    }

    const rId = checklistData?.restaurant?.id || checklistData?.restaurant_id;
    if (!rId) {
      setImportExcelError('Không tìm thấy thông tin nhà hàng hiện tại!');
      return;
    }

    setIsImportingExcel(true);
    setImportExcelError('');
    try {
      const res = await setupRestaurantService.importChecklistExcel(rId, importFile, importSaveToMaster);
      setIsImportExcelModalOpen(false);
      setAlertInfo({
        type: 'success',
        message: res.message || `Đã nhập thành công ${res.imported_count} công việc từ file Excel!`
      });
      refreshCurrentChecklist(rId);
      fetchRestaurants();
    } catch (err: any) {
      setImportExcelError(err?.response?.data?.detail || err?.message || 'Lỗi khi import file Excel.');
    } finally {
      setIsImportingExcel(false);
    }
  };

  // --- Review Restaurant Handlers (Admin & Super Admin) ---
  const handleReviewRestaurant = async (res: SetupRestaurant, status: 'ok' | 'fail' | null, note?: string | null) => {
    try {
      await setupRestaurantService.reviewRestaurant(res.id, {
        review_status: status,
        review_note: note || null
      });
      const resName = res.ten_nh || res.TEN_NH || '';
      setAlertInfo({
        type: 'success',
        message: status === 'ok'
          ? `Đã đánh giá ĐẠT (OK) cho nhà hàng ${resName}`
          : (status === 'fail' ? `Đã đánh giá KHÔNG ĐẠT (Fail) cho nhà hàng ${resName}` : `Đã hủy đánh giá cho nhà hàng ${resName}`)
      });
      fetchRestaurants();
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi cập nhật đánh giá'
      });
    }
  };

  const handleOpenReviewFailModal = (res: SetupRestaurant) => {
    setReviewFailModalRes(res);
    setReviewFailNote(res.ReviewNote || '');
    setReviewFailError('');
  };

  const handleSubmitReviewFail = async () => {
    if (!reviewFailModalRes) return;
    if (!reviewFailNote.trim()) {
      setReviewFailError('Vui lòng nhập lý do đánh giá không đạt (Fail)!');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await handleReviewRestaurant(reviewFailModalRes, 'fail', reviewFailNote.trim());
      setReviewFailModalRes(null);
      setReviewFailNote('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div style={{ width: '100%' }}>
      {/* Alert toast notification */}
      {alertInfo && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type={alertInfo.type} message={alertInfo.message} />
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)'
            }}>
              <Store size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Setup Nhà Hàng Mới
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Quản lý quy trình triển khai & 83 hạng mục checklist kỹ thuật chuẩn bị vận hành
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openMasterModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: 'var(--color-primary)',
              color: 'var(--color-primary)',
              backgroundColor: 'var(--color-primary-subtle)',
              fontWeight: 600,
            }}
            title="Xem bảng checklist chuẩn SOP tham khảo các bước thực hiện của từng mục lớn"
          >
            <BookOpen size={15} />
            Sổ Tay Hướng Dẫn Setup (SOP)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRestaurants}
            disabled={loading}
          >
            <RefreshCw size={15} style={{ marginRight: '6px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Tải lại
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
          >
            <Plus size={16} style={{ marginRight: '6px' }} />
            Thêm Nhà Hàng Mới
          </Button>
        </div>
      </div>



      {/* Filter and Search Bar */}
      <Card style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Status Tab Pills */}
          <div style={{ display: 'flex', gap: '6px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusFilter === 'all' ? 'var(--bg-card)' : 'transparent',
                color: statusFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: statusFilter === 'all' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Tất Cả
            </button>
            <button
              onClick={() => { setStatusFilter('Mới - Đang Setup'); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusFilter === 'Mới - Đang Setup' ? 'var(--bg-card)' : 'transparent',
                color: statusFilter === 'Mới - Đang Setup' ? 'var(--color-primary-text)' : 'var(--text-muted)',
                boxShadow: statusFilter === 'Mới - Đang Setup' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Đang Setup
            </button>
            <button
              onClick={() => { setStatusFilter('Đã Hoàn Thành'); setCurrentPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: statusFilter === 'Đã Hoàn Thành' ? 'var(--bg-card)' : 'transparent',
                color: statusFilter === 'Đã Hoàn Thành' ? 'var(--color-success)' : 'var(--text-muted)',
                boxShadow: statusFilter === 'Đã Hoàn Thành' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Đã Hoàn Thành
            </button>
          </div>

          {/* Search and IT Filter */}
          <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '320px', justifyContent: 'flex-end' }}>
            <div style={{ minWidth: '160px' }}>
              <select
                value={selectedIt}
                onChange={(e) => { setSelectedIt(e.target.value); setCurrentPage(1); }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              >
                <option value="all">Tất cả IT Phụ Trách</option>
                {itUsers.map((u) => (
                  <option key={u.id || u.username} value={u.username}>
                    {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '360px', width: '100%' }}>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm nhà hàng, AM, IT, ghi chú..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>
              <Button variant="outline" size="sm" type="submit">
                Tìm
              </Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        {/* Thanh cuộn ngang ở trên (Đồng bộ với bảng dữ liệu) */}
        {showTopScroll && (
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="top-scrollbar"
            style={{
              overflowX: 'auto',
              overflowY: 'hidden',
              width: '100%',
              height: '12px',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-color)',
              cursor: 'pointer',
            }}
            title="Kéo để cuộn ngang danh sách nhà hàng setup"
          >
            <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
          </div>
        )}

        <div
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          style={{ overflowX: 'auto' }}
        >
          <table
            ref={tableRef}
            style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Nhà Hàng</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ngày Khai Trương</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Phụ Trách (IT / AM)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '220px' }}>Tiến Độ Checklist</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Trạng Thái</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '160px' }}>Đánh Giá</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', maxWidth: '200px' }}>Ghi Chú</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                    <p style={{ margin: 0 }}>Đang tải danh sách nhà hàng setup...</p>
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Store size={36} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>Không tìm thấy nhà hàng setup nào phù hợp</p>
                  </td>
                </tr>
              ) : (
                restaurants.map((res) => {
                  const tenNh = res.ten_nh || res.TEN_NH || '-';
                  const rawNgayKt = res.ngay_dukien_khaitruong || res.NGAY_DUKIEN_KHAITRUONG;
                  const itPhuTrach = res.it_phutrach || res.IT_PHUTRACH;
                  const amPhuTrach = res.am_phutrach || res.AM_PHUTRACH;
                  const trangThai = res.trangthai || res.TRANGTHAI || 'Mới - Đang Setup';
                  const isCompleted = trangThai === 'Đã Hoàn Thành';
                  const percent = res.progress_percent || 0;
                  return (
                    <tr
                      key={res.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Nhà Hàng */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tenNh}</span>
                          {(() => {
                            const resBrand = (res.brand || res.BRAND || 'GGG').toLowerCase();
                            const isTCH = resBrand.includes('coffee') || resBrand === 'tch';
                            return isTCH ? (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#FFF7ED',
                                border: '1px solid #FED7AA',
                                color: '#EA580C',
                                letterSpacing: '0.2px'
                              }}>
                                The Coffee House
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-primary-subtle)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--color-primary-hover)',
                                letterSpacing: '0.2px'
                              }}>
                                GGG
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Ngày Khai Trương */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {rawNgayKt ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                            <span>{rawNgayKt.split(' ')[0]}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>

                      {/* Phụ Trách */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>IT:</span>
                            <span style={{ fontWeight: 500, color: itPhuTrach ? 'var(--color-primary-hover)' : 'var(--text-muted)' }}>
                              {itPhuTrach || 'Chưa gán'}
                            </span>
                          </div>
                          {amPhuTrach && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>AM:</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{amPhuTrach}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Tiến độ Checklist */}
                      <td style={{ padding: '12px 16px' }}>
                        {res.total_checklist === 0 ? (
                          <span style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px dashed var(--border-color)'
                          }}>
                            Chưa có checklist
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                              <span style={{ fontWeight: 600, color: isCompleted ? '#10b981' : 'var(--text-primary)' }}>
                                {res.completed_checklist} / {res.total_checklist} mục lớn
                              </span>
                              <span style={{ fontWeight: 700, color: isCompleted ? '#16A34A' : 'var(--color-primary-hover)' }}>
                                {percent}%
                              </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${percent}%`,
                                  height: '100%',
                                  backgroundColor: isCompleted ? '#16A34A' : 'var(--color-primary)',
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              ({res.completed_tasks || 0}/{res.total_tasks || 0} việc kỹ thuật)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: '12px 16px' }}>
                        {isCompleted ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981'
                          }}>
                            <CheckCircle2 size={13} />
                            Đã Hoàn Thành
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b'
                          }}>
                            <Clock size={13} />
                            Mới - Đang Setup
                          </span>
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
                                  handleReviewRestaurant(res, res.ReviewStatus === 'ok' ? null : 'ok');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  border: res.ReviewStatus === 'ok' ? '1px solid #16A34A' : '1px solid #D1D5DB',
                                  backgroundColor: res.ReviewStatus === 'ok' ? '#DCFCE7' : '#FFFFFF',
                                  color: res.ReviewStatus === 'ok' ? '#15803D' : '#6B7280',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title={
                                  res.ReviewStatus === 'ok'
                                    ? `Đã đánh giá ĐẠT bởi ${res.ReviewedBy || 'Admin'}${res.ReviewedAt ? ` (${res.ReviewedAt.substring(0, 16)})` : ''}. Bấm để hủy.`
                                    : 'Bấm để đánh giá: Đạt (OK)'
                                }
                              >
                                <CheckCircle2 size={12} color={res.ReviewStatus === 'ok' ? '#15803D' : '#9CA3AF'} />
                                <span>OK</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenReviewFailModal(res);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  borderRadius: '12px',
                                  border: res.ReviewStatus === 'fail' ? '1px solid #DC2626' : '1px solid #D1D5DB',
                                  backgroundColor: res.ReviewStatus === 'fail' ? '#FEE2E2' : '#FFFFFF',
                                  color: res.ReviewStatus === 'fail' ? '#B91C1C' : '#6B7280',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                title={
                                  res.ReviewStatus === 'fail'
                                    ? `Đã đánh giá FAIL bởi ${res.ReviewedBy || 'Admin'}${res.ReviewedAt ? ` (${res.ReviewedAt.substring(0, 16)})` : ''}${res.ReviewNote ? ': ' + res.ReviewNote : ''}. Bấm để sửa hoặc hủy.`
                                    : 'Bấm để đánh giá: Không đạt (Fail)'
                                }
                              >
                                <XCircle size={12} color={res.ReviewStatus === 'fail' ? '#B91C1C' : '#9CA3AF'} />
                                <span>Fail</span>
                              </button>
                            </div>

                            {res.ReviewStatus === 'fail' && res.ReviewNote && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  color: '#DC2626',
                                  fontStyle: 'italic',
                                  maxWidth: '180px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={`Lý do: ${res.ReviewNote}`}
                              >
                                ({res.ReviewNote})
                              </span>
                            )}

                            {!res.ReviewStatus && isCompleted && (
                              <span style={{ fontSize: '11px', color: '#16A34A', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                (Mặc định: Thành công)
                              </span>
                            )}
                          </div>
                        ) : (
                          res.ReviewStatus === 'fail' ? (
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
                              title={res.ReviewNote ? `Lý do: ${res.ReviewNote}` : 'Đánh giá không đạt'}
                            >
                              <XCircle size={12} />
                              <span>Fail{res.ReviewNote ? `: ${res.ReviewNote}` : ''}</span>
                            </span>
                          ) : res.ReviewStatus === 'ok' ? (
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
                          ) : isCompleted ? (
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
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>-</span>
                          )
                        )}
                      </td>

                      {/* Ghi chú */}
                      <td style={{ padding: '12px 16px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }}>
                        {res.note_them || res.NOTE_THEM || '-'}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openChecklistModal(res.id)}
                            style={{ padding: '4px 8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckSquare size={13} />
                            Checklist ({res.completed_checklist}/{res.total_checklist} mục)
                          </Button>

                          <button
                            title="Xuất Excel Checklist"
                            onClick={() => handleExportExcel(res.id, res.ten_nh || res.TEN_NH || 'Nha_Hang')}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: 'transparent',
                              borderRadius: '6px',
                              padding: '5px',
                              cursor: 'pointer',
                              color: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FileSpreadsheet size={15} />
                          </button>

                          <button
                            title="Sửa thông tin nhà hàng"
                            onClick={() => openEditModal(res)}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: 'transparent',
                              borderRadius: '6px',
                              padding: '5px',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            title="Xóa nhà hàng"
                            onClick={() => handleDelete(res)}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: 'transparent',
                              borderRadius: '6px',
                              padding: '5px',
                              cursor: 'pointer',
                              color: '#ef4444',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={14} />
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

        {/* Pagination Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-secondary)',
          fontSize: '13px'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Hiển thị {restaurants.length} trên tổng số {totalCount} nhà hàng
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </Button>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </Card>

      {/* ========================================================
          MODAL: CHECKLIST CHI TIẾT 83 HẠNG MỤC
      ======================================================== */}
      {isChecklistModalOpen && (
        <Modal
          isOpen={isChecklistModalOpen}
          onClose={() => setIsChecklistModalOpen(false)}
          title={`Checklist Setup: ${checklistData?.restaurant?.ten_nh || checklistData?.restaurant?.TEN_NH || checklistData?.restaurant_name || ''}`}
          maxWidth="980px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Tiến độ:{' '}
                <strong style={{ color: '#059669' }}>
                  {checklistData?.completed_groups ?? 0}/{checklistData?.total_groups ?? 7} mục lớn hoàn tất
                </strong>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsChecklistModalOpen(false)}
                style={{ padding: '7px 18px', fontSize: '13px', fontWeight: 600 }}
              >
                Đóng (Esc)
              </Button>
            </div>
          }
        >
          {loadingChecklist ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
              <p>Đang tải chi tiết 83 hạng mục checklist...</p>
            </div>
          ) : checklistData ? (
            (() => {
              const totalGroups = checklistData.total_groups || (checklistData.groups?.length ?? 0);
              const completedGroups = checklistData.completed_groups ?? (
                checklistData.groups?.filter((g) => {
                  const gTot = g.total ?? g.total_items ?? g.items.length;
                  const gComp = g.completed ?? g.completed_items ?? 0;
                  return g.is_completed || (gTot > 0 && gComp === gTot);
                }).length ?? 0
              );
              const groupProgressPct = totalGroups > 0 ? Math.round((completedGroups / totalGroups) * 100) : 0;
              const resStatus = checklistData.restaurant?.trangthai || checklistData.trangthai || 'Mới - Đang Setup';
              const isResDone = resStatus === 'Đã Hoàn Thành';
              const isChecklistSearching = Boolean(checklistSearch.trim());
              const searchNorm = removeVietnameseTones(checklistSearch);

              const filteredChecklistGroups = (checklistData.groups || []).filter((grp) => {
                const grpName = grp.nhom || grp.group_name || 'Nhóm';
                const grpCompleted = grp.completed ?? grp.completed_items ?? 0;
                const grpTotal = grp.total ?? grp.total_items ?? (grp.items?.length ?? 0);
                const isGroupDone = Boolean(grp.is_completed || (grpTotal > 0 && grpCompleted === grpTotal));

                // 1. Filter by status tab
                if (checklistFilter === 'completed' && !isGroupDone) return false;
                if (checklistFilter === 'pending' && isGroupDone) return false;

                // 2. Filter by search query
                if (isChecklistSearching) {
                  const nameMatch = removeVietnameseTones(grpName).includes(searchNorm);
                  const noteMatch = grp.note ? removeVietnameseTones(grp.note).includes(searchNorm) : false;
                  const itemsMatch = grp.items.some((item) => {
                    const itName = item.ten_checklist || item.NOIDUNG || '';
                    const itNote = item.note || item.GHICHU || '';
                    const itUser = item.user_hoanthanh || item.USER_HOANTHANH || '';
                    return (
                      removeVietnameseTones(itName).includes(searchNorm) ||
                      removeVietnameseTones(itNote).includes(searchNorm) ||
                      removeVietnameseTones(itUser).includes(searchNorm)
                    );
                  });
                  return nameMatch || noteMatch || itemsMatch;
                }

                return true;
              });

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Header Bar with Major Group Progress */}
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Tiến độ Mục Lớn: {completedGroups} / {totalGroups} mục hoàn thành
                        </span>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: isResDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isResDone ? '#10b981' : '#f59e0b'
                        }}>
                          {resStatus}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* SOP Handbook Reference Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openMasterModal()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            borderColor: 'var(--color-primary)',
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            fontWeight: 600
                          }}
                          title="Mở sổ tay SOP xem chi tiết các bước chuẩn hóa của từng mục lớn khi cần tham khảo"
                        >
                          <BookOpen size={14} />
                          Sổ Tay Setup (SOP)
                        </Button>

                        {isAdmin && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openAddTaskModal()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              title="Thêm task con hoặc nhóm lớn mới vào checklist (Quản trị viên)"
                            >
                              <Plus size={15} />
                              Thêm Task / Nhóm
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={openImportExcelModal}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              title="Nhập file Excel các đầu việc"
                            >
                              <Upload size={14} />
                              Nhập Excel
                            </Button>
                          </>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const rId = checklistData.restaurant?.id || checklistData.restaurant_id;
                            const rName = checklistData.restaurant?.ten_nh || checklistData.restaurant?.TEN_NH || checklistData.restaurant_name || 'Nha_Hang';
                            if (rId) handleExportExcel(rId, rName);
                          }}
                        >
                          <FileSpreadsheet size={15} style={{ marginRight: '6px', color: '#10b981' }} />
                          Xuất Excel
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '9px', backgroundColor: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${groupProgressPct}%`,
                          height: '100%',
                          backgroundColor: groupProgressPct === 100 ? '#16A34A' : 'var(--color-primary)',
                          transition: 'width 0.4s ease'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      <span>
                        {totalGroups === 0
                          ? 'Nhà hàng tạm thời chưa có checklist'
                          : `Quy tắc: Cần hoàn thành toàn bộ ${totalGroups} mục lớn để hoàn tất triển khai nhà hàng`}
                      </span>
                      <span style={{ fontWeight: 700, color: groupProgressPct === 100 ? '#16A34A' : 'var(--color-primary-hover)' }}>
                        {groupProgressPct}% • Hoàn thành {completedGroups}/{totalGroups} mục lớn
                      </span>
                    </div>
                  </div>

                  {/* Filter and Search Bar */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    {/* Status Tabs */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => setChecklistFilter('all')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: checklistFilter === 'all' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          backgroundColor: checklistFilter === 'all' ? 'var(--color-primary-subtle)' : 'transparent',
                          color: checklistFilter === 'all' ? 'var(--color-primary-hover)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Tất cả mục ({totalGroups})
                      </button>
                      <button
                        onClick={() => setChecklistFilter('pending')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: checklistFilter === 'pending' ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                          backgroundColor: checklistFilter === 'pending' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                          color: checklistFilter === 'pending' ? '#f59e0b' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Chưa xong ({Math.max(0, totalGroups - completedGroups)})
                      </button>
                      <button
                        onClick={() => setChecklistFilter('completed')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: checklistFilter === 'completed' ? '1px solid #10b981' : '1px solid var(--border-color)',
                          backgroundColor: checklistFilter === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                          color: checklistFilter === 'completed' ? '#10b981' : 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Đã xong ({completedGroups})
                      </button>
                    </div>

                    {/* Search box */}
                    <div style={{ position: 'relative', minWidth: '320px', flex: 1, maxWidth: '480px' }}>
                      <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="🔍 Tìm nhanh mục lớn, ghi chú..."
                        value={checklistSearch}
                        onChange={(e) => setChecklistSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 32px 7px 32px',
                          borderRadius: '6px',
                          border: isChecklistSearching ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg, #fff)',
                          color: 'var(--text-primary)',
                          fontSize: '12px',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      {checklistSearch && (
                        <button
                          type="button"
                          onClick={() => setChecklistSearch('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

              {/* Major Groups Container (Tinh Gọn Theo Mục Lớn) */}
              <div
                style={{
                  maxHeight: 'calc(90vh - 310px)',
                  minHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  paddingRight: '6px',
                  paddingBottom: '24px'
                }}
              >
                {checklistData.total_items === 0 ? (
                  <div style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-color)'
                  }}>
                    <Store size={36} style={{ margin: '0 auto 10px', color: '#ea580c', opacity: 0.8 }} />
                    <p style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Nhà hàng này tạm thời chưa có checklist setup
                    </p>
                    <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Bạn có thể sử dụng nút <strong>+ Thêm Task / Nhóm</strong> ở phía trên để bổ sung các hạng mục checklist khi cần.
                    </p>
                  </div>
                ) : filteredChecklistGroups.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckSquare size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      {isChecklistSearching
                        ? `Không tìm thấy mục nào khớp với từ khóa "${checklistSearch}"`
                        : 'Không có mục nào khớp với bộ lọc'}
                    </p>
                    {isChecklistSearching && (
                      <button
                        type="button"
                        onClick={() => setChecklistSearch('')}
                        style={{
                          marginTop: '10px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--color-primary)',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Xóa từ khóa tìm kiếm
                      </button>
                    )}
                  </div>
                ) : (
                  filteredChecklistGroups.map((grp) => {
                    const grpName = grp.nhom || grp.group_name || 'Nhóm';
                    const grpCompleted = grp.completed ?? grp.completed_items ?? 0;
                    const grpTotal = grp.total ?? grp.total_items ?? (grp.items?.length ?? 0);
                    const isGroupDone = Boolean(grp.is_completed || (grpTotal > 0 && grpCompleted === grpTotal));

                    // Find date, user, note for group
                    let completedDateStr = grp.completed_date;
                    let completedUserStr = grp.completed_by;
                    let groupNoteStr = grp.note || '';

                    if (!completedDateStr && isGroupDone) {
                      const dates = grp.items
                        .map((it) => it.ngay_hoanthanh || it.NGAY_HOANTHANH)
                        .filter(Boolean) as string[];
                      if (dates.length > 0) {
                        completedDateStr = dates[dates.length - 1];
                      }
                    }

                    if (!completedUserStr && isGroupDone) {
                      const users = grp.items
                        .map((it) => it.user_hoanthanh || it.USER_HOANTHANH)
                        .filter(Boolean) as string[];
                      if (users.length > 0) {
                        completedUserStr = users[users.length - 1];
                      }
                    }

                    if (!groupNoteStr) {
                      const itemWithNote = grp.items.find((it) => (it.note || it.GHICHU));
                      if (itemWithNote) {
                        groupNoteStr = itemWithNote.note || itemWithNote.GHICHU || '';
                      }
                    }

                    const isTogglingThis = togglingGroupName === grpName;
                    const isEditingThisGroupNote = editingGroupNote === grpName;

                    return (
                      <div
                        key={grpName}
                        style={{
                          border: isGroupDone ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border-color)',
                          borderRadius: '10px',
                          backgroundColor: isGroupDone ? 'rgba(16, 185, 129, 0.025)' : 'var(--bg-card, #fff)',
                          boxShadow: isGroupDone ? '0 2px 6px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Major Group Header */}
                        <div style={{
                          padding: '14px 18px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          backgroundColor: isGroupDone ? 'rgba(16, 185, 129, 0.07)' : 'var(--bg-secondary)',
                          borderBottom: '1px solid var(--border-color)'
                        }}>
                          {/* Left: Group info & Status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: isGroupDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {getGroupIcon(grpName)}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {renderHighlightedText(grpName, checklistSearch)}
                                </span>
                                {isGroupDone ? (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 9px',
                                    borderRadius: '12px',
                                    backgroundColor: '#10b981',
                                    color: '#ffffff'
                                  }}>
                                    <CheckCircle2 size={12} />
                                    ĐÃ XONG (DONE)
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '2px 9px',
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                    color: '#d97706'
                                  }}>
                                    <Clock size={12} />
                                    Chưa xong
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick 1-click Toggle Action */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isGroupDone ? (
                              <button
                                type="button"
                                onClick={() => handleToggleGroup(grpName, false)}
                                disabled={isBulkUpdating || isTogglingThis}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-secondary)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: isBulkUpdating || isTogglingThis ? 'wait' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'all 0.15s ease'
                                }}
                                title={`Mở lại trạng thái chưa xong cho mục [${grpName}]`}
                              >
                                {isTogglingThis ? (
                                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <RotateCcw size={13} />
                                )}
                                <span>Mở Lại Chưa Xong</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleGroup(grpName, true)}
                                disabled={isBulkUpdating || isTogglingThis}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: '1px solid #10b981',
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: isBulkUpdating || isTogglingThis ? 'wait' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.25)',
                                  transition: 'all 0.15s ease'
                                }}
                                title={`Đánh dấu đã hoàn thành toàn bộ mục lớn [${grpName}]`}
                              >
                                {isTogglingThis ? (
                                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                <span>Đánh Dấu Đã Xong (Done)</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Body: Completion Info (if Done) & Note */}
                        <div style={{
                          padding: '10px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          backgroundColor: isGroupDone ? 'rgba(16, 185, 129, 0.015)' : 'transparent'
                        }}>
                          {/* If done, show completion timestamp & technician */}
                          {isGroupDone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 500 }}>
                                <Calendar size={13} />
                                Hoàn thành lúc: <strong style={{ color: '#15803d' }}>{formatDisplayDateTime(completedDateStr) || 'Đã ghi nhận'}</strong>
                              </span>
                              {completedUserStr && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#15803d', fontWeight: 500 }}>
                                  Kỹ thuật viên: <strong style={{ color: '#15803d' }}>{completedUserStr}</strong>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Note section */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '12px',
                            borderTop: isGroupDone ? '1px dashed var(--border-color)' : 'none',
                            paddingTop: isGroupDone ? '6px' : '0'
                          }}>
                            {isEditingThisGroupNote ? (
                              <div style={{ display: 'flex', gap: '6px', width: '100%', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  placeholder={`Nhập ghi chú cho mục [${grpName}] (nếu có)...`}
                                  value={groupNoteInput}
                                  onChange={(e) => setGroupNoteInput(e.target.value)}
                                  disabled={savingGroupNote}
                                  style={{
                                    flex: 1,
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-primary)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--input-bg, #fff)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveGroupNote(grpName, groupNoteInput);
                                    } else if (e.key === 'Escape') {
                                      setEditingGroupNote(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveGroupNote(grpName, groupNoteInput)}
                                  disabled={savingGroupNote}
                                  style={{ padding: '5px 12px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  {savingGroupNote ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                                  Lưu
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingGroupNote(null)}
                                  disabled={savingGroupNote}
                                  style={{ padding: '5px 10px', fontSize: '11px' }}
                                >
                                  Hủy
                                </Button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {groupNoteStr ? (
                                  <span
                                    onClick={() => {
                                      setEditingGroupNote(grpName);
                                      setGroupNoteInput(groupNoteStr);
                                    }}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '4px 10px',
                                      backgroundColor: 'var(--bg-secondary)',
                                      borderRadius: '6px',
                                      border: '1px dashed var(--border-color)',
                                      color: 'var(--text-primary)',
                                      cursor: 'pointer',
                                      fontSize: '12px'
                                    }}
                                    title="Nhấn vào để chỉnh sửa ghi chú"
                                  >
                                    <MessageSquare size={13} style={{ color: 'var(--color-primary)' }} />
                                    <span>Ghi chú: <strong>{renderHighlightedText(groupNoteStr, checklistSearch)}</strong></span>
                                    <Edit2 size={11} style={{ color: 'var(--text-muted)' }} />
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGroupNote(grpName);
                                      setGroupNoteInput('');
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: 'var(--text-muted)',
                                      fontSize: '12px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 0'
                                    }}
                                    title={`Thêm ghi chú cho mục [${grpName}]`}
                                  >
                                    <Plus size={12} />
                                    <span>+ Thêm ghi chú cho mục này (nếu có)</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()
      ) : null}
    </Modal>
  )}

  {/* ========================================================
      MODAL: SỔ TAY HƯỚNG DẪN SETUP (SOP CHUẨN)
  ======================================================== */}
  {isMasterModalOpen && (
    <Modal
      isOpen={isMasterModalOpen}
      onClose={() => setIsMasterModalOpen(false)}
      title="📖 Sổ Tay Hướng Dẫn Kỹ Thuật Setup Nhà Hàng Mới (SOP Chuẩn)"
      maxWidth="960px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Intro Banner */}
        <div style={{
          padding: '12px 18px',
          backgroundColor: 'var(--color-primary-subtle)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ margin: '0 0 3px 0', fontSize: '14px', fontWeight: 700, color: 'var(--color-primary-hover)' }}>
              Tài Liệu SOP Chuẩn Hóa Triển Khai Kỹ Thuật Nhà Hàng Mới
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Tra cứu nhanh 83 bước thực hiện, cấu hình thiết bị, phần mềm và lưu ý quan trọng theo từng phân hệ.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenCreateSopItem()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 12px' }}
                title="Bổ sung bước kỹ thuật hoặc tạo mục lớn mới vào Sổ tay SOP"
              >
                <Plus size={14} />
                Thêm Mục / Bước Mới
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExpandAllSop(true)}
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              Mở rộng tất cả
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExpandAllSop(false)}
              style={{ fontSize: '12px', padding: '5px 10px' }}
            >
              Thu gọn tất cả
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMasterModal()}
              disabled={loadingMaster}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', padding: '5px 10px' }}
            >
              <RefreshCw size={13} style={loadingMaster ? { animation: 'spin 1s linear infinite' } : {}} />
              Tải lại
            </Button>
          </div>
        </div>

        {/* Search box for SOP */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="🔍 Tìm kiếm bước hướng dẫn trong SOP (ví dụ: POS Thu Ngân, MID, IP máy in, License, XML, Gmoniter...)..."
            value={masterSearch}
            onChange={(e) => setMasterSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 36px 9px 36px',
              borderRadius: '6px',
              border: masterSearch ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg, #fff)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {masterSearch && (
            <button
              type="button"
              onClick={() => setMasterSearch('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Master Content */}
        {loadingMaster ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
            <p>Đang tải tài liệu sổ tay SOP...</p>
          </div>
        ) : !masterData ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertTriangle size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
            <p>Chưa có dữ liệu sổ tay SOP.</p>
          </div>
        ) : (
          <div style={{
            maxHeight: '68vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            paddingRight: '6px'
          }}>
            {masterData.groups.map((grp) => {
              const grpSearchNorm = removeVietnameseTones(masterSearch);
              const matchingTasks = masterSearch.trim()
                ? grp.tasks.filter((t) =>
                    removeVietnameseTones(t.noidung).includes(grpSearchNorm) ||
                    (t.ghichu && removeVietnameseTones(t.ghichu).includes(grpSearchNorm)) ||
                    removeVietnameseTones(grp.nhom).includes(grpSearchNorm)
                  )
                : grp.tasks;

              if (masterSearch.trim() && matchingTasks.length === 0) return null;

              // Mặc định thu gọn vào, chỉ bung ra khi người dùng bấm vào hoặc khi đang tìm kiếm
              const isExpanded = masterSearch.trim() ? true : (expandedSopGroups[grp.nhom] ?? false);

              return (
                <div
                  key={grp.nhom}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card, #fff)',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {/* Group Header (Click to toggle) */}
                  <div
                    onClick={() => toggleSopGroup(grp.nhom)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    title={isExpanded ? 'Bấm để thu gọn' : 'Bấm để mở rộng xem các bước'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {getGroupIcon(grp.nhom)}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {renderHighlightedText(grp.nhom, masterSearch)}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary-hover)',
                        fontWeight: 600
                      }}>
                        {matchingTasks.length} bước kỹ thuật
                      </span>

                      {/* Admin-only group actions */}
                      {isAdmin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenRenameGroup(grp.nhom)}
                            title={`Đổi tên mục lớn '${grp.nhom}'`}
                            style={{
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-primary)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <Edit2 size={11} />
                            Đổi tên
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCreateSopItem(grp.nhom)}
                            title={`Thêm bước mới vào mục '${grp.nhom}'`}
                            style={{
                              border: '1px solid var(--color-primary)',
                              background: 'var(--color-primary-subtle)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              color: 'var(--color-primary-hover)',
                              fontWeight: 600
                            }}
                          >
                            <Plus size={11} />
                            Thêm bước
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px' }}>{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  </div>

                  {/* Group Tasks List */}
                  {isExpanded && (
                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {matchingTasks.map((t, idx) => (
                        <div
                          key={t.id || idx}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            fontSize: '13px',
                            flexShrink: 0
                          }}
                        >
                          <span style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '1px'
                          }}>
                            {t.stt || idx + 1}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>
                              {renderHighlightedText(t.noidung, masterSearch)}
                            </div>
                            {t.ghichu && (
                              <div style={{ marginTop: '5px', fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                💡 {renderHighlightedText(t.ghichu, masterSearch)}
                              </div>
                            )}
                          </div>

                          {/* Admin-only step actions (Edit / Delete) */}
                          {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSopItem(t)}
                                title="Chỉnh sửa bước kỹ thuật này"
                                style={{
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-primary)',
                                  borderRadius: '4px',
                                  padding: '4px 6px',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSopItem(t)}
                                title="Xóa bước này khỏi Sổ tay SOP"
                                style={{
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  borderRadius: '4px',
                                  padding: '4px 6px',
                                  cursor: 'pointer',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  )}

  {/* ========================================================
      MODAL: THÊM / SỬA BƯỚC HOẶC MỤC LỚN SOP (ADMIN / SUPER ADMIN)
  ======================================================== */}
  {isSopItemModalOpen && isAdmin && (
    <Modal
      isOpen={isSopItemModalOpen}
      onClose={() => !isSubmittingSopItem && setIsSopItemModalOpen(false)}
      title={sopItemModalMode === 'create' ? '➕ Thêm Bước Kỹ Thuật / Mục Lớn Mới Vào Sổ Tay SOP' : `✏️ Sửa Bước SOP #${editingSopItem?.id}`}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmitSopItem} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sopItemError && <Alert type="error" message={sopItemError} />}

        {/* Group Selection */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Mục Lớn / Nhóm Hạng Mục <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '14px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="sop_group_mode"
                checked={sopFormGroupMode === 'existing'}
                onChange={() => setSopFormGroupMode('existing')}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>Chọn mục lớn có sẵn</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="sop_group_mode"
                checked={sopFormGroupMode === 'new'}
                onChange={() => setSopFormGroupMode('new')}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>Tạo mục lớn mới</span>
            </label>
          </div>

          {sopFormGroupMode === 'existing' ? (
            <select
              value={sopFormNhom}
              onChange={(e) => setSopFormNhom(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg, #fff)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            >
              {masterData?.groups.map((g) => (
                <option key={g.nhom} value={g.nhom}>
                  {g.nhom} ({g.total_tasks} bước)
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="VD: CẤU HÌNH CAMERA, HỆ THỐNG MẠNG DỰ PHÒNG..."
              value={sopFormNhomCustom}
              onChange={(e) => setSopFormNhomCustom(e.target.value.toUpperCase())}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg, #fff)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                textTransform: 'uppercase'
              }}
              required
            />
          )}
        </div>

        {/* STT (Optional) */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Số Thứ Tự (STT) <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Để trống hệ thống tự đánh số tiếp theo)</span>
          </label>
          <input
            type="number"
            placeholder="Tự động tăng..."
            value={sopFormStt}
            onChange={(e) => setSopFormStt(e.target.value)}
            style={{
              width: '140px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg, #fff)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Content */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Nội Dung Bước Kỹ Thuật <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Nhập chi tiết bước hướng dẫn kỹ thuật trong SOP..."
            value={sopFormNoidung}
            onChange={(e) => setSopFormNoidung(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg, #fff)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            required
          />
        </div>

        {/* Note */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Ghi Chú Hướng Dẫn Thêm / Lưu Ý Kỹ Thuật (Tùy chọn)
          </label>
          <textarea
            rows={2}
            placeholder="Mẹo xử lý, IP mặc định, cú pháp lệnh hoặc lưu ý đặc biệt..."
            value={sopFormGhichu}
            onChange={(e) => setSopFormGhichu(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg, #fff)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSopItemModalOpen(false)}
            disabled={isSubmittingSopItem}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmittingSopItem}
          >
            {isSubmittingSopItem ? 'Đang lưu...' : sopItemModalMode === 'create' ? 'Thêm Vào Sổ Tay SOP' : 'Lưu Thay Đổi'}
          </Button>
        </div>
      </form>
    </Modal>
  )}

  {/* ========================================================
      MODAL: ĐỔI TÊN MỤC LỚN SOP (ADMIN / SUPER ADMIN)
  ======================================================== */}
  {isSopGroupModalOpen && isAdmin && (
    <Modal
      isOpen={isSopGroupModalOpen}
      onClose={() => !isSubmittingSopGroup && setIsSopGroupModalOpen(false)}
      title={`✏️ Đổi Tên Mục Lớn SOP: ${sopGroupOldName}`}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmitRenameGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sopGroupError && <Alert type="error" message={sopGroupError} />}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Tên Mục Lớn Mới <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={sopGroupNewName}
            onChange={(e) => setSopGroupNewName(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--input-bg, #fff)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              textTransform: 'uppercase'
            }}
            required
            autoFocus
          />
          <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Tất cả các bước kỹ thuật thuộc mục <strong>{sopGroupOldName}</strong> sẽ được cập nhật sang tên mới.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSopGroupModalOpen(false)}
            disabled={isSubmittingSopGroup}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmittingSopGroup}
          >
            {isSubmittingSopGroup ? 'Đang cập nhật...' : 'Cập Nhật Tên'}
          </Button>
        </div>
      </form>
    </Modal>
  )}

  {/* ========================================================
      MODAL: XÁC NHẬN XÓA BƯỚC SOP (ADMIN / SUPER ADMIN)
  ======================================================== */}
  {deletingSopItem && isAdmin && (
    <Modal
      isOpen={true}
      onClose={() => !isDeletingSopItem && setDeletingSopItem(null)}
      title="⚠️ Xác Nhận Xóa Bước Kỹ Thuật Khỏi SOP"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          Bạn có chắc chắn muốn xóa bước sau khỏi mục <strong>[{deletingSopItem.nhom}]</strong> của Sổ tay SOP không?
        </p>

        <div style={{
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          fontSize: '13px',
          color: 'var(--text-primary)',
          fontWeight: 500
        }}>
          {deletingSopItem.noidung}
          {deletingSopItem.ghichu && (
            <div style={{ marginTop: '4px', fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              💡 {deletingSopItem.ghichu}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeletingSopItem(null)}
            disabled={isDeletingSopItem}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirmDeleteSopItem}
            disabled={isDeletingSopItem}
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
          >
            {isDeletingSopItem ? 'Đang xóa...' : 'Xác Nhận Xóa'}
          </Button>
        </div>
      </div>
    </Modal>
  )}

      {/* ========================================================
          MODAL: THÊM NHÀ HÀNG MỚI
      ======================================================== */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Thêm Nhà Hàng Setup Mới"
          maxWidth="540px"
        >
          <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              backgroundColor: formBrand === 'GGG' ? 'var(--color-primary-subtle)' : '#FFF7ED',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              color: formBrand === 'GGG' ? 'var(--color-primary-hover)' : '#C2410C',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: formBrand === 'GGG' ? '1px solid var(--border-color)' : '1px solid #FED7AA'
            }}>
              <Sparkles size={16} style={{ flexShrink: 0 }} />
              {formBrand === 'GGG' ? (
                <span>Hệ thống sẽ tự động nhân bản trọn bộ <strong>83 hạng mục checklist</strong> chuẩn của GGG khi tạo nhà hàng!</span>
              ) : (
                <span>Nhà hàng <strong>The Coffee House</strong> tạm thời chưa có checklist (sẽ không tạo hạng mục checklist).</span>
              )}
            </div>

            {/* Chọn Hệ thống NH / Brand */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Hệ Thống Nhà Hàng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: formBrand === 'GGG' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: formBrand === 'GGG' ? 'var(--color-primary-subtle)' : 'var(--input-bg, #fff)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="modal_brand_add"
                    value="GGG"
                    checked={formBrand === 'GGG'}
                    onChange={() => setFormBrand('GGG')}
                    style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>GGG</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Golden Gate (Checklist chuẩn 83 mục)</div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: formBrand === 'Thecoffeehouse' ? '2px solid #ea580c' : '1px solid var(--border-color)',
                    backgroundColor: formBrand === 'Thecoffeehouse' ? '#FFF7ED' : 'var(--input-bg, #fff)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="modal_brand_add"
                    value="Thecoffeehouse"
                    checked={formBrand === 'Thecoffeehouse'}
                    onChange={() => setFormBrand('Thecoffeehouse')}
                    style={{ accentColor: '#ea580c', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#ea580c' }}>The Coffee House</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TCH (Tạm thời chưa có checklist)</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Tên Nhà Hàng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Gogi House Tân Sơn Nhì"
                value={formTenNh}
                onChange={(e) => setFormTenNh(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Ngày Dự Kiến Khai Trương
              </label>
              <input
                type="date"
                value={formNgayKhaiTruong}
                onChange={(e) => setFormNgayKhaiTruong(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  IT Phụ Trách {isAdmin && <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>(Gợi ý xoay vòng tự động)</span>}
                </label>
                <select
                  value={formItPhutrach}
                  onChange={(e) => setFormItPhutrach(e.target.value)}
                  disabled={!isAdmin}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: !isAdmin ? 'var(--bg-muted, #f3f4f6)' : 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: !isAdmin ? 'not-allowed' : 'default'
                  }}
                >
                  <option value="">-- {isAdmin ? 'Chọn IT Phụ Trách' : 'Tự động phân công theo xoay vòng'} --</option>
                  {itUsers.map((u) => (
                    <option key={u.id || u.username} value={u.username}>
                      {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                    </option>
                  ))}
                </select>
                {!isAdmin && (
                  <span style={{ fontSize: '11px', color: 'var(--color-primary-hover)', marginTop: '3px', display: 'block' }}>
                    🔄 Tự động phân công theo xoay vòng (Chỉ Quản trị viên mới được đổi)
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  AM Phụ Trách
                </label>
                <input
                  type="text"
                  placeholder="Tên Quản lý vận hành (AM)"
                  value={formAmPhutrach}
                  onChange={(e) => setFormAmPhutrach(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Ghi Chú Thêm
              </label>
              <textarea
                placeholder="Thông tin thêm về địa điểm, số lượng máy POS, lưu ý..."
                value={formNoteThem}
                onChange={(e) => setFormNoteThem(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setIsAddModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                {submitting ? 'Đang tạo...' : 'Tạo Nhà Hàng'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: SỬA THÔNG TIN NHÀ HÀNG
      ======================================================== */}
      {isEditModalOpen && editingRestaurant && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Sửa Thông Tin: ${editingRestaurant.ten_nh}`}
          maxWidth="540px"
        >
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Thuộc Hệ Thống (GGG / The Coffee House) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Hệ Thống Nhà Hàng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: formBrand === 'GGG' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: formBrand === 'GGG' ? 'var(--color-primary-subtle)' : 'var(--input-bg, #fff)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="radio"
                    name="modal_brand_edit"
                    value="GGG"
                    checked={formBrand === 'GGG'}
                    onChange={() => setFormBrand('GGG')}
                    style={{ accentColor: 'var(--color-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>GGG</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>(Golden Gate)</span>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: formBrand === 'Thecoffeehouse' ? '2px solid #ea580c' : '1px solid var(--border-color)',
                    backgroundColor: formBrand === 'Thecoffeehouse' ? '#FFF7ED' : 'var(--input-bg, #fff)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="radio"
                    name="modal_brand_edit"
                    value="Thecoffeehouse"
                    checked={formBrand === 'Thecoffeehouse'}
                    onChange={() => setFormBrand('Thecoffeehouse')}
                    style={{ accentColor: '#ea580c', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#ea580c' }}>The Coffee House</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>(TCH)</span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Tên Nhà Hàng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formTenNh}
                onChange={(e) => setFormTenNh(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Ngày Dự Kiến Khai Trương
              </label>
              <input
                type="date"
                value={formNgayKhaiTruong}
                onChange={(e) => setFormNgayKhaiTruong(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  IT Phụ Trách
                </label>
                <select
                  value={formItPhutrach}
                  onChange={(e) => setFormItPhutrach(e.target.value)}
                  disabled={!isAdmin}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: !isAdmin ? 'var(--bg-muted, #f3f4f6)' : 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: !isAdmin ? 'not-allowed' : 'default'
                  }}
                >
                  <option value="">-- Chọn IT Phụ Trách --</option>
                  {itUsers.map((u) => (
                    <option key={u.id || u.username} value={u.username}>
                      {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                    </option>
                  ))}
                </select>
                {!isAdmin && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px', display: 'block' }}>
                    🔒 Chỉ Quản trị viên mới có quyền đổi người phụ trách
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  AM Phụ Trách
                </label>
                <input
                  type="text"
                  value={formAmPhutrach}
                  onChange={(e) => setFormAmPhutrach(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Trạng Thái
              </label>
              <select
                value={formTrangThai}
                onChange={(e) => setFormTrangThai(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              >
                <option value="Mới - Đang Setup">Mới - Đang Setup</option>
                <option
                  value="Đã Hoàn Thành"
                  disabled={!editingRestaurant.can_complete}
                >
                  {editingRestaurant.can_complete
                    ? 'Đã Hoàn Thành (100% Checklist)'
                    : `Đã Hoàn Thành (Chưa đủ điều kiện: ${editingRestaurant.completed_checklist}/${editingRestaurant.total_checklist})`}
                </option>
              </select>
              {!editingRestaurant.can_complete && (
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={12} />
                  Cần tích hoàn thành toàn bộ 83 hạng mục checklist để chuyển sang "Đã Hoàn Thành".
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Ghi Chú Thêm
              </label>
              <textarea
                value={formNoteThem}
                onChange={(e) => setFormNoteThem(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal nhập lý do Đánh giá Fail */}
      {reviewFailModalRes && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isSubmittingReview) {
              setReviewFailModalRes(null);
              setReviewFailNote('');
              setReviewFailError('');
            }
          }}
          title={`Đánh Giá Không Đạt (Fail) - Nhà hàng: ${reviewFailModalRes.ten_nh}`}
        >
          <div>
            {reviewFailModalRes.ReviewStatus === 'fail' ? (
              <p style={{ fontSize: '13px', color: '#DC2626', margin: '0 0 12px 0', fontWeight: 500 }}>
                Nhà hàng này hiện đang được đánh giá <strong>Fail</strong> bởi{' '}
                <strong>{reviewFailModalRes.ReviewedBy || 'Admin'}</strong>
                {reviewFailModalRes.ReviewedAt ? ` vào lúc ${reviewFailModalRes.ReviewedAt.substring(0, 16)}` : ''}.
              </p>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Vui lòng nhập lý do đánh giá không đạt (Fail) cho nhà hàng này để ghi nhận báo cáo:
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
                placeholder="Ví dụ: Thiếu thiết bị POS, chưa cấu hình mạng hoàn tất, trễ tiến độ bàn giao..."
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
                {reviewFailModalRes.ReviewStatus === 'fail' && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsSubmittingReview(true);
                      try {
                        await handleReviewRestaurant(reviewFailModalRes, null);
                        setReviewFailModalRes(null);
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
                    setReviewFailModalRes(null);
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

      {/* ========================================================
          MODAL: THÊM TASK / NHÓM CHECKLIST (ADMIN / SUPER ADMIN)
      ======================================================== */}
      {isAddTaskModalOpen && (
        <Modal
          isOpen={isAddTaskModalOpen}
          onClose={() => !isSubmittingTask && setIsAddTaskModalOpen(false)}
          title="Thêm Task / Nhóm Vào Checklist"
          maxWidth="560px"
        >
          <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {addTaskError && (
              <Alert type="error" message={addTaskError} />
            )}

            {/* Mode: Chọn nhóm hay tạo nhóm mới */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Phân loại nhóm lớn <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="groupMode"
                    value="existing"
                    checked={addTaskGroupMode === 'existing'}
                    onChange={() => setAddTaskGroupMode('existing')}
                  />
                  Chọn nhóm có sẵn
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="groupMode"
                    value="new"
                    checked={addTaskGroupMode === 'new'}
                    onChange={() => setAddTaskGroupMode('new')}
                  />
                  + Tạo nhóm lớn mới
                </label>
              </div>

              {addTaskGroupMode === 'existing' ? (
                <select
                  value={addTaskSelectedGroup}
                  onChange={(e) => setAddTaskSelectedGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                  required
                >
                  <option value="" disabled>-- Chọn nhóm lớn --</option>
                  {(checklistData?.groups || []).map((grp) => {
                    const gName = grp.nhom || grp.group_name || '';
                    return (
                      <option key={gName} value={gName}>
                        {gName}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ví dụ: HỆ THỐNG ÂM THANH, CAMERA GIÁM SÁT..."
                  value={addTaskNewGroup}
                  onChange={(e) => setAddTaskNewGroup(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                  required
                />
              )}
            </div>

            {/* Task Content */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Nội dung công việc / Task con <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập chi tiết đầu việc cần thực hiện (ví dụ: Cấu hình switch Ruijie PoE cho AP...)"
                value={addTaskContent}
                onChange={(e) => setAddTaskContent(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
                required
              />
            </div>

            {/* Note */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Ghi chú ban đầu (không bắt buộc)
              </label>
              <input
                type="text"
                placeholder="Ghi chú thêm về thiết bị, vị trí hoặc người phụ trách..."
                value={addTaskNote}
                onChange={(e) => setAddTaskNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Save to Master Checklist */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-primary-subtle)',
              borderRadius: '6px',
              border: '1px dashed var(--color-primary)'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={addTaskSaveToMaster}
                  onChange={(e) => setAddTaskSaveToMaster(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  <strong>Áp dụng vào mẫu Checklist chuẩn chung (Master Template)</strong>
                  <br />
                  <span style={{ color: 'var(--text-muted)' }}>
                    Nếu tích chọn, hạng mục này sẽ được lưu vĩnh viễn vào danh mục chuẩn và tự động áp dụng cho tất cả nhà hàng mới tạo sau này.
                  </span>
                </span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsAddTaskModalOpen(false);
                  openImportExcelModal();
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                <Upload size={13} />
                Hoặc Nhập nhanh bằng file Excel
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddTaskModalOpen(false)}
                  disabled={isSubmittingTask}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingTask}
                >
                  {isSubmittingTask ? 'Đang thêm...' : 'Thêm Vào Checklist'}
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: IMPORT FILE EXCEL CHECKLIST (ADMIN / SUPER ADMIN)
      ======================================================== */}
      {isImportExcelModalOpen && (
        <Modal
          isOpen={isImportExcelModalOpen}
          onClose={() => !isImportingExcel && setIsImportExcelModalOpen(false)}
          title="Nhập File Excel Thêm Nhanh Task / Nhóm Vào Checklist"
          maxWidth="620px"
        >
          <form onSubmit={handleImportExcelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {importExcelError && (
              <Alert type="error" message={importExcelError} />
            )}

            {/* Template Download & Guide */}
            <div style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  File mẫu chuẩn Excel (.xlsx)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}
                >
                  <Download size={14} />
                  Tải File Mẫu Excel
                </Button>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Cấu trúc file gồm 3 cột:
                <br />• <strong>Nhóm Hạng Mục</strong> (Cột A): Tên nhóm lớn (ví dụ: <em>RK7-MANAGER, POS THU NGÂN, HỆ THỐNG MẠNG...</em>).
                <br />• <strong>Nội Dung Công Việc</strong> (Cột B): Tên chi tiết task cần làm (bắt buộc).
                <br />• <strong>Ghi Chú</strong> (Cột C): Thông tin thêm về thiết bị, vị trí... (tùy chọn).
              </p>
            </div>

            {/* File Upload Box */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Chọn file Excel (.xlsx / .xls) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div
                style={{
                  border: '2px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: importFile ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => document.getElementById('checklist-excel-file-input')?.click()}
              >
                <input
                  id="checklist-excel-file-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setImportFile(f);
                      setImportExcelError('');
                    }
                  }}
                  style={{ display: 'none' }}
                />

                {importFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet size={36} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {importFile.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {(importFile.size / 1024).toFixed(1)} KB — Nhấn để chọn file khác
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Upload size={32} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Nhấn để chọn file Excel từ máy tính
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Hỗ trợ file định dạng .xlsx, .xls
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Save to Master Checklist */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'var(--color-primary-subtle)',
              borderRadius: '6px',
              border: '1px dashed var(--color-primary)'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={importSaveToMaster}
                  onChange={(e) => setImportSaveToMaster(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  <strong>Đồng thời lưu vào Mẫu Checklist Chuẩn Chung (Master Template)</strong>
                  <br />
                  <span style={{ color: 'var(--text-muted)' }}>
                    Nếu tích chọn, toàn bộ các đầu việc trong file Excel cũng sẽ được lưu vào mẫu chuẩn và tự động áp dụng cho các nhà hàng tạo mới sau này.
                  </span>
                </span>
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsImportExcelModalOpen(false)}
                disabled={isImportingExcel}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isImportingExcel || !importFile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Upload size={14} />
                {isImportingExcel ? 'Đang đọc và import...' : 'Bắt đầu Import'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
