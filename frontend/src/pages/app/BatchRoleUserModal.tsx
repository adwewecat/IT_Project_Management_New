import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Power,
  X,
  Play,
  CheckSquare,
  Square,
  ClipboardList
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RestaurantItem } from '../../types/restaurant';
import {
  mongoService,
  BatchRoleUserActionResponse,
  BatchRoleUserRestaurantResult
} from '../../services/mongoService';

export interface BatchRoleUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurants: RestaurantItem[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  defaultParamCode?: string;
  selectedRestaurant?: RestaurantItem | null;
}

export const BatchRoleUserModal: React.FC<BatchRoleUserModalProps> = ({
  isOpen,
  onClose,
  restaurants,
  showToast,
  defaultParamCode = 'ROLE_SETUP_SHOW_HIDE_ITEM',
  selectedRestaurant
}) => {
  // Tham số cấu hình
  const [paramCode, setParamCode] = useState<string>(defaultParamCode);
  const isShowHide = paramCode === 'ROLE_SETUP_SHOW_HIDE_ITEM';

  React.useEffect(() => {
    if (defaultParamCode && isOpen) {
      setParamCode(defaultParamCode);
    }
  }, [defaultParamCode, isOpen]);

  // Hành động trạng thái (status)
  const [statusAction, setStatusAction] = useState<'ENABLE' | 'DISABLE' | 'KEEP'>('ENABLE');

  // Hành động danh sách user
  const [userAction, setUserAction] = useState<'NONE' | 'APPEND' | 'REPLACE' | 'REMOVE'>('NONE');
  const [inputUserCodesText, setInputUserCodesText] = useState<string>('');

  // Bộ lọc nhà hàng
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON' | 'NEW' | 'SELECTED'>('ALL');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Trạng thái thực thi
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<BatchRoleUserActionResponse | null>(null);
  const [resultsMap, setResultsMap] = useState<Record<number, BatchRoleUserRestaurantResult>>({});

  // Chỉ lấy nhà hàng ON / NEW
  const validRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const st = (r.trangthai || '').toUpperCase().trim();
      return st !== 'OFF';
    });
  }, [restaurants]);

  // Khởi tạo chọn mặc định nếu có selectedRestaurant
  React.useEffect(() => {
    if (isOpen) {
      if (selectedRestaurant && validRestaurants.some((r) => r.id === selectedRestaurant.id)) {
        setSelectedIds((prev) => (prev.includes(selectedRestaurant.id) ? prev : [selectedRestaurant.id]));
      }
    }
  }, [isOpen, selectedRestaurant, validRestaurants]);

  // Danh sách nhà hàng sau khi lọc
  const filteredRestaurants = useMemo(() => {
    let list = validRestaurants;
    if (statusFilter === 'SELECTED') {
      list = list.filter((r) => selectedIds.includes(r.id));
    } else if (statusFilter !== 'ALL') {
      list = list.filter((r) => (r.trangthai || 'ON').toUpperCase().trim() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const sap = (r.sap || '').toLowerCase();
        const res = (r.res || '').toLowerCase();
        const ip = (r.ip || '').toLowerCase();
        return sap.includes(q) || res.includes(q) || ip.includes(q);
      });
    }

    if (selectedIds.length > 0) {
      list = [...list].sort((a, b) => {
        const aSel = selectedIds.includes(a.id) ? 1 : 0;
        const bSel = selectedIds.includes(b.id) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel;
        return (a.sap || '').localeCompare(b.sap || '');
      });
    }

    return list;
  }, [validRestaurants, statusFilter, searchQuery, selectedIds]);

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredRestaurants.map((r) => r.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleSelectAllRestaurants = () => {
    setSelectedIds(validRestaurants.map((r) => r.id));
    showToast(`Đã chọn toàn bộ ${validRestaurants.length} nhà hàng!`, 'info');
  };

  // Dán danh sách mã SAP nhà hàng để chọn hàng loạt
  const [pastedSapText, setPastedSapText] = useState<string>('');
  const [showPasteBox, setShowPasteBox] = useState<boolean>(false);

  // Phân tích mã SAP đã dán
  const { matchedRestaurants, unmatchedCodes, parsedCodes } = useMemo(() => {
    if (!pastedSapText.trim()) {
      return { matchedRestaurants: [], unmatchedCodes: [], parsedCodes: [] };
    }
    const rawTokens = pastedSapText
      .split(/[\s,;\n\t]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const uniqueTokens = Array.from(new Set(rawTokens));
    const matched: RestaurantItem[] = [];
    const unmatched: string[] = [];

    for (const token of uniqueTokens) {
      const tokenLower = token.toLowerCase();
      const tokenNum = parseInt(token, 10);

      const found = validRestaurants.find((r) => {
        const sap = (r.sap || '').trim().toLowerCase();
        const rk7 = (r.rk7 || '').trim().toLowerCase();
        const res = (r.res || '').trim().toLowerCase();
        if (sap === tokenLower || rk7 === tokenLower || res === tokenLower) return true;
        if (!isNaN(tokenNum) && !isNaN(parseInt(sap, 10))) {
          if (parseInt(sap, 10) === tokenNum) return true;
        }
        return false;
      });

      if (found) {
        if (!matched.some((m) => m.id === found.id)) {
          matched.push(found);
        }
      } else {
        unmatched.push(token);
      }
    }

    return {
      matchedRestaurants: matched,
      unmatchedCodes: unmatched,
      parsedCodes: uniqueTokens
    };
  }, [pastedSapText, validRestaurants]);

  const handleApplyPastedSaps = (replace: boolean = true) => {
    if (matchedRestaurants.length === 0) {
      showToast('Không tìm thấy nhà hàng nào tương ứng từ danh sách mã đã nhập!', 'error');
      return;
    }
    const targetIds = matchedRestaurants.map((r) => r.id);
    if (replace) {
      setSelectedIds(targetIds);
      if (unmatchedCodes.length > 0) {
        showToast(`Đã chọn ${matchedRestaurants.length} nhà hàng hợp lệ (${unmatchedCodes.length} mã không khớp)!`, 'info');
      } else {
        showToast(`Đã chọn toàn bộ ${matchedRestaurants.length} nhà hàng từ mã SAP!`, 'success');
      }
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...targetIds])));
      if (unmatchedCodes.length > 0) {
        showToast(`Đã cộng dồn ${matchedRestaurants.length} nhà hàng vào danh sách chọn (${unmatchedCodes.length} mã không khớp)!`, 'info');
      } else {
        showToast(`Đã cộng dồn ${matchedRestaurants.length} nhà hàng vào danh sách chọn!`, 'success');
      }
    }
  };

  // Phân tích danh sách mã user từ textarea
  const parsedUserCodes = useMemo(() => {
    if (!inputUserCodesText.trim()) return [];
    const tokens = inputUserCodesText
      .split(/[\s,;\n]+/)
      .map((t) => t.trim())
      .filter((t) => t && t !== '0');
    return Array.from(new Set(tokens));
  }, [inputUserCodesText]);

  // Thực thi
  const handleExecuteBatch = async () => {
    if (selectedIds.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 nhà hàng để thực thi!', 'error');
      return;
    }

    if (userAction !== 'NONE' && parsedUserCodes.length === 0) {
      showToast('Bạn đã chọn hành động user nhưng chưa nhập danh sách mã nhân viên!', 'error');
      return;
    }

    const actionText =
      statusAction === 'ENABLE'
        ? 'BẬT kiểm tra phân quyền (status = 1)'
        : statusAction === 'DISABLE'
        ? 'TẮT kiểm tra phân quyền (status = 0)'
        : 'GIỮ NGUYÊN trạng thái status';

    const userText =
      userAction === 'APPEND'
        ? `Thêm ${parsedUserCodes.length} mã user vào danh sách hiện tại`
        : userAction === 'REPLACE'
        ? `Ghi đè danh sách quyền bằng ${parsedUserCodes.length} mã user`
        : userAction === 'REMOVE'
        ? `Gỡ ${parsedUserCodes.length} mã user khỏi quyền`
        : 'Không thay đổi danh sách user';

    const confirmMsg = `Bạn có chắc chắn muốn thực thi HÀNG LOẠT cho ${selectedIds.length} nhà hàng?\n\n- Tham số: ${paramCode}\n- Thao tác Status: ${actionText}\n- Thao tác User: ${userText}\n${
      parsedUserCodes.length > 0 ? `- Mã user: ${parsedUserCodes.join(', ')}\n` : ''
    }\nHành động này sẽ cập nhật trực tiếp vào MongoDB G_ORDER.APP_PARAM của các nhà hàng đã chọn.`;

    if (!window.confirm(confirmMsg)) return;

    setIsExecuting(true);
    showToast(`⚡ Đang thực thi cấu hình phân quyền cho ${selectedIds.length} nhà hàng...`, 'info');

    try {
      const res = await mongoService.executeBatchRoleUserAction({
        restaurant_ids: selectedIds,
        param_code: paramCode,
        status_action: statusAction,
        user_action: userAction,
        user_codes: parsedUserCodes
      });

      setExecutionResult(res);
      const nextMap: Record<number, BatchRoleUserRestaurantResult> = {};
      for (const item of res.items) {
        nextMap[item.restaurant_id] = item;
      }
      setResultsMap(nextMap);

      showToast(
        `Hoàn tất thực thi ${res.total_processed} nhà hàng: ${res.success_count} thành công, ${res.failed_count} lỗi/offline!`,
        res.success_count > 0 ? 'success' : 'error'
      );
    } catch (err: any) {
      console.error('Lỗi khi thực thi phân quyền hàng loạt:', err);
      showToast('Lỗi thực thi hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isShowHide
          ? '⚡ Cấu Hình Phân Quyền User Ẩn / Hiện Món Hàng Loạt (Nhiều Nhà Hàng)'
          : '⚡ Cấu Hình Phân Quyền User KDS Hàng Loạt (Nhiều Nhà Hàng)'
      }
      maxWidth="1100px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Metric Cards khi vừa chạy xong */}
        {executionResult && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Tổng Nhà Hàng Xử Lý
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {executionResult.total_processed}
                  </div>
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="#4B5563" />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>
                    Thành Công
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#065F46', marginTop: '2px' }}>
                    {executionResult.success_count}
                  </div>
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color="#059669" />
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase' }}>
                    Offline / Lỗi
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#991B1B', marginTop: '2px' }}>
                    {executionResult.failed_count}
                  </div>
                </div>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="#DC2626" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Khối Thiết Lập Hành Động Hàng Loạt */}
        <Card>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: isShowHide ? '#FEF3C7' : '#EFF6FF',
                    border: isShowHide ? '1px solid #FCD34D' : '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isShowHide ? '#D97706' : '#2563EB'
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    1. Thiết Lập Thao Tác Hàng Loạt
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Chọn trạng thái Bật/Tắt và cách xử lý danh sách mã nhân viên được cấp quyền
                  </p>
                </div>
              </div>

              {/* Lựa chọn tham số cấu hình */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', padding: '4px 8px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Cấu hình cho:</span>
                <select
                  value={paramCode}
                  onChange={(e) => setParamCode(e.target.value)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ROLE_SETUP_SHOW_HIDE_ITEM">4. Quyền Ẩn/Hiện Món (ROLE_SETUP_SHOW_HIDE_ITEM)</option>
                  <option value="ROLE_SETUP_CONFIG_COOKING">3. Quyền Bếp KDS (ROLE_SETUP_CONFIG_COOKING)</option>
                </select>
              </div>
            </div>

            {/* Grid 2 cột: Cột 1 = Status, Cột 2 = User action */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
              {/* Thao tác trạng thái Status */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  A. Trạng thái kiểm tra quyền (status):
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setStatusAction('ENABLE')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: statusAction === 'ENABLE' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: statusAction === 'ENABLE' ? '#059669' : '#FFFFFF',
                      color: statusAction === 'ENABLE' ? '#FFFFFF' : '#334155',
                      border: statusAction === 'ENABLE' ? '1.5px solid #047857' : '1px solid #CBD5E1',
                      boxShadow: statusAction === 'ENABLE' ? '0 2px 4px rgba(5,150,105,0.2)' : 'none'
                    }}
                  >
                    <Power size={14} />
                    <span>BẬT (status: 1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusAction('DISABLE')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: statusAction === 'DISABLE' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: statusAction === 'DISABLE' ? '#DC2626' : '#FFFFFF',
                      color: statusAction === 'DISABLE' ? '#FFFFFF' : '#334155',
                      border: statusAction === 'DISABLE' ? '1.5px solid #B91C1C' : '1px solid #CBD5E1',
                      boxShadow: statusAction === 'DISABLE' ? '0 2px 4px rgba(220,38,38,0.2)' : 'none'
                    }}
                  >
                    <Power size={14} />
                    <span>TẮT (status: 0)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusAction('KEEP')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: statusAction === 'KEEP' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: statusAction === 'KEEP' ? '#475569' : '#FFFFFF',
                      color: statusAction === 'KEEP' ? '#FFFFFF' : '#334155',
                      border: statusAction === 'KEEP' ? '1.5px solid #334155' : '1px solid #CBD5E1'
                    }}
                  >
                    <span>Giữ nguyên Status</span>
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>
                  {statusAction === 'ENABLE' && '💡 BẬT: Hệ thống sẽ bắt buộc nhân viên phải có mã trong danh sách mới thao tác được.'}
                  {statusAction === 'DISABLE' && '💡 TẮT: Bỏ qua kiểm tra quyền (mặc định tất cả nhân viên đều thao tác được).'}
                  {statusAction === 'KEEP' && '💡 Giữ nguyên: Không đổi cờ status của nhà hàng, chỉ áp dụng danh sách user.'}
                </div>
              </div>

              {/* Thao tác danh sách user */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                  B. Cập nhật mã nhân viên (value):
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setUserAction('NONE')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: userAction === 'NONE' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: userAction === 'NONE' ? '#2563EB' : '#FFFFFF',
                      color: userAction === 'NONE' ? '#FFFFFF' : '#334155',
                      border: userAction === 'NONE' ? '1.5px solid #1D4ED8' : '1px solid #CBD5E1'
                    }}
                  >
                    Không đổi User
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserAction('APPEND')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: userAction === 'APPEND' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: userAction === 'APPEND' ? '#059669' : '#FFFFFF',
                      color: userAction === 'APPEND' ? '#FFFFFF' : '#334155',
                      border: userAction === 'APPEND' ? '1.5px solid #047857' : '1px solid #CBD5E1'
                    }}
                  >
                    + Bổ sung User (Append)
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserAction('REPLACE')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: userAction === 'REPLACE' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: userAction === 'REPLACE' ? '#D97706' : '#FFFFFF',
                      color: userAction === 'REPLACE' ? '#FFFFFF' : '#334155',
                      border: userAction === 'REPLACE' ? '1.5px solid #B45309' : '1px solid #CBD5E1'
                    }}
                  >
                    Ghi đè (Replace)
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserAction('REMOVE')}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: userAction === 'REMOVE' ? 800 : 600,
                      cursor: 'pointer',
                      backgroundColor: userAction === 'REMOVE' ? '#DC2626' : '#FFFFFF',
                      color: userAction === 'REMOVE' ? '#FFFFFF' : '#334155',
                      border: userAction === 'REMOVE' ? '1.5px solid #B91C1C' : '1px solid #CBD5E1'
                    }}
                  >
                    - Xóa khỏi quyền
                  </button>
                </div>

                {userAction !== 'NONE' && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155' }}>
                        Nhập 1 user hoặc dán danh sách nhiều mã NV (phân tách bởi dấu phẩy, khoảng trắng hoặc dòng):
                      </span>
                      {parsedUserCodes.length > 0 && (
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                          ({parsedUserCodes.length} mã hợp lệ)
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="VD: 30001 (hoặc dán nhiều mã: 30001, 14373, 101, 102...)"
                      value={inputUserCodesText}
                      onChange={(e) => setInputUserCodesText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12.5px',
                        fontFamily: 'monospace',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                      {userAction === 'APPEND' && '💡 Bổ sung (Append): Thêm 1 hoặc nhiều mã user vào danh sách quyền (giữ nguyên danh sách các user cũ đang có của nhà hàng).'}
                      {userAction === 'REPLACE' && '⚠️ Ghi đè (Replace): Thay thế toàn bộ danh sách user cũ bằng danh sách user mới nhập.'}
                      {userAction === 'REMOVE' && '💡 Xóa khỏi quyền: Gỡ bỏ các mã user chỉ định ra khỏi danh sách quyền.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Nút Thực Thi Toàn Cục */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>
                Nhà hàng được chọn:{' '}
                <strong style={{ color: selectedIds.length > 0 ? '#059669' : '#DC2626', fontSize: '15px' }}>
                  {selectedIds.length}
                </strong>{' '}
                / {validRestaurants.length} nhà hàng
              </div>

              <Button
                size="md"
                style={{
                  backgroundColor: selectedIds.length === 0 ? '#94A3B8' : '#059669',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  boxShadow: selectedIds.length > 0 ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none',
                  padding: '10px 24px'
                }}
                disabled={selectedIds.length === 0 || isExecuting}
                isLoading={isExecuting}
                onClick={handleExecuteBatch}
                leftIcon={<Play size={16} />}
              >
                {isExecuting ? 'Đang Thực Thi Hàng Loạt...' : `🚀 Thực Thi Cấu Hình Hàng Loạt (${selectedIds.length} Nhà Hàng)`}
              </Button>
            </div>
          </div>
        </Card>

        {/* Khối Chọn Phạm Vi Nhà Hàng */}
        <Card>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="#059669" />
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  2. Chọn Danh Sách Nhà Hàng Áp Dụng
                </h4>
              </div>

              {/* Nút thao tác nhanh phạm vi áp dụng */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  style={{
                    backgroundColor: selectedIds.length === validRestaurants.length && validRestaurants.length > 0 ? '#059669' : '#F1F5F9',
                    color: selectedIds.length === validRestaurants.length && validRestaurants.length > 0 ? '#FFFFFF' : '#1E293B',
                    fontWeight: 700,
                    border: '1px solid #CBD5E1'
                  }}
                  onClick={handleSelectAllRestaurants}
                  leftIcon={<CheckSquare size={13} />}
                >
                  Chọn ALL Nhà Hàng ({validRestaurants.length})
                </Button>

                <Button
                  size="sm"
                  style={{
                    backgroundColor: showPasteBox ? '#EFF6FF' : '#F8FAFC',
                    borderColor: showPasteBox ? '#93C5FD' : '#CBD5E1',
                    color: showPasteBox ? '#1D4ED8' : '#334155',
                    fontWeight: 700
                  }}
                  variant="outline"
                  onClick={() => setShowPasteBox(!showPasteBox)}
                  leftIcon={<ClipboardList size={13} />}
                >
                  📋 Dán Hàng Loạt Mã SAP {showPasteBox ? '▲' : '▼'}
                </Button>

                {selectedIds.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeselectAll}
                    style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                    leftIcon={<Square size={13} />}
                  >
                    Bỏ chọn ({selectedIds.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Ô Dán Hàng Loạt Mã SAP Nhà Hàng */}
            {showPasteBox && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F0F9FF',
                  borderRadius: '8px',
                  border: '1.5px solid #BAE6FD',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0369A1' }}>
                      📋 Dán hàng loạt mã SAP của nhà hàng để chọn:
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      (Phân tách bằng dấu phẩy <code style={{ backgroundColor: '#E0F2FE', padding: '1px 4px', borderRadius: '3px' }}>,</code> hoặc xuống dòng <code style={{ backgroundColor: '#E0F2FE', padding: '1px 4px', borderRadius: '3px' }}>Enter</code>)
                    </span>
                  </div>
                  {parsedCodes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPastedSapText('')}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#DC2626',
                        fontSize: '11.5px',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Xóa trắng ô dán
                    </button>
                  )}
                </div>

                <textarea
                  rows={3}
                  placeholder="Dán các mã SAP tại đây... VD:&#10;1001, 1002, 1005&#10;1010&#10;1023, 1045..."
                  value={pastedSapText}
                  onChange={(e) => setPastedSapText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #7DD3FC',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    resize: 'vertical',
                    backgroundColor: '#FFFFFF',
                    lineHeight: '1.4'
                  }}
                />

                {/* Kết quả phân tích mã SAP */}
                {parsedCodes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: '#047857', fontWeight: 700 }}>
                          ✅ Đã tìm thấy: <strong>{matchedRestaurants.length}</strong> / {parsedCodes.length} nhà hàng hợp lệ
                        </span>
                        {unmatchedCodes.length > 0 && (
                          <span style={{ color: '#B91C1C', fontWeight: 700 }}>
                            ⚠️ Không tìm thấy: <strong>{unmatchedCodes.length}</strong> mã
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          size="sm"
                          style={{ backgroundColor: '#0284C7', color: '#fff', fontWeight: 700, fontSize: '12px' }}
                          disabled={matchedRestaurants.length === 0}
                          onClick={() => handleApplyPastedSaps(true)}
                        >
                          ✓ Chọn Riêng {matchedRestaurants.length} Nhà Hàng Này
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          style={{ borderColor: '#0284C7', color: '#0369A1', backgroundColor: '#FFFFFF', fontWeight: 700, fontSize: '12px' }}
                          disabled={matchedRestaurants.length === 0}
                          onClick={() => handleApplyPastedSaps(false)}
                        >
                          + Cộng Dồn Vào Danh Sách Đã Chọn
                        </Button>
                      </div>
                    </div>

                    {/* Danh sách các mã KHÔNG có nhà hàng tương ứng */}
                    {unmatchedCodes.length > 0 && (
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#FEF2F2',
                          borderRadius: '6px',
                          border: '1.5px solid #FCA5A5',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#B91C1C', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} color="#DC2626" />
                          <span>
                            Phát hiện {unmatchedCodes.length} mã SAP KHÔNG có nhà hàng tương ứng trong hệ thống:
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '90px', overflowY: 'auto' }}>
                          {unmatchedCodes.map((code, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontSize: '11.5px',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                border: '1px solid #F87171'
                              }}
                              title="Không tìm thấy nhà hàng nào có mã SAP này trong hệ thống"
                            >
                              {code} ✕
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: '11px', color: '#7F1D1D' }}>
                          💡 Ghi chú: Các mã không có nhà hàng tương ứng ở trên sẽ không được tích chọn. Bạn hãy kiểm tra lại xem có gõ sai mã không.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Toolbar Tìm kiếm & Lọc danh sách */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    placeholder="Tìm theo SAP, tên, IP..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#fff',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ON">Đang hoạt động (ON)</option>
                  <option value="NEW">Nhà hàng mới (NEW)</option>
                  <option value="SELECTED">Chỉ xem Đã Chọn ({selectedIds.length})</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllFiltered}
                  leftIcon={<CheckSquare size={13} />}
                >
                  Chọn tất cả đang hiển thị ({filteredRestaurants.length})
                </Button>
              </div>
            </div>

            {/* Bảng Danh Sách Nhà Hàng */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', width: '38px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredRestaurants.length > 0 && filteredRestaurants.every((r) => selectedIds.includes(r.id))}
                        onChange={handleSelectAllFiltered}
                      />
                    </th>
                    <th style={{ padding: '8px 10px', width: '75px' }}>Mã SAP</th>
                    <th style={{ padding: '8px 12px' }}>Tên Nhà Hàng</th>
                    <th style={{ padding: '8px 10px', width: '130px' }}>IP Nhà Hàng</th>
                    <th style={{ padding: '8px 10px', width: '85px', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ padding: '8px 12px', width: '260px' }}>Kết Quả Thực Thi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94A3B8' }}>
                        Không tìm thấy nhà hàng nào phù hợp
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurants.map((r) => {
                      const isSelected = selectedIds.includes(r.id);
                      const resItem = resultsMap[r.id];
                      return (
                        <tr
                          key={r.id}
                          onClick={() => toggleSelectOne(r.id)}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isSelected ? '#F0FDF4' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(r.id)}
                            />
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#0F172A' }}>
                            {r.sap || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {r.res}
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                            {r.ip || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <Badge variant={(r.trangthai || '').toUpperCase() === 'ON' ? 'success' : 'primary'}>
                              {r.trangthai || 'ON'}
                            </Badge>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {resItem ? (
                              resItem.status === 'SUCCESS' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} color="#059669" /> Thành công ({resItem.host}:27017)
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#475569' }}>
                                    {resItem.message}
                                  </span>
                                </div>
                              ) : resItem.status === 'SKIPPED' ? (
                                <span style={{ color: '#D97706', fontSize: '11.5px', fontWeight: 600 }}>
                                  ⚠️ {resItem.message}
                                </span>
                              ) : (
                                <span style={{ color: '#DC2626', fontSize: '11.5px', fontWeight: 600 }}>
                                  ❌ {resItem.message}
                                </span>
                              )
                            ) : (
                              <span style={{ color: '#94A3B8', fontSize: '12px' }}>Chưa thực thi</span>
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
        </Card>
      </div>
    </Modal>
  );
};
