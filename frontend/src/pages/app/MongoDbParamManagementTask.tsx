import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Download,
  Upload,
  Clock,
  Play,
  Eye
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { DateInput } from '../../components/ui/DateInput';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';
import { RestaurantItem } from '../../types/restaurant';
import { UserInfo } from '../../types/auth';
import {
  mongoService,
  AppParamItem,
  StandardAppParamItem,
  BatchTargetRestaurantItem,
  BatchApplyParamsResponse,
  ScheduledParamJobItem
} from '../../services/mongoService';
import { checkIsAdmin } from '../../utils/authUtils';
import {
  getParamDisplayName,
  getParamCategory,
  getParamPriority
} from './RestaurantMongoPage';

interface MongoDbParamManagementTaskProps {
  selectedRestaurant?: RestaurantItem | null;
  restaurants: RestaurantItem[];
  user: UserInfo | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  connectedHost?: string;
  openCandidates?: { ip: string; is_kds?: boolean; role_hint?: string }[];
  onSwitchMongoHost?: (host: string) => void;
}

export const MongoDbParamManagementTask: React.FC<MongoDbParamManagementTaskProps> = ({
  selectedRestaurant,
  restaurants = [],
  user = null,
  showToast,
  connectedHost
}) => {
  // MongoDB chỉ nằm trên các máy trạm (.11, .12, .41) được chuyển qua connectedHost; KHÔNG dùng gateway ip (10.x.y.1)
  const currentHost = connectedHost || '';
  const currentPort = 27017;

  const isAdmin = checkIsAdmin(user);

  // Dữ liệu params
  const [paramsList, setParamsList] = useState<AppParamItem[]>([]);
  const [loadingParams, setLoadingParams] = useState<boolean>(false);

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<number>(-1);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal Sửa
  const [editingParam, setEditingParam] = useState<AppParamItem | null>(null);
  const [editFormType, setEditFormType] = useState<'FUNCTION' | 'CONFIG'>('FUNCTION');
  const [editFormStatus, setEditFormStatus] = useState<number>(1);
  const [editFormValue, setEditFormValue] = useState<string>('');
  const [editFormNote, setEditFormNote] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Modal Thêm Mới
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newParamCode, setNewParamCode] = useState<string>('');
  const [newParamType, setNewParamType] = useState<'FUNCTION' | 'CONFIG'>('FUNCTION');
  const [newParamStatus, setNewParamStatus] = useState<number>(1);
  const [newParamValue, setNewParamValue] = useState<string>('1');
  const [newParamNote, setNewParamNote] = useState<string>('');
  const [isSavingCreate, setIsSavingCreate] = useState<boolean>(false);

  // Modal Xóa
  const [deletingParam, setDeletingParam] = useState<AppParamItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toggle nhanh status
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  // ══════════════════════════════════════════════════════════════
  // STATE CHO TÍNH NĂNG BỘ PARAM CHUẨN (STANDARD PARAMS)
  // ══════════════════════════════════════════════════════════════
  const [standardParamsList, setStandardParamsList] = useState<StandardAppParamItem[]>([]);
  const [loadingStandardParams, setLoadingStandardParams] = useState<boolean>(false);
  const [showStandardModal, setShowStandardModal] = useState<boolean>(false);
  const [standardModalTab, setStandardModalTab] = useState<'LIST' | 'APPLY'>('LIST');
  const [standardSearchQuery, setStandardSearchQuery] = useState<string>('');
  const [standardTypeFilter, setStandardTypeFilter] = useState<string>('ALL');
  const [standardStatusFilter, setStandardStatusFilter] = useState<number>(-1);

  // Thêm / Sửa Param Chuẩn
  const [editingStdParam, setEditingStdParam] = useState<StandardAppParamItem | null>(null);
  const [showCreateStdModal, setShowCreateStdModal] = useState<boolean>(false);
  const [stdFormCode, setStdFormCode] = useState<string>('');
  const [stdFormType, setStdFormType] = useState<'FUNCTION' | 'CONFIG'>('FUNCTION');
  const [stdFormStatus, setStdFormStatus] = useState<number>(1);
  const [stdFormValue, setStdFormValue] = useState<string>('1');
  const [stdFormNote, setStdFormNote] = useState<string>('');
  const [isSavingStd, setIsSavingStd] = useState<boolean>(false);
  const [deletingStdParam, setDeletingStdParam] = useState<StandardAppParamItem | null>(null);
  const [isDeletingStd, setIsDeletingStd] = useState<boolean>(false);

  // Lưu lẻ 1 dòng vào bộ chuẩn
  const [savingSingleCode, setSavingSingleCode] = useState<string | null>(null);

  // Modal Lưu toàn bộ từ nhà này vào chuẩn
  const [showSaveToStandardModal, setShowSaveToStandardModal] = useState<boolean>(false);
  const [isSavingToStandard, setIsSavingToStandard] = useState<boolean>(false);

  // ══════════════════════════════════════════════════════════════
  // STATE CHO TÍNH NĂNG ÁP DỤNG PARAM (ĐƠN LẺ & HÀNG LOẠT)
  // ══════════════════════════════════════════════════════════════
  const [applyScope, setApplyScope] = useState<'CURRENT' | 'MULTIPLE'>('CURRENT');
  const [applyMode, setApplyMode] = useState<'upsert' | 'overwrite' | 'skip_existing'>('upsert');
  const [isApplying, setIsApplying] = useState<boolean>(false);

  // Lựa chọn nhà hàng hàng loạt
  const [batchPastedCodes, setBatchPastedCodes] = useState<string>('');
  const [batchSearchName, setBatchSearchName] = useState<string>('');
  const [batchSelectedIps, setBatchSelectedIps] = useState<string[]>([]);
  const [batchSelectAllParams, setBatchSelectAllParams] = useState<boolean>(true);
  const [batchSelectedParamCodes, setBatchSelectedParamCodes] = useState<string[]>([]);
  const [batchParamSearch, setBatchParamSearch] = useState<string>('');

  // Kết quả áp dụng hàng loạt
  const [batchResultData, setBatchResultData] = useState<BatchApplyParamsResponse | null>(null);
  const [showBatchResultModal, setShowBatchResultModal] = useState<boolean>(false);

  // ══════════════════════════════════════════════════════════════
  // STATE CHO TÍNH NĂNG HẸN GIỜ ĐẨY PARAM (SCHEDULED JOBS)
  // ══════════════════════════════════════════════════════════════
  const [scheduledJobsList, setScheduledJobsList] = useState<ScheduledParamJobItem[]>([]);
  const [loadingScheduledJobs, setLoadingScheduledJobs] = useState<boolean>(false);
  const [showScheduledJobsModal, setShowScheduledJobsModal] = useState<boolean>(false);
  const [scheduledActiveTab, setScheduledActiveTab] = useState<'LIST' | 'CREATE'>('LIST');

  // Form tạo lịch hẹn giờ
  const [newJobTitle, setNewJobTitle] = useState<string>('');
  const [newJobDate, setNewJobDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [newJobTime, setNewJobTime] = useState<string>('01:00');
  const [newJobMode, setNewJobMode] = useState<'upsert' | 'overwrite' | 'skip_existing'>('upsert');
  const [newJobTargetScope, setNewJobTargetScope] = useState<'CURRENT' | 'MULTIPLE'>('MULTIPLE');
  const [newJobPastedCodes, setNewJobPastedCodes] = useState<string>('');
  const [newJobSearchName, setNewJobSearchName] = useState<string>('');
  const [newJobSelectedIps, setNewJobSelectedIps] = useState<string[]>([]);
  const [newJobParamMode, setNewJobParamMode] = useState<'ALL' | 'CUSTOM'>('ALL');
  const [newJobSelectedParamCodes, setNewJobSelectedParamCodes] = useState<string[]>([]);
  const [newJobParamSearch, setNewJobParamSearch] = useState<string>('');
  const [isCreatingJob, setIsCreatingJob] = useState<boolean>(false);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);
  const [viewingJobDetail, setViewingJobDetail] = useState<ScheduledParamJobItem | null>(null);

  // Tham số tự thêm cho Lịch Hẹn Giờ
  const [newJobCustomParams, setNewJobCustomParams] = useState<{
    paramCode: string;
    paramName?: string;
    paramType: 'FUNCTION' | 'CONFIG';
    status: number;
    value: string;
    note?: string;
  }[]>([]);
  const [showAddCustomParamForm, setShowAddCustomParamForm] = useState<boolean>(false);
  const [editingCustomParamIndex, setEditingCustomParamIndex] = useState<number | null>(null);

  // Form input cho param tự thêm
  const [customFormCode, setCustomFormCode] = useState<string>('');
  const [customFormName, setCustomFormName] = useState<string>('');
  const [customFormType, setCustomFormType] = useState<'FUNCTION' | 'CONFIG'>('FUNCTION');
  const [customFormStatus, setCustomFormStatus] = useState<number>(1);
  const [customFormValue, setCustomFormValue] = useState<string>('1');
  const [customFormNote, setCustomFormNote] = useState<string>('');

  const handleAddOrUpdateCustomParam = () => {
    const code = customFormCode.trim().toUpperCase();
    if (!code) {
      showToast('Vui lòng nhập Mã tham số (Param Code)!', 'error');
      return;
    }
    const newItem = {
      paramCode: code,
      paramName: customFormName.trim() || code,
      paramType: customFormType,
      status: customFormStatus,
      value: customFormValue,
      note: customFormNote.trim()
    };

    if (editingCustomParamIndex !== null) {
      setNewJobCustomParams((prev) => {
        const next = [...prev];
        next[editingCustomParamIndex] = newItem;
        return next;
      });
      showToast(`Đã cập nhật tham số '${code}'!`, 'success');
      setEditingCustomParamIndex(null);
    } else {
      const existsIndex = newJobCustomParams.findIndex((p) => p.paramCode === code);
      if (existsIndex >= 0) {
        setNewJobCustomParams((prev) => {
          const next = [...prev];
          next[existsIndex] = newItem;
          return next;
        });
        showToast(`Đã cập nhật tham số tự thêm '${code}'!`, 'success');
      } else {
        setNewJobCustomParams((prev) => [...prev, newItem]);
        showToast(`Đã thêm tham số '${code}' vào lịch hẹn!`, 'success');
      }
    }

    if (!newJobSelectedParamCodes.includes(code)) {
      setNewJobSelectedParamCodes((prev) => [...prev, code]);
    }

    setCustomFormCode('');
    setCustomFormName('');
    setCustomFormType('FUNCTION');
    setCustomFormStatus(1);
    setCustomFormValue('1');
    setCustomFormNote('');
    setShowAddCustomParamForm(false);
  };

  const handleRemoveCustomParam = (code: string) => {
    setNewJobCustomParams((prev) => prev.filter((p) => p.paramCode !== code));
    setNewJobSelectedParamCodes((prev) => prev.filter((c) => c !== code));
    showToast(`Đã xóa tham số tự thêm '${code}'`, 'info');
  };

  const handleEditCustomParam = (
    item: { paramCode: string; paramName?: string; paramType: 'FUNCTION' | 'CONFIG'; status: number; value: string; note?: string },
    index: number
  ) => {
    setEditingCustomParamIndex(index);
    setCustomFormCode(item.paramCode);
    setCustomFormName(item.paramName || '');
    setCustomFormType(item.paramType);
    setCustomFormStatus(item.status);
    setCustomFormValue(item.value);
    setCustomFormNote(item.note || '');
    setShowAddCustomParamForm(true);
  };



  const handleCopy = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  // Tải danh sách params từ MongoDB nhà hàng
  const loadParams = async (targetHost?: string) => {
    const hostToUse = targetHost || currentHost;
    if (!hostToUse) return;
    setLoadingParams(true);
    try {
      const data = await mongoService.getAppParams(hostToUse, currentPort);
      setParamsList(data);
    } catch (err: any) {
      showToast('Lỗi khi tải tham số MongoDB: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingParams(false);
    }
  };

  // Nút Làm mới dữ liệu: luôn nạp lại từ MongoDB đang kết nối và có thông báo trực quan
  const handleRefreshParams = async () => {
    if (!currentHost) {
      showToast('Chưa có kết nối MongoDB nhà hàng. Đang chờ kết nối máy trạm...', 'info');
      return;
    }
    setLoadingParams(true);
    try {
      const data = await mongoService.getAppParams(currentHost, currentPort);
      setParamsList(data);
      showToast(`Đã làm mới thành công ${data.length} tham số từ MongoDB ${currentHost}:27017`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi làm mới tham số MongoDB: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingParams(false);
    }
  };

  // Tự động load params khi có kết nối host hợp lệ
  useEffect(() => {
    if (currentHost) {
      loadParams(currentHost);
    } else {
      setParamsList([]);
    }
  }, [currentHost]);

  // Khi chọn sang nhà hàng khác, tự động xóa bộ lọc tìm kiếm cũ để hiển thị đầy đủ tham số
  const prevRestaurantIdRef = React.useRef<number | undefined>(selectedRestaurant?.id);
  useEffect(() => {
    if (selectedRestaurant?.id !== prevRestaurantIdRef.current) {
      prevRestaurantIdRef.current = selectedRestaurant?.id;
      setSearchQuery('');
      setTypeFilter('ALL');
      setStatusFilter(-1);
      setCategoryFilter('ALL');
    }
  }, [selectedRestaurant?.id]);

  // Tải danh sách Bộ Param Chuẩn từ SQL Server
  const loadStandardParams = async () => {
    setLoadingStandardParams(true);
    try {
      const data = await mongoService.getStandardAppParams();
      setStandardParamsList(data);
    } catch (err: any) {
      console.warn('Lỗi khi tải Bộ Param Chuẩn:', err);
    } finally {
      setLoadingStandardParams(false);
    }
  };

  // Tải danh sách Lịch Hẹn Giờ (giới hạn tối đa 20 phiên gần nhất)
  const loadScheduledJobs = async () => {
    setLoadingScheduledJobs(true);
    try {
      const data = await mongoService.getScheduledParamJobs(undefined, 20);
      setScheduledJobsList(data.slice(0, 20));
    } catch (err: any) {
      console.warn('Lỗi khi tải Lịch Hẹn Giờ:', err);
    } finally {
      setLoadingScheduledJobs(false);
    }
  };

  useEffect(() => {
    loadStandardParams();
    loadScheduledJobs();
  }, []);

  // Tự động làm mới danh sách lịch hẹn giờ mỗi 8 giây khi modal đang mở và có tác vụ PENDING hoặc RUNNING
  useEffect(() => {
    if (!showScheduledJobsModal) return;

    const hasActiveJob = scheduledJobsList.some((j) => j.status === 'PENDING' || j.status === 'RUNNING');
    const intervalTime = hasActiveJob ? 8000 : 20000;

    const timer = setInterval(() => {
      mongoService.getScheduledParamJobs(undefined, 20).then((data) => {
        setScheduledJobsList(data.slice(0, 20));
      }).catch((err) => {
        console.warn('Lỗi làm mới ngầm lịch hẹn giờ:', err);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [showScheduledJobsModal, scheduledJobsList]);

  // Filter params cho nhà hàng hiện tại
  const filteredParams = useMemo(() => {
    return paramsList
      .filter((p) => {
        if (typeFilter !== 'ALL' && p.paramType !== typeFilter) return false;
        if (statusFilter !== -1 && p.status !== statusFilter) return false;
        if (categoryFilter !== 'ALL') {
          const cat = getParamCategory(p.paramCode);
          if (cat !== categoryFilter) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchCode = p.paramCode.toLowerCase().includes(q);
          const matchName = (p.paramName || '').toLowerCase().includes(q);
          const matchVal = String(p.value ?? '').toLowerCase().includes(q);
          const matchNote = (p.note || '').toLowerCase().includes(q);
          const matchDisplay = getParamDisplayName(p).toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchVal && !matchNote && !matchDisplay) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priA = getParamPriority(a.paramCode);
        const priB = getParamPriority(b.paramCode);
        if (priA !== priB) return priB - priA;
        return a.paramCode.localeCompare(b.paramCode);
      });
  }, [paramsList, searchQuery, typeFilter, statusFilter, categoryFilter]);

  // Toggle nhanh trạng thái
  const handleToggleStatus = async (param: AppParamItem) => {
    if (!currentHost) return;
    const nextStatus = param.status === 1 ? 0 : 1;
    setTogglingCode(param.paramCode);
    try {
      await mongoService.updateAppParam(
        param.paramCode,
        {
          host: currentHost,
          port: currentPort,
          paramName: param.paramName,
          paramType: (param.paramType === 'CONFIG' ? 'CONFIG' : 'FUNCTION'),
          status: nextStatus,
          value: param.value,
          note: param.note
        }
      );
      setParamsList((prev) =>
        prev.map((item) => (item.paramCode === param.paramCode ? { ...item, status: nextStatus } : item))
      );
      showToast(
        `Đã chuyển trạng thái '${param.paramCode}' sang ${nextStatus === 1 ? 'BẬT (1)' : 'TẮT (0)'}`,
        'success'
      );
    } catch (err: any) {
      showToast('Lỗi khi đổi trạng thái: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setTogglingCode(null);
    }
  };

  // Mở modal sửa
  const openEditModal = (param: AppParamItem) => {
    setEditingParam(param);
    setEditFormType(param.paramType === 'CONFIG' ? 'CONFIG' : 'FUNCTION');
    setEditFormStatus(param.status ?? 1);
    setEditFormValue(String(param.value ?? ''));
    setEditFormNote(param.note || '');
  };

  // Lưu chỉnh sửa
  const handleSaveEdit = async () => {
    if (!editingParam || !currentHost) return;
    setIsSavingEdit(true);
    try {
      await mongoService.updateAppParam(
        editingParam.paramCode,
        {
          host: currentHost,
          port: currentPort,
          paramName: editingParam.paramCode, // Mã tham số và tên tham số luôn giống nhau
          paramType: editFormType,
          status: editFormStatus,
          value: editFormValue,
          note: editFormNote.trim()
        }
      );
      showToast(`Đã cập nhật tham số '${editingParam.paramCode}' thành công!`, 'success');
      setEditingParam(null);
      await loadParams();
    } catch (err: any) {
      showToast('Lỗi khi cập nhật tham số: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Lưu thêm mới
  const handleSaveCreate = async () => {
    if (!currentHost) return;
    const code = newParamCode.trim().toUpperCase();
    if (!code) {
      showToast('Vui lòng nhập mã tham số (Param Code)!', 'error');
      return;
    }
    setIsSavingCreate(true);
    try {
      await mongoService.createAppParam({
        host: currentHost,
        port: currentPort,
        paramCode: code,
        paramName: code, // Tự động điền tên tham số giống hệt mã tham số
        paramType: newParamType,
        status: newParamStatus,
        value: newParamValue,
        note: newParamNote.trim()
      });
      showToast(`Đã thêm tham số '${code}' thành công!`, 'success');
      setShowCreateModal(false);
      setNewParamCode('');
      setNewParamValue('1');
      setNewParamNote('');
      await loadParams();
    } catch (err: any) {
      showToast('Lỗi khi thêm tham số: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingCreate(false);
    }
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!deletingParam || !currentHost) return;
    setIsDeleting(true);
    try {
      await mongoService.deleteAppParam(deletingParam.paramCode, currentHost, currentPort);
      showToast(`Đã xóa tham số '${deletingParam.paramCode}' khỏi MongoDB!`, 'success');
      setDeletingParam(null);
      await loadParams();
    } catch (err: any) {
      showToast('Lỗi khi xóa tham số: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // XỬ LÝ LƯU VÀO BỘ CHUẨN
  // ══════════════════════════════════════════════════════════════

  // Lưu lẻ 1 dòng tham số vào bộ chuẩn (Dành cho Admin / Super Admin)
  const handleSaveSingleToStandard = async (param: AppParamItem) => {
    if (!isAdmin) {
      showToast('Chỉ tài khoản Admin hoặc Super Admin mới có quyền lưu vào Bộ Chuẩn!', 'error');
      return;
    }
    setSavingSingleCode(param.paramCode);
    try {
      const pName = getParamDisplayName(param);
      const pCat = getParamCategory(param.paramCode);
      await mongoService.saveSingleStandardParam({
        param_code: param.paramCode,
        param_name: pName,
        param_type: param.paramType,
        status: param.status,
        param_value: String(param.value ?? ''),
        note: param.note,
        category: pCat,
        priority: 0
      });
      showToast(`Đã lưu tham số '${param.paramCode}' vào Bộ Chuẩn dùng chung thành công!`, 'success');
      await loadStandardParams();
    } catch (err: any) {
      showToast('Lỗi khi lưu vào Bộ Chuẩn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSingleCode(null);
    }
  };

  // Thêm mới param chuẩn thủ công
  const handleCreateStdParam = async () => {
    const code = stdFormCode.trim().toUpperCase();
    if (!code) {
      showToast('Vui lòng nhập Mã tham số chuẩn!', 'error');
      return;
    }
    setIsSavingStd(true);
    try {
      await mongoService.createStandardAppParam({
        param_code: code,
        param_name: code, // Tên tham số luôn tự động điền giống hệt mã tham số
        param_type: stdFormType,
        status: stdFormStatus,
        param_value: stdFormValue,
        note: stdFormNote.trim()
      });
      showToast(`Đã thêm tham số chuẩn '${code}'!`, 'success');
      setShowCreateStdModal(false);
      await loadStandardParams();
    } catch (err: any) {
      showToast('Lỗi khi tạo tham số chuẩn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingStd(false);
    }
  };

  // Sửa param chuẩn
  const handleSaveEditStdParam = async () => {
    if (!editingStdParam) return;
    setIsSavingStd(true);
    try {
      await mongoService.updateStandardAppParam(editingStdParam.param_code, {
        param_name: editingStdParam.param_code, // Tên tham số luôn tự động điền giống hệt mã tham số
        param_type: stdFormType,
        status: stdFormStatus,
        param_value: stdFormValue,
        note: stdFormNote.trim()
      });
      showToast(`Đã cập nhật tham số chuẩn '${editingStdParam.param_code}'!`, 'success');
      setEditingStdParam(null);
      await loadStandardParams();
    } catch (err: any) {
      showToast('Lỗi khi cập nhật: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingStd(false);
    }
  };

  // Xóa param chuẩn
  const handleDeleteStdParam = async () => {
    if (!deletingStdParam) return;
    setIsDeletingStd(true);
    try {
      await mongoService.deleteStandardAppParam(deletingStdParam.param_code);
      showToast(`Đã xóa tham số chuẩn '${deletingStdParam.param_code}'`, 'success');
      setDeletingStdParam(null);
      await loadStandardParams();
    } catch (err: any) {
      showToast('Lỗi khi xóa: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsDeletingStd(false);
    }
  };

  // Lưu toàn bộ từ nhà hiện tại vào bộ chuẩn
  const handleConfirmSaveToStandard = async () => {
    if (!currentHost) {
      showToast('Chưa có thông tin host MongoDB nhà hàng', 'error');
      return;
    }
    setIsSavingToStandard(true);
    try {
      const res = await mongoService.saveStandardParamsFromRestaurant({
        host: currentHost,
        port: currentPort
      });
      showToast(res.message, 'success');
      setShowSaveToStandardModal(false);
      await loadStandardParams();
    } catch (err: any) {
      showToast('Lỗi khi lưu vào Bộ Chuẩn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingToStandard(false);
    }
  };


  // ══════════════════════════════════════════════════════════════
  // LOGIC TÌM KIẾM & CHỌN NHÀ HÀNG HÀNG LOẠT (PASTE SAP / RK7)
  // ══════════════════════════════════════════════════════════════

  const removeVietnameseTones = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .toLowerCase()
      .trim();
  };

  const getRestaurantDisplayName = (r?: RestaurantItem | null, fallbackIp: string = ''): string => {
    if (!r) return fallbackIp;
    return (
      r.res ||
      (r as any).ten_nha_hang ||
      (r as any).restaurant_name ||
      (r as any).name ||
      r.ip ||
      (r as any).mongo_ip ||
      fallbackIp
    );
  };

  const getRestaurantSapCode = (r?: RestaurantItem | null): string => {
    if (!r) return '';
    return (r.sap || (r as any).ma_sap || (r as any).sap_code || '').trim();
  };

  const getRestaurantRk7Code = (r?: RestaurantItem | null): string => {
    if (!r) return '';
    return (r.rk7 || (r as any).ma_rk7 || (r as any).rk7_code || '').trim();
  };

  // Phân tích nhà hàng theo text paste (SAP hoặc RK7) và tên tìm kiếm
  const getMatchedRestaurants = (pastedText: string, searchName: string) => {
    const rawTokens = pastedText
      .split(/[\r\n,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const sName = removeVietnameseTones(searchName);

    return restaurants.filter((r) => {
      const sap = getRestaurantSapCode(r).toUpperCase();
      const rk7 = getRestaurantRk7Code(r).toUpperCase();
      const rawName = getRestaurantDisplayName(r);
      const nameClean = removeVietnameseTones(rawName);
      const brandClean = removeVietnameseTones(r.brand || '');
      const ip = (r.ip || (r as any).mongo_ip || '').trim();

      if (!ip) return false;

      let matchPasted = true;
      if (rawTokens.length > 0) {
        matchPasted = rawTokens.includes(sap) || rawTokens.includes(rk7);
      }

      let matchSearch = true;
      if (sName) {
        matchSearch =
          nameClean.includes(sName) ||
          brandClean.includes(sName) ||
          sap.toLowerCase().includes(sName) ||
          rk7.toLowerCase().includes(sName) ||
          ip.toLowerCase().includes(sName);
      }

      return matchPasted && matchSearch;
    });
  };

  const matchedBatchRestaurants = useMemo(() => {
    return getMatchedRestaurants(batchPastedCodes, batchSearchName);
  }, [restaurants, batchPastedCodes, batchSearchName]);

  const matchedNewJobRestaurants = useMemo(() => {
    return getMatchedRestaurants(newJobPastedCodes, newJobSearchName);
  }, [restaurants, newJobPastedCodes, newJobSearchName]);

  // Lấy IP MongoDB chuẩn (đã trim) từ bản ghi nhà hàng
  const getRestaurantMongoIp = (r?: RestaurantItem | null): string => {
    if (!r) return '';
    return (r.ip || (r as any).mongo_ip || '').trim();
  };

  // Helper dùng chung: Toggle chọn tất cả nhà hàng đang khớp bộ lọc theo IP (đã loại trùng)
  const toggleSelectAllMatchedIps = (
    matchedList: RestaurantItem[],
    selectedIps: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const matchedIps = Array.from(
      new Set(matchedList.map(getRestaurantMongoIp).filter(Boolean))
    );
    const allSelected =
      matchedIps.length > 0 && matchedIps.every((ip) => selectedIps.includes(ip));
    if (allSelected) {
      setter((prev) => prev.filter((ip) => !matchedIps.includes(ip)));
    } else {
      setter((prev) => Array.from(new Set([...prev, ...matchedIps])));
    }
  };

  // Helper dùng chung: Toggle chọn/bỏ chọn 1 IP (đảm bảo không bao giờ trùng lặp trong mảng)
  const toggleSingleSelectedIp = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    rawIp: string
  ) => {
    const ip = rawIp.trim();
    if (!ip) return;
    setter((prev) =>
      prev.includes(ip)
        ? prev.filter((item) => item !== ip)
        : Array.from(new Set([...prev, ip]))
    );
  };

  // Kiểm tra tất cả nhà hàng khớp bộ lọc đã được chọn hết hay chưa
  const areAllMatchedIpsSelected = (
    matchedList: RestaurantItem[],
    selectedIps: string[]
  ): boolean => {
    const matchedIps = Array.from(
      new Set(matchedList.map(getRestaurantMongoIp).filter(Boolean))
    );
    return matchedIps.length > 0 && matchedIps.every((ip) => selectedIps.includes(ip));
  };

  // Toggle chọn tất cả nhà hàng trong batch modal
  const handleToggleSelectAllBatchRestaurants = () => {
    toggleSelectAllMatchedIps(matchedBatchRestaurants, batchSelectedIps, setBatchSelectedIps);
  };

  // Toggle chọn 1 nhà hàng trong batch modal
  const handleToggleSingleBatchRestaurant = (ip: string) => {
    toggleSingleSelectedIp(setBatchSelectedIps, ip);
  };

  // Toggle chọn tất cả nhà hàng trong new job modal
  const handleToggleSelectAllNewJobRestaurants = () => {
    toggleSelectAllMatchedIps(matchedNewJobRestaurants, newJobSelectedIps, setNewJobSelectedIps);
  };

  // ══════════════════════════════════════════════════════════════
  // THỰC HIỆN ĐẨY PARAM (ĐƠN LẺ HOẶC HÀNG LOẠT)
  // ══════════════════════════════════════════════════════════════
  const handleConfirmApply = async () => {
    setIsApplying(true);
    try {
      if (applyScope === 'CURRENT') {
        // Áp dụng cho 1 nhà hàng hiện tại
        if (!currentHost) {
          showToast('Chưa có thông tin host MongoDB nhà hàng', 'error');
          return;
        }
        const selectedCodes = batchSelectAllParams
          ? undefined
          : batchSelectedParamCodes.length > 0
          ? batchSelectedParamCodes
          : undefined;

        // Lưu ý: backend apply_to_restaurant nhận 'overwrite' hoặc 'skip_existing', nếu upsert ta dùng overwrite
        const singleMode = applyMode === 'skip_existing' ? 'skip_existing' : 'overwrite';

        const res = await mongoService.applyStandardParamsToRestaurant({
          host: currentHost,
          port: currentPort,
          mode: singleMode as 'overwrite' | 'skip_existing',
          selected_param_codes: selectedCodes
        });
        showToast(res.message, 'success');
        setShowStandardModal(false);
        await loadParams(currentHost);
      } else {
        // Áp dụng hàng loạt cho danh sách nhà hàng đã chọn
        if (batchSelectedIps.length === 0) {
          showToast('Vui lòng chọn ít nhất 1 nhà hàng để đẩy cấu hình!', 'error');
          return;
        }

        const targets: BatchTargetRestaurantItem[] = batchSelectedIps.map((ip) => {
          const r = restaurants.find((item) => getRestaurantMongoIp(item) === ip);
          return {
            name: getRestaurantDisplayName(r, ip),
            ip,
            port: 27017,
            sap_code: getRestaurantSapCode(r),
            rk7_code: getRestaurantRk7Code(r)
          };
        });

        const selectedCodes = batchSelectAllParams
          ? undefined
          : batchSelectedParamCodes.length > 0
          ? batchSelectedParamCodes
          : undefined;

        const res = await mongoService.batchApplyParams({
          target_restaurants: targets,
          selected_param_codes: selectedCodes,
          mode: applyMode
        });

        setBatchResultData(res);
        setShowStandardModal(false);
        setShowBatchResultModal(true);
        showToast(res.message, res.failed_count === 0 ? 'success' : 'info');

        // Làm mới lại dữ liệu nhà hiện tại nếu có trong danh sách
        if (batchSelectedIps.includes(currentHost)) {
          await loadParams(currentHost);
        }
      }
    } catch (err: any) {
      showToast('Lỗi khi đẩy param: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // XỬ LÝ LỊCH HẸN GIỜ ĐẨY PARAM
  // ══════════════════════════════════════════════════════════════
  const handleCreateScheduledJob = async () => {
    if (!newJobTitle.trim()) {
      showToast('Vui lòng nhập Tiêu đề cho tác vụ hẹn giờ!', 'error');
      return;
    }
    if (!newJobDate) {
      showToast('Vui lòng chọn ngày chạy!', 'error');
      return;
    }
    if (!newJobTime) {
      showToast('Vui lòng chọn giờ chạy (HH:mm)!', 'error');
      return;
    }
    if (newJobSelectedIps.length === 0 && newJobTargetScope !== 'CURRENT') {
      showToast('Vui lòng chọn ít nhất 1 nhà hàng mục tiêu!', 'error');
      return;
    }

    let targets: BatchTargetRestaurantItem[] = [];
    if (newJobTargetScope === 'CURRENT') {
      if (!currentHost) {
        showToast('Chưa có thông tin host MongoDB nhà hàng hiện tại!', 'error');
        return;
      }
      targets = [{
        name: getRestaurantDisplayName(selectedRestaurant, currentHost),
        ip: currentHost,
        port: 27017,
        sap_code: getRestaurantSapCode(selectedRestaurant),
        rk7_code: getRestaurantRk7Code(selectedRestaurant)
      }];
    } else {
      if (newJobSelectedIps.length === 0) {
        showToast('Vui lòng chọn ít nhất 1 nhà hàng mục tiêu!', 'error');
        return;
      }
      targets = newJobSelectedIps.map((ip) => {
        const r = restaurants.find((item) => getRestaurantMongoIp(item) === ip);
        return {
          name: getRestaurantDisplayName(r, ip),
          ip,
          port: 27017,
          sap_code: getRestaurantSapCode(r),
          rk7_code: getRestaurantRk7Code(r)
        };
      });
    }

    let selectedCodes: string[] | undefined = undefined;
    let customParamsPayload: any[] | undefined = undefined;

    if (newJobParamMode === 'CUSTOM') {
      const combinedCodes = Array.from(new Set([
        ...newJobSelectedParamCodes,
        ...newJobCustomParams.map((p) => p.paramCode)
      ]));

      if (combinedCodes.length === 0) {
        showToast('Vui lòng chọn hoặc tự thêm ít nhất 1 tham số để đưa vào phiên hẹn giờ!', 'error');
        return;
      }
      selectedCodes = combinedCodes;
      customParamsPayload = combinedCodes.map((code) => {
        const customItem = newJobCustomParams.find((cp) => cp.paramCode === code);
        if (customItem) {
          return {
            paramCode: customItem.paramCode,
            paramName: customItem.paramName || customItem.paramCode,
            paramType: customItem.paramType,
            status: customItem.status,
            value: customItem.value,
            note: customItem.note || ''
          };
        }
        const std = standardParamsList.find((s) => s.param_code === code);
        if (std) {
          return {
            paramCode: std.param_code,
            paramName: std.param_name,
            paramType: std.param_type,
            status: std.status,
            value: std.param_value || '',
            note: std.note || ''
          };
        }
        const cur = paramsList.find((p) => p.paramCode === code);
        return {
          paramCode: code,
          paramName: cur?.paramName || code,
          paramType: cur?.paramType || 'FUNCTION',
          status: cur?.status ?? 1,
          value: String(cur?.value ?? ''),
          note: cur?.note || ''
        };
      });
    } else {
      if (newJobCustomParams.length > 0) {
        customParamsPayload = [
          ...standardParamsList.map((std) => ({
            paramCode: std.param_code,
            paramName: std.param_name,
            paramType: std.param_type,
            status: std.status,
            value: std.param_value || '',
            note: std.note || ''
          })),
          ...newJobCustomParams.map((cp) => ({
            paramCode: cp.paramCode,
            paramName: cp.paramName || cp.paramCode,
            paramType: cp.paramType,
            status: cp.status,
            value: cp.value,
            note: cp.note || ''
          }))
        ];
        const map = new Map();
        customParamsPayload.forEach((p) => map.set(p.paramCode, p));
        customParamsPayload = Array.from(map.values());
      }
    }

    setIsCreatingJob(true);
    try {
      await mongoService.createScheduledParamJob({
        job_title: newJobTitle.trim(),
        run_date: newJobDate,
        run_time: newJobTime,
        mode: newJobMode,
        target_restaurants: targets,
        selected_param_codes: selectedCodes,
        custom_params: customParamsPayload
      });
      showToast(`Đã tạo phiên lịch hẹn giờ '${newJobTitle}' chạy vào ${newJobDate} ${newJobTime} thành công!`, 'success');
      setScheduledActiveTab('LIST');
      setNewJobTitle('');
      setNewJobSelectedIps([]);
      setNewJobSelectedParamCodes([]);
      setNewJobCustomParams([]);
      setShowAddCustomParamForm(false);
      setEditingCustomParamIndex(null);
      await loadScheduledJobs();
    } catch (err: any) {
      showToast('Lỗi khi tạo lịch hẹn giờ: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleRunScheduledJobNow = async (job: ScheduledParamJobItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn kích hoạt chạy NGAY tác vụ '#${job.id}: ${job.job_title}' cho ${job.total_restaurants} nhà hàng?`)) {
      return;
    }
    setRunningJobId(job.id);
    try {
      const updated = await mongoService.runScheduledParamJobNow(job.id);
      showToast(`Đã thực thi tác vụ #${job.id}: ${updated.success_count} thành công, ${updated.failed_count} thất bại!`, updated.failed_count === 0 ? 'success' : 'info');
      await loadScheduledJobs();
      if (batchSelectedIps.includes(currentHost) || job.target_restaurants.some((t) => t.ip === currentHost)) {
        await loadParams(currentHost);
      }
    } catch (err: any) {
      showToast('Lỗi khi chạy tác vụ: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setRunningJobId(null);
    }
  };

  const handleDeleteScheduledJob = async (jobId: number) => {
    if (!window.confirm(`Bạn có chắc muốn xóa lịch hẹn giờ #${jobId}?`)) return;
    try {
      await mongoService.deleteScheduledParamJob(jobId);
      showToast(`Đã xóa lịch hẹn giờ #${jobId}`, 'success');
      await loadScheduledJobs();
    } catch (err: any) {
      showToast('Lỗi khi xóa lịch hẹn giờ: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  // Tái sử dụng cấu hình param & danh sách nhà hàng từ một tác vụ đã có
  const handleReuseScheduledJob = (job: ScheduledParamJobItem) => {
    setScheduledActiveTab('CREATE');
    setViewingJobDetail(null); // Đóng modal chi tiết nếu đang mở

    // Tiêu đề gợi ý
    setNewJobTitle(`Bản sao: ${job.job_title}`);
    setNewJobMode((job.mode as any) || 'upsert');

    // Thời gian gợi ý: hôm nay, sau thời điểm hiện tại 15 phút
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const futureMinutes = now.getMinutes() + 15;
    now.setMinutes(futureMinutes);
    const hoursStr = String(now.getHours()).padStart(2, '0');
    const minsStr = String(now.getMinutes()).padStart(2, '0');
    setNewJobDate(todayStr);
    setNewJobTime(`${hoursStr}:${minsStr}`);

    // Nạp danh sách nhà hàng mục tiêu
    if (job.target_restaurants && job.target_restaurants.length > 0) {
      setNewJobTargetScope('MULTIPLE');
      const ips = Array.from(
        new Set(
          job.target_restaurants
            .map((r: any) => (r.ip || (r as any).mongo_ip || '').trim())
            .filter(Boolean)
        )
      );
      setNewJobSelectedIps(ips);
    }

    // Nạp danh sách tham số cấu hình
    if (job.params_payload && job.params_payload.length > 0) {
      setNewJobParamMode('CUSTOM');
      const customParams = job.params_payload.map((p: any) => ({
        paramCode: p.paramCode,
        paramName: p.paramName || p.paramCode,
        paramType: (p.paramType as any) || 'FUNCTION',
        status: p.status !== undefined ? Number(p.status) : 1,
        value: p.value !== undefined ? String(p.value) : '1',
        note: p.note || ''
      }));
      setNewJobCustomParams(customParams);
      setNewJobSelectedParamCodes(customParams.map((cp) => cp.paramCode));
    }

    showToast(
      `Đã nạp lại cấu hình gồm ${job.params_payload?.length || 0} param và ${job.target_restaurants?.length || 0} nhà hàng từ tác vụ #${job.id}. Bạn có thể chỉnh sửa thêm bớt nhà hàng hoặc đổi tham số tùy ý!`,
      'success'
    );
  };

  // Lưu tác vụ và kích hoạt đẩy param xuống các nhà hàng ngay lập tức
  const handleCreateAndRunImmediately = async () => {
    if (!newJobTitle.trim()) {
      showToast('Vui lòng nhập Tiêu đề cho tác vụ!', 'error');
      return;
    }
    if (newJobSelectedIps.length === 0 && newJobTargetScope !== 'CURRENT') {
      showToast('Vui lòng chọn ít nhất 1 nhà hàng mục tiêu!', 'error');
      return;
    }

    let targets: BatchTargetRestaurantItem[] = [];
    if (newJobTargetScope === 'CURRENT') {
      if (!currentHost) {
        showToast('Chưa có thông tin host MongoDB nhà hàng hiện tại!', 'error');
        return;
      }
      targets = [{
        name: getRestaurantDisplayName(selectedRestaurant, currentHost),
        ip: currentHost,
        port: 27017,
        sap_code: getRestaurantSapCode(selectedRestaurant),
        rk7_code: getRestaurantRk7Code(selectedRestaurant)
      }];
    } else {
      targets = newJobSelectedIps.map((ip) => {
        const r = restaurants.find((item) => getRestaurantMongoIp(item) === ip);
        return {
          name: getRestaurantDisplayName(r, ip),
          ip,
          port: 27017,
          sap_code: getRestaurantSapCode(r),
          rk7_code: getRestaurantRk7Code(r)
        };
      });
    }

    let selectedCodes: string[] | undefined = undefined;
    let customParamsPayload: any[] | undefined = undefined;

    if (newJobParamMode === 'CUSTOM') {
      const combinedCodes = Array.from(new Set([
        ...newJobSelectedParamCodes,
        ...newJobCustomParams.map((p) => p.paramCode)
      ]));

      if (combinedCodes.length === 0) {
        showToast('Vui lòng chọn hoặc tự thêm ít nhất 1 tham số để đẩy xuống nhà hàng!', 'error');
        return;
      }
      selectedCodes = combinedCodes;
      customParamsPayload = combinedCodes.map((code) => {
        const customItem = newJobCustomParams.find((cp) => cp.paramCode === code);
        if (customItem) {
          return {
            paramCode: customItem.paramCode,
            paramName: customItem.paramName || customItem.paramCode,
            paramType: customItem.paramType,
            status: customItem.status,
            value: customItem.value,
            note: customItem.note || ''
          };
        }
        const std = standardParamsList.find((s) => s.param_code === code);
        if (std) {
          return {
            paramCode: std.param_code,
            paramName: std.param_name,
            paramType: std.param_type,
            status: std.status,
            value: std.param_value || '',
            note: std.note || ''
          };
        }
        const cur = paramsList.find((p) => p.paramCode === code);
        return {
          paramCode: code,
          paramName: cur?.paramName || code,
          paramType: cur?.paramType || 'FUNCTION',
          status: cur?.status ?? 1,
          value: String(cur?.value ?? ''),
          note: cur?.note || ''
        };
      });
    } else {
      if (newJobCustomParams.length > 0) {
        customParamsPayload = [
          ...standardParamsList.map((std) => ({
            paramCode: std.param_code,
            paramName: std.param_name,
            paramType: std.param_type,
            status: std.status,
            value: std.param_value || '',
            note: std.note || ''
          })),
          ...newJobCustomParams.map((cp) => ({
            paramCode: cp.paramCode,
            paramName: cp.paramName || cp.paramCode,
            paramType: cp.paramType,
            status: cp.status,
            value: cp.value,
            note: cp.note || ''
          }))
        ];
        const map = new Map();
        customParamsPayload.forEach((p) => map.set(p.paramCode, p));
        customParamsPayload = Array.from(map.values());
      }
    }

    if (!window.confirm(`Bạn có chắc chắn muốn LƯU và KÍCH HOẠT ĐẨY NGAY LẬP TỨC tham số xuống ${targets.length} nhà hàng?`)) {
      return;
    }

    setIsCreatingJob(true);
    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const hoursStr = String(now.getHours()).padStart(2, '0');
      const minsStr = String(now.getMinutes()).padStart(2, '0');

      const createdJob = await mongoService.createScheduledParamJob({
        job_title: newJobTitle.trim(),
        run_date: todayStr,
        run_time: `${hoursStr}:${minsStr}`,
        mode: newJobMode,
        target_restaurants: targets,
        selected_param_codes: selectedCodes,
        custom_params: customParamsPayload
      });

      showToast(`Đã tạo tác vụ #${createdJob.id}, đang kích hoạt thực thi ngay...`, 'info');

      // Kích hoạt chạy ngay tác vụ vừa tạo
      const updated = await mongoService.runScheduledParamJobNow(createdJob.id);
      showToast(`Đã thực thi thành công tác vụ #${createdJob.id}: ${updated.success_count} thành công, ${updated.failed_count} thất bại!`, updated.failed_count === 0 ? 'success' : 'info');

      await loadScheduledJobs();
      if (batchSelectedIps.includes(currentHost) || targets.some((t) => t.ip === currentHost)) {
        await loadParams(currentHost);
      }
      setScheduledActiveTab('LIST');
      setViewingJobDetail(updated); // Mở popup xem kết quả chi tiết ngay
    } catch (err: any) {
      showToast('Lỗi khi thực thi tác vụ: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsCreatingJob(false);
    }
  };

  const pendingJobsCount = useMemo(() => {
    return scheduledJobsList.filter((j) => j.status === 'PENDING').length;
  }, [scheduledJobsList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Thanh Thao Tác Nhanh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* Nút Mở Lịch Hẹn Giờ */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadScheduledJobs();
            setShowScheduledJobsModal(true);
          }}
          leftIcon={<Clock size={14} color="#0284C7" />}
          style={{
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            borderColor: '#0284C7',
            color: '#0369A1',
            fontWeight: 600
          }}
          title="Cài đặt hẹn giờ đẩy cấu hình param tự động theo ngày & giờ cố định"
        >
          ⏰ Lịch Hẹn Giờ {pendingJobsCount > 0 && `(${pendingJobsCount})`}
        </Button>

        {/* Nút Gộp: ⭐ Bộ Param Chuẩn (Bao gồm: Xem/Quản lý danh sách, Lưu vào chuẩn, và Áp dụng xuống NH) */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadStandardParams();
            setStandardModalTab('LIST');
            setShowStandardModal(true);
          }}
          leftIcon={<Sparkles size={14} color="#D97706" />}
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            borderColor: '#F59E0B',
            color: '#B45309',
            fontWeight: 600
          }}
          title="Quản lý bộ tham số chuẩn: xem/sửa, lưu từ nhà hàng hiện tại và áp dụng hàng loạt xuống các nhà hàng"
        >
          ⭐ Bộ Param Chuẩn ({standardParamsList.length})
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus size={15} />}
          style={{ backgroundColor: '#059669', borderColor: '#059669', fontWeight: 600 }}
        >
          + Thêm Param Mới
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshParams}
          isLoading={loadingParams}
          leftIcon={<RefreshCw size={14} />}
          title="Bấm để tải lại toàn bộ danh sách tham số mới nhất từ MongoDB nhà hàng"
        >
          Làm mới dữ liệu
        </Button>
      </div>

      {/* Thanh Bộ Lọc & Tìm Kiếm */}
      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Tìm theo Param Code, tên, diễn giải, giá trị..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: searchQuery ? '7px 32px 7px 32px' : '7px 10px 7px 32px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="Xóa nhanh từ khóa tìm kiếm"
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="ALL">-- Tất cả kiểu --</option>
            <option value="FUNCTION">FUNCTION (Bật/Tắt)</option>
            <option value="CONFIG">CONFIG (Cấu hình)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(Number(e.target.value))}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value={-1}>-- Tất cả trạng thái --</option>
            <option value={1}>Bật (1)</option>
            <option value={0}>Tắt (0)</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="ALL">-- Tất cả chuyên mục --</option>
            <option value="KDS / Bếp">KDS / Bếp</option>
            <option value="QR Order & CO">QR Order & CO</option>
            <option value="Vận Hành & Đặt Bàn">Vận Hành & Đặt Bàn</option>
            <option value="Bảo Mật & Phân Quyền">Bảo Mật & Phân Quyền</option>
            <option value="In Ấn & Hóa Đơn">In Ấn & Hóa Đơn</option>
            <option value="Khác">Khác</option>
          </select>


        </div>
      </Card>

      {/* Bảng APP_PARAM */}
      <Card style={{ padding: 0, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '10px 16px', backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Danh sách tham số: <strong>{filteredParams.length}</strong> / {paramsList.length} tham số
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>
            💡 Click vào mã để copy • Click vào nút Bật/Tắt để đảo trạng thái tức thì
          </div>
        </div>

        <TopScrollTable maxHeight="calc(100vh - 270px)">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', textAlign: 'left', color: '#334155' }}>
                <th style={{ padding: '8px 12px', minWidth: '240px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F1F5F9' }}>
                  Mã Param (Param Code)
                </th>
                <th style={{ padding: '8px 10px', width: '90px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F1F5F9' }}>
                  Kiểu
                </th>
                <th style={{ padding: '8px 10px', width: '105px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F1F5F9' }}>
                  Trạng Thái
                </th>
                <th style={{ padding: '8px 10px', width: '130px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F1F5F9' }}>
                  Giá Trị Cấu Hình
                </th>
                <th style={{ padding: '8px 12px', minWidth: '240px', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F1F5F9' }}>
                  Diễn Giải & Ghi Chú Nghiệp Vụ
                </th>
                <th style={{ padding: '8px 12px', width: '160px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#F1F5F9' }}>
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingParams ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      Đang tải dữ liệu từ MongoDB {currentHost ? `${currentHost}:27017` : 'nhà hàng'}...
                    </div>
                  </td>
                </tr>
              ) : !currentHost ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px', color: '#2563EB' }} />
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                      Đang kết nối MongoDB nhà hàng {selectedRestaurant?.res || selectedRestaurant?.restaurant_name || ''}...
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Hệ thống đang tự động dò tìm máy trạm POS (.11, .12, .41). Vui lòng chờ trong giây lát.
                    </div>
                  </td>
                </tr>
              ) : filteredParams.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                      Không tìm thấy tham số nào phù hợp với bộ lọc hiện tại.
                    </div>
                    {searchQuery && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Đang lọc theo từ khóa: <strong style={{ color: '#2563EB' }}>"{searchQuery}"</strong> {paramsList.length > 0 ? `(Kho nhà hàng hiện có ${paramsList.length} tham số)` : ''}
                      </div>
                    )}
                    {(searchQuery || typeFilter !== 'ALL' || statusFilter !== -1 || categoryFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setTypeFilter('ALL');
                          setStatusFilter(-1);
                          setCategoryFilter('ALL');
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          border: '1px solid #2563EB',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Xóa bộ lọc tìm kiếm để xem toàn bộ {paramsList.length} tham số
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredParams.map((p) => {
                  const isEssential = getParamPriority(p.paramCode) === 1;
                  const categoryName = getParamCategory(p.paramCode);
                  const isToggling = togglingCode === p.paramCode;
                  const isSavingSingle = savingSingleCode === p.paramCode;

                  return (
                    <tr
                      key={p.paramCode}
                      style={{
                        borderBottom: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      {/* Mã Tham Số (Param Code) */}
                      <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <code style={{ fontFamily: 'Consolas, monospace', fontSize: '12px', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.paramCode}
                          </code>
                          {categoryName && categoryName !== 'Khác' && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', padding: '1px 5px', borderRadius: '4px' }}>
                              {categoryName}
                            </span>
                          )}
                          {isEssential && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FCD34D',
                                borderRadius: '4px',
                                padding: '0 4px',
                                lineHeight: 1.3
                              }}
                              title="Tham số trọng yếu thường dùng"
                            >
                              ★ Cần thiết
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(p.paramCode, p.paramCode)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: copiedCode === p.paramCode ? '#10B981' : '#94A3B8',
                              padding: '1px 3px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            title="Sao chép Mã Tham Số"
                          >
                            {copiedCode === p.paramCode ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Kiểu Tham Số */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            display: 'inline-block',
                            backgroundColor: p.paramType === 'FUNCTION' ? '#F3E8FF' : '#E0F2FE',
                            color: p.paramType === 'FUNCTION' ? '#7E22CE' : '#0369A1',
                            border: `1px solid ${p.paramType === 'FUNCTION' ? '#E9D5FF' : '#BAE6FD'}`
                          }}
                        >
                          {p.paramType}
                        </span>
                      </td>

                      {/* Trạng Thái (Bật/Tắt) */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          disabled={isToggling}
                          title="Bấm để bật / tắt nhanh trạng thái"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            backgroundColor: p.status === 1 ? '#ECFDF5' : '#FEF2F2',
                            color: p.status === 1 ? '#065F46' : '#991B1B',
                            border: `1px solid ${p.status === 1 ? '#A7F3D0' : '#FECACA'}`
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: p.status === 1 ? '#10B981' : '#EF4444'
                            }}
                          />
                          <span>{p.status === 1 ? 'Bật (1)' : 'Tắt (0)'}</span>
                          {isToggling && <RefreshCw size={10} className="spin-animation" />}
                        </button>
                      </td>

                      {/* Giá Trị Cấu Hình */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontFamily: 'Consolas, monospace',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: '#F8FAFC',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            border: '1px solid #E2E8F0',
                            color: '#1E293B'
                          }}
                          title={String(p.value ?? '')}
                        >
                          {p.value !== undefined && p.value !== '' ? String(p.value) : <em style={{ color: '#94A3B8' }}>[rỗng]</em>}
                        </div>
                      </td>

                      {/* Diễn Giải Nghiệp Vụ */}
                      <td style={{ padding: '8px 12px', color: '#475569', fontSize: '11.5px', lineHeight: 1.4, verticalAlign: 'middle', maxWidth: '320px', overflow: 'hidden' }}>
                        {p.note ? (
                          <div
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                            title={p.note}
                          >
                            {p.note}
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Chưa có diễn giải ghi chú</span>
                        )}
                      </td>

                      {/* Thao Tác */}
                      <td style={{ padding: '8px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSaveSingleToStandard(p)}
                              disabled={isSavingSingle}
                              title="Lưu tham số này vào Bộ Tham Số Chuẩn"
                              style={{
                                border: '1px solid #93C5FD',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                borderRadius: '4px',
                                padding: '3px 6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10.5px',
                                fontWeight: 600
                              }}
                            >
                              {isSavingSingle ? <RefreshCw size={10} className="spin-animation" /> : <Upload size={11} color="#1D4ED8" />}
                              <span>Lưu Chuẩn</span>
                            </button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(p)}
                            leftIcon={<Edit2 size={11} />}
                            style={{ padding: '3px 7px', fontSize: '11px', height: '26px' }}
                          >
                            Sửa
                          </Button>

                          <button
                            type="button"
                            onClick={() => setDeletingParam(p)}
                            title={`Xóa tham số ${p.paramCode}`}
                            style={{
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              borderRadius: '4px',
                              padding: '4px 6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '26px'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TopScrollTable>
      </Card>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL SỬA THAM SỐ */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {editingParam && (
        <Modal
          isOpen={!!editingParam}
          onClose={() => setEditingParam(null)}
          title={`✏️ Sửa Tham Số: ${editingParam.paramCode}`}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setEditingParam(null)} disabled={isSavingEdit}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveEdit}
                isLoading={isSavingEdit}
                style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
              >
                Lưu Thay Đổi
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Mã Tham Số (Param Code)
              </label>
              <input
                type="text"
                disabled
                value={editingParam.paramCode}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Kiểu Tham Số
                </label>
                <select
                  value={editFormType}
                  onChange={(e) => setEditFormType(e.target.value as 'FUNCTION' | 'CONFIG')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="FUNCTION">FUNCTION (Bật / Tắt)</option>
                  <option value="CONFIG">CONFIG (Cấu hình giá trị)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Trạng Thái (Status)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', height: '38px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editFormStatus === 1}
                      onChange={() => setEditFormStatus(1)}
                    />
                    <span style={{ color: '#059669', fontWeight: 600 }}>Bật (1)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editFormStatus === 0}
                      onChange={() => setEditFormStatus(0)}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Tắt (0)</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Giá Trị Cấu Hình (Value)
              </label>
              <textarea
                rows={2}
                value={editFormValue}
                onChange={(e) => setEditFormValue(e.target.value)}
                placeholder="Nhập giá trị cấu hình (Value)..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Diễn Giải Nghiệp Vụ (Note)
              </label>
              <textarea
                rows={2}
                value={editFormNote}
                onChange={(e) => setEditFormNote(e.target.value)}
                placeholder="Diễn giải ý nghĩa nghiệp vụ của tham số này..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL THÊM MỚI THAM SỐ */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="➕ Thêm Mới Tham Số (APP_PARAM)"
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={isSavingCreate}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCreate}
                isLoading={isSavingCreate}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                Xác Nhận Thêm Mới
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Mã Tham Số (Param Code) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newParamCode}
                onChange={(e) => {
                  const code = e.target.value.toUpperCase().replace(/\s+/g, '_');
                  setNewParamCode(code);
                }}
                placeholder="Ví dụ: AUTO_PRINT_BILL, CONFIG_QR_ORDER..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #2563EB',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                Mã viết hoa, không dấu, cách nhau bởi dấu gạch dưới (_). Tên tham số sẽ tự động điền giống hệt mã.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Kiểu Tham Số
                </label>
                <select
                  value={newParamType}
                  onChange={(e) => setNewParamType(e.target.value as 'FUNCTION' | 'CONFIG')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="FUNCTION">FUNCTION (Bật / Tắt)</option>
                  <option value="CONFIG">CONFIG (Cấu hình giá trị)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Trạng Thái (Status)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', height: '38px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="newStatus"
                      checked={newParamStatus === 1}
                      onChange={() => setNewParamStatus(1)}
                    />
                    <span style={{ color: '#059669', fontWeight: 600 }}>Bật (1)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="newStatus"
                      checked={newParamStatus === 0}
                      onChange={() => setNewParamStatus(0)}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Tắt (0)</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Giá Trị Cấu Hình (Value)
              </label>
              <textarea
                rows={2}
                value={newParamValue}
                onChange={(e) => setNewParamValue(e.target.value)}
                placeholder="Nhập giá trị cấu hình (Value)..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Diễn Giải Nghiệp Vụ (Note)
              </label>
              <textarea
                rows={2}
                value={newParamNote}
                onChange={(e) => setNewParamNote(e.target.value)}
                placeholder="Diễn giải ý nghĩa nghiệp vụ của tham số này..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL XÁC NHẬN XÓA THAM SỐ TRÊN NHÀ HÀNG */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {deletingParam && (
        <Modal
          isOpen={!!deletingParam}
          onClose={() => setDeletingParam(null)}
          title="⚠️ Xác Nhận Xóa Tham Số MongoDB"
          maxWidth="460px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button variant="outline" onClick={() => setDeletingParam(null)} disabled={isDeleting}>
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                leftIcon={<Trash2 size={14} />}
                style={{ backgroundColor: '#DC2626', color: '#fff' }}
              >
                Xác Nhận Xóa
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '13px',
                lineHeight: 1.5
              }}
            >
              Bạn có chắc chắn muốn xóa tham số <strong>{deletingParam.paramCode}</strong> (
              <em>{getParamDisplayName(deletingParam)}</em>) khỏi cơ sở dữ liệu MongoDB trên máy{' '}
              <strong>{currentHost}</strong>?
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ⚠️ Thao tác này sẽ xóa trực tiếp bản ghi trong collection <code>APP_PARAM</code> của database{' '}
              <code>G_ORDER</code>. Hành động này không thể hoàn tác!
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL QUẢN LÝ & ÁP DỤNG BỘ PARAM CHUẨN (GỘP 3 TÍNH NĂNG THÀNH 1) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showStandardModal && (
        <Modal
          isOpen={showStandardModal}
          onClose={() => setShowStandardModal(false)}
          title="⭐ Quản Lý & Áp Dụng Bộ Param Chuẩn Dùng Chung"
          maxWidth="1050px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {standardModalTab === 'LIST' ? (
                  <>Tổng cộng <strong>{standardParamsList.length}</strong> tham số chuẩn được lưu trữ trên hệ thống</>
                ) : (
                  applyScope === 'CURRENT'
                    ? `Mục tiêu: Nhà hàng hiện tại (${selectedRestaurant?.restaurant_name || currentHost})`
                    : `Mục tiêu: ${batchSelectedIps.length} nhà hàng đã chọn`
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {standardModalTab === 'LIST' ? (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setStandardModalTab('APPLY')}
                      leftIcon={<Download size={14} />}
                      style={{ backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}
                    >
                      🚀 Đi Đến Áp Dụng Xuống Nhà Hàng
                    </Button>
                    <Button variant="outline" onClick={() => setShowStandardModal(false)}>
                      Đóng
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setStandardModalTab('LIST')} disabled={isApplying}>
                      ⬅ Quay Lại Danh Sách Chuẩn
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleConfirmApply}
                      isLoading={isApplying}
                      leftIcon={<Download size={14} />}
                      style={{ backgroundColor: '#7C3AED', borderColor: '#7C3AED' }}
                    >
                      {applyScope === 'CURRENT'
                        ? 'Bắt Đầu Áp Dụng Xuống Nhà Này'
                        : `Bắt Đầu Đẩy Xuống ${batchSelectedIps.length} Nhà Hàng`}
                    </Button>
                  </>
                )}
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* TABS TRONG MODAL BỘ CHUẨN */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px' }}>
              <button
                type="button"
                onClick={() => setStandardModalTab('LIST')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  backgroundColor: standardModalTab === 'LIST' ? '#D97706' : 'var(--bg-secondary)',
                  color: standardModalTab === 'LIST' ? '#FFFFFF' : 'var(--text-primary)'
                }}
              >
                📋 Danh Sách Bộ Chuẩn ({standardParamsList.length})
              </button>
              <button
                type="button"
                onClick={() => setStandardModalTab('APPLY')}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  backgroundColor: standardModalTab === 'APPLY' ? '#7C3AED' : 'var(--bg-secondary)',
                  color: standardModalTab === 'APPLY' ? '#FFFFFF' : 'var(--text-primary)'
                }}
              >
                🚀 Áp Dụng Xuống Nhà Hàng
              </button>
            </div>

            {/* NỘI DUNG TAB 1: DANH SÁCH BỘ CHUẨN */}
            {standardModalTab === 'LIST' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search
                        size={14}
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                      />
                      <input
                        type="text"
                        placeholder="Tìm kiếm mã, tên, giá trị, ghi chú..."
                        value={standardSearchQuery}
                        onChange={(e) => setStandardSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={standardTypeFilter}
                      onChange={(e) => setStandardTypeFilter(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '12.5px'
                      }}
                    >
                      <option value="ALL">-- Tất cả kiểu --</option>
                      <option value="FUNCTION">FUNCTION (Bật/Tắt)</option>
                      <option value="CONFIG">CONFIG (Cấu hình)</option>
                    </select>

                    <select
                      value={standardStatusFilter}
                      onChange={(e) => setStandardStatusFilter(Number(e.target.value))}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '12.5px'
                      }}
                    >
                      <option value={-1}>-- Tất cả trạng thái --</option>
                      <option value={1}>Bật (1)</option>
                      <option value={0}>Tắt (0)</option>
                    </select>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setStdFormCode('');
                        setStdFormType('FUNCTION');
                        setStdFormStatus(1);
                        setStdFormValue('1');
                        setStdFormNote('');
                        setShowCreateStdModal(true);
                      }}
                      leftIcon={<Plus size={14} />}
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                      + Thêm Param Chuẩn
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveToStandardModal(true)}
                      leftIcon={<Upload size={14} />}
                      style={{
                        borderColor: '#3B82F6',
                        color: '#1D4ED8',
                        backgroundColor: 'rgba(59, 130, 246, 0.08)',
                        fontWeight: 600
                      }}
                      title="Quét và lưu tất cả các tham số từ nhà hàng hiện tại vào bộ chuẩn"
                    >
                      📥 Lưu Từ Nhà Này Vào Chuẩn
                    </Button>
                  </div>
                </div>

                {/* Bảng danh sách Param Chuẩn */}
                <div style={{ overflowX: 'auto', maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '40px' }} />
                      <col style={{ width: '220px' }} />
                      <col style={{ width: '85px' }} />
                      <col style={{ width: '85px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: 'auto' }} />
                      <col style={{ width: '95px' }} />
                    </colgroup>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1, borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '7px 6px', textAlign: 'center', width: '40px' }}>#</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left', width: '220px' }}>Mã Param (Param Code)</th>
                        <th style={{ padding: '7px 6px', textAlign: 'center', width: '85px' }}>Kiểu</th>
                        <th style={{ padding: '7px 6px', textAlign: 'center', width: '85px' }}>Trạng Thái</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left', width: '150px' }}>Giá Trị</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left' }}>Diễn Giải / Ghi Chú (Note)</th>
                        <th style={{ padding: '7px 6px', textAlign: 'center', width: '95px' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = standardParamsList.filter((s) => {
                          if (standardTypeFilter !== 'ALL' && s.param_type !== standardTypeFilter) return false;
                          if (standardStatusFilter !== -1 && s.status !== standardStatusFilter) return false;
                          if (standardSearchQuery.trim()) {
                            const q = standardSearchQuery.trim().toLowerCase();
                            const matchCode = s.param_code.toLowerCase().includes(q);
                            const matchVal = (s.param_value || '').toLowerCase().includes(q);
                            const matchNote = (s.note || '').toLowerCase().includes(q);
                            if (!matchCode && !matchVal && !matchNote) return false;
                          }
                          return true;
                        });

                        if (loadingStandardParams) {
                          return (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                <RefreshCw size={20} className="spin-animation" style={{ margin: '0 auto 8px' }} />
                                <div>Đang tải kho tham số chuẩn...</div>
                              </td>
                            </tr>
                          );
                        }

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                Chưa có tham số chuẩn nào phù hợp.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((std, idx) => {
                          const rawNote = std.note || '—';
                          const cleanNote = rawNote.replace(/[\r\n]+/g, ' ');
                          const rawVal = std.param_value !== undefined && std.param_value !== null ? String(std.param_value) : '';
                          const cleanVal = rawVal.replace(/[\r\n]+/g, ' ');

                          return (
                            <tr
                              key={std.param_code}
                              style={{ borderBottom: '1px solid var(--border-color)', height: '36px' }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <td style={{ padding: '6px 6px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', verticalAlign: 'middle' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '6px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: 700,
                                    color: '#1D4ED8',
                                    fontSize: '11.5px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={std.param_code}
                                >
                                  {std.param_code}
                                </div>
                              </td>
                              <td style={{ padding: '6px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: std.param_type === 'FUNCTION' ? '#EDE9FE' : '#DBEAFE',
                                    color: std.param_type === 'FUNCTION' ? '#6D28D9' : '#1D4ED8'
                                  }}
                                >
                                  {std.param_type}
                                </span>
                              </td>
                              <td style={{ padding: '6px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '10px',
                                    backgroundColor: std.status === 1 ? '#D1FAE5' : '#FEE2E2',
                                    color: std.status === 1 ? '#065F46' : '#991B1B',
                                    display: 'inline-block',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {std.status === 1 ? 'Bật (1)' : 'Tắt (0)'}
                                </span>
                              </td>
                              <td style={{ padding: '6px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontSize: '11.5px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={rawVal || '—'}
                                >
                                  {cleanVal || <em style={{ color: 'var(--text-muted)' }}>[rỗng]</em>}
                                </div>
                              </td>
                              <td style={{ padding: '6px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    fontSize: '11.5px',
                                    color: 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={rawNote}
                                >
                                  {cleanNote}
                                </div>
                              </td>
                              <td style={{ padding: '6px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                {isAdmin ? (
                                  <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStdParam(std);
                                        setStdFormCode(std.param_code);
                                        setStdFormType(std.param_type === 'CONFIG' ? 'CONFIG' : 'FUNCTION');
                                        setStdFormStatus(std.status);
                                        setStdFormValue(std.param_value || '');
                                        setStdFormNote(std.note || '');
                                      }}
                                      title="Chỉnh sửa thông tin tham số chuẩn này (Chỉ Admin)"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '3px 7px',
                                        borderRadius: '4px',
                                        border: '1px solid #93C5FD',
                                        backgroundColor: '#EFF6FF',
                                        cursor: 'pointer',
                                        color: '#1D4ED8',
                                        fontSize: '11px',
                                        fontWeight: 600
                                      }}
                                    >
                                      <Edit2 size={11} />
                                      <span>Sửa</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingStdParam(std)}
                                      title="Xóa tham số chuẩn (Chỉ Admin)"
                                      style={{
                                        padding: '3px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #FECACA',
                                        backgroundColor: '#FEF2F2',
                                        cursor: 'pointer',
                                        color: '#DC2626'
                                      }}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      color: 'var(--text-muted)',
                                      fontStyle: 'italic'
                                    }}
                                    title="Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa bộ param chuẩn"
                                  >
                                    🔒 Chỉ Admin
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* NỘI DUNG TAB 2: ÁP DỤNG XUỐNG NHÀ HÀNG */}
            {standardModalTab === 'APPLY' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. CHỌN PARAM CHUẨN CẦN ĐẨY */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      1. Chọn Tham Số Chuẩn Cần Áp Dụng:
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {batchSelectAllParams
                        ? `Áp dụng toàn bộ (${standardParamsList.length}) tham số`
                        : `Đã chọn: ${batchSelectedParamCodes.length} tham số`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="applyParamChoice"
                        checked={batchSelectAllParams}
                        onChange={() => setBatchSelectAllParams(true)}
                      />
                      <span style={{ fontWeight: 600 }}>Tất cả tham số trong Bộ Chuẩn ({standardParamsList.length})</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="applyParamChoice"
                        checked={!batchSelectAllParams}
                        onChange={() => setBatchSelectAllParams(false)}
                      />
                      <span style={{ fontWeight: 600, color: '#7C3AED' }}>Chọn cụ thể 1 hoặc nhiều tham số</span>
                    </label>
                  </div>

                  {!batchSelectAllParams && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            placeholder="Tìm kiếm tham số chuẩn cần áp dụng..."
                            value={batchParamSearch}
                            onChange={(e) => setBatchParamSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px 6px 28px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setBatchSelectedParamCodes(standardParamsList.map((s) => s.param_code))}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #7C3AED',
                            backgroundColor: '#EDE9FE',
                            color: '#6D28D9',
                            fontWeight: 600,
                            fontSize: '11.5px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Chọn Tất Cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setBatchSelectedParamCodes([])}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '11.5px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Bỏ Chọn
                        </button>
                      </div>

                      <div style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '4px' }}>
                          {standardParamsList
                            .filter((s) => {
                              if (!batchParamSearch.trim()) return true;
                              const q = batchParamSearch.trim().toLowerCase();
                              return s.param_code.toLowerCase().includes(q) || (s.param_name || '').toLowerCase().includes(q);
                            })
                            .map((s) => {
                              const isChecked = batchSelectedParamCodes.includes(s.param_code);
                              return (
                                <label
                                  key={s.param_code}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: isChecked ? '1px solid #7C3AED' : '1px solid transparent',
                                    backgroundColor: isChecked ? '#F5F3FF' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '11.5px'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setBatchSelectedParamCodes((prev) =>
                                        prev.includes(s.param_code)
                                          ? prev.filter((c) => c !== s.param_code)
                                          : [...prev, s.param_code]
                                      );
                                    }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1E40AF' }}>
                                      {s.param_code}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {s.param_name || s.param_value}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CHỌN PHẠM VI ÁP DỤNG */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setApplyScope('CURRENT')}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid ' + (applyScope === 'CURRENT' ? '#7C3AED' : 'var(--border-color)'),
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      backgroundColor: applyScope === 'CURRENT' ? '#7C3AED' : 'var(--bg-secondary)',
                      color: applyScope === 'CURRENT' ? '#FFFFFF' : 'var(--text-primary)'
                    }}
                  >
                    📍 Nhà hàng đang mở ({selectedRestaurant?.restaurant_name || currentHost})
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyScope('MULTIPLE')}
                    style={{
                      flex: 1,
                      padding: '8px 14px',
                      borderRadius: '6px',
                      border: '1px solid ' + (applyScope === 'MULTIPLE' ? '#7C3AED' : 'var(--border-color)'),
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '12.5px',
                      backgroundColor: applyScope === 'MULTIPLE' ? '#7C3AED' : 'var(--bg-secondary)',
                      color: applyScope === 'MULTIPLE' ? '#FFFFFF' : 'var(--text-primary)'
                    }}
                  >
                    🏢 Danh sách nhiều nhà hàng hàng loạt ({batchSelectedIps.length})
                  </button>
                </div>

                {/* NỘI DUNG KHI CHỌN NHIỀU NHÀ HÀNG HÀNG LOẠT */}
                {applyScope === 'MULTIPLE' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          📋 Dán mã SAP hoặc Mã RK7 hàng loạt:
                        </label>
                        <textarea
                          rows={2}
                          value={batchPastedCodes}
                          onChange={(e) => setBatchPastedCodes(e.target.value)}
                          placeholder="Mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                          🔍 Tìm kiếm theo tên nhà hàng:
                        </label>
                        <input
                          type="text"
                          value={batchSearchName}
                          onChange={(e) => setBatchSearchName(e.target.value)}
                          placeholder="Nhập tên nhà hàng..."
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          <span style={{ fontSize: '11.5px' }}>
                            Khớp: <strong>{matchedBatchRestaurants.length}</strong> nhà hàng
                          </span>
                          <button
                            type="button"
                            onClick={handleToggleSelectAllBatchRestaurants}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #7C3AED',
                              backgroundColor: areAllMatchedIpsSelected(matchedBatchRestaurants, batchSelectedIps) ? '#DDD6FE' : '#EDE9FE',
                              color: '#6D28D9',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              cursor: 'pointer'
                            }}
                          >
                            {areAllMatchedIpsSelected(matchedBatchRestaurants, batchSelectedIps)
                              ? `✕ Bỏ Chọn (${matchedBatchRestaurants.length})`
                              : `✓ Chọn Tất Cả (${matchedBatchRestaurants.length})`}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                      {matchedBatchRestaurants.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                          Không tìm thấy nhà hàng nào khớp.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '4px' }}>
                          {matchedBatchRestaurants.map((r, idx) => {
                            const ip = getRestaurantMongoIp(r);
                            const isChecked = batchSelectedIps.includes(ip);
                            const sap = getRestaurantSapCode(r);
                            const rk7 = getRestaurantRk7Code(r);
                            const name = getRestaurantDisplayName(r, ip);
                            const rowKey = r.id != null ? String(r.id) : `${ip}_${idx}`;

                            return (
                              <label
                                key={rowKey}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: isChecked ? '1px solid #7C3AED' : '1px solid transparent',
                                  backgroundColor: isChecked ? '#F5F3FF' : 'transparent',
                                  cursor: 'pointer',
                                  fontSize: '11.5px'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSingleBatchRestaurant(ip)}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {name}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                    {sap && <span>SAP: {sap} • </span>}
                                    {rk7 && <span>RK7: {rk7} • </span>}
                                    <span>{ip}</span>
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. LỰA CHỌN PHƯƠNG ÁN ĐẨY */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                    3. Phương Án Cập Nhật:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: applyMode === 'upsert' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                        backgroundColor: applyMode === 'upsert' ? '#EFF6FF' : 'var(--bg-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="applyModeChoice"
                        checked={applyMode === 'upsert'}
                        onChange={() => setApplyMode('upsert')}
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8' }}>
                          ⚡ Cập nhật & Thêm mới (Upsert)
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          Có thì cập nhật, chưa có thì thêm mới.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: applyMode === 'overwrite' ? '2px solid #DC2626' : '1px solid var(--border-color)',
                        backgroundColor: applyMode === 'overwrite' ? '#FEF2F2' : 'var(--bg-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="applyModeChoice"
                        checked={applyMode === 'overwrite'}
                        onChange={() => setApplyMode('overwrite')}
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
                          🔄 Đè luôn param cũ (Overwrite)
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          Ghi đè hoàn toàn toàn bộ param cũ.
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: applyMode === 'skip_existing' ? '2px solid #059669' : '1px solid var(--border-color)',
                        backgroundColor: applyMode === 'skip_existing' ? '#F0FDF4' : 'var(--bg-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="applyModeChoice"
                        checked={applyMode === 'skip_existing'}
                        onChange={() => setApplyMode('skip_existing')}
                      />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46' }}>
                          🛡️ Giữ nguyên cũ (Skip existing)
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          Chỉ bổ sung param thiếu, giữ nguyên cũ.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL THÊM / SỬA PARAM CHUẨN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {(showCreateStdModal || !!editingStdParam) && (
        <Modal
          isOpen={showCreateStdModal || !!editingStdParam}
          onClose={() => {
            setShowCreateStdModal(false);
            setEditingStdParam(null);
          }}
          title={editingStdParam ? `✏️ Chỉnh Sửa Tham Số Chuẩn: ${editingStdParam.param_code}` : '➕ Thêm Mới Tham Số Chuẩn'}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateStdModal(false);
                  setEditingStdParam(null);
                }}
                disabled={isSavingStd}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={editingStdParam ? handleSaveEditStdParam : handleCreateStdParam}
                isLoading={isSavingStd}
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                {editingStdParam ? 'Lưu Thay Đổi' : 'Thêm Vào Bộ Chuẩn'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Mã Tham Số (Param Code) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                disabled={!!editingStdParam}
                value={stdFormCode}
                onChange={(e) => setStdFormCode(e.target.value.toUpperCase())}
                placeholder="VD: SHOW_KDS, PASSWORD_EXIT_TABLE..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: editingStdParam ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Kiểu Tham Số
                </label>
                <select
                  value={stdFormType}
                  onChange={(e) => setStdFormType(e.target.value as 'FUNCTION' | 'CONFIG')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  <option value="FUNCTION">FUNCTION (Bật / Tắt)</option>
                  <option value="CONFIG">CONFIG (Cấu hình)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Trạng Thái (Status)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', height: '38px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="stdFormStatus"
                      checked={stdFormStatus === 1}
                      onChange={() => setStdFormStatus(1)}
                    />
                    <span style={{ color: '#059669', fontWeight: 600 }}>Bật (1)</span>
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="radio"
                      name="stdFormStatus"
                      checked={stdFormStatus === 0}
                      onChange={() => setStdFormStatus(0)}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Tắt (0)</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Giá Trị Cấu Hình (Value)
              </label>
              <textarea
                rows={2}
                value={stdFormValue}
                onChange={(e) => setStdFormValue(e.target.value)}
                placeholder="Nhập giá trị cấu hình chuẩn..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Ghi Chú Hướng Dẫn Nghiệp Vụ
              </label>
              <textarea
                rows={2}
                value={stdFormNote}
                onChange={(e) => setStdFormNote(e.target.value)}
                placeholder="Ghi chú mục đích và cách sử dụng tham số này..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL XÓA PARAM CHUẨN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {deletingStdParam && (
        <Modal
          isOpen={!!deletingStdParam}
          onClose={() => setDeletingStdParam(null)}
          title="⚠️ Xác Nhận Xóa Tham Số Chuẩn"
          maxWidth="460px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Button variant="outline" onClick={() => setDeletingStdParam(null)} disabled={isDeletingStd}>
                Hủy bỏ
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteStdParam}
                isLoading={isDeletingStd}
                leftIcon={<Trash2 size={14} />}
                style={{ backgroundColor: '#DC2626', color: '#fff' }}
              >
                Xác Nhận Xóa
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
              Bạn có chắc chắn muốn xóa tham số chuẩn <strong>{deletingStdParam.param_code}</strong> khỏi hệ thống không?
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Lưu ý: Thao tác này chỉ xóa tham số khỏi kho chuẩn, không ảnh hưởng đến các máy trạm nhà hàng đã cài đặt tham số này trước đó.
            </p>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL LƯU TỪ NHÀ HÀNG NÀY VÀO BỘ CHUẨN */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showSaveToStandardModal && (
        <Modal
          isOpen={showSaveToStandardModal}
          onClose={() => setShowSaveToStandardModal(false)}
          title="💾 Lưu Tham Số Nhà Này Vào Bộ Param Chuẩn"
          maxWidth="520px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowSaveToStandardModal(false)} disabled={isSavingToStandard}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSaveToStandard}
                isLoading={isSavingToStandard}
                leftIcon={<Upload size={14} />}
                style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
              >
                Xác Nhận Lưu Vào Bộ Chuẩn
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                color: '#1E40AF',
                fontSize: '13px',
                lineHeight: 1.5
              }}
            >
              Hệ thống sẽ quét toàn bộ <strong>{paramsList.length}</strong> tham số hiện có từ nhà hàng{' '}
              <strong>{selectedRestaurant?.restaurant_name || currentHost}</strong> (<code>{currentHost}:27017</code>) và lưu vào kho Tham Số Chuẩn trên SQL Server.
            </div>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>Các tham số mới chưa có trong Bộ Chuẩn sẽ được thêm mới tự động.</li>
              <li>Các tham số đã tồn tại trong Bộ Chuẩn sẽ được cập nhật lại theo giá trị của nhà này.</li>
            </ul>
          </div>
        </Modal>
      )}



      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL KẾT QUẢ ÁP DỤNG HÀNG LOẠT (BATCH RESULT MODAL) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showBatchResultModal && batchResultData && (
        <Modal
          isOpen={showBatchResultModal}
          onClose={() => setShowBatchResultModal(false)}
          title="📊 Kết Quả Áp Dụng Tham Số Hàng Loạt"
          maxWidth="850px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => setShowBatchResultModal(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Thẻ thống kê kết quả */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Tổng nhà hàng xử lý</div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{batchResultData.total_restaurants}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Thành công</div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{batchResultData.success_count}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Thất bại / Lỗi</div>
                <div style={{ fontSize: '22px', fontWeight: 800 }}>{batchResultData.failed_count}</div>
              </div>
            </div>

            {/* Chi tiết từng nhà hàng */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nhà Hàng</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', width: '120px' }}>IP</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Mã SAP / RK7</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Trạng Thái</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>Chi Tiết Cập Nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResultData.details.map((res, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{res.restaurant_name}</td>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{res.ip}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11.5px' }}>
                        {res.sap_code && <div>SAP: {res.sap_code}</div>}
                        {res.rk7_code && <div>RK7: {res.rk7_code}</div>}
                        {!res.sap_code && !res.rk7_code && <span>—</span>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {res.success ? (
                          <span style={{ color: '#059669', fontWeight: 700 }}>✓ Thành công</span>
                        ) : (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>✕ Lỗi</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11.5px' }}>
                        {res.success ? (
                          <div>
                            <span style={{ color: '#2563EB' }}>Thêm: {res.inserted}</span> •{' '}
                            <span style={{ color: '#059669' }}>Cập nhật: {res.updated}</span> •{' '}
                            <span style={{ color: '#6B7280' }}>Bỏ qua: {res.skipped}</span>
                          </div>
                        ) : (
                          <div style={{ color: '#DC2626', fontSize: '11px', lineHeight: 1.2 }}>{res.error}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL QUẢN LÝ LỊCH HẸN GIỜ ĐẨY PARAM (SCHEDULED JOBS MODAL) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showScheduledJobsModal && (
        <Modal
          isOpen={showScheduledJobsModal}
          onClose={() => setShowScheduledJobsModal(false)}
          title="⏰ Quản Lý Lịch Hẹn Giờ Đẩy Param Xuống Nhà Hàng"
          maxWidth="950px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                💡 Hệ thống tự động kiểm tra và thực thi đẩy param theo ngày & giờ cố định. Hiển thị tối đa 20 phiên gần nhất; toàn bộ lịch sử đẩy param được lưu trữ đầy đủ tại menu <strong>Báo Cáo Logs Tập Trung</strong>.
              </div>
              <Button variant="outline" onClick={() => setShowScheduledJobsModal(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* TABS CHUYỂN ĐỔI: DANH SÁCH LỊCH VS TẠO MỚI */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setScheduledActiveTab('LIST')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  backgroundColor: scheduledActiveTab === 'LIST' ? '#0284C7' : 'var(--bg-secondary)',
                  color: scheduledActiveTab === 'LIST' ? '#FFFFFF' : 'var(--text-primary)'
                }}
              >
                📋 Danh Sách Lịch Hẹn ({scheduledJobsList.length})
              </button>
              <button
                type="button"
                onClick={() => setScheduledActiveTab('CREATE')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  backgroundColor: scheduledActiveTab === 'CREATE' ? '#0284C7' : 'var(--bg-secondary)',
                  color: scheduledActiveTab === 'CREATE' ? '#FFFFFF' : 'var(--text-primary)'
                }}
              >
                ➕ Tạo Lịch Hẹn Giờ Mới
              </button>
            </div>

            {/* TAB 1: DANH SÁCH LỊCH HẸN GIỜ */}
            {scheduledActiveTab === 'LIST' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Các tác vụ hẹn giờ đã cài đặt trên hệ thống <span style={{ fontWeight: 700, color: '#0284C7' }}>(hiển thị tối đa 20 phiên gần nhất)</span>:
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadScheduledJobs}
                    isLoading={loadingScheduledJobs}
                    leftIcon={<RefreshCw size={13} />}
                  >
                    Làm mới danh sách
                  </Button>
                </div>

                <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px' }}>#ID</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left' }}>Tiêu Đề Tác Vụ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>Thời Gian Hẹn Giờ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Chế Độ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Số Nhà Hàng</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '120px' }}>Tham Số Đồng Bộ</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '110px' }}>Trạng Thái</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: '170px' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledJobsList.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            Chưa có lịch hẹn giờ nào được tạo. Nhấp "Tạo Lịch Hẹn Giờ Mới" để lên lịch chạy tự động!
                          </td>
                        </tr>
                      ) : (
                        scheduledJobsList.map((job) => {
                          const isRunning = runningJobId === job.id;
                          return (
                            <tr key={job.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                                #{job.id}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                                {job.job_title}
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Tạo bởi: {job.created_by || 'Hệ thống'}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ fontWeight: 700, color: '#0284C7' }}>
                                  {job.run_time}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {formatDateDDMMYYYY(job.run_date)}
                                </div>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor:
                                      job.mode === 'upsert' ? '#EFF6FF' : job.mode === 'overwrite' ? '#FEF2F2' : '#ECFDF5',
                                    color:
                                      job.mode === 'upsert' ? '#1D4ED8' : job.mode === 'overwrite' ? '#991B1B' : '#065F46'
                                  }}
                                >
                                  {job.mode}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                                {job.total_restaurants}
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: '#EFF6FF',
                                    color: '#1D4ED8',
                                    border: '1px solid #BFDBFE'
                                  }}
                                  title={(job.params_payload || []).map((p: any) => p.paramCode || p.param_code).join(', ')}
                                >
                                  {job.params_payload?.length || 0} param
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    backgroundColor:
                                      job.status === 'PENDING'
                                        ? '#FEF3C7'
                                        : job.status === 'RUNNING'
                                        ? '#DBEAFE'
                                        : job.status === 'COMPLETED'
                                        ? '#D1FAE5'
                                        : '#FEE2E2',
                                    color:
                                      job.status === 'PENDING'
                                        ? '#92400E'
                                        : job.status === 'RUNNING'
                                        ? '#1E40AF'
                                        : job.status === 'COMPLETED'
                                        ? '#065F46'
                                        : '#991B1B'
                                  }}
                                >
                                  {job.status === 'PENDING'
                                    ? '⏳ Đang chờ'
                                    : job.status === 'RUNNING'
                                    ? '🔄 Đang chạy'
                                    : job.status === 'COMPLETED'
                                    ? '✓ Đã xong'
                                    : '✕ Lỗi'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                                  {job.status === 'PENDING' && (
                                    <button
                                      type="button"
                                      onClick={() => handleRunScheduledJobNow(job)}
                                      disabled={isRunning}
                                      title="Kích hoạt chạy ngay lập tức tác vụ này"
                                      style={{
                                        border: '1px solid #059669',
                                        backgroundColor: '#ECFDF5',
                                        color: '#065F46',
                                        borderRadius: '4px',
                                        padding: '3px 7px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '11px',
                                        fontWeight: 600
                                      }}
                                    >
                                      {isRunning ? (
                                        <RefreshCw size={11} className="spin-animation" />
                                      ) : (
                                        <Play size={11} />
                                      )}
                                      <span>Chạy Ngay</span>
                                    </button>
                                  )}

                                  {job.result_summary && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingJobDetail(job)}
                                      title="Xem kết quả thực thi chi tiết"
                                      style={{
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        borderRadius: '4px',
                                        padding: '3px 7px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '11px',
                                        fontWeight: 600
                                      }}
                                    >
                                      <Eye size={11} />
                                      <span>Kết Quả</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleReuseScheduledJob(job)}
                                    title="Tái sử dụng cấu hình tham số & danh sách nhà hàng của tác vụ này"
                                    style={{
                                      border: '1px solid #BFDBFE',
                                      backgroundColor: '#EFF6FF',
                                      color: '#1D4ED8',
                                      borderRadius: '4px',
                                      padding: '3px 7px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontSize: '11px',
                                      fontWeight: 600
                                    }}
                                  >
                                    <Copy size={11} />
                                    <span>Tái Sử Dụng</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteScheduledJob(job.id)}
                                    title="Xóa tác vụ này"
                                    style={{
                                      border: '1px solid #FECACA',
                                      backgroundColor: '#FEF2F2',
                                      color: '#DC2626',
                                      borderRadius: '4px',
                                      padding: '3px 6px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Trash2 size={12} />
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

            {/* TAB 2: TẠO LỊCH HẸN GIỜ MỚI */}
            {scheduledActiveTab === 'CREATE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Tiêu Đề Tác Vụ <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newJobTitle}
                      onChange={(e) => setNewJobTitle(e.target.value)}
                      placeholder="VD: Cập nhật Param KDS & Bill cho cụm nhà hàng miền Bắc"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Ngày Chạy (dd-mm-yyyy) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <DateInput
                      value={newJobDate}
                      onChange={setNewJobDate}
                      required
                      style={{ height: '38px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Giờ Chạy (HH:mm) <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="time"
                      value={newJobTime}
                      onChange={(e) => setNewJobTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                {/* Chọn Phương Án Đẩy (Upsert, Overwrite, Skip) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Phương Án Cập Nhật:
                  </label>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="jobModeRadio"
                        checked={newJobMode === 'upsert'}
                        onChange={() => setNewJobMode('upsert')}
                      />
                      <span style={{ color: '#1D4ED8', fontWeight: 600 }}>Cập nhật cũ & Thêm mới (Upsert)</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="jobModeRadio"
                        checked={newJobMode === 'overwrite'}
                        onChange={() => setNewJobMode('overwrite')}
                      />
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>Đè luôn param cũ (Overwrite)</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="jobModeRadio"
                        checked={newJobMode === 'skip_existing'}
                        onChange={() => setNewJobMode('skip_existing')}
                      />
                      <span style={{ color: '#059669', fontWeight: 600 }}>Giữ nguyên cũ, chỉ thêm mới</span>
                    </label>
                  </div>
                </div>

                {/* 1. CHỌN PARAM CẦN ĐỒNG BỘ (Theo yêu cầu: có thể chọn sẵn 1 hoặc nhiều param hoặc tự add param mới) */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                      1. Chọn Tham Số Cần Đồng Bộ:
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {newJobParamMode === 'ALL'
                        ? `Tất cả (${standardParamsList.length}) tham số chuẩn ${newJobCustomParams.length > 0 ? `+ ${newJobCustomParams.length} tự thêm` : ''}`
                        : `Đã chọn: ${newJobSelectedParamCodes.length} tham số ${newJobCustomParams.length > 0 ? `(${newJobCustomParams.length} tự thêm)` : ''}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="newJobParamModeRadio"
                        checked={newJobParamMode === 'ALL'}
                        onChange={() => setNewJobParamMode('ALL')}
                      />
                      <span style={{ fontWeight: 600 }}>Tất cả tham số trong Bộ Chuẩn ({standardParamsList.length})</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="newJobParamModeRadio"
                        checked={newJobParamMode === 'CUSTOM'}
                        onChange={() => setNewJobParamMode('CUSTOM')}
                      />
                      <span style={{ fontWeight: 600, color: '#D97706' }}>Chọn cụ thể 1 hoặc nhiều tham số / Tự thêm</span>
                    </label>

                    {/* NÚT TỰ THÊM PARAM (luôn hiển thị để tiện bấm nhanh) */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewJobParamMode('CUSTOM');
                        setShowAddCustomParamForm((prev) => !prev);
                        setEditingCustomParamIndex(null);
                        if (!showAddCustomParamForm) {
                          setCustomFormCode('');
                          setCustomFormName('');
                          setCustomFormValue('1');
                          setCustomFormNote('');
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        border: '1px solid #059669',
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        fontWeight: 700,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: 'auto'
                      }}
                      title="Tự nhập thêm tham số tùy chỉnh chưa có trong danh sách để đẩy xuống nhà hàng"
                    >
                      <Plus size={13} color="#059669" />
                      <span>+ Tự Thêm Param</span>
                    </button>
                  </div>

                  {/* FORM NHẬP PARAM TỰ THÊM */}
                  {showAddCustomParamForm && (
                    <div
                      style={{
                        margin: '10px 0',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1.5px solid #059669',
                        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Plus size={14} color="#059669" />
                          <span>{editingCustomParamIndex !== null ? '✏️ Chỉnh Sửa Tham Số Tự Thêm' : '➕ Nhập Tham Số Tự Thêm Vào Lịch Hẹn'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCustomParamForm(false);
                            setEditingCustomParamIndex(null);
                          }}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '0 4px' }}
                        >
                          ✕
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                            Mã Param (Param Code) <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="VD: FUNC_PROMO_QR, CONFIG_BILL..."
                            value={customFormCode}
                            onChange={(e) => setCustomFormCode(e.target.value.toUpperCase())}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontFamily: 'monospace',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                            Tên Param / Diễn Giải
                          </label>
                          <input
                            type="text"
                            placeholder="VD: Quét mã QR khuyến mãi..."
                            value={customFormName}
                            onChange={(e) => setCustomFormName(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                            Kiểu Tham Số
                          </label>
                          <select
                            value={customFormType}
                            onChange={(e) => {
                              const val = e.target.value as 'FUNCTION' | 'CONFIG';
                              setCustomFormType(val);
                              if (val === 'FUNCTION' && (!customFormValue || customFormValue === '0')) {
                                setCustomFormValue('1');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          >
                            <option value="FUNCTION">FUNCTION (Bật / Tắt)</option>
                            <option value="CONFIG">CONFIG (Cấu hình giá trị)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                            Trạng Thái
                          </label>
                          <select
                            value={customFormStatus}
                            onChange={(e) => setCustomFormStatus(Number(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: customFormStatus === 1 ? '#059669' : '#DC2626'
                            }}
                          >
                            <option value={1}>🟢 Bật (Status = 1)</option>
                            <option value={0}>🔴 Tắt (Status = 0)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                            Giá Trị Cấu Hình (Value)
                          </label>
                          <input
                            type="text"
                            placeholder={customFormType === 'FUNCTION' ? '1' : 'VD: 0, 1, chuỗi...'}
                            value={customFormValue}
                            onChange={(e) => setCustomFormValue(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontFamily: 'monospace',
                              fontSize: '12px'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: 'var(--text-secondary)' }}>
                            Ghi Chú Nghiệp Vụ
                          </label>
                          <input
                            type="text"
                            placeholder="Ghi chú chi tiết nếu có..."
                            value={customFormNote}
                            onChange={(e) => setCustomFormNote(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCustomParamForm(false);
                            setEditingCustomParamIndex(null);
                          }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={handleAddOrUpdateCustomParam}
                          style={{
                            padding: '5px 14px',
                            borderRadius: '6px',
                            border: '1px solid #059669',
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {editingCustomParamIndex !== null ? '✓ Cập Nhật Param' : '✓ Thêm Vào Lịch Hẹn'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DANH SÁCH CÁC PARAM TỰ THÊM */}
                  {newJobCustomParams.length > 0 && (
                    <div
                      style={{
                        margin: '8px 0',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                          📌 Tham số tự thêm cho lịch hẹn ({newJobCustomParams.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Bạn có muốn xóa toàn bộ các param tự thêm?')) {
                              const customCodes = newJobCustomParams.map((p) => p.paramCode);
                              setNewJobCustomParams([]);
                              setNewJobSelectedParamCodes((prev) => prev.filter((c) => !customCodes.includes(c)));
                            }
                          }}
                          style={{
                            border: 'none',
                            background: 'none',
                            fontSize: '11px',
                            color: '#DC2626',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          Xóa tất cả ({newJobCustomParams.length})
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {newJobCustomParams.map((cp, idx) => (
                          <div
                            key={cp.paramCode}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #86EFAC',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              fontSize: '11.5px'
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#15803D' }}>
                              {cp.paramCode}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: cp.status === 1 ? '#DCFCE7' : '#FEE2E2',
                                color: cp.status === 1 ? '#15803D' : '#B91C1C'
                              }}
                            >
                              {cp.status === 1 ? 'Bật' : 'Tắt'}
                            </span>
                            <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              ({cp.paramType}: {cp.value || '""'})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleEditCustomParam(cp, idx)}
                              title="Sửa tham số này"
                              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#2563EB', display: 'flex', alignItems: 'center' }}
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomParam(cp.paramCode)}
                              title="Xóa tham số này"
                              style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newJobParamMode === 'CUSTOM' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            placeholder="Tìm kiếm mã hoặc tên param cần đồng bộ..."
                            value={newJobParamSearch}
                            onChange={(e) => setNewJobParamSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 10px 6px 28px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const allCodes = Array.from(new Set([
                              ...newJobCustomParams.map((cp) => cp.paramCode),
                              ...standardParamsList.map((s) => s.param_code),
                              ...paramsList.map((p) => p.paramCode)
                            ]));
                            setNewJobSelectedParamCodes(allCodes);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid #D97706',
                            backgroundColor: '#FEF3C7',
                            color: '#B45309',
                            fontWeight: 600,
                            fontSize: '11.5px',
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Chọn Tất Cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewJobSelectedParamCodes([])}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '11.5px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Bỏ Chọn
                        </button>
                      </div>

                      <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                        {(() => {
                          const availableMap = new Map<string, { code: string; name: string; type: string; status: number; val: string; isCustom?: boolean }>();
                          // Đưa các param tự thêm lên đầu danh sách
                          newJobCustomParams.forEach((cp) => {
                            availableMap.set(cp.paramCode, {
                              code: cp.paramCode,
                              name: cp.paramName || '',
                              type: cp.paramType,
                              status: cp.status,
                              val: cp.value,
                              isCustom: true
                            });
                          });
                          standardParamsList.forEach((s) => {
                            if (!availableMap.has(s.param_code)) {
                              availableMap.set(s.param_code, {
                                code: s.param_code,
                                name: s.param_name || '',
                                type: s.param_type,
                                status: s.status,
                                val: s.param_value || '',
                                isCustom: false
                              });
                            }
                          });
                          paramsList.forEach((p) => {
                            if (!availableMap.has(p.paramCode)) {
                              availableMap.set(p.paramCode, {
                                code: p.paramCode,
                                name: p.paramName || '',
                                type: p.paramType || 'FUNCTION',
                                status: p.status ?? 1,
                                val: String(p.value ?? ''),
                                isCustom: false
                              });
                            }
                          });
                          const list = Array.from(availableMap.values()).filter((item) => {
                            if (!newJobParamSearch.trim()) return true;
                            const q = newJobParamSearch.trim().toLowerCase();
                            return item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
                          });

                          if (list.length === 0) {
                            return <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Không tìm thấy param nào.</div>;
                          }

                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '4px' }}>
                              {list.map((item) => {
                                const isChecked = newJobSelectedParamCodes.includes(item.code);
                                return (
                                  <label
                                    key={item.code}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      border: isChecked ? '1px solid #D97706' : '1px solid transparent',
                                      backgroundColor: isChecked ? '#FFFDF0' : 'transparent',
                                      cursor: 'pointer',
                                      fontSize: '11.5px'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setNewJobSelectedParamCodes((prev) =>
                                          prev.includes(item.code)
                                            ? prev.filter((c) => c !== item.code)
                                            : [...prev, item.code]
                                        );
                                      }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: item.isCustom ? '#15803D' : '#1E40AF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{item.code}</span>
                                        {item.isCustom && (
                                          <span style={{ fontSize: '9px', fontWeight: 700, padding: '0 4px', borderRadius: '3px', backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                                            Tự thêm
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name || item.val}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: item.status === 1 ? '#D1FAE5' : '#FEE2E2', color: item.status === 1 ? '#065F46' : '#991B1B' }}>
                                      {item.status === 1 ? 'Bật' : 'Tắt'}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CHỌN NHÀ HÀNG MỤC TIÊU (Nhà hàng đang mở hoặc hàng loạt) */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      2. Chọn Danh Sách Nhà Hàng Mục Tiêu:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>
                        {newJobTargetScope === 'CURRENT'
                          ? `Nhà hàng hiện tại (${getRestaurantDisplayName(selectedRestaurant, currentHost)})`
                          : `Đã chọn: ${newJobSelectedIps.length} nhà hàng`}
                      </span>
                      {newJobTargetScope === 'MULTIPLE' && newJobSelectedIps.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNewJobSelectedIps([])}
                          style={{
                            padding: '2px 7px',
                            borderRadius: '4px',
                            border: '1px solid #FCA5A5',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Xóa toàn bộ nhà hàng đã chọn"
                        >
                          Xóa đã chọn
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="newJobTargetScopeRadio"
                        checked={newJobTargetScope === 'CURRENT'}
                        onChange={() => setNewJobTargetScope('CURRENT')}
                      />
                      <span style={{ fontWeight: 600 }}>Nhà hàng đang mở ({getRestaurantDisplayName(selectedRestaurant, currentHost)})</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="newJobTargetScopeRadio"
                        checked={newJobTargetScope === 'MULTIPLE'}
                        onChange={() => setNewJobTargetScope('MULTIPLE')}
                      />
                      <span style={{ fontWeight: 600, color: '#0284C7' }}>Dán mã SAP / RK7 hoặc tìm kiếm nhiều nhà hàng</span>
                    </label>
                  </div>

                  {newJobTargetScope === 'MULTIPLE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                            Dán mã SAP hoặc RK7 hàng loạt:
                          </label>
                          <textarea
                            rows={2}
                            value={newJobPastedCodes}
                            onChange={(e) => setNewJobPastedCodes(e.target.value)}
                            placeholder="Mỗi mã 1 dòng hoặc cách nhau bởi dấu phẩy..."
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                            Hoặc tìm theo tên:
                          </label>
                          <input
                            type="text"
                            value={newJobSearchName}
                            onChange={(e) => setNewJobSearchName(e.target.value)}
                            placeholder="Tìm tên nhà hàng..."
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <span style={{ fontSize: '11.5px' }}>Khớp: <strong>{matchedNewJobRestaurants.length}</strong> nhà hàng</span>
                            <button
                              type="button"
                              onClick={handleToggleSelectAllNewJobRestaurants}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                border: '1px solid #0284C7',
                                backgroundColor: areAllMatchedIpsSelected(matchedNewJobRestaurants, newJobSelectedIps) ? '#BAE6FD' : '#E0F2FE',
                                color: '#0369A1',
                                fontWeight: 700,
                                fontSize: '11.5px',
                                cursor: 'pointer'
                              }}
                            >
                              {areAllMatchedIpsSelected(matchedNewJobRestaurants, newJobSelectedIps)
                                ? `✕ Bỏ Chọn (${matchedNewJobRestaurants.length})`
                                : `✓ Chọn Tất Cả (${matchedNewJobRestaurants.length})`}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Danh sách nhà hàng dạng checkbox */}
                      <div style={{ maxHeight: '140px', overflowY: 'auto', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}>
                        {matchedNewJobRestaurants.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Không có nhà hàng nào khớp với tìm kiếm.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '4px' }}>
                            {matchedNewJobRestaurants.map((r, idx) => {
                              const ip = getRestaurantMongoIp(r);
                              const isChecked = newJobSelectedIps.includes(ip);
                              const sap = getRestaurantSapCode(r);
                              const rk7 = getRestaurantRk7Code(r);
                              const name = getRestaurantDisplayName(r, ip);
                              const rowKey = r.id != null ? String(r.id) : `${ip}_${idx}`;

                              return (
                                <label
                                  key={rowKey}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: isChecked ? '1px solid #0284C7' : '1px solid transparent',
                                    backgroundColor: isChecked ? '#F0F9FF' : 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '11.5px'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSingleSelectedIp(setNewJobSelectedIps, ip)}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {name}
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                                      {sap && <span>SAP: {sap} • </span>}
                                      {rk7 && <span>RK7: {rk7} • </span>}
                                      <span>{ip}</span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center' }}>
                  <Button variant="outline" onClick={() => setScheduledActiveTab('LIST')} disabled={isCreatingJob}>
                    Hủy Bỏ
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreateAndRunImmediately}
                    isLoading={isCreatingJob}
                    leftIcon={<Play size={14} />}
                    style={{
                      borderColor: '#059669',
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      fontWeight: 700
                    }}
                    title="Lưu cấu hình và thực thi đẩy ngay lập tức xuống các nhà hàng đã chọn"
                  >
                    ⚡ Đẩy Xuống Nhà Hàng Ngay
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleCreateScheduledJob}
                    isLoading={isCreatingJob}
                    leftIcon={<Clock size={14} />}
                    style={{ backgroundColor: '#0284C7', borderColor: '#0284C7', fontWeight: 700 }}
                  >
                    💾 Lưu Lịch Hẹn Giờ
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL XEM CHI TIẾT KẾT QUẢ CỦA TÁC VỤ HẸN GIỜ ĐÃ CHẠY */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {viewingJobDetail && (
        <Modal
          isOpen={!!viewingJobDetail}
          onClose={() => setViewingJobDetail(null)}
          title={`📊 Kết Quả Thực Thi: #${viewingJobDetail.id} - ${viewingJobDetail.job_title}`}
          maxWidth="980px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Button
                variant="outline"
                onClick={() => {
                  const jobToReuse = viewingJobDetail;
                  setViewingJobDetail(null);
                  handleReuseScheduledJob(jobToReuse);
                }}
                leftIcon={<RefreshCw size={14} />}
                style={{
                  borderColor: '#0284C7',
                  color: '#0284C7',
                  fontWeight: 700,
                  backgroundColor: '#F0F9FF'
                }}
                title="Sao chép toàn bộ danh sách param và danh sách nhà hàng này sang form Tạo Mới để thêm nhà hàng hoặc đẩy lại ngay"
              >
                🔄 Tái Sử Dụng Cấu Hình Này (Thêm Nhà Hàng / Đẩy Lại)
              </Button>
              <Button variant="primary" onClick={() => setViewingJobDetail(null)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 700 }}>Tổng nhà hàng</div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{viewingJobDetail.total_restaurants}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 700 }}>Thành công</div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{viewingJobDetail.success_count}</div>
              </div>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 700 }}>Thất bại</div>
                <div style={{ fontSize: '20px', fontWeight: 800 }}>{viewingJobDetail.failed_count}</div>
              </div>
            </div>

            {/* 📋 DANH SÁCH CẤU HÌNH PARAM ĐÃ ĐẨY XUỐNG NHÀ HÀNG */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📋 Cấu Hình Tham Số (Param) Đã Đẩy ({Array.isArray(viewingJobDetail.params_payload) ? viewingJobDetail.params_payload.length : 0} tham số)</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Chế độ đồng bộ: <strong style={{ textTransform: 'uppercase', color: '#0284C7' }}>{viewingJobDetail.mode || (viewingJobDetail as any).operation_mode || 'upsert'}</strong>
                </div>
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {Array.isArray(viewingJobDetail.params_payload) && viewingJobDetail.params_payload.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '6px 10px', textAlign: 'center', width: '36px' }}>#</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', minWidth: '180px' }}>Mã Tham Số (paramCode)</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', minWidth: '150px' }}>Tên Tham Số</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', width: '80px' }}>Loại</th>
                        <th style={{ padding: '6px 10px', textAlign: 'center', width: '90px' }}>Trạng Thái</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left', minWidth: '120px' }}>Giá Trị (Value)</th>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Ghi Chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingJobDetail.params_payload.map((param: any, pIdx: number) => {
                        const isEnabled = param.status === 1 || param.status === true || param.status === '1';
                        return (
                          <tr key={pIdx} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: pIdx % 2 === 1 ? '#FAFAFA' : '#FFF' }}>
                            <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>{pIdx + 1}</td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                              {param.paramCode || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', fontWeight: 500 }}>
                              {param.paramName || getParamDisplayName(param.paramCode) || '—'}
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569' }}>
                                {param.paramType || 'boolean'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  backgroundColor: isEnabled ? '#DCFCE7' : '#FEE2E2',
                                  color: isEnabled ? '#15803D' : '#B91C1C',
                                  border: `1px solid ${isEnabled ? '#86EFAC' : '#FCA5A5'}`
                                }}
                              >
                                {isEnabled ? '✓ Bật (1)' : '✕ Tắt (0)'}
                              </span>
                            </td>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: '11px', color: '#1E293B', maxWidth: '180px', wordBreak: 'break-all' }}>
                              {param.value !== undefined && param.value !== null ? String(param.value) : '—'}
                            </td>
                            <td style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {param.note || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    Không có thông tin chi tiết tham số trong cấu hình đợt này.
                  </div>
                )}
              </div>
            </div>

            {/* DANH SÁCH CHI TIẾT TỪNG NHÀ HÀNG & MÁY TRẠM */}
            <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '160px' }}>Nhà Hàng</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '220px' }}>Máy Trạm POS / KDS</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Trạng Thái</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', minWidth: '180px' }}>Chi Tiết Tham Số</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(viewingJobDetail.result_summary) &&
                    viewingJobDetail.result_summary.map((res: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>
                          <div>{res.restaurant_name}</div>
                          {res.raw_ip && (
                            <div style={{ fontSize: '10px', color: '#6B7280', fontFamily: 'monospace' }}>Subnet: {res.raw_ip}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>
                          {Array.isArray(res.device_results) && res.device_results.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {res.device_results.map((d: any, dIdx: number) => (
                                <div
                                  key={dIdx}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    backgroundColor: d.success ? '#ECFDF5' : d.connected ? '#FEF2F2' : '#F3F4F6',
                                    border: `1px solid ${d.success ? '#A7F3D0' : d.connected ? '#FECACA' : '#E5E7EB'}`,
                                    color: d.success ? '#065F46' : d.connected ? '#991B1B' : '#6B7280'
                                  }}
                                >
                                  <span style={{ fontWeight: 700 }}>
                                    {d.success ? '✓' : d.connected ? '✕' : '⚡'}
                                  </span>
                                  <span>{d.ip}</span>
                                  {!d.connected && <span style={{ fontSize: '9px', fontStyle: 'italic' }}>(Tắt)</span>}
                                  {d.success && (
                                    <span style={{ fontSize: '9px', color: '#047857' }}>
                                      (+{d.inserted || 0}/~{d.updated || 0})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontWeight: 600 }}>{res.ip || res.raw_ip || '—'}</div>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {res.success ? (
                            <span style={{ color: '#059669', fontWeight: 700 }}>✓ Thành công</span>
                          ) : (
                            <span style={{ color: '#DC2626', fontWeight: 700 }}>✕ Thất bại</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', wordBreak: 'break-word' }}>
                          {res.success ? (
                            <div>
                              <span>Thêm: {res.inserted || 0}</span> • <span>Sửa: {res.updated || 0}</span> •{' '}
                              <span>Bỏ qua: {res.skipped || 0}</span>
                            </div>
                          ) : (
                            <div style={{ color: '#DC2626', lineHeight: '1.4' }}>{res.error}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
