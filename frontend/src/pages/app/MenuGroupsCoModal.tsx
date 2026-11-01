import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Zap,
  Trash2,
  Plus,
  RefreshCw,
  Download,
  Layers,
  CheckSquare,
  Square,
  Search,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  mongoService,
  MenuGroupsCoDetailResponse
} from '../../services/mongoService';

interface MenuOption {
  code: string;
  name: string;
  group_count?: number;
  so_only_group_count?: number;
}

interface MenuGroupsCoModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  initialMenuCode?: string;
  availableMenus: MenuOption[];
  onUpdated?: () => void;
}

export const MenuGroupsCoModal: React.FC<MenuGroupsCoModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  initialMenuCode = '',
  availableMenus = [],
  onUpdated
}) => {
  const [selectedMenuCode, setSelectedMenuCode] = useState<string>(initialMenuCode || (availableMenus[0]?.code || ''));
  const [loading, setLoading] = useState<boolean>(false);
  const [detail, setDetail] = useState<MenuGroupsCoDetailResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Danh sách các mã nhóm được chọn qua Checkbox để đưa lên CO
  const [selectedGroupCodes, setSelectedGroupCodes] = useState<Set<string>>(new Set());

  // Tìm kiếm lọc nhóm trong bảng
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'MISSING' | 'EXISTING'>('ALL');

  // Thêm tay mã nhóm
  const [manualInput, setManualInput] = useState<string>('');
  const [syncFile2, setSyncFile2] = useState<boolean>(true);

  // Trạng thái đang thực thi
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Tự động load dữ liệu khi đổi menu hoặc mở modal
  useEffect(() => {
    if (isOpen && host && selectedMenuCode) {
      loadDetail(selectedMenuCode);
    }
  }, [isOpen, host, selectedMenuCode]);

  const loadDetail = async (menuCode: string) => {
    if (!host || !menuCode) return;
    setLoading(true);
    setErrorMsg(null);
    setSelectedGroupCodes(new Set());
    try {
      const res = await mongoService.getMenuGroupsCo({
        host,
        port,
        menu_code: menuCode
      });
      setDetail(res);
      // Mặc định chọn tất cả các nhóm chưa có trên CO
      const missing = new Set<string>();
      res.so_groups.forEach((g) => {
        if (!g.is_co) missing.add(g.code);
      });
      setSelectedGroupCodes(missing);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Lỗi khi tải chi tiết nhóm CO');
    } finally {
      setLoading(false);
    }
  };

  // Toggle checkbox từng nhóm
  const toggleSelectGroup = (code: string) => {
    setSelectedGroupCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Danh sách nhóm sau lọc
  const filteredGroups = useMemo(() => {
    if (!detail) return [];
    return detail.so_groups.filter((g) => {
      if (filterStatus === 'MISSING' && g.is_co) return false;
      if (filterStatus === 'EXISTING' && !g.is_co) return false;
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        return g.code.toLowerCase().includes(q) || g.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [detail, filterQuery, filterStatus]);

  // Các nhóm chưa có trên CO trong danh sách sau lọc
  const selectableGroups = useMemo(() => {
    return filteredGroups.filter((g) => !g.is_co);
  }, [filteredGroups]);

  const isAllSelectableChecked = selectableGroups.length > 0 && selectableGroups.every((g) => selectedGroupCodes.has(g.code));

  const toggleSelectAll = () => {
    if (isAllSelectableChecked) {
      // Bỏ chọn tất cả các nhóm đang lọc
      setSelectedGroupCodes((prev) => {
        const next = new Set(prev);
        selectableGroups.forEach((g) => next.delete(g.code));
        return next;
      });
    } else {
      // Chọn tất cả các nhóm đang lọc
      setSelectedGroupCodes((prev) => {
        const next = new Set(prev);
        selectableGroups.forEach((g) => next.add(g.code));
        return next;
      });
    }
  };

  // Đưa các nhóm đã chọn lên CO
  const handleSyncSelected = async (action: 'ADD' | 'REMOVE' = 'ADD') => {
    if (!host || !selectedMenuCode || selectedGroupCodes.size === 0) return;
    setIsSyncing(true);
    try {
      const codes = Array.from(selectedGroupCodes);
      await mongoService.bulkSyncMenuGroupsCo({
        host,
        port,
        menu_code: selectedMenuCode,
        group_codes: codes,
        action,
        update_file2: syncFile2
      });
      await loadDetail(selectedMenuCode);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert('Lỗi cập nhật nhóm CO: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  // Đưa toàn bộ nhóm SO chưa có lên CO (1-Click)
  const handleSyncAllMissing = async () => {
    if (!host || !selectedMenuCode || !detail) return;
    const missingCodes = detail.so_groups.filter((g) => !g.is_co).map((g) => g.code);
    if (missingCodes.length === 0) {
      alert('Tất cả nhóm món đã có trên CO!');
      return;
    }
    if (!confirm(`Đưa toàn bộ ${missingCodes.length} nhóm chưa có lên CO cho Menu ${selectedMenuCode}?`)) return;

    setIsSyncing(true);
    try {
      await mongoService.bulkSyncMenuGroupsCo({
        host,
        port,
        menu_code: selectedMenuCode,
        group_codes: missingCodes,
        action: 'ADD',
        update_file2: syncFile2
      });
      await loadDetail(selectedMenuCode);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert('Lỗi cập nhật: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  // Thêm tay mã nhóm
  const handleAddManualCodes = async () => {
    if (!manualInput.trim() || !host || !selectedMenuCode) return;
    const rawCodes = manualInput
      .split(/[\n,;\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    if (rawCodes.length === 0) return;

    setIsSyncing(true);
    try {
      await mongoService.bulkSyncMenuGroupsCo({
        host,
        port,
        menu_code: selectedMenuCode,
        group_codes: rawCodes,
        action: 'ADD',
        update_file2: syncFile2
      });
      setManualInput('');
      await loadDetail(selectedMenuCode);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert('Lỗi thêm tay mã nhóm: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  // Thao tác nhanh từng nhóm đơn lẻ
  const handleSingleGroupAction = async (code: string, action: 'ADD' | 'REMOVE') => {
    if (!host || !selectedMenuCode) return;
    setIsSyncing(true);
    try {
      await mongoService.bulkSyncMenuGroupsCo({
        host,
        port,
        menu_code: selectedMenuCode,
        group_codes: [code],
        action,
        update_file2: syncFile2
      });
      await loadDetail(selectedMenuCode);
      if (onUpdated) onUpdated();
    } catch (err: any) {
      alert('Lỗi thao tác nhóm: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsSyncing(false);
    }
  };

  // Số lượng thống kê
  const totalSoGroups = detail?.so_groups.length || 0;
  const existingCoGroups = detail?.so_groups.filter((g) => g.is_co).length || 0;
  const missingCoGroups = totalSoGroups - existingCoGroups;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileSpreadsheet size={18} color="#059669" />
          <span>Quản Lý &amp; Đối Soát Nhóm Hiển Thị CO (File Số 2: CO_FILE_2.xlsx)</span>
        </div>
      }
      maxWidth="1100px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={syncFile2}
                onChange={(e) => setSyncFile2(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: '#10B981' }}
              />
              <HardDrive size={13} color="#059669" />
              Đồng thời cập nhật vào File 2 (CO_FILE_2.xlsx)
            </label>

            {detail?.file2_available && (
              <a
                href={mongoService.getExportFile2Url(host, port)}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11.5px',
                  color: '#059669',
                  backgroundColor: '#ECFDF5',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid #A7F3D0',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
                title="Tải file Excel CO_FILE_2.xlsx mới nhất từ hệ thống"
              >
                <Download size={12} /> Tải File 2 Excel Mới
              </a>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSyncing}>
              Đóng
            </Button>

            {missingCoGroups > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAllMissing}
                isLoading={isSyncing}
                leftIcon={<Zap size={14} color="#D97706" />}
                style={{ borderColor: '#F59E0B', color: '#B45309', backgroundColor: '#FFFBEB' }}
              >
                Đưa Tất Cả {missingCoGroups} Nhóm Chưa Có Lên CO
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSyncSelected('ADD')}
              disabled={selectedGroupCodes.size === 0 || isSyncing}
              isLoading={isSyncing}
              leftIcon={<Check size={14} />}
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              Đưa Các Nhóm Đã Chọn Lên CO ({selectedGroupCodes.size} nhóm)
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '76vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* BANNER ĐIỀU HƯỚNG & CHỌN MENU */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* Menu Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '320px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
              Chọn Menu:
            </label>
            <select
              value={selectedMenuCode}
              onChange={(e) => setSelectedMenuCode(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                flex: 1
              }}
            >
              {availableMenus.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name || `Menu ${m.code}`} ({m.code}) {m.so_only_group_count ? `[⚠️ Còn ${m.so_only_group_count} nhóm chưa lên CO]` : '[✓ Đủ nhóm CO]'}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadDetail(selectedMenuCode)}
              disabled={loading}
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: 'var(--text-secondary)'
              }}
              title="Tải lại dữ liệu nhóm"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
            </button>
          </div>

          {/* Trạng thái File 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Nguồn File 2:</span>
            {detail?.file2_available ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#065F46',
                  backgroundColor: '#D1FAE5',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '11px'
                }}
                title={detail.file2_path || ''}
              >
                <CheckCircle2 size={12} color="#059669" />
                Đã nạp từ File 2 ({detail.file2_group_codes.length} nhóm)
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#92400E',
                  backgroundColor: '#FEF3C7',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              >
                <AlertTriangle size={12} color="#D97706" />
                Chưa có File 2 (D:\1.Download\SO.CO\File_goc)
              </span>
            )}
          </div>
        </div>

        {/* THỐNG KÊ NHÓM */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '11px', color: '#1E40AF', fontWeight: 600 }}>TỔNG NHÓM Ở SO (STAFF ORDER)</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#1D4ED8', marginTop: '2px' }}>
              {totalSoGroups} <span style={{ fontSize: '11px', fontWeight: 500 }}>nhóm món</span>
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 600 }}>ĐÃ ĐƯA LÊN CO (TABLET KHÁCH)</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {existingCoGroups} <span style={{ fontSize: '11px', fontWeight: 500 }}>nhóm hiển thị</span>
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: missingCoGroups > 0 ? '#FFFBEB' : '#F3F4F6', border: `1px solid ${missingCoGroups > 0 ? '#FDE68A' : '#E5E7EB'}` }}>
            <div style={{ fontSize: '11px', color: missingCoGroups > 0 ? '#92400E' : '#6B7280', fontWeight: 600 }}>CHƯA ĐƯỢC ĐƯA LÊN CO</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: missingCoGroups > 0 ? '#D97706' : '#6B7280', marginTop: '2px' }}>
              {missingCoGroups} <span style={{ fontSize: '11px', fontWeight: 500 }}>nhóm còn thiếu</span>
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF' }}>
            <div style={{ fontSize: '11px', color: '#6B21A8', fontWeight: 600 }}>MÃ NHÓM TRÊN CO / FILE 2</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#7E22CE', marginTop: '2px' }}>
              {detail?.co_group_codes.length || 0} <span style={{ fontSize: '11px', fontWeight: 500 }}>mã hiển thị</span>
            </div>
          </div>
        </div>

        {/* KHU VỰC THÊM TAY MÃ NHÓM (MANUAL ADD) */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: '#F8FAFC',
            border: '1px dashed #CBD5E1',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '170px' }}>
            <Plus size={14} color="#059669" />
            Thêm mã nhóm bằng tay:
          </div>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="VD: KK013BFExtra, KK005BF20 (có thể dán nhiều mã cách nhau bằng dấu phẩy)..."
              style={{ fontSize: '12px' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddManualCodes();
                }
              }}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddManualCodes}
            disabled={!manualInput.trim() || isSyncing}
            isLoading={isSyncing}
            leftIcon={<Plus size={13} />}
            style={{ fontSize: '11.5px', backgroundColor: '#0284C7', borderColor: '#0284C7' }}
          >
            Thêm Vào CO
          </Button>
        </div>

        {/* CÁC MÃ NHÓM NGOÀI SO (EXTRA / MANUAL CODES TRÊN CO / FILE 2) */}
        {detail && detail.extra_co_groups.length > 0 && (
          <div style={{ padding: '8px 12px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FDE68A', fontSize: '11.5px' }}>
            <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} color="#D97706" />
              Các mã nhóm đặc biệt đang có trên CO / File 2 (không thuộc nhóm chuẩn SO):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {detail.extra_co_groups.map((ec) => (
                <span
                  key={ec}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '11px',
                    color: '#B45309',
                    backgroundColor: '#FFFBEB',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #FCD34D'
                  }}
                >
                  {ec}
                  <button
                    type="button"
                    onClick={() => handleSingleGroupAction(ec, 'REMOVE')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#EF4444', display: 'flex', alignItems: 'center' }}
                    title={`Gỡ mã "${ec}" khỏi CO`}
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* THANH TÌM KIẾM & BỘ LỌC */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={selectableGroups.length === 0}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '5px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: selectableGroups.length > 0 ? 'pointer' : 'not-allowed',
                color: 'var(--text-primary)'
              }}
            >
              {isAllSelectableChecked ? <CheckSquare size={13} color="#059669" /> : <Square size={13} />}
              {isAllSelectableChecked ? 'Bỏ chọn tất cả' : `Chọn tất cả nhóm chưa lên CO (${selectableGroups.length})`}
            </button>

            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Đã tích: <strong>{selectedGroupCodes.size}</strong> nhóm
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Bộ lọc trạng thái */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                padding: '4px 8px',
                borderRadius: '5px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '11.5px'
              }}
            >
              <option value="ALL">Tất cả nhóm ({totalSoGroups})</option>
              <option value="MISSING">Chưa có trên CO ({missingCoGroups})</option>
              <option value="EXISTING">Đã có trên CO ({existingCoGroups})</option>
            </select>

            {/* Tìm kiếm */}
            <div style={{ position: 'relative', width: '200px' }}>
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Tìm mã hoặc tên nhóm..."
                style={{
                  width: '100%',
                  padding: '4px 8px 4px 26px',
                  borderRadius: '5px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px'
                }}
              />
              <Search size={12} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '7px' }} />
            </div>
          </div>
        </div>

        {/* BẢNG ĐỐI SOÁT NHÓM MÓN */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <div style={{ maxHeight: '42vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 2 }}>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllSelectableChecked}
                      onChange={toggleSelectAll}
                      disabled={selectableGroups.length === 0}
                      style={{ cursor: 'pointer', accentColor: '#059669' }}
                    />
                  </th>
                  <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '8px 12px', width: '170px' }}>Mã Nhóm (Group Code)</th>
                  <th style={{ padding: '8px 12px' }}>Tên Nhóm Món (SO)</th>
                  <th style={{ padding: '8px 10px', width: '90px', textAlign: 'center' }}>Phân Loại</th>
                  <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Số Món</th>
                  <th style={{ padding: '8px 12px', width: '140px', textAlign: 'center' }}>Trạng Thái Trên CO</th>
                  {detail?.file2_available && (
                    <th style={{ padding: '8px 12px', width: '130px', textAlign: 'center' }}>File 2 (Excel)</th>
                  )}
                  <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={detail?.file2_available ? 9 : 8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={18} className="spin" style={{ margin: '0 auto 6px' }} />
                      Đang đối soát danh sách nhóm món...
                    </td>
                  </tr>
                ) : errorMsg ? (
                  <tr>
                    <td colSpan={detail?.file2_available ? 9 : 8} style={{ padding: '20px', textAlign: 'center', color: '#DC2626' }}>
                      {errorMsg}
                    </td>
                  </tr>
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={detail?.file2_available ? 9 : 8} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Không có nhóm món nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((g, idx) => {
                    const isSelected = selectedGroupCodes.has(g.code);
                    return (
                      <tr
                        key={g.code}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--color-primary-subtle)' : (!g.is_co ? '#FFFDF5' : 'transparent'),
                          transition: 'background-color 0.1s ease'
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectGroup(g.code)}
                            style={{ cursor: 'pointer', accentColor: '#059669' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {g.code}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {g.name}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {g.level === 0 ? (
                            <Badge variant="info">Đồ uống (0)</Badge>
                          ) : (
                            <Badge variant="success">Món ăn (-1)</Badge>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#2563EB' }}>
                          {g.dish_count}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {g.is_co ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px', border: '1px solid #A7F3D0' }}>
                              <Check size={11} /> Đã có trên CO
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#D97706', backgroundColor: '#FFFBEB', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '11px', border: '1px solid #FCD34D' }}>
                              <AlertTriangle size={11} /> Chưa có trên CO
                            </span>
                          )}
                        </td>

                        {detail?.file2_available && (
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {g.in_file2 ? (
                              <span style={{ color: '#059669', fontWeight: 600, fontSize: '11px' }}>
                                ✓ Có trong File 2
                              </span>
                            ) : (
                              <span style={{ color: '#B45309', fontWeight: 600, fontSize: '11px' }}>
                                ⚠️ Chưa có File 2
                              </span>
                            )}
                          </td>
                        )}

                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {!g.is_co ? (
                            <button
                              type="button"
                              onClick={() => handleSingleGroupAction(g.code, 'ADD')}
                              disabled={isSyncing}
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                color: '#B45309',
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #F59E0B',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Đưa nhóm này lên CO ngay"
                            >
                              <Zap size={11} color="#D97706" />
                              + Đưa Lên CO
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSingleGroupAction(g.code, 'REMOVE')}
                              disabled={isSyncing}
                              style={{
                                fontSize: '10px',
                                color: '#6B7280',
                                backgroundColor: '#F3F4F6',
                                border: '1px solid #D1D5DB',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                cursor: 'pointer'
                              }}
                              title="Gỡ nhóm này khỏi CO"
                            >
                              Gỡ khỏi CO
                            </button>
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
  );
};
