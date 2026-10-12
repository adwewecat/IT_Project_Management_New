import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock,
  RefreshCw, Search, ShieldAlert, Play, Sliders, FileText,
  Calendar, Check, AlertCircle, Info, Mail, Moon, Copy,
  Server, Zap, Send, Shield, X, Plus, Settings,
  Eye, EyeOff, Database, User, ListChecks, Download,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Star, Unlock, Trash2
} from 'lucide-react';
import { jobService } from '../../services/jobService';
import {
  overnightDevicesService,
  OvernightDeviceItem
} from '../../services/overnightDevicesService';
import {
  ramLimitAuditService
} from '../../services/ramLimitAuditService';
import {
  RamLimitAuditItem,
  RamLimitBatchApplyResponse
} from '../../types/ramLimit';
import {
  JobItem, JobRunLog,
  JobUpdateScheduleRequest,
  RestaurantAuditItem,
  RestaurantAuditResult
} from '../../types/job';
import { ticketBatchService } from '../../services/ticketBatchService';
import {
  TicketBatchConfig, TicketBatchRunResult,
  TicketBatchHistory
} from '../../types/ticketBatch';
import { unassigned3cxService } from '../../services/unassigned3cxService';
import { UnassignedTicketItem } from '../../types/unassigned3cx';
import { mailMemoService, MailMemoStatusResponse, LocalAgentStatus } from '../../services/mailMemoService';
import {
  mongoMosquittoService,
  MongoMosquittoSummary
} from '../../services/mongoMosquittoService';
import { getRestaurants } from '../../services/restaurantService';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin, checkIsDungOrSuperAdmin } from '../../utils/authUtils';

// Helper: chuyển chuỗi tiếng Việt có dấu thành không dấu để tìm kiếm siêu mượt
const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// Helper kiểm tra 1 nhà hàng có thuộc diện loại trừ không
const isRestaurantExcluded = (item: RamLimitAuditItem, skipTchCheck: boolean, kws: string[]) => {
  const name = (item.restaurant_name || '').trim().toUpperCase();
  const sap = (item.sap_code || '').trim().toUpperCase();
  const rid = String(item.restaurant_id || '');

  // 0. Bỏ qua nếu mã SAP không phải 4 chữ số (loại bỏ 'Khong Phai NH', kho, xưởng...)
  if (!(/^\d{4}$/.test(sap))) {
    return true;
  }

  if (skipTchCheck) {
    if (name.startsWith('TCH') || sap.startsWith('TCH') || name.startsWith('THE COFFEE HOUSE') || name.startsWith('THECOFFEEHOUSE')) {
      return true;
    }
  }

  for (const kw of kws) {
    const k = kw.trim().toUpperCase();
    if (!k) continue;
    if (k === 'TCH' && skipTchCheck) continue;
    if (k === sap || k === rid || name.startsWith(k) || name.includes(k)) {
      return true;
    }
  }
  return false;
};

// Memoized Row Component để tránh re-render hàng trăm dòng khi người dùng tương tác với modal hoặc gõ tìm kiếm
interface RamAuditRowProps {
  item: RamLimitAuditItem;
  displayIndex: number;
  targetSqlGb: number;
  targetMongoGb: number;
  isExcluded: boolean;
  isFixing: boolean;
  isScanning?: boolean;
  onApplySingleRam: (restaurantId: number) => void;
  onOpenConfigRam: (item: RamLimitAuditItem) => void;
  onScanSingleRam: (restaurantId: number) => void;
}

const RamAuditRow: React.FC<RamAuditRowProps> = React.memo(({
  item,
  displayIndex,
  targetSqlGb,
  targetMongoGb,
  isExcluded,
  isFixing,
  isScanning,
  onApplySingleRam,
  onOpenConfigRam,
  onScanSingleRam,
}) => {
  const sqlOk = item.sql_is_limited_2gb ?? item.sql_is_limited_4gb;
  const effectiveSqlGb = item.custom_sql_gb ?? (item.target_sql_gb || targetSqlGb);
  const effectiveMongoGb = item.custom_mongo_gb ?? (item.target_mongo_gb || targetMongoGb);

  return (
    <tr
      style={{
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: displayIndex % 2 === 0 ? '#FFFFFF' : '#F9FAFB'
      }}
    >
      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)', borderRight: '1px solid #E5E7EB' }}>
        {displayIndex}
      </td>
      <td style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>
        <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
          <span>{item.sap_code ? `${item.sap_code} - ` : ''}{item.restaurant_name}</span>
          {item.has_custom_ram && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: '#EDE9FE',
                color: '#5B21B6',
                fontWeight: 700,
                border: '1px solid #C4B5FD',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title={`Nhà hàng này áp dụng cấu hình RAM riêng (SQL: ${effectiveSqlGb}GB, Mongo: ${effectiveMongoGb}GB) và được tự động loại trừ khi Fix Hàng Loạt`}
            >
              ⭐ RAM Riêng ({effectiveSqlGb}G/{effectiveMongoGb}G)
            </span>
          )}
          {isExcluded && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                fontWeight: 700,
                border: '1px solid #FCD34D',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px'
              }}
              title="Nhà hàng này thuộc diện loại trừ (TCH hoặc nằm trong danh sách loại trừ)"
            >
              🛡️ {((item.restaurant_name || '').toUpperCase().startsWith('TCH') || (item.sap_code || '').toUpperCase().startsWith('TCH')) ? 'TCH' : 'Loại trừ'}
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          Subnet: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{item.subnet || item.ip_gateway}</span>
        </div>
      </td>
      <td style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: sqlOk ? '#DEF7EC' : item.sql_connected ? '#FDE8E8' : '#F3F4F6',
              color: sqlOk ? '#03543F' : item.sql_connected ? '#9B1C1C' : '#6B7280',
              border: `1px solid ${sqlOk ? '#31C48D' : item.sql_connected ? '#F98080' : '#D1D5DB'}`
            }}
          >
            {sqlOk ? `ĐẠT (<= ${effectiveSqlGb}GB)` : item.sql_connected ? `CHƯA ĐẠT (> ${effectiveSqlGb}GB)` : 'MẤT KẾT NỐI'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.4 }}>
          {item.sql_status}
        </div>
      </td>
      <td style={{ padding: '10px 12px', borderRight: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: item.mongo_is_limited_6gb
                ? '#DEF7EC'
                : item.mongo_connected
                ? '#FEF08A'
                : (item.mongo_port_open ?? (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port')))
                ? '#E0F2FE'
                : '#FEE2E2',
              color: item.mongo_is_limited_6gb
                ? '#03543F'
                : item.mongo_connected
                ? '#854D0E'
                : (item.mongo_port_open ?? (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port')))
                ? '#0369A1'
                : '#991B1B',
              border: `1px solid ${
                item.mongo_is_limited_6gb
                  ? '#31C48D'
                  : item.mongo_connected
                  ? '#FACC15'
                  : (item.mongo_port_open ?? (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port')))
                  ? '#38BDF8'
                  : '#F87171'
              }`
            }}
          >
            {item.mongo_is_limited_6gb
              ? `ĐẠT (${effectiveMongoGb}GB)`
              : item.mongo_connected
              ? 'CHƯA ĐẠT'
              : (item.mongo_port_open ?? (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port')))
              ? `PORT ${item.mongo_ip ? item.mongo_ip.split('.').pop() : '27017'} MỞ`
              : 'CHƯA MỞ PORT'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.4 }}>
          {item.mongo_status}
        </div>
      </td>
      {/* Cột 5: Đánh Giá SQL */}
      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border-color)', width: '130px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: sqlOk ? '#DEF7EC' : item.sql_connected ? '#FDE8E8' : '#F3F4F6',
            color: sqlOk ? '#03543F' : item.sql_connected ? '#9B1C1C' : '#6B7280',
            border: `1px solid ${sqlOk ? '#31C48D' : item.sql_connected ? '#F98080' : '#D1D5DB'}`
          }}
        >
          {sqlOk ? `Đạt <= ${effectiveSqlGb}GB` : item.sql_connected ? 'Chưa đạt' : 'Mất kết nối'}
        </span>
      </td>

      {/* Cột 6: Đánh Giá MongoDB (Đặc biệt làm nổi bật CHƯA MỞ PORT) */}
      <td style={{ padding: '10px 12px', borderRight: '1px solid var(--border-color)', width: '160px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: !(item.mongo_port_open ?? (item.mongo_connected || (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port'))))
              ? '#FEE2E2'
              : item.mongo_is_limited_6gb
              ? '#DEF7EC'
              : item.mongo_connected
              ? '#FEF3C7'
              : '#E0F2FE',
            color: !(item.mongo_port_open ?? (item.mongo_connected || (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port'))))
              ? '#991B1B'
              : item.mongo_is_limited_6gb
              ? '#03543F'
              : item.mongo_connected
              ? '#92400E'
              : '#0369A1',
            border: `1px solid ${
              !(item.mongo_port_open ?? (item.mongo_connected || (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port'))))
                ? '#F87171'
                : item.mongo_is_limited_6gb
                ? '#31C48D'
                : item.mongo_connected
                ? '#FCD34D'
                : '#38BDF8'
            }`
          }}
        >
          {!(item.mongo_port_open ?? (item.mongo_connected || (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port'))))
            ? '❌ Chưa mở port IP'
            : item.mongo_is_limited_6gb
            ? `✅ Đạt ${targetMongoGb}GB`
            : item.mongo_connected
            ? `⚠️ Chưa đạt ${targetMongoGb}GB`
            : `⚠️ Port mở (Lỗi lệnh)`}
        </span>
      </td>

      {/* Cột 7: Nút Xử Lý */}
      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {/* Nút Fix RAM */}
          <button
            type="button"
            onClick={() => onApplySingleRam(item.restaurant_id)}
            disabled={isFixing || isScanning}
            style={{
              padding: '3px 7px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '5px',
              border: '1px solid #F59E0B',
              backgroundColor: sqlOk && item.mongo_is_limited_6gb ? '#FFFBEA' : '#FEF3C7',
              color: '#B45309',
              cursor: isFixing || isScanning ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.15s ease'
            }}
            title={`Fix RAM theo chuẩn ${targetSqlGb}GB (SQL) & ${targetMongoGb}GB (Mongo)`}
          >
            {isFixing ? (
              <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Zap size={11} color="#D97706" />
            )}
            <span>{isFixing ? 'Đang fix...' : 'Fix RAM'}</span>
          </button>

          {/* Nút Config RAM */}
          <button
            type="button"
            onClick={() => onOpenConfigRam(item)}
            disabled={isFixing || isScanning}
            style={{
              padding: '3px 7px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '5px',
              border: '1px solid #818CF8',
              backgroundColor: '#EEF2FF',
              color: '#4338CA',
              cursor: isFixing || isScanning ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.15s ease'
            }}
            title="Tùy biến cấu hình mức RAM riêng cho nhà hàng này"
          >
            <Sliders size={11} color="#4F46E5" />
            <span>Config RAM</span>
          </button>

          {/* Nút Quét Lại */}
          <button
            type="button"
            onClick={() => onScanSingleRam(item.restaurant_id)}
            disabled={isFixing || isScanning}
            style={{
              padding: '3px 6px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '5px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              cursor: isFixing || isScanning ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              transition: 'all 0.15s ease'
            }}
            title="Quét kiểm tra lại chỉ riêng nhà hàng này"
          >
            <RefreshCw size={11} style={{ animation: isScanning ? 'spin 1s linear infinite' : 'none' }} color="#4B5563" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export const JobManagementPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = checkIsSuperAdmin(user);
  const isDungOrSuperAdmin = checkIsDungOrSuperAdmin(user);

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningJobIds, setRunningJobIds] = useState<Record<string, boolean>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Schedule Modal
  const [editingJob, setEditingJob] = useState<JobItem | null>(null);
  const [scheduleType, setScheduleType] = useState<string>('daily');
  const [scheduleTime, setScheduleTime] = useState<string>('06:00');
  const [scheduleTime2, setScheduleTime2] = useState<string>('');
  const [scheduleTime3, setScheduleTime3] = useState<string>('');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(30);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [customCron, setCustomCron] = useState<string>('');
  const [scheduleEmailRecipients, setScheduleEmailRecipients] = useState<string>('');
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Email Configuration Modal
  const [editingEmailJob, setEditingEmailJob] = useState<JobItem | null>(null);
  const [emailRecipientsInput, setEmailRecipientsInput] = useState<string>('');
  const [savingEmail, setSavingEmail] = useState<boolean>(false);

  // Logs Drawer / Modal
  const [logModalJob, setLogModalJob] = useState<JobItem | null>(null);
  const [logs, setLogs] = useState<JobRunLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [showAllLogsModal, setShowAllLogsModal] = useState<boolean>(false);

  // Overnight Devices Modal
  const [showOvernightModal, setShowOvernightModal] = useState<boolean>(false);
  const [overnightDate, setOvernightDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [overnightItems, setOvernightItems] = useState<OvernightDeviceItem[]>([]);
  const [overnightTotalDevs, setOvernightTotalDevs] = useState<number>(0);
  const [overnightSearch, setOvernightSearch] = useState<string>('');
  const [loadingOvernight, setLoadingOvernight] = useState<boolean>(false);
  const [isScanningOvernight, setIsScanningOvernight] = useState<boolean>(false);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedExcel, setCopiedExcel] = useState<boolean>(false);
  const [copiedItemKey, setCopiedItemKey] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState<boolean>(false);
  const [reportRecipients, setReportRecipients] = useState<string>('it.helpdesk@ggg.com.vn, it.support@ggg.com.vn');

  const fetchOvernightData = async (targetDate?: string) => {
    setLoadingOvernight(true);
    try {
      const [dates, data] = await Promise.all([
        overnightDevicesService.getScanDates(),
        overnightDevicesService.getDevices(targetDate || overnightDate)
      ]);
      setAvailableDates(dates);
      setOvernightItems(data.items || []);
      setOvernightTotalDevs(data.total_devices || 0);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu thiết bị qua đêm:', e);
    } finally {
      setLoadingOvernight(false);
    }
  };

  const openOvernightModal = () => {
    setShowOvernightModal(true);
    fetchOvernightData();
  };

  const handleScanOvernightNow = async () => {
    setIsScanningOvernight(true);
    try {
      showToast('Bắt đầu quét thiết bị qua đêm toàn bộ nhà hàng...', 'info');
      const res = await overnightDevicesService.triggerScanNow();
      showToast(res.message || 'Quét thiết bị qua đêm hoàn tất!', 'success');
      await fetchOvernightData();
      jobService.getJobs().then(setJobs);
    } catch (err: any) {
      showToast('Lỗi khi kích hoạt quét thiết bị qua đêm: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsScanningOvernight(false);
    }
  };

  const handleCopyAllOvernight = () => {
    const lines = filteredOvernightItems.map(item => item.summary_line).filter(Boolean);
    if (lines.length === 0) {
      showToast('Không có dữ liệu để sao chép', 'info');
      return;
    }
    navigator.clipboard.writeText(lines.join('\n\n'));
    setCopiedAll(true);
    showToast(`Đã sao chép ${lines.length} dòng ghi chú nhà hàng vào Clipboard!`, 'success');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyExcelTable = () => {
    if (filteredOvernightItems.length === 0) {
      showToast('Không có dữ liệu để sao chép', 'info');
      return;
    }
    const header = 'Tên Nhà Hàng\tThiết bị để qua đêm kds\tThiết bị để qua đêm pc/11/41\temail';
    const rows = filteredOvernightItems.map(it => {
      const rest = it.col_restaurant || `${it.sap_code ? it.sap_code + ' ' : ''}${it.restaurant_name} ${it.subnet ? it.subnet + 'x' : ''}`.trim();

      let kds = it.col_kds || (it.kds_items ? it.kds_items.join('\n') : '');
      let posPc = it.col_pos_pc || (it.pos_pc_items ? it.pos_pc_items.join('\n') : '');
      if (!kds && !posPc && (it.device_items || it.col_devices || it.overnight_devices)) {
        const raw = it.device_items || (it.col_devices ? it.col_devices.split('\n') : (it.overnight_devices ? it.overnight_devices.split(',') : []));
        const kList = raw.map((d: string) => d.trim()).filter((d: string) => d.toLowerCase().includes('kds'));
        const pList = raw.map((d: string) => d.trim()).filter((d: string) => !d.toLowerCase().includes('kds') && d.length > 0);
        kds = kList.join('\n');
        posPc = pList.join('\n');
      }

      const kdsCell = kds.includes('\n') ? `"${kds}"` : kds;
      const posPcCell = posPc.includes('\n') ? `"${posPc}"` : posPc;
      const email = it.col_email || it.email || '';
      return `${rest}\t${kdsCell}\t${posPcCell}\t${email}`;
    });
    const tsv = [header, ...rows].join('\n');

    const htmlRows = filteredOvernightItems.map(it => {
      const rest = it.col_restaurant || `${it.sap_code ? it.sap_code + ' ' : ''}${it.restaurant_name} ${it.subnet ? it.subnet + 'x' : ''}`.trim();

      let kdsList = it.kds_items || [];
      if (kdsList.length === 0 && it.col_kds) {
        kdsList = it.col_kds.split('\n').filter(Boolean);
      }
      let posPcList = it.pos_pc_items || [];
      if (posPcList.length === 0 && it.col_pos_pc) {
        posPcList = it.col_pos_pc.split('\n').filter(Boolean);
      }
      if (kdsList.length === 0 && posPcList.length === 0 && (it.device_items || it.col_devices || it.overnight_devices)) {
        const raw = it.device_items || (it.col_devices ? it.col_devices.split('\n') : (it.overnight_devices ? it.overnight_devices.split(',') : []));
        kdsList = raw.map((d: string) => d.trim()).filter((d: string) => d.toLowerCase().includes('kds'));
        posPcList = raw.map((d: string) => d.trim()).filter((d: string) => !d.toLowerCase().includes('kds') && d.length > 0);
      }

      const kdsHtml = kdsList.length > 0 ? kdsList.join('<br/>') : '--';
      const posPcHtml = posPcList.length > 0 ? posPcList.join('<br/>') : '--';
      const email = it.col_email || it.email || '';
      return `<tr><td style="border:1px solid #BFBFBF;padding:8px 12px;font-weight:500;">${rest}</td><td style="border:1px solid #BFBFBF;padding:8px 12px;line-height:1.5;">${kdsHtml}</td><td style="border:1px solid #BFBFBF;padding:8px 12px;line-height:1.5;">${posPcHtml}</td><td style="border:1px solid #BFBFBF;padding:8px 12px;"><a href="mailto:${email}">${email}</a></td></tr>`;
    }).join('');
    const htmlTable = `<table style="border-collapse:collapse;font-family:Segoe UI,sans-serif;font-size:13px;width:100%;"><tr style="background-color:#D9E1F2;font-weight:bold;"><th style="border:1px solid #BFBFBF;padding:8px 12px;text-align:center;">Tên Nhà Hàng</th><th style="border:1px solid #BFBFBF;padding:8px 12px;text-align:center;">Thiết bị để qua đêm kds</th><th style="border:1px solid #BFBFBF;padding:8px 12px;text-align:center;">Thiết bị để qua đêm pc/11/41</th><th style="border:1px solid #BFBFBF;padding:8px 12px;text-align:center;">email</th></tr>${htmlRows}</table>`;

    try {
      const blobHtml = new Blob([htmlTable], { type: 'text/html' });
      const blobText = new Blob([tsv], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });
      navigator.clipboard.write([clipboardItem]).then(() => {
        setCopiedExcel(true);
        showToast('Đã sao chép dạng Bảng Excel (4 cột) vào Clipboard! Dán trực tiếp vào Excel hoặc Email.', 'success');
        setTimeout(() => setCopiedExcel(false), 2500);
      }).catch(() => {
        navigator.clipboard.writeText(tsv);
        setCopiedExcel(true);
        showToast('Đã sao chép dạng Bảng TSV vào Clipboard! Dán vào Excel để chia cột.', 'success');
        setTimeout(() => setCopiedExcel(false), 2500);
      });
    } catch {
      navigator.clipboard.writeText(tsv);
      setCopiedExcel(true);
      showToast('Đã sao chép dạng Bảng TSV vào Clipboard! Dán vào Excel để chia cột.', 'success');
      setTimeout(() => setCopiedExcel(false), 2500);
    }
  };

  const handleSendEmailReport = async () => {
    setIsSendingEmail(true);
    try {
      const recs = reportRecipients.split(',').map(r => r.trim()).filter(Boolean);
      const res = await overnightDevicesService.sendEmail(overnightDate, recs);
      showToast(res.message || 'Đã gửi email báo cáo dạng bảng thành công!', 'success');
      setShowEmailPrompt(false);
    } catch (err: any) {
      showToast('Lỗi khi gửi email báo cáo: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCopySingleOvernight = (line?: string, key?: string) => {
    if (!line) return;
    navigator.clipboard.writeText(line);
    if (key) setCopiedItemKey(key);
    setTimeout(() => setCopiedItemKey(null), 2000);
  };

  // ── TICKET BATCH (Ticket theo Danh Mục - Chỉ Dung & Super Admin) ──────────────
  const [showSsoConfigModal, setShowSsoConfigModal] = useState<boolean>(false);
  const [ssoConfigData, setSsoConfigData] = useState<TicketBatchConfig | null>(null);
  const [tempSsoUsername, setTempSsoUsername] = useState<string>('');
  const [tempSsoPassword, setTempSsoPassword] = useState<string>('');
  const [tempTicketEmail, setTempTicketEmail] = useState<string>('');
  const [showSsoPassword, setShowSsoPassword] = useState<boolean>(false);
  const [savingSsoConfig, setSavingSsoConfig] = useState<boolean>(false);

  const [showTicketListModal, setShowTicketListModal] = useState<boolean>(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [ticketHistory, setTicketHistory] = useState<TicketBatchHistory | null>(null);
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(new Set());
  const [isRunningTicketBatch, setIsRunningTicketBatch] = useState<boolean>(false);
  const [ticketBatchResult, setTicketBatchResult] = useState<TicketBatchRunResult | null>(null);
  const [showTicketResultModal, setShowTicketResultModal] = useState<boolean>(false);
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [selectedErrorDetail, setSelectedErrorDetail] = useState<{
    ticket_id: string;
    ticket_name: string;
    message: string;
    error_details: string;
    source_type?: string;
  } | null>(null);
  const [copiedErrorText, setCopiedErrorText] = useState<boolean>(false);

  const loadSsoConfig = useCallback(async () => {
    try {
      const cfg = await ticketBatchService.getConfig();
      setSsoConfigData(cfg);
      setTempSsoUsername(cfg.sso_username || '');
      setTempTicketEmail(cfg.email_recipients || '');
    } catch (_) {}
  }, []);

  const handleOpenSsoConfig = async () => {
    await loadSsoConfig();
    setTempSsoPassword('');
    setShowSsoPassword(false);
    setShowSsoConfigModal(true);
  };

  const handleSaveSsoConfig = async () => {
    if (!tempSsoUsername.trim()) {
      alert('Vui lòng nhập Username SSO.');
      return;
    }
    setSavingSsoConfig(true);
    try {
      await ticketBatchService.saveConfig({
        sso_username: tempSsoUsername.trim(),
        sso_password: tempSsoPassword.trim(),
        email_recipients: tempTicketEmail.trim(),
      });
      await loadSsoConfig();
      setShowSsoConfigModal(false);
      showToast('Đã lưu cấu hình SSO thành công!', 'success');
    } catch (err: any) {
      showToast('Lỗi lưu cấu hình SSO: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSsoConfig(false);
    }
  };

  const handleOpenTicketListModal = async () => {
    setShowTicketListModal(true);
    setIsLoadingHistory(true);
    setTicketSearch('');
    try {
      const hist = await ticketBatchService.getLatestHistory();
      setTicketHistory(hist);
      if (hist && hist.items && hist.items.length > 0) {
        // Mặc định chọn các vé chưa hoàn thành (chờ xử lý hoặc thất bại)
        const pendingOrFailed = hist.items
          .filter(it => it.execution_status !== 'success')
          .map(it => it.ticket_id);
        if (pendingOrFailed.length > 0) {
          setSelectedTicketIds(new Set(pendingOrFailed));
        } else {
          setSelectedTicketIds(new Set(hist.items.map(it => it.ticket_id)));
        }
      } else {
        setSelectedTicketIds(new Set());
      }
    } catch (err: any) {
      showToast('Lỗi tải lịch sử ticket: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleScanTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const result = await ticketBatchService.preview();
      const hist = await ticketBatchService.getLatestHistory();
      setTicketHistory(hist);
      if (hist && hist.items && hist.items.length > 0) {
        setSelectedTicketIds(new Set(hist.items.map(t => t.ticket_id)));
      } else if (result.tickets) {
        setSelectedTicketIds(new Set(result.tickets.map(t => t.ticket_id)));
      }
      showToast(`Quét thành công! Tìm thấy ${result.total_tickets} mục (${result.ticket_count || 0} 3CX, ${result.gprocess_count || 0} G-Process)`, 'success');
    } catch (err: any) {
      const rawDetail = err.response?.data?.detail;
      const rawMsg = err.message || '';
      let msg = rawDetail || rawMsg || 'Lỗi không xác định';
      if (
        rawMsg.toLowerCase().includes('timeout') ||
        rawMsg.toLowerCase().includes('econnaborted') ||
        (typeof rawDetail === 'string' && rawDetail.toLowerCase().includes('timeout')) ||
        err.code === 'ECONNABORTED' ||
        err.response?.status === 504
      ) {
        msg = 'kết nối 150s nhưng không thành công, có thể lỗi hệ thống, vui lòng check lại';
      }
      showToast('Lỗi quét danh sách: ' + msg, 'error');
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const handleRunTicketBatch = async () => {
    const currentItems = ticketHistory?.items || [];
    if (currentItems.length === 0 || selectedTicketIds.size === 0) {
      showToast('Vui lòng chọn ít nhất 1 mục để xử lý', 'info');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn đóng / xử lý ${selectedTicketIds.size} mục đã chọn? Thao tác này sẽ thực hiện trực tiếp trên GPMS!`)) return;
    setIsRunningTicketBatch(true);
    try {
      const result = await ticketBatchService.run({
        ticket_ids: Array.from(selectedTicketIds),
        all_tickets: currentItems.map(it => ({
          ticket_id: it.ticket_id,
          ticket_name: it.ticket_name,
          source_type: it.source_type,
          created_by: it.created_by,
          assignee: it.assignee,
          due_date: it.due_date,
          url: it.url,
          status: it.status,
        })),
        timesheet_data: ticketHistory?.timesheet_summary || {},
      });
      setTicketBatchResult(result);
      const updatedHist = await ticketBatchService.getLatestHistory();
      setTicketHistory(updatedHist);
      showToast(`Đã xử lý xong ${result.total_processed} mục. Thành công: ${result.success_count}, Thất bại: ${result.failed_count}`, result.failed_count > 0 ? 'info' : 'success');
    } catch (err: any) {
      showToast('Lỗi khi chạy xử lý: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsRunningTicketBatch(false);
    }
  };

  const handleCopyErrorLog = () => {
    if (!selectedErrorDetail) return;
    const content = `=== LỖI XỬ LÝ TICKET / G-PROCESS ===
Mã: #${selectedErrorDetail.ticket_id}
Tên: ${selectedErrorDetail.ticket_name}
Phân loại: ${selectedErrorDetail.source_type === 'GPROCESS' ? 'G-Process' : 'Ticket 3CX'}
Nguyên nhân: ${selectedErrorDetail.message}

=== TECHNICAL LOGS / TRACEBACK ===
${selectedErrorDetail.error_details || 'Không có chi tiết stack trace'}
`;
    navigator.clipboard.writeText(content);
    setCopiedErrorText(true);
    showToast('✓ Đã sao chép logs lỗi vào clipboard! Bạn có thể dán (Ctrl+V) cho AI phân tích.', 'success');
    setTimeout(() => setCopiedErrorText(false), 2000);
  };

  const filteredTickets = useMemo(() => {
    const list = ticketHistory?.items || [];
    if (!ticketSearch.trim()) return list;
    const q = ticketSearch.trim().toLowerCase();
    return list.filter(t =>
      (t.ticket_id || '').toLowerCase().includes(q) ||
      (t.ticket_name || '').toLowerCase().includes(q) ||
      (t.created_by || '').toLowerCase().includes(q) ||
      (t.assignee || '').toLowerCase().includes(q) ||
      (t.source_type || '').toLowerCase().includes(q) ||
      (t.execution_status || '').toLowerCase().includes(q) ||
      (t.execution_message || '').toLowerCase().includes(q)
    );
  }, [ticketHistory, ticketSearch]);

  // ── END TICKET BATCH ──────────────────────────────────────────────────────────

  // RAM Limit Audit Modal (Chỉ Dung & Super Admin)
  const [showRamAuditModal, setShowRamAuditModal] = useState<boolean>(false);
  const [ramAuditDate, setRamAuditDate] = useState<string>('');
  const [availableRamDates, setAvailableRamDates] = useState<string[]>([]);
  const [ramAuditItems, setRamAuditItems] = useState<RamLimitAuditItem[]>([]);
  const [ramAuditSearch, setRamAuditSearch] = useState<string>('');
  const [ramAuditFilter, setRamAuditFilter] = useState<string>('all');
  const [loadingRamAudit, setLoadingRamAudit] = useState<boolean>(false);
  const [isScanningRam, setIsScanningRam] = useState<boolean>(false);
  const [copiedRamExcel, setCopiedRamExcel] = useState<boolean>(false);

  // Target RAM & Connection configuration (Linh động cấu hình mức RAM & Port/User/Pass cho SQL & Mongo)
  const [targetSqlGb, setTargetSqlGb] = useState<number>(2.0);
  const [targetMongoGb, setTargetMongoGb] = useState<number>(6.0);
  const [sqlPort, setSqlPort] = useState<number>(1433);
  const [sqlUser, setSqlUser] = useState<string>('rk7');
  const [sqlPassword, setSqlPassword] = useState<string>('rk7');
  const [mongoPort, setMongoPort] = useState<number>(27017);

  const [showRamConfigModal, setShowRamConfigModal] = useState<boolean>(false);
  const [savingTargetConfig, setSavingTargetConfig] = useState<boolean>(false);
  const [tempSqlGb, setTempSqlGb] = useState<number>(2.0);
  const [tempMongoGb, setTempMongoGb] = useState<number>(6.0);
  const [tempSqlPort, setTempSqlPort] = useState<number>(1433);
  const [tempSqlUser, setTempSqlUser] = useState<string>('rk7');
  const [tempSqlPassword, setTempSqlPassword] = useState<string>('rk7');
  const [tempMongoPort, setTempMongoPort] = useState<number>(27017);
  const [showSqlPassword, setShowSqlPassword] = useState<boolean>(false);

  // Exclude configuration for RAM audit (Loại trừ TCH và nhà hàng đặc thù)
  const [skipTch, setSkipTch] = useState<boolean>(true);
  const [excludeKeywords, setExcludeKeywords] = useState<string[]>(['TCH']);
  const [showExcludeModal, setShowExcludeModal] = useState<boolean>(false);
  const [newExcludeKeywordInput, setNewExcludeKeywordInput] = useState<string>('');
  const [savingExcludeConfig, setSavingExcludeConfig] = useState<boolean>(false);
  const [hideExcludedInTable, setHideExcludedInTable] = useState<boolean>(true);
  const [batchRamSkipTch, setBatchRamSkipTch] = useState<boolean>(true);

  // Phân trang cho Modal kiểm tra RAM để bảng phản hồi tức thì, không bị đơ lag
  const [ramCurrentPage, setRamCurrentPage] = useState<number>(1);
  const [ramPageSize, setRamPageSize] = useState<number>(50);

  // Tự động chuyển về trang 1 khi thay đổi từ khóa tìm kiếm, bộ lọc hoặc ngày quét
  useEffect(() => {
    setRamCurrentPage(1);
  }, [ramAuditSearch, ramAuditFilter, hideExcludedInTable, ramAuditDate]);

  const fetchRamAuditData = async (targetDate?: string) => {
    setLoadingRamAudit(true);
    try {
      const [dates, data] = await Promise.all([
        ramLimitAuditService.getScanDates(),
        ramLimitAuditService.getAuditLogs(targetDate || ramAuditDate)
      ]);
      setAvailableRamDates(dates);
      setRamAuditItems(data.items || []);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu audit RAM:', e);
    } finally {
      setLoadingRamAudit(false);
    }
  };

  const loadTargetConfig = async () => {
    try {
      const cfg = await ramLimitAuditService.getTargetConfig();
      if (cfg) {
        if (cfg.sql_limit_gb) {
          setTargetSqlGb(cfg.sql_limit_gb);
          setTempSqlGb(cfg.sql_limit_gb);
        }
        if (cfg.mongo_limit_gb) {
          setTargetMongoGb(cfg.mongo_limit_gb);
          setTempMongoGb(cfg.mongo_limit_gb);
        }
        if (cfg.sql_port) {
          setSqlPort(cfg.sql_port);
          setTempSqlPort(cfg.sql_port);
        }
        if (cfg.sql_user) {
          setSqlUser(cfg.sql_user);
          setTempSqlUser(cfg.sql_user);
        }
        if (cfg.sql_password) {
          setSqlPassword(cfg.sql_password);
          setTempSqlPassword(cfg.sql_password);
        }
        if (cfg.mongo_port) {
          setMongoPort(cfg.mongo_port);
          setTempMongoPort(cfg.mongo_port);
        }
      }
    } catch (e) {
      console.error('Lỗi khi tải cấu hình RAM mục tiêu:', e);
    }
  };

  const handleSaveTargetConfig = async (
    newSql: number,
    newMongo: number,
    newSqlPort: number,
    newSqlUser: string,
    newSqlPass: string,
    newMongoPort: number
  ) => {
    setSavingTargetConfig(true);
    try {
      const res = await ramLimitAuditService.saveTargetConfig({
        sql_limit_gb: newSql,
        mongo_limit_gb: newMongo,
        sql_port: newSqlPort,
        sql_user: newSqlUser,
        sql_password: newSqlPass,
        mongo_port: newMongoPort
      });
      setTargetSqlGb(res.config.sql_limit_gb);
      setTargetMongoGb(res.config.mongo_limit_gb);
      setTempSqlGb(res.config.sql_limit_gb);
      setTempMongoGb(res.config.mongo_limit_gb);
      if (res.config.sql_port) {
        setSqlPort(res.config.sql_port);
        setTempSqlPort(res.config.sql_port);
      }
      if (res.config.sql_user) {
        setSqlUser(res.config.sql_user);
        setTempSqlUser(res.config.sql_user);
      }
      if (res.config.sql_password) {
        setSqlPassword(res.config.sql_password);
        setTempSqlPassword(res.config.sql_password);
      }
      if (res.config.mongo_port) {
        setMongoPort(res.config.mongo_port);
        setTempMongoPort(res.config.mongo_port);
      }
      showToast(res.message || `Đã lưu cấu hình mức RAM và kết nối SQL/Mongo thành công!`, 'success');
      setShowRamConfigModal(false);
      await fetchRamAuditData();
    } catch (err: any) {
      showToast('Lỗi khi lưu cấu hình: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingTargetConfig(false);
    }
  };

  const loadExcludeConfig = async () => {
    try {
      const cfg = await ramLimitAuditService.getExcludeConfig();
      if (cfg) {
        setSkipTch(cfg.skip_tch);
        setExcludeKeywords(cfg.exclude_keywords || ['TCH']);
        setBatchRamSkipTch(cfg.skip_tch);
      }
    } catch (e) {
      console.error('Lỗi khi tải cấu hình loại trừ:', e);
    }
  };

  const openRamAuditModal = () => {
    setShowRamAuditModal(true);
    loadTargetConfig();
    loadExcludeConfig();
    fetchRamAuditData();
  };

  const handleScanRamNow = async () => {
    setIsScanningRam(true);
    try {
      showToast(`Bắt đầu quét kiểm tra giới hạn RAM SQL (${targetSqlGb}GB) & Mongo (${targetMongoGb}GB) toàn bộ nhà hàng...`, 'info');
      const res = await ramLimitAuditService.triggerScanNow({
        skip_tch: skipTch,
        exclude_keywords: excludeKeywords,
        target_sql_gb: targetSqlGb,
        target_mongo_gb: targetMongoGb
      });
      showToast(res.message || 'Quét giới hạn RAM hoàn tất!', 'success');
      await fetchRamAuditData();
      jobService.getJobs().then(setJobs);
    } catch (err: any) {
      showToast('Lỗi khi quét giới hạn RAM: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsScanningRam(false);
    }
  };

  const handleSaveExcludeConfig = async () => {
    setSavingExcludeConfig(true);
    try {
      const res = await ramLimitAuditService.saveExcludeConfig({
        skip_tch: skipTch,
        exclude_keywords: excludeKeywords
      });
      setSkipTch(res.config.skip_tch);
      setExcludeKeywords(res.config.exclude_keywords);
      setBatchRamSkipTch(res.config.skip_tch);
      showToast(res.message || 'Đã lưu cấu hình danh sách loại trừ thành công!', 'success');
      setShowExcludeModal(false);
    } catch (err: any) {
      showToast('Lỗi khi lưu cấu hình loại trừ: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingExcludeConfig(false);
    }
  };

  const handleAddExcludeKeyword = () => {
    const raw = newExcludeKeywordInput.trim();
    if (!raw) return;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const updated = Array.from(new Set([...excludeKeywords, ...parts]));
    setExcludeKeywords(updated);
    setNewExcludeKeywordInput('');
  };

  const handleRemoveExcludeKeyword = (kwToRemove: string) => {
    setExcludeKeywords(prev => prev.filter(k => k !== kwToRemove));
  };

  const excludedCount = useMemo(() => {
    return ramAuditItems.filter(item => isRestaurantExcluded(item, skipTch, excludeKeywords)).length;
  }, [ramAuditItems, skipTch, excludeKeywords]);

  const mongoClosedCount = useMemo(() => {
    return ramAuditItems.filter(item => {
      const isEx = isRestaurantExcluded(item, skipTch, excludeKeywords);
      if (hideExcludedInTable && isEx) return false;
      const isPortOpen = item.mongo_port_open ?? (
        item.mongo_connected || 
        (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port'))
      );
      return !isPortOpen;
    }).length;
  }, [ramAuditItems, skipTch, excludeKeywords, hideExcludedInTable]);

  const mongoNotLimitedCount = useMemo(() => {
    return ramAuditItems.filter(item => {
      const isEx = isRestaurantExcluded(item, skipTch, excludeKeywords);
      if (hideExcludedInTable && isEx) return false;
      return item.mongo_connected && !item.mongo_is_limited_6gb;
    }).length;
  }, [ramAuditItems, skipTch, excludeKeywords, hideExcludedInTable]);

  const mongoOkCount = useMemo(() => {
    return ramAuditItems.filter(item => {
      const isEx = isRestaurantExcluded(item, skipTch, excludeKeywords);
      if (hideExcludedInTable && isEx) return false;
      return Boolean(item.mongo_is_limited_6gb);
    }).length;
  }, [ramAuditItems, skipTch, excludeKeywords, hideExcludedInTable]);

  const sqlNotLimitedCount = useMemo(() => {
    return ramAuditItems.filter(item => {
      const isEx = isRestaurantExcluded(item, skipTch, excludeKeywords);
      if (hideExcludedInTable && isEx) return false;
      const sqlOk = item.sql_is_limited_2gb ?? item.sql_is_limited_4gb;
      return item.sql_connected && !sqlOk;
    }).length;
  }, [ramAuditItems, skipTch, excludeKeywords, hideExcludedInTable]);

  const customRamCount = useMemo(() => {
    return ramAuditItems.filter(item => {
      const isEx = isRestaurantExcluded(item, skipTch, excludeKeywords);
      if (hideExcludedInTable && isEx) return false;
      return Boolean(item.has_custom_ram);
    }).length;
  }, [ramAuditItems, skipTch, excludeKeywords, hideExcludedInTable]);

  const filteredRamItems = useMemo(() => {
    const qRaw = ramAuditSearch.trim();
    const qNorm = qRaw ? removeVietnameseTones(qRaw) : '';
    const qLower = qRaw.toLowerCase();

    return ramAuditItems.filter((item) => {
      const isEx = isRestaurantExcluded(item, skipTch, excludeKeywords);

      // Nếu filter là chỉ xem loại trừ
      if (ramAuditFilter === 'only_excluded') {
        if (!isEx) return false;
      } else if (hideExcludedInTable && isEx) {
        // Tùy chọn bỏ qua/ẩn các nhà hàng loại trừ khỏi danh sách
        return false;
      }

      if (qRaw) {
        const matchSap = (item.sap_code || '').toLowerCase().includes(qLower);
        const matchName = removeVietnameseTones(item.restaurant_name || '').includes(qNorm) || (item.restaurant_name || '').toLowerCase().includes(qLower);
        const matchSubnet = (item.subnet || '').toLowerCase().includes(qLower);
        const matchIp = (item.ip_gateway || '').toLowerCase().includes(qLower);
        const matchSql = (item.sql_status || '').toLowerCase().includes(qLower);
        const matchMongo = (item.mongo_status || '').toLowerCase().includes(qLower);
        if (!matchSap && !matchName && !matchSubnet && !matchIp && !matchSql && !matchMongo) return false;
      }
      const sqlOk = item.sql_is_limited_2gb ?? item.sql_is_limited_4gb;
      if (ramAuditFilter === 'custom_only') {
        return Boolean(item.has_custom_ram);
      }
      if (ramAuditFilter === 'not_limited') {
        return !sqlOk || !item.mongo_is_limited_6gb;
      }
      if (ramAuditFilter === 'sql_not_limited') {
        return item.sql_connected && !sqlOk;
      }
      if (ramAuditFilter === 'sql_offline') {
        return !item.sql_connected;
      }
      if (ramAuditFilter === 'mongo_closed') {
        const isPortOpen = item.mongo_port_open ?? (
          item.mongo_connected || 
          (Boolean(item.mongo_ip) && !(item.mongo_status || '').includes('chưa cấu hình mở port'))
        );
        return !isPortOpen;
      }
      if (ramAuditFilter === 'mongo_not_limited') {
        return item.mongo_connected && !item.mongo_is_limited_6gb;
      }
      if (ramAuditFilter === 'mongo_ok') {
        return Boolean(item.mongo_is_limited_6gb);
      }
      if (ramAuditFilter === 'both_ok') {
        return sqlOk && item.mongo_is_limited_6gb;
      }
      return true;
    });
  }, [ramAuditItems, ramAuditSearch, ramAuditFilter, skipTch, excludeKeywords, hideExcludedInTable]);

  const totalRamPages = useMemo(() => {
    if (ramPageSize === -1 || ramPageSize <= 0) return 1;
    return Math.max(1, Math.ceil(filteredRamItems.length / ramPageSize));
  }, [filteredRamItems.length, ramPageSize]);

  const paginatedRamItems = useMemo(() => {
    if (ramPageSize === -1) return filteredRamItems;
    const start = (ramCurrentPage - 1) * ramPageSize;
    return filteredRamItems.slice(start, start + ramPageSize);
  }, [filteredRamItems, ramCurrentPage, ramPageSize]);

  const handleCopyRamExcelTable = () => {
    if (filteredRamItems.length === 0) {
      showToast('Không có dữ liệu để sao chép', 'info');
      return;
    }
    const header = 'STT\tMã SAP\tTên Nhà Hàng\tSubnet\tIP Gateway\tChi Tiết SQL (.41)\tĐánh Giá SQL\tMongoDB IP\tChi Tiết Mongo\tĐánh Giá MongoDB\tTrạng Thái Port Mongo';
    const rows = filteredRamItems.map((it, idx) => {
      const sqlOk = it.sql_is_limited_2gb ?? it.sql_is_limited_4gb;
      const sqlEval = sqlOk ? `ĐẠT (<= ${targetSqlGb}GB)` : it.sql_connected ? 'CHƯA ĐẠT' : 'MẤT KẾT NỐI';
      const isPortOpen = it.mongo_port_open ?? (
        it.mongo_connected || 
        (Boolean(it.mongo_ip) && !(it.mongo_status || '').includes('chưa cấu hình mở port'))
      );
      const mongoEval = it.mongo_is_limited_6gb
        ? `ĐẠT (${targetMongoGb}GB)`
        : it.mongo_connected
        ? 'CHƯA ĐẠT'
        : isPortOpen
        ? `PORT MỞ (${it.mongo_ip || 'Port 27017'})`
        : 'CHƯA MỞ PORT';
      const mongoPortStatus = isPortOpen ? `ĐÃ MỞ PORT (${it.mongo_ip || 'Port 27017'})` : 'CHƯA MỞ PORT';
      return [
        idx + 1,
        it.sap_code || '',
        it.restaurant_name,
        it.subnet,
        it.ip_gateway || '',
        it.sql_status,
        sqlEval,
        it.mongo_ip || 'Không có',
        it.mongo_status,
        mongoEval,
        mongoPortStatus
      ].join('\t');
    });
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedRamExcel(true);
    showToast(`Đã sao chép ${filteredRamItems.length} dòng dạng bảng Excel vào Clipboard!`, 'success');
    setTimeout(() => setCopiedRamExcel(false), 2500);
  };

  // Batch Apply RAM Limits Modal (Xử lý hàng loạt)
  const [showBatchRamModal, setShowBatchRamModal] = useState<boolean>(false);
  const [batchRamAction, setBatchRamAction] = useState<'apply_limit' | 'remove_limit'>('apply_limit');
  const [batchRamScope, setBatchRamScope] = useState<'unlimited_only' | 'all_active'>('unlimited_only');
  const [batchRamRecipients, setBatchRamRecipients] = useState<string>('dung.nguyenanh@ggg.com.vn');
  const [batchRamSendEmail, setBatchRamSendEmail] = useState<boolean>(true);
  const [isBatchApplyingRam, setIsBatchApplyingRam] = useState<boolean>(false);
  const [batchApplyResult, setBatchApplyResult] = useState<RamLimitBatchApplyResponse | null>(null);
  const [fixingRestaurantId, setFixingRestaurantId] = useState<number | null>(null);

  // Email Report Modal (Gửi báo cáo email)
  const [showRamEmailModal, setShowRamEmailModal] = useState<boolean>(false);
  const [ramEmailRecipientsInput, setRamEmailRecipientsInput] = useState<string>('dung.nguyenanh@ggg.com.vn');
  const [isSendingRamEmail, setIsSendingRamEmail] = useState<boolean>(false);

  const openBatchRamModal = async () => {
    setShowBatchRamModal(true);
    setBatchApplyResult(null);
    try {
      const cfg = await ramLimitAuditService.getEmailConfig();
      if (cfg.recipients && cfg.recipients.length > 0) {
        setBatchRamRecipients(cfg.recipients.join(', '));
      }
    } catch {
      // fallback
    }
  };

  const handleRunBatchRam = async () => {
    setIsBatchApplyingRam(true);
    setBatchApplyResult(null);
    try {
      const recs = batchRamRecipients.split(',').map(r => r.trim()).filter(Boolean);
      if (recs.length > 0) {
        ramLimitAuditService.saveEmailConfig(recs).catch(() => {});
      }

      if (batchRamAction === 'remove_limit') {
        const confirmed = window.confirm(
          `CẢNH BÁO XỬ LÝ HÀNG LOẠT:\n\nBạn đang chọn GỠ BỎ HOÀN TOÀN GIỚI HẠN RAM cho các nhà hàng thuộc phạm vi '${batchRamScope === 'unlimited_only' ? 'Chưa đạt chuẩn' : 'Toàn bộ đang ON'}'!\n\n• SQL Server (.41): Gỡ bỏ hạn mức bộ nhớ (chạy tối đa 2147483647 MB).\n• MongoDB (.41/.11/.12): Xóa cacheSizeGB trong file cấu hình và restart service (Bộ nhớ cache chạy theo mặc định WiredTiger).\n\nBạn có chắc chắn muốn thực hiện không?`
        );
        if (!confirmed) {
          setIsBatchApplyingRam(false);
          return;
        }
        showToast('Đang tiến hành gỡ bỏ hoàn toàn giới hạn RAM hàng loạt qua mạng...', 'info');
        const res = await ramLimitAuditService.removeBatchRamLimits({
          scope: batchRamScope as any,
          recipients: recs,
          send_email: batchRamSendEmail
        });
        showToast(res.message || 'Đã gỡ bỏ giới hạn RAM hàng loạt thành công!', 'success');
      } else {
        showToast(`Đang tiến hành xử lý hàng loạt giới hạn RAM SQL ${targetSqlGb}GB & Mongo ${targetMongoGb}GB (Tự động loại trừ các nhà hàng có cấu hình riêng)...`, 'info');
        const res = await ramLimitAuditService.batchApplyRamLimits({
          scope: batchRamScope,
          recipients: recs,
          send_email: batchRamSendEmail,
          skip_tch: batchRamSkipTch,
          exclude_keywords: excludeKeywords,
          target_sql_gb: targetSqlGb,
          target_mongo_gb: targetMongoGb
        });
        setBatchApplyResult(res);
        showToast(res.message || 'Xử lý hàng loạt hoàn tất!', 'success');
      }
      await fetchRamAuditData();
      jobService.getJobs().then(setJobs);
    } catch (err: any) {
      showToast('Lỗi khi xử lý hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsBatchApplyingRam(false);
    }
  };

  const handleApplySingleRam = useCallback(async (restaurantId: number) => {
    setFixingRestaurantId(restaurantId);
    try {
      const updated = await ramLimitAuditService.applySingleRamLimit(restaurantId, targetSqlGb, targetMongoGb);
      setRamAuditItems(prev => prev.map(item => item.restaurant_id === restaurantId ? updated : item));
      showToast(`Đã xử lý RAM cho [${updated.restaurant_name}]: ${updated.summary_note}`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi xử lý RAM cho nhà hàng: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setFixingRestaurantId(null);
    }
  }, [targetSqlGb, targetMongoGb]);

  // Quét 1 nhà hàng đơn lẻ
  const [scanningRestaurantId, setScanningRestaurantId] = useState<number | null>(null);
  const [selectedRestaurantToScan, setSelectedRestaurantToScan] = useState<number | ''>('');
  const [activeRestaurantsList, setActiveRestaurantsList] = useState<Array<{ id: number; res: string; sap?: string; ip?: string }>>([]);

  // Searchable combobox cho chọn nhà hàng quét đơn lẻ
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState<string>('');
  const [isRestaurantDropdownOpen, setIsRestaurantDropdownOpen] = useState<boolean>(false);
  const restaurantSearchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (restaurantSearchRef.current && !restaurantSearchRef.current.contains(event.target as Node)) {
        setIsRestaurantDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Tải danh sách nhà hàng đang hoạt động để phục vụ chọn quét đơn lẻ
    getRestaurants({ trangthai: 'ON', page_size: 1000 })
      .then(res => {
        if (res && res.items) {
          const list = res.items
            .filter((r) => /^\d{4}$/.test(String(r.sap || '').trim()))
            .map((r) => ({
              id: r.id,
              res: r.res || 'N/A',
              sap: r.sap || '',
              ip: r.ip || ''
            }));
          list.sort((a, b) => (a.sap || '').localeCompare(b.sap || ''));
          setActiveRestaurantsList(list);
        }
      })
      .catch(() => {});
  }, []);

  // Danh sách nhà hàng sau khi filter theo query nhập vào
  const filteredSearchRestaurants = useMemo(() => {
    const rawList = (activeRestaurantsList.length > 0 ? activeRestaurantsList : ramAuditItems.map(i => ({ id: i.restaurant_id, res: i.restaurant_name, sap: i.sap_code, ip: i.ip_gateway })))
      .filter(r => /^\d{4}$/.test(String(r.sap || '').trim()));

    if (!restaurantSearchQuery.trim()) {
      return rawList.slice(0, 30);
    }

    const q = removeVietnameseTones(restaurantSearchQuery.trim());
    return rawList.filter(r => {
      const sap = (r.sap || '').toLowerCase();
      const res = removeVietnameseTones(r.res || '');
      const ip = (r.ip || '').toLowerCase();
      return sap.includes(q) || res.includes(q) || ip.includes(q);
    }).slice(0, 60);
  }, [activeRestaurantsList, ramAuditItems, restaurantSearchQuery]);

  const handleScanSingleRam = useCallback(async (restaurantId: number, customSql?: number, customMongo?: number) => {
    setScanningRestaurantId(restaurantId);
    try {
      const updated = await ramLimitAuditService.scanSingleRestaurant(
        restaurantId,
        customSql ?? targetSqlGb,
        customMongo ?? targetMongoGb
      );
      setRamAuditItems(prev => {
        const idx = prev.findIndex(item => item.restaurant_id === restaurantId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
      showToast(`Đã quét kiểm tra RAM [${updated.restaurant_name}]: ${updated.summary_note}`, 'success');
      return updated;
    } catch (err: any) {
      showToast('Lỗi khi quét RAM nhà hàng: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanningRestaurantId(null);
    }
  }, [targetSqlGb, targetMongoGb]);

  // Modal Cấu Hình RAM Riêng Cho 1 Nhà Hàng
  const [showSingleRamConfigModal, setShowSingleRamConfigModal] = useState<boolean>(false);
  const [selectedRamItemForConfig, setSelectedRamItemForConfig] = useState<RamLimitAuditItem | null>(null);
  const [singleCustomSqlGb, setSingleCustomSqlGb] = useState<number>(2.0);
  const [singleCustomMongoGb, setSingleCustomMongoGb] = useState<number>(6.0);
  const [isApplyingSingleCustomRam, setIsApplyingSingleCustomRam] = useState<boolean>(false);

  const handleOpenConfigRam = useCallback((item: RamLimitAuditItem) => {
    setSelectedRamItemForConfig(item);
    setSingleCustomSqlGb(item.target_sql_gb || targetSqlGb || 2.0);
    setSingleCustomMongoGb(item.target_mongo_gb || targetMongoGb || 6.0);
    setShowSingleRamConfigModal(true);
  }, [targetSqlGb, targetMongoGb]);

  const handleApplySingleCustomRam = async (saveAsCustom: boolean) => {
    if (!selectedRamItemForConfig) return;
    const rid = selectedRamItemForConfig.restaurant_id;
    setIsApplyingSingleCustomRam(true);
    setFixingRestaurantId(rid);
    try {
      const updated = await ramLimitAuditService.applySingleRamLimit(rid, singleCustomSqlGb, singleCustomMongoGb, saveAsCustom);
      setRamAuditItems(prev => prev.map(item => item.restaurant_id === rid ? updated : item));
      if (saveAsCustom) {
        showToast(`⭐ Đã lưu cấu hình riêng & Áp dụng RAM cho [${updated.restaurant_name}] (SQL: ${singleCustomSqlGb}GB, Mongo: ${singleCustomMongoGb}GB - Loại trừ khi fix hàng loạt)`, 'success');
      } else {
        showToast(`⚡ Đã xử lý RAM ngay cho [${updated.restaurant_name}] (Tạm thời - SQL: ${singleCustomSqlGb}GB, Mongo: ${singleCustomMongoGb}GB): ${updated.summary_note}`, 'success');
      }
      setShowSingleRamConfigModal(false);
    } catch (err: any) {
      showToast('Lỗi khi áp dụng cấu hình RAM: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsApplyingSingleCustomRam(false);
      setFixingRestaurantId(null);
    }
  };

  const handleRemoveSingleRamLimit = async () => {
    if (!selectedRamItemForConfig) return;
    const rid = selectedRamItemForConfig.restaurant_id;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn GỠ BỎ HOÀN TOÀN giới hạn RAM cho [${selectedRamItemForConfig.restaurant_name}]?\n\n• SQL Server (.41): Chạy không giới hạn (2147483647 MB)\n• MongoDB (.41/.11/.12): Xóa cacheSizeGB trong mongod.cfg và restart service (Bộ nhớ cache chạy theo mặc định).\n• Đồng thời xóa khỏi danh sách cấu hình RAM riêng (nếu có).`
    );
    if (!confirmed) return;

    setIsApplyingSingleCustomRam(true);
    setFixingRestaurantId(rid);
    try {
      const updated = await ramLimitAuditService.removeSingleRamLimit(rid);
      setRamAuditItems(prev => prev.map(item => item.restaurant_id === rid ? updated : item));
      showToast(`🔓 Đã gỡ bỏ giới hạn RAM cho [${updated.restaurant_name}]: ${updated.summary_note}`, 'success');
      setShowSingleRamConfigModal(false);
    } catch (err: any) {
      showToast('Lỗi khi gỡ bỏ giới hạn RAM: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsApplyingSingleCustomRam(false);
      setFixingRestaurantId(null);
    }
  };

  const handleDeleteCustomRamConfig = async () => {
    if (!selectedRamItemForConfig) return;
    const rid = selectedRamItemForConfig.restaurant_id;
    const confirmed = window.confirm(
      `Xóa cấu hình riêng của [${selectedRamItemForConfig.restaurant_name}] và đưa về áp dụng mức RAM chuẩn mặc định (${targetSqlGb}GB SQL / ${targetMongoGb}GB Mongo)?`
    );
    if (!confirmed) return;

    setIsApplyingSingleCustomRam(true);
    try {
      await ramLimitAuditService.deleteCustomConfig(rid);
      const reScanned = await ramLimitAuditService.scanSingleRestaurant(rid, targetSqlGb, targetMongoGb);
      setRamAuditItems(prev => prev.map(item => item.restaurant_id === rid ? reScanned : item));
      showToast(`Đã xóa cấu hình riêng của [${selectedRamItemForConfig.restaurant_name}], đưa về chuẩn mặc định!`, 'success');
      setShowSingleRamConfigModal(false);
    } catch (err: any) {
      showToast('Lỗi khi xóa cấu hình riêng: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsApplyingSingleCustomRam(false);
    }
  };

  const openRamEmailModal = async () => {
    setShowRamEmailModal(true);
    try {
      const cfg = await ramLimitAuditService.getEmailConfig();
      if (cfg.recipients && cfg.recipients.length > 0) {
        setRamEmailRecipientsInput(cfg.recipients.join(', '));
      }
    } catch {}
  };

  const handleSendRamEmail = async () => {
    setIsSendingRamEmail(true);
    try {
      const recs = ramEmailRecipientsInput.split(',').map(r => r.trim()).filter(Boolean);
      if (recs.length === 0) {
        showToast('Vui lòng nhập ít nhất 1 email người nhận.', 'error');
        return;
      }
      await ramLimitAuditService.saveEmailConfig(recs);
      const res = await ramLimitAuditService.sendEmailReport(ramAuditDate, recs, targetSqlGb, targetMongoGb);
      showToast(res.message || 'Đã gửi email báo cáo thành công!', 'success');
      setShowRamEmailModal(false);
    } catch (err: any) {
      showToast('Lỗi khi gửi email: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSendingRamEmail(false);
    }
  };

  // ══ UNASSIGNED 3CX TICKETS STATE & HANDLERS ══════════════════════
  const [showUnassignedModal, setShowUnassignedModal] = useState<boolean>(false);
  const [unassignedItems, setUnassignedItems] = useState<UnassignedTicketItem[]>([]);
  const [unassignedDates, setUnassignedDates] = useState<string[]>([]);
  const [selectedUnassignedDate, setSelectedUnassignedDate] = useState<string>('');
  const [loadingUnassigned, setLoadingUnassigned] = useState<boolean>(false);
  const [scanningUnassigned, setScanningUnassigned] = useState<boolean>(false);
  const [unassignedSearch, setUnassignedSearch] = useState<string>('');
  const [unassignedTypeFilter, setUnassignedTypeFilter] = useState<'all' | 'TICKET' | 'GPROCESS'>('all');
  const [copiedUnassignedExcel, setCopiedUnassignedExcel] = useState<boolean>(false);
  const [showUnassignedEmailModal, setShowUnassignedEmailModal] = useState<boolean>(false);
  const [unassignedEmailInput, setUnassignedEmailInput] = useState<string>('dung.nguyenanh@ggg.com.vn');
  const [sendingUnassignedEmail, setSendingUnassignedEmail] = useState<boolean>(false);

  const fetchUnassignedData = async (targetDate?: string) => {
    setLoadingUnassigned(true);
    try {
      const [dates, data] = await Promise.all([
        unassigned3cxService.getScanDates(),
        unassigned3cxService.getAuditData(targetDate || selectedUnassignedDate),
      ]);
      setUnassignedDates(dates);
      if (dates.length > 0 && !selectedUnassignedDate && !targetDate) {
        setSelectedUnassignedDate(dates[0]);
      }
      setUnassignedItems(data.items || []);
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu ticket 3CX chưa gán:', e);
    } finally {
      setLoadingUnassigned(false);
    }
  };

  const handleOpenUnassignedModal = async () => {
    setShowUnassignedModal(true);
    await fetchUnassignedData();
  };

  const handleRunUnassignedScan = async () => {
    setScanningUnassigned(true);
    try {
      showToast('Đang kết nối SSO và quét nhiệm vụ 3CX & G-Process chưa gán trên GPMS...', 'info');
      const res = await unassigned3cxService.triggerScan();
      setUnassignedItems(res.items || []);
      const dates = await unassigned3cxService.getScanDates();
      setUnassignedDates(dates);
      if (dates.length > 0) setSelectedUnassignedDate(dates[0]);
      showToast(`Rà soát hoàn tất! Phát hiện ${res.total_unassigned} nhiệm vụ chưa gán người xử lý.`, 'success');
      setShowUnassignedModal(true);
      loadData();
    } catch (err: any) {
      const rawDetail = err.response?.data?.detail;
      const rawMsg = err.message || '';
      let displayError = rawDetail || rawMsg;
      if (
        rawMsg.toLowerCase().includes('timeout') ||
        rawMsg.toLowerCase().includes('econnaborted') ||
        (typeof rawDetail === 'string' && rawDetail.toLowerCase().includes('timeout')) ||
        err.code === 'ECONNABORTED' ||
        err.response?.status === 504
      ) {
        displayError = 'kết nối 150s nhưng không thành công , có thể lỗi hệ thống, vui lòng check lại';
      }
      showToast('Lỗi khi rà soát ticket: ' + displayError, 'error');
    } finally {
      setScanningUnassigned(false);
    }
  };

  const filteredUnassignedItems = useMemo(() => {
    let list = unassignedItems;
    if (unassignedTypeFilter !== 'all') {
      list = list.filter(it => (it.source_type || 'TICKET') === unassignedTypeFilter);
    }
    if (!unassignedSearch.trim()) return list;
    const q = removeVietnameseTones(unassignedSearch);
    return list.filter(it => {
      const title = removeVietnameseTones(it.ticket_title || '');
      const creator = removeVietnameseTones(it.creator || '');
      const id = String(it.ticket_id || '').toLowerCase();
      const typeStr = (it.source_type || 'TICKET').toLowerCase();
      return title.includes(q) || creator.includes(q) || id.includes(q) || typeStr.includes(q);
    });
  }, [unassignedItems, unassignedSearch, unassignedTypeFilter]);

  const handleCopyUnassignedExcel = () => {
    if (filteredUnassignedItems.length === 0) {
      showToast('Không có dữ liệu để sao chép', 'info');
      return;
    }
    const header = 'STT\tPhân Loại\tMã Ticket\tTên Nhiệm Vụ\tNgười Tạo\tNgày Tạo\tHạn Xử Lý (Ngày YCHT)\tTrạng Thái\tNgười Xử Lý\tLink GPMS';
    const rows = filteredUnassignedItems.map((it, idx) => [
      idx + 1,
      it.source_type === 'GPROCESS' ? 'G-Process' : 'Ticket 3CX',
      it.ticket_id,
      it.ticket_title,
      it.creator,
      it.created_at,
      it.due_date,
      it.status,
      it.assignee_status,
      it.url,
    ].join('\t'));
    const tsv = [header, ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedUnassignedExcel(true);
    showToast(`Đã sao chép ${filteredUnassignedItems.length} dòng dạng bảng Excel vào Clipboard!`, 'success');
    setTimeout(() => setCopiedUnassignedExcel(false), 2500);
  };


  const handleSendUnassignedEmail = async () => {
    setSendingUnassignedEmail(true);
    try {
      const res = await unassigned3cxService.sendEmailReport(unassignedEmailInput, selectedUnassignedDate);
      showToast(res.message || 'Đã gửi email báo cáo thành công!', 'success');
      setShowUnassignedEmailModal(false);
    } catch (err: any) {
      showToast('Lỗi khi gửi email: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSendingUnassignedEmail(false);
    }
  };

  // Mail Memo Modal & Actions
  const [showMailMemoModal, setShowMailMemoModal] = useState<boolean>(false);
  const [mailMemoStatus, setMailMemoStatus] = useState<MailMemoStatusResponse | null>(null);
  const [loadingMailMemoStatus, setLoadingMailMemoStatus] = useState<boolean>(false);
  const [scanningMailMemo, setScanningMailMemo] = useState<boolean>(false);
  const [mailMemoLookbackDays, setMailMemoLookbackDays] = useState<number>(30);
  const [mailMemoLastScanResult, setMailMemoLastScanResult] = useState<any | null>(null);
  const [localAgentStatus, setLocalAgentStatus] = useState<LocalAgentStatus | null>(null);

  const fetchMailMemoStatus = async () => {
    try {
      setLoadingMailMemoStatus(true);
      const [res, agent] = await Promise.all([
        mailMemoService.getStatus(),
        mailMemoService.checkLocalAgent()
      ]);
      setMailMemoStatus(res);
      setLocalAgentStatus(agent);
    } catch (err: any) {
      console.error('Lỗi lấy trạng thái Mail Memo:', err);
    } finally {
      setLoadingMailMemoStatus(false);
    }
  };

  const handleOpenMailMemoModal = () => {
    setShowMailMemoModal(true);
    fetchMailMemoStatus();
  };

  const handleRunMailMemoScan = async () => {
    try {
      setScanningMailMemo(true);
      showToast('Đang kết nối Outlook và quét mail Memo mới...', 'info');
      const res = await mailMemoService.smartScan(mailMemoLookbackDays);
      setMailMemoLastScanResult(res);
      showToast(res.message || `Quét hoàn tất: +${res.total_imported} memo mới!`, res.total_imported > 0 ? 'success' : 'info');
      await fetchMailMemoStatus();
      loadData();
    } catch (err: any) {
      console.error('Lỗi quét mail memo:', err);
      showToast('Lỗi khi quét mail memo: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanningMailMemo(false);
    }
  };

  const [downloadingAgent, setDownloadingAgent] = useState<boolean>(false);

  const handleDownloadAgent = async () => {
    try {
      setDownloadingAgent(true);
      showToast('Đang tạo và tải gói cài đặt Agent...', 'info');
      await mailMemoService.downloadAgentPackage();
      showToast('Đã tải gói Outlook_Memo_Agent_Full.zip thành công! Giải nén và nhấp đúp Cai_Dat_Tu_Dong_Schedule.bat.', 'success');
    } catch (err: any) {
      console.error('Lỗi tải agent:', err);
      showToast('Lỗi khi tải gói Agent: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDownloadingAgent(false);
    }
  };

  // Mongo & Mosquitto Audit Modal & Actions
  const [showMongoMosquittoModal, setShowMongoMosquittoModal] = useState<boolean>(false);
  const [mongoMosquittoData, setMongoMosquittoData] = useState<MongoMosquittoSummary | null>(null);
  const [loadingMongoMosquitto, setLoadingMongoMosquitto] = useState<boolean>(false);
  const [scanningMongoMosquitto, setScanningMongoMosquitto] = useState<boolean>(false);
  const [scanningMongoMosquittoErrors, setScanningMongoMosquittoErrors] = useState<boolean>(false);
  const [scanningSingleSap, setScanningSingleSap] = useState<string | null>(null);
  const [mongoMosquittoSearch, setMongoMosquittoSearch] = useState<string>('');
  const [mongoMosquittoFilter, setMongoMosquittoFilter] = useState<'all' | 'error' | 'ok'>('all');

  const fetchMongoMosquittoData = async () => {
    try {
      setLoadingMongoMosquitto(true);
      const res = await mongoMosquittoService.getResults();
      setMongoMosquittoData(res);
    } catch (err: any) {
      console.error('Lỗi lấy kết quả Mongo & Mosquitto:', err);
    } finally {
      setLoadingMongoMosquitto(false);
    }
  };

  const handleOpenMongoMosquittoModal = () => {
    setShowMongoMosquittoModal(true);
    fetchMongoMosquittoData();
  };

  const handleScanMongoMosquittoNow = async () => {
    try {
      setScanningMongoMosquitto(true);
      showToast('Đang quét kiểm tra MongoDB & Mosquitto Broker toàn bộ nhà hàng...', 'info');
      const res = await mongoMosquittoService.triggerScan();
      setMongoMosquittoData(res);
      showToast(res.message || `Quét hoàn tất: ${res.total_ok} OK, ${res.total_error} lỗi!`, res.total_error === 0 ? 'success' : 'info');
      loadData();
    } catch (err: any) {
      console.error('Lỗi quét Mongo & Mosquitto:', err);
      showToast('Lỗi khi quét: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanningMongoMosquitto(false);
    }
  };

  const handleScanMongoMosquittoErrorsNow = async () => {
    try {
      setScanningMongoMosquittoErrors(true);
      showToast(`Đang quét lại ${mongoMosquittoData?.total_error || 0} nhà hàng bị lỗi...`, 'info');
      const res = await mongoMosquittoService.triggerScanErrors();
      setMongoMosquittoData(res);
      showToast(res.message || `Quét lại hoàn tất: Hiện còn ${res.total_error} nhà bị lỗi!`, res.total_error === 0 ? 'success' : 'info');
      loadData();
    } catch (err: any) {
      console.error('Lỗi quét lại các nhà lỗi:', err);
      showToast('Lỗi khi quét lại nhà lỗi: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanningMongoMosquittoErrors(false);
    }
  };

  const handleScanSingleRestaurant = async (sapCode: string) => {
    try {
      setScanningSingleSap(sapCode);
      showToast(`Đang quét kiểm tra nhà hàng [${sapCode}]...`, 'info');
      const res = await mongoMosquittoService.triggerScanSingle(sapCode);
      setMongoMosquittoData(res.summary);
      showToast(res.message || `Đã quét xong [${sapCode}]!`, res.item.is_ok ? 'success' : 'error');
      loadData();
    } catch (err: any) {
      console.error(`Lỗi quét nhà ${sapCode}:`, err);
      showToast(`Lỗi quét [${sapCode}]: ` + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanningSingleSap(null);
    }
  };

  const filteredMongoMosquittoItems = useMemo(() => {
    if (!mongoMosquittoData || !mongoMosquittoData.items) return [];
    let items = mongoMosquittoData.items;

    if (mongoMosquittoFilter === 'error') {
      items = items.filter(it => !it.is_ok);
    } else if (mongoMosquittoFilter === 'ok') {
      items = items.filter(it => it.is_ok);
    }

    if (!mongoMosquittoSearch.trim()) return items;
    const q = removeVietnameseTones(mongoMosquittoSearch);
    return items.filter(it => {
      const sap = removeVietnameseTones(it.sap_code || '');
      const name = removeVietnameseTones(it.restaurant_name || '');
      const ip = (it.representative_ip || '').toLowerCase();
      const subnet = (it.subnet || '').toLowerCase();
      const note = removeVietnameseTones(it.note || '');
      return sap.includes(q) || name.includes(q) || ip.includes(q) || subnet.includes(q) || note.includes(q);
    });
  }, [mongoMosquittoData, mongoMosquittoFilter, mongoMosquittoSearch]);

  // Toggle Hide / Unhide Job (chỉ dành cho Dũng và Super Admin)
  const handleToggleHideJob = async (jobId: string, isHidden: boolean) => {
    try {
      const updated = await jobService.toggleHideJob(jobId, isHidden);
      setJobs((prev) => prev.map((j) => (j.job_id === jobId ? updated : j)));
      showToast(
        isHidden
          ? `Đã ẩn tác vụ '${updated.job_name}'. Bạn có thể xem lại tại tab '🔒 Tác Vụ Ẩn'.`
          : `Đã bỏ ẩn tác vụ '${updated.job_name}'. Tác vụ sẽ xuất hiện lại ở các tab thông thường.`,
        'success'
      );
    } catch (err: any) {
      console.error('Lỗi khi ẩn/bỏ ẩn job:', err);
      showToast('Có lỗi xảy ra: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Restaurant Missing Info Audit Modal & Actions
  const [showRestaurantAuditModal, setShowRestaurantAuditModal] = useState<boolean>(false);
  const [restaurantAuditResult, setRestaurantAuditResult] = useState<RestaurantAuditResult | null>(null);
  const [loadingRestaurantAudit, setLoadingRestaurantAudit] = useState<boolean>(false);
  const [scanningRestaurantAudit, setScanningRestaurantAudit] = useState<boolean>(false);
  const [restaurantAuditFilter, setRestaurantAuditFilter] = useState<'need_reminder' | 'valid' | 'all'>('need_reminder');
  const [restaurantAuditSearch, setRestaurantAuditSearch] = useState<string>('');
  const [copiedRestaurantId, setCopiedRestaurantId] = useState<number | null>(null);
  const [copiedAllRestaurantAudit, setCopiedAllRestaurantAudit] = useState<boolean>(false);
  const [sendingAuditEmail, setSendingAuditEmail] = useState<boolean>(false);
  const [showAuditEmailPrompt, setShowAuditEmailPrompt] = useState<boolean>(false);
  const [auditEmailRecipientsInput, setAuditEmailRecipientsInput] = useState<string>('it.helpdesk@ggg.com.vn, dung.nguyenanh@ggg.com.vn');

  // Exclusion configuration state
  const [showAuditExclusionModal, setShowAuditExclusionModal] = useState<boolean>(false);
  const [auditExcludedKeywords, setAuditExcludedKeywords] = useState<string[]>([]);
  const [newExclusionKeywordInput, setNewExclusionKeywordInput] = useState<string>('');
  const [savingExclusionConfig, setSavingExclusionConfig] = useState<boolean>(false);

  const fetchRestaurantAuditConfig = async () => {
    try {
      const cfg = await jobService.getRestaurantAuditConfig();
      if (cfg && cfg.excluded_keywords) {
        setAuditExcludedKeywords(cfg.excluded_keywords);
      }
    } catch (err: any) {
      console.error('Lỗi lấy cấu hình loại bỏ:', err);
    }
  };

  const handleOpenExclusionModal = async () => {
    await fetchRestaurantAuditConfig();
    setShowAuditExclusionModal(true);
  };

  const handleAddExclusionKeyword = () => {
    const kw = newExclusionKeywordInput.trim();
    if (!kw) return;
    if (auditExcludedKeywords.some(k => k.toLowerCase() === kw.toLowerCase())) {
      showToast(`Mục "${kw}" đã có trong danh sách loại bỏ!`, 'info');
      return;
    }
    setAuditExcludedKeywords(prev => [...prev, kw]);
    setNewExclusionKeywordInput('');
  };

  const handleRemoveExclusionKeyword = (kwToRemove: string) => {
    setAuditExcludedKeywords(prev => prev.filter(k => k !== kwToRemove));
  };

  const handleResetDefaultExclusionKeywords = () => {
    setAuditExcludedKeywords(["The Coffee House", "TCH", "Universal", "TEA"]);
    showToast('Đã khôi phục danh sách về 4 mục mặc định (The Coffee House, TCH, Universal, TEA)', 'info');
  };

  const handleSaveExclusionConfigAndRescan = async () => {
    try {
      setSavingExclusionConfig(true);
      await jobService.saveRestaurantAuditConfig({ excluded_keywords: auditExcludedKeywords });
      showToast('Đã lưu cấu hình danh sách loại bỏ thành công! Đang rà soát lại...', 'success');
      setShowAuditExclusionModal(false);
      await handleRunRestaurantAuditScan();
    } catch (err: any) {
      console.error('Lỗi khi lưu cấu hình loại bỏ:', err);
      showToast('Lỗi khi lưu cấu hình: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingExclusionConfig(false);
    }
  };

  const fetchRestaurantAuditLatest = async () => {
    try {
      setLoadingRestaurantAudit(true);
      const res = await jobService.getRestaurantAuditLatest();
      setRestaurantAuditResult(res);
    } catch (err: any) {
      console.error('Lỗi lấy kết quả rà soát nhà hàng:', err);
    } finally {
      setLoadingRestaurantAudit(false);
    }
  };

  const handleOpenRestaurantAuditModal = () => {
    setShowRestaurantAuditModal(true);
    fetchRestaurantAuditLatest();
    fetchRestaurantAuditConfig();
  };

  const handleRunRestaurantAuditScan = async () => {
    try {
      setScanningRestaurantAudit(true);
      showToast('Đang quét và ping kiểm tra router các nhà hàng còn thiếu thông tin...', 'info');
      const res = await jobService.scanRestaurantAudit();
      setRestaurantAuditResult(res);
      showToast(`Rà soát hoàn tất! Tìm thấy ${res.need_reminder_count} nhà hàng online cần bổ sung thông tin.`, res.need_reminder_count > 0 ? 'info' : 'success');
      loadData();
    } catch (err: any) {
      console.error('Lỗi khi rà soát thông tin nhà hàng:', err);
      showToast('Lỗi khi rà soát: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanningRestaurantAudit(false);
    }
  };

  const handleCopySingleRestaurantReminder = (item: RestaurantAuditItem) => {
    const textToCopy = item.reminder_text || `${item.res}\n${item.missing_fields.join(', ')}\nvui lòng bổ sung`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedRestaurantId(item.id);
    showToast(`Đã sao chép nội dung nhắc nhở: ${item.res}!`, 'success');
    setTimeout(() => setCopiedRestaurantId(null), 2500);
  };

  const handleCopyAllRestaurantAuditReminders = () => {
    const allText = restaurantAuditResult?.reminder_text_all || '';
    if (!allText) {
      showToast('Không có nội dung nhắc nhở nào để sao chép!', 'info');
      return;
    }
    navigator.clipboard.writeText(allText);
    setCopiedAllRestaurantAudit(true);
    showToast(`Đã sao chép toàn bộ danh sách nhắc nhở (${restaurantAuditResult?.need_reminder_count} nhà hàng) vào Clipboard!`, 'success');
    setTimeout(() => setCopiedAllRestaurantAudit(false), 2500);
  };

  const handleSendAuditEmailNow = async () => {
    if (!auditEmailRecipientsInput.trim()) {
      showToast('Vui lòng nhập ít nhất 1 địa chỉ email người nhận!', 'info');
      return;
    }
    try {
      setSendingAuditEmail(true);
      const recs = auditEmailRecipientsInput.split(',').map(e => e.trim()).filter(Boolean);
      await jobService.sendRestaurantAuditEmail(recs);
      showToast(`Đã gửi email nhắc nhở bổ sung dữ liệu thành công tới: ${recs.join(', ')}!`, 'success');
      setShowAuditEmailPrompt(false);
    } catch (err: any) {
      console.error('Lỗi gửi email rà soát:', err);
      showToast('Lỗi khi gửi email: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSendingAuditEmail(false);
    }
  };

  const filteredRestaurantAuditItems = useMemo(() => {
    if (!restaurantAuditResult?.all_items) return [];
    let items = restaurantAuditResult.all_items;

    // Loại bỏ triệt để các nhà hàng bỏ qua (offline) hoặc loại bỏ (theo cấu hình) khỏi danh sách hiển thị
    items = items.filter(it => it.category !== 'skipped_offline' && it.category !== 'excluded');

    if (restaurantAuditFilter === 'need_reminder') {
      items = items.filter(it => it.category === 'need_reminder');
    } else if (restaurantAuditFilter === 'valid') {
      items = items.filter(it => it.category === 'valid');
    }

    if (restaurantAuditSearch.trim()) {
      const q = removeVietnameseTones(restaurantAuditSearch.toLowerCase().trim());
      items = items.filter(it => {
        const name = removeVietnameseTones((it.res || '').toLowerCase());
        const brand = removeVietnameseTones((it.brand || '').toLowerCase());
        const sap = (it.sap || '').toLowerCase();
        const cc = (it.coscenter || '').toLowerCase();
        const rk7 = (it.rk7 || '').toLowerCase();
        const ip = (it.ip || '').toLowerCase();
        const matched = removeVietnameseTones((it.matched_keyword || '').toLowerCase());
        const missing = removeVietnameseTones((it.missing_fields || []).join(' ').toLowerCase());
        return name.includes(q) || brand.includes(q) || sap.includes(q) || cc.includes(q) || rk7.includes(q) || ip.includes(q) || matched.includes(q) || missing.includes(q);
      });
    }

    return items;
  }, [restaurantAuditResult, restaurantAuditFilter, restaurantAuditSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      const jobsData = await jobService.getJobs();
      setJobs(jobsData);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu jobs:', error);
      showToast('Không thể tải dữ liệu danh sách tác vụ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin || isDungOrSuperAdmin) {
      loadData();
      if (isDungOrSuperAdmin) {
        loadSsoConfig();
      }
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, isDungOrSuperAdmin, loadSsoConfig]);

  const hiddenJobsCount = useMemo(() => {
    if (!isDungOrSuperAdmin) return 0;
    return jobs.filter((j) => j.is_hidden).length;
  }, [jobs, isDungOrSuperAdmin]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Quyền truy cập: tác vụ restricted_to_dung chỉ hiển thị cho dung.nguyenanh và super admin
      if (job.restricted_to_dung && !isDungOrSuperAdmin) {
        return false;
      }
      if (job.category === 'dung_utility' && !isDungOrSuperAdmin) {
        return false;
      }

      // Xử lý tab Tác vụ ẩn ('hidden')
      if (selectedCategory === 'hidden') {
        if (!isDungOrSuperAdmin) return false;
        if (!job.is_hidden) return false;
      } else {
        // Ở tất cả các tab khác (kể cả 'all', 'dung_utility', v.v.), nếu job bị ẩn thì không hiển thị
        if (job.is_hidden) return false;

        // Nếu là tác vụ tiện ích của Dũng:
        // CHỈ hiển thị ở tab riêng 'dung_utility', không hiển thị ở tab 'Tất Cả' hay các tab khác
        if (job.category === 'dung_utility') {
          if (selectedCategory !== 'dung_utility') {
            return false;
          }
        }
      }

      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = job.job_name.toLowerCase().includes(query);
        const matchId = job.job_id.toLowerCase().includes(query);
        const matchDesc = job.description.toLowerCase().includes(query);
        if (!matchName && !matchId && !matchDesc) return false;
      }

      // Category
      if (selectedCategory !== 'all' && selectedCategory !== 'hidden' && job.category !== selectedCategory) {
        return false;
      }

      // Status
      if (selectedStatus === 'enabled' && !job.is_enabled) return false;
      if (selectedStatus === 'disabled' && job.is_enabled) return false;

      return true;
    });
  }, [jobs, searchQuery, selectedCategory, selectedStatus, isDungOrSuperAdmin]);

  // Dynamic timeline slots sorted by scheduled time (excluding dung_utility)
  const timelineSlots = useMemo(() => {
    return jobs
      .filter((j) => j.is_enabled && j.category !== 'dung_utility')
      .flatMap((j) => {
        if (j.schedule?.schedule_type === 'interval') {
          return [{
            id: j.job_id,
            time: `Mỗi ${j.schedule.interval_minutes}p`,
            title: j.job_name,
            sub: j.category_name,
            isInterval: true,
            sortKey: '99:99'
          }];
        }

        const slots: { id: string; time: string; title: string; sub: string; isInterval: boolean; sortKey: string }[] = [];
        const hasMultiple = Boolean(j.schedule?.time_2 || j.schedule?.time_3);

        if (j.schedule?.time) {
          slots.push({
            id: `${j.job_id}_t1`,
            time: j.schedule.time,
            title: hasMultiple ? `${j.job_name} (Lần 1)` : j.job_name,
            sub: j.category_name,
            isInterval: false,
            sortKey: j.schedule.time
          });
        }
        if (j.schedule?.time_2) {
          slots.push({
            id: `${j.job_id}_t2`,
            time: j.schedule.time_2,
            title: `${j.job_name} (Lần 2)`,
            sub: j.category_name,
            isInterval: false,
            sortKey: j.schedule.time_2
          });
        }
        if (j.schedule?.time_3) {
          slots.push({
            id: `${j.job_id}_t3`,
            time: j.schedule.time_3,
            title: `${j.job_name} (Lần 3)`,
            sub: j.category_name,
            isInterval: false,
            sortKey: j.schedule.time_3
          });
        }

        if (slots.length === 0) {
          slots.push({
            id: j.job_id,
            time: '08:00',
            title: j.job_name,
            sub: j.category_name,
            isInterval: false,
            sortKey: '08:00'
          });
        }

        return slots;
      })
      .sort((a, b) => {
        if (a.isInterval && !b.isInterval) return 1;
        if (!a.isInterval && b.isInterval) return -1;
        return a.sortKey.localeCompare(b.sortKey);
      });
  }, [jobs]);

  const isOvernightRestaurantExcluded = (item: OvernightDeviceItem): boolean => {
    const name = (item.restaurant_name || '').toLowerCase();
    const sap = (item.sap_code || '').toLowerCase();
    const full = `${sap} ${name}`;

    if (full.includes('khong phai nh')) return true;
    if (full.includes('thecoffeehouse') || full.includes('the coffee house') || /\btch\b/i.test(full)) return true;
    if (/\but\b/i.test(full) || full.includes('universal') || /\btea\b/i.test(full)) return true;
    return false;
  };

  const hasAtLeastOneOvernightDevice = (it: OvernightDeviceItem): boolean => {
    if (it.kds_items && it.kds_items.length > 0) return true;
    if (it.col_kds && it.col_kds.trim().length > 0) return true;
    if (it.pos_pc_items && it.pos_pc_items.length > 0) return true;
    if (it.col_pos_pc && it.col_pos_pc.trim().length > 0) return true;
    if (it.device_items && it.device_items.length > 0) return true;
    if (it.col_devices && it.col_devices.trim().length > 0) return true;
    if (it.overnight_devices && it.overnight_devices.trim().length > 0) return true;
    if ((it.device_count || 0) > 0) return true;
    return false;
  };

  const filteredOvernightItems = useMemo(() => {
    let items = overnightItems.filter(
      it => !isOvernightRestaurantExcluded(it) && hasAtLeastOneOvernightDevice(it)
    );
    if (!overnightSearch) return items;
    const q = overnightSearch.trim().toLowerCase();
    return items.filter(
      it =>
        (it.sap_code || '').toLowerCase().includes(q) ||
        (it.restaurant_name || '').toLowerCase().includes(q) ||
        (it.ip_gateway || '').toLowerCase().includes(q) ||
        (it.email || '').toLowerCase().includes(q) ||
        (it.overnight_devices || '').toLowerCase().includes(q) ||
        (it.col_kds || '').toLowerCase().includes(q) ||
        (it.col_pos_pc || '').toLowerCase().includes(q)
    );
  }, [overnightItems, overnightSearch]);

  const totalOvernightDevicesFiltered = useMemo(() => {
    return filteredOvernightItems.reduce((sum, it) => {
      let count = 0;
      if (it.kds_items && it.kds_items.length > 0) {
        count += it.kds_items.length;
      } else if (it.col_kds) {
        count += it.col_kds.split('\n').map(s => s.trim()).filter(Boolean).length;
      }
      if (it.pos_pc_items && it.pos_pc_items.length > 0) {
        count += it.pos_pc_items.length;
      } else if (it.col_pos_pc) {
        count += it.col_pos_pc.split('\n').map(s => s.trim()).filter(Boolean).length;
      }
      if (count === 0) {
        count = it.device_count || (it.device_items ? it.device_items.length : 0) || 1;
      }
      return sum + count;
    }, 0);
  }, [filteredOvernightItems]);

  // Handle Toggle
  const handleToggle = async (job: JobItem) => {
    try {
      const updated = await jobService.toggleJob(job.job_id, !job.is_enabled);
      setJobs((prev) => prev.map((j) => (j.job_id === job.job_id ? updated : j)));
      showToast(
        `Đã ${updated.is_enabled ? 'kích hoạt' : 'tạm dừng'} tác vụ '${job.job_name}'`,
        updated.is_enabled ? 'success' : 'info'
      );
    } catch (error) {
      console.error('Lỗi toggle job:', error);
      showToast('Có lỗi xảy ra khi thay đổi trạng thái tác vụ', 'error');
    }
  };

  // Handle Run Dry Run
  const handleRunDryRun = async (job: JobItem) => {
    setRunningJobIds((prev) => ({ ...prev, [job.job_id]: true }));
    try {
      await jobService.runJobDryRun(job.job_id);
      showToast(`Chạy thử nghiệm an toàn '${job.job_name}' hoàn tất!`, 'success');
      // Refresh list to show last run
      const updatedJobs = await jobService.getJobs();
      setJobs(updatedJobs);
    } catch (error) {
      console.error('Lỗi khi chạy thử job:', error);
      showToast('Lỗi khi kích hoạt chạy thử nghiệm', 'error');
    } finally {
      setRunningJobIds((prev) => ({ ...prev, [job.job_id]: false }));
    }
  };

  // Open Schedule Modal
  const openScheduleModal = (job: JobItem) => {
    setEditingJob(job);
    setScheduleType(job.schedule.schedule_type || 'daily');
    setScheduleTime(job.schedule.time || '06:00');
    setScheduleTime2(job.schedule.time_2 || '');
    setScheduleTime3(job.schedule.time_3 || '');
    setIntervalMinutes(job.schedule.interval_minutes || 30);
    setSelectedDays(job.schedule.days_of_week || [1, 2, 3, 4, 5, 6, 7]);
    setCustomCron(job.schedule.cron_expression || '');
    setScheduleEmailRecipients(job.email_recipients || '');
  };

  // Save Schedule
  const handleSaveSchedule = async () => {
    if (!editingJob) return;
    try {
      setSavingSchedule(true);
      const payload: JobUpdateScheduleRequest = {
        schedule_type: scheduleType,
        time: scheduleTime,
        time_2: scheduleTime2 ? scheduleTime2.trim() : undefined,
        time_3: scheduleTime3 ? scheduleTime3.trim() : undefined,
        interval_minutes: intervalMinutes,
        days_of_week: selectedDays,
        cron_expression: scheduleType === 'custom_cron' ? customCron : undefined,
        email_recipients: scheduleEmailRecipients.trim()
      };
      const updated = await jobService.updateSchedule(editingJob.job_id, payload);
      setJobs((prev) => prev.map((j) => (j.job_id === editingJob.job_id ? updated : j)));
      setEditingJob(null);
      showToast(`Đã cập nhật cấu hình tác vụ '${editingJob.job_name}' thành công!`, 'success');
    } catch (error) {
      console.error('Lỗi cập nhật lịch:', error);
      showToast('Không thể lưu cấu hình lịch chạy', 'error');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Open Email Modal
  const openEmailModal = (job: JobItem) => {
    setEditingEmailJob(job);
    setEmailRecipientsInput(job.email_recipients || '');
  };

  // Save Email Configuration
  const handleSaveEmail = async () => {
    if (!editingEmailJob) return;
    try {
      setSavingEmail(true);
      const updated = await jobService.updateEmailRecipients(
        editingEmailJob.job_id,
        emailRecipientsInput.trim()
      );
      setJobs((prev) => prev.map((j) => (j.job_id === editingEmailJob.job_id ? updated : j)));
      setEditingEmailJob(null);
      showToast(`Đã cập nhật danh sách email nhận tin cho '${editingEmailJob.job_name}'!`, 'success');
    } catch (error) {
      console.error('Lỗi cập nhật email:', error);
      showToast('Không thể lưu danh sách email nhận tin', 'error');
    } finally {
      setSavingEmail(false);
    }
  };


  // Open Logs Modal
  const openLogsModal = async (job: JobItem) => {
    setLogModalJob(job);
    setLoadingLogs(true);
    try {
      const logsData = await jobService.getJobLogs(job.job_id);
      setLogs(logsData);
    } catch (error) {
      console.error('Lỗi tải logs:', error);
      showToast('Không thể tải nhật ký tác vụ', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open All Logs Modal
  const openAllLogs = async () => {
    setShowAllLogsModal(true);
    setLoadingLogs(true);
    try {
      const allLogs = await jobService.getAllLogs();
      setLogs(allLogs);
    } catch (error) {
      console.error('Lỗi tải toàn bộ logs:', error);
      showToast('Không thể tải nhật ký toàn hệ thống', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Category badge colors
  const getCategoryBadge = (cat: string, name: string) => {
    const badgeConfigs: Record<string, { bg: string; color: string; border: string; icon: string }> = {
      sync_data: { bg: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.25)', icon: '🔄' },
      reconcile: { bg: 'rgba(147, 51, 234, 0.1)', color: '#7c3aed', border: 'rgba(147, 51, 234, 0.25)', icon: '⚖️' },
      report: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: 'rgba(16, 185, 129, 0.25)', icon: '📊' },
      monitor: { bg: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)', icon: '📡' },
      utility: { bg: 'rgba(6, 182, 212, 0.1)', color: '#0891b2', border: 'rgba(6, 182, 212, 0.25)', icon: '⚡' },
      dung_utility: { bg: 'rgba(245, 158, 11, 0.15)', color: '#b45309', border: 'rgba(245, 158, 11, 0.4)', icon: '⭐' }
    };
    const c = badgeConfigs[cat] || { bg: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: 'var(--border-color)', icon: '📌' };

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: c.bg,
          color: c.color,
          border: `1px solid ${c.border}`
        }}
      >
        <span>{c.icon}</span>
        <span>{name}</span>
      </span>
    );
  };

  const dayOptions = [
    { value: 1, label: 'T2' },
    { value: 2, label: 'T3' },
    { value: 3, label: 'T4' },
    { value: 4, label: 'T5' },
    { value: 5, label: 'T6' },
    { value: 6, label: 'T7' },
    { value: 7, label: 'CN' }
  ];

  if (!isSuperAdmin && !isDungOrSuperAdmin) {
    return (
      <div
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: '60vh'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}
        >
          <ShieldAlert size={34} />
        </div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Quyền Truy Cập Bị Từ Chối
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '460px', lineHeight: 1.5 }}>
          Bạn không có quyền truy cập trang này. Vui lòng liên hệ Quản trị viên để được hỗ trợ.
        </p>
        <Button variant="primary" onClick={() => navigate('/restaurants')}>
          Quay Về Trang Chủ
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'success' ? '#065f46' : toastMessage.type === 'error' ? '#991b1b' : '#1e40af',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Info size={18} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Dashboard & Quản Lý Tác Vụ Ngầm (Jobs & Scheduler)
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                Giám sát chu kỳ chạy, theo dõi lịch sử và cấu hình giờ tự động cho các tác vụ định kỳ của hệ thống
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={openOvernightModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: '#FCD34D',
                color: '#B45309',
                backgroundColor: '#FFFBEB',
                fontWeight: 600
              }}
            >
              <Moon size={15} color="#B45309" />
              <span>Máy Để Qua Đêm (04:00)</span>
            </Button>
            {isDungOrSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={openRamAuditModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderColor: '#F59E0B',
                  color: '#92400E',
                  backgroundColor: '#FEF3C7',
                  fontWeight: 600
                }}
              >
                <Server size={15} color="#D97706" />
                <span>⭐ RAM SQL (2GB) & Mongo (6GB)</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={openAllLogs}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FileText size={15} />
              <span>Nhật Ký Toàn Bộ</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={loadData}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              <span>Làm Mới</span>
            </Button>
          </div>
        </div>

        {/* Safe View Mode Banner */}
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px',
            color: '#92400e',
            lineHeight: 1.5
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
          <div>
            <strong>Chế độ xem trước an toàn (View Mode):</strong> Hệ thống đang ở trạng thái xem trước và cấu hình. Các tác vụ chưa chạy thật ngoài hệ thống thực tế theo chỉ đạo an toàn. Khi bạn nhấn <strong>"Chạy Thử"</strong>, hệ thống sẽ mô phỏng an toàn (Dry Run) và ghi nhận kết quả mà không làm ảnh hưởng tới dữ liệu hay gửi email thật.
          </div>
        </div>
      </div>



      {/* Upcoming Schedule Timeline Overview */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '18px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          <Calendar size={16} color="#2563eb" />
          <span>Khung Giờ Tự Động Định Kỳ Trong Ngày</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '12px'
          }}
        >
          {timelineSlots.map((slot) => (
            <div
              key={slot.id}
              style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                transition: 'border-color 0.15s ease'
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563eb' }}>{slot.time}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {slot.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {slot.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Search */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { id: 'all', label: 'Tất Cả' },
              { id: 'sync_data', label: 'Đồng Bộ Dữ Liệu' },
              { id: 'report', label: 'Báo Cáo & Biểu Đồ' },
              { id: 'monitor', label: 'Giám Sát Mạng & VPN' },
              { id: 'utility', label: 'Tiện Ích Tự Động' },
              ...(isDungOrSuperAdmin ? [{ id: 'dung_utility', label: '⭐ Tiện Ích của Dũng' }] : []),
              ...(isDungOrSuperAdmin ? [{ id: 'hidden', label: `🔒 Tác Vụ Ẩn${hiddenJobsCount > 0 ? ` (${hiddenJobsCount})` : ''}` }] : [])
            ].map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backgroundColor: isActive ? 'var(--color-primary, #3b82f6)' : 'var(--bg-secondary)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Status select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                fontSize: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '7px 10px',
                backgroundColor: 'var(--input-bg, #fff)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="enabled">Đang Bật Lịch</option>
              <option value="disabled">Đang Tạm Dừng</option>
            </select>

            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tác vụ, mã, mô tả..."
                style={{
                  fontSize: '12px',
                  padding: '7px 12px 7px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  width: '210px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ backgroundColor: 'var(--bg-card, #fff)', padding: '50px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '13px' }}>Đang tải danh sách tác vụ ngầm...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ backgroundColor: 'var(--bg-card, #fff)', padding: '50px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={28} style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Không tìm thấy tác vụ phù hợp</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Thử thay đổi từ khóa tìm kiếm hoặc chọn lại danh mục bộ lọc.</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const isRunning = runningJobIds[job.job_id] || job.status === 'running';

            return (
              <div
                key={job.job_id}
                style={{
                  backgroundColor: 'var(--bg-card, #fff)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  {/* Job Info */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {job.job_name}
                      </h3>
                      {getCategoryBadge(job.category, job.category_name)}
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {job.job_id}
                      </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 8px 0', lineHeight: 1.5 }}>
                      {job.description}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 600 }}>
                        <Clock size={13} />
                        Lịch: {job.schedule.human_readable}
                      </span>
                      {(job.schedule.time_2 || job.schedule.time_3) && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.25)' }}>
                            Lần 1: {job.schedule.time}
                          </span>
                          {job.schedule.time_2 && (
                            <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                              Lần 2: {job.schedule.time_2}
                            </span>
                          )}
                          {job.schedule.time_3 && (
                            <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                              Lần 3: {job.schedule.time_3}
                            </span>
                          )}
                        </div>
                      )}
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        Cron: {job.schedule.cron_expression}
                      </span>
                      {job.next_run_at && (
                        <span>
                          Chạy tiếp theo: <strong style={{ color: 'var(--text-primary)' }}>{job.next_run_at}</strong>
                        </span>
                      )}
                      {job.last_run_at && (
                        <span>
                          Lần chạy cuối: {job.last_run_at}
                          {job.last_duration ? ` (${job.last_duration}s)` : ''}
                        </span>
                      )}
                    </div>

                    {/* Email Recipients Badges */}
                    {(job.has_email_notification || (job.email_recipients && job.email_recipients.trim().length > 0)) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px', fontSize: '11px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 600 }}>
                          <Mail size={12} />
                          Email nhận tự động:
                        </span>
                        {job.email_recipients && job.email_recipients.trim() ? (
                          job.email_recipients
                            .split(',')
                            .map((em) => em.trim())
                            .filter(Boolean)
                            .map((email, idx) => (
                              <span
                                key={idx}
                                style={{
                                  backgroundColor: 'rgba(217, 119, 6, 0.1)',
                                  color: '#b45309',
                                  border: '1px solid rgba(217, 119, 6, 0.25)',
                                  borderRadius: '12px',
                                  padding: '1px 8px',
                                  fontSize: '11px',
                                  fontWeight: 500
                                }}
                              >
                                {email}
                              </span>
                            ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Chưa cấu hình (Bấm "Cấu Hình Email" để khai báo)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions & Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Toggle Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '6px' }}>
                      <div
                        onClick={() => handleToggle(job)}
                        style={{
                          width: '42px',
                          height: '22px',
                          borderRadius: '11px',
                          backgroundColor: job.is_enabled ? '#10b981' : '#d1d5db',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background-color 0.2s ease'
                        }}
                        title={job.is_enabled ? 'Nhấp để tạm dừng lịch tự động' : 'Nhấp để bật lịch tự động'}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            position: 'absolute',
                            top: '2px',
                            left: job.is_enabled ? '22px' : '2px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: job.is_enabled ? '#059669' : 'var(--text-muted)' }}>
                        {job.is_enabled ? 'Đang Bật' : 'Tạm Dừng'}
                      </span>
                    </div>

                    {/* Cài Đặt Giờ button */}
                    <button
                      type="button"
                      onClick={() => openScheduleModal(job)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Cài đặt giờ và chu kỳ tự động"
                    >
                      <Sliders size={13} color="#2563eb" />
                      <span>Cài Đặt Giờ</span>
                    </button>

                    {/* Cấu Hình Email button */}
                    <button
                      type="button"
                      onClick={() => openEmailModal(job)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: (job.has_email_notification || job.email_recipients) ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-secondary)',
                        color: (job.has_email_notification || job.email_recipients) ? '#b45309' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Khai báo email nhận báo cáo/cảnh báo tự động (cách nhau bằng dấu phẩy)"
                    >
                      <Mail size={13} color={(job.has_email_notification || job.email_recipients) ? '#d97706' : 'var(--text-secondary)'} />
                      <span>Cấu Hình Email</span>
                    </button>

                    {/* Chạy Thử (Dry-run) button - Ẩn đối với ticket_batch_by_category, job_check_unassigned_3cx_tickets, job_scan_mail_memo_auto */}
                    {job.job_id !== 'job_ticket_batch_by_category' && job.job_id !== 'job_check_unassigned_3cx_tickets' && job.job_id !== 'job_scan_mail_memo_auto' && (
                      <button
                        type="button"
                        onClick={() => handleRunDryRun(job)}
                        disabled={isRunning}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          cursor: isRunning ? 'not-allowed' : 'pointer',
                          opacity: isRunning ? 0.6 : 1,
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Kích hoạt chạy thử nghiệm mô phỏng (an toàn)"
                      >
                        {isRunning ? (
                          <>
                            <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Đang Chạy...</span>
                          </>
                        ) : (
                          <>
                            <Play size={13} style={{ fill: '#fff' }} />
                            <span>Chạy Thử</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Xem Bảng Kết Quả RAM Audit button */}
                    {job.job_id === 'job_check_ram_sql_mongo_limits' && (
                      <button
                        type="button"
                        onClick={openRamAuditModal}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #f59e0b',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(245, 158, 11, 0.15)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Xem bảng chi tiết kết quả kiểm tra RAM SQL & MongoDB"
                      >
                        <Server size={13} color="#d97706" />
                        <span>Xem Bảng Kết Quả</span>
                      </button>
                    )}

                    {/* Ticket Batch: Cấu Hình SSO + List Xử Lý */}
                    {job.job_id === 'job_ticket_batch_by_category' && (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenSsoConfig}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 11px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#f9fafb',
                            color: '#374151',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={ssoConfigData?.sso_username ? `SSO: ${ssoConfigData.sso_username} (${ssoConfigData.has_password ? 'Đã có pass' : 'Chưa có pass'})` : 'Cấu hình tài khoản SSO để đăng nhập GPMS'}
                        >
                          <User size={13} />
                          <span>Cấu Hình SSO</span>
                          {ssoConfigData?.sso_username && (
                            <span style={{ fontSize: '10px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '4px', padding: '1px 5px', marginLeft: '2px' }}>
                              ✓ {ssoConfigData.sso_username}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenTicketListModal}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.15)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Lấy danh sách ticket 3CX cần đóng"
                        >
                          <ListChecks size={13} color="#d97706" />
                          <span>List_Xử Lý</span>
                        </button>
                      </>
                    )}

                    {/* Rà soát 3CX chưa gán: Cấu Hình SSO + Quét Ngay + Xem Bảng Kết Quả */}
                    {job.job_id === 'job_check_unassigned_3cx_tickets' && (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenSsoConfig}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 11px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#f9fafb',
                            color: '#374151',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title={ssoConfigData?.sso_username ? `SSO: ${ssoConfigData.sso_username} (${ssoConfigData.has_password ? 'Đã có pass' : 'Chưa có pass'})` : 'Cấu hình tài khoản SSO để đăng nhập GPMS'}
                        >
                          <User size={13} />
                          <span>Cấu Hình SSO</span>
                          {ssoConfigData?.sso_username && (
                            <span style={{ fontSize: '10px', backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: '4px', padding: '1px 5px', marginLeft: '2px' }}>
                              ✓ {ssoConfigData.sso_username}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleRunUnassignedScan}
                          disabled={scanningUnassigned}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 13px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            cursor: scanningUnassigned ? 'not-allowed' : 'pointer',
                            opacity: scanningUnassigned ? 0.7 : 1,
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Kết nối SSO và rà soát trực tiếp trên GPMS ngay lập tức"
                        >
                          {scanningUnassigned ? (
                            <>
                              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Đang Quét...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw size={13} />
                              <span>Quét Ngay</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenUnassignedModal}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.15)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Xem bảng chi tiết kết quả rà soát ticket chưa gán người xử lý"
                        >
                          <Server size={13} color="#d97706" />
                          <span>Xem Bảng Kết Quả</span>
                        </button>
                      </>
                    )}

                    {/* Quét Mail Memo AUTO: Quét Mail Ngay + Xem Trạng Thái / Chi Tiết */}
                    {job.job_id === 'job_scan_mail_memo_auto' && (
                      <>
                        <button
                          type="button"
                          onClick={handleRunMailMemoScan}
                          disabled={scanningMailMemo}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 13px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            cursor: scanningMailMemo ? 'not-allowed' : 'pointer',
                            opacity: scanningMailMemo ? 0.7 : 1,
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Đọc Outlook Desktop và quét tự động các mail Memo mới"
                        >
                          {scanningMailMemo ? (
                            <>
                              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Đang Quét Mail...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={13} />
                              <span>Quét Mail Ngay</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenMailMemoModal}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.15)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Xem trạng thái kết nối Outlook, thông tin 2FA và danh sách Memo đã import"
                        >
                          <Server size={13} color="#d97706" />
                          <span>Chi Tiết / Trạng Thái</span>
                        </button>
                      </>
                    )}

                    {/* Quét MongoDB & Mosquitto: Xem Bảng Kết Quả */}
                    {job.job_id === 'job_check_mongodb_mosquitto_services' && (
                      <button
                        type="button"
                        onClick={handleOpenMongoMosquittoModal}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: '1px solid #10b981',
                          backgroundColor: '#ecfdf5',
                          color: '#047857',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(16, 185, 129, 0.15)',
                          transition: 'all 0.15s ease'
                        }}
                        title="Xem bảng chi tiết kết quả kiểm tra MongoDB (27017) & Mosquitto (1883)"
                      >
                        <Server size={13} color="#059669" />
                        <span>Xem Bảng Kết Quả</span>
                      </button>
                    )}

                    {/* Rà Soát Thông Tin Nhà Hàng Còn Thiếu: Rà Soát Ngay + Chi Tiết & Logs Rà Soát */}
                    {job.job_id === 'job_review_missing_restaurant_info' && (
                      <>
                        <button
                          type="button"
                          onClick={handleRunRestaurantAuditScan}
                          disabled={scanningRestaurantAudit}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 13px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            cursor: scanningRestaurantAudit ? 'not-allowed' : 'pointer',
                            opacity: scanningRestaurantAudit ? 0.7 : 1,
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Rà soát hồ sơ nhà hàng và ping kiểm tra router"
                        >
                          {scanningRestaurantAudit ? (
                            <>
                              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              <span>Đang Rà Soát...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={13} />
                              <span>Rà Soát Ngay</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenRestaurantAuditModal}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: '1px solid #f59e0b',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.15)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Mở popup xem bảng kết quả rà soát chi tiết, lọc trạng thái và sao chép danh sách nhắc nhở"
                        >
                          <Server size={13} color="#d97706" />
                          <span>Chi Tiết & Logs Rà Soát</span>
                        </button>
                      </>
                    )}

                    {/* Xem Log button */}
                    <button
                      type="button"
                      onClick={() => openLogsModal(job)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Xem lịch sử thực thi và nhật ký"
                    >
                      <FileText size={13} />
                      <span>Logs</span>
                    </button>

                    {/* Nút Ẩn / Bỏ Ẩn tác vụ nhạy cảm (Dành cho Dũng & Super Admin) */}
                    {isDungOrSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => handleToggleHideJob(job.job_id, !job.is_hidden)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 500,
                          borderRadius: '6px',
                          border: `1px solid ${job.is_hidden ? '#d97706' : 'var(--border-color)'}`,
                          backgroundColor: job.is_hidden ? '#fef3c7' : 'transparent',
                          color: job.is_hidden ? '#b45309' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title={job.is_hidden ? 'Bỏ ẩn tác vụ (hiển thị lại ở các tab thông thường)' : 'Ẩn tác vụ nhạy cảm này (chỉ hiển thị ở tab Tác Vụ Ẩn)'}
                      >
                        {job.is_hidden ? <Eye size={13} color="#b45309" /> : <EyeOff size={13} />}
                        <span>{job.is_hidden ? 'Bỏ Ẩn' : 'Ẩn'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Cài Đặt Giờ Chạy Tự Động */}
      {editingJob && (
        <Modal
          isOpen={!!editingJob}
          onClose={() => setEditingJob(null)}
          title="Cài Đặt Giờ Chạy Tự Động"
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Tác Vụ
              </label>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{editingJob.job_name}</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>{editingJob.job_id}</div>
              </div>
            </div>

            {/* Kiểu Lịch Trình */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Kiểu Lịch Chạy
              </label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="daily">Hàng ngày vào giờ cố định</option>
                <option value="interval">Lặp lại định kỳ (Mỗi X phút)</option>
                <option value="weekly">Vào các ngày cụ thể trong tuần</option>
                <option value="custom_cron">Biểu thức Cron nâng cao</option>
              </select>
            </div>

            {/* Giờ Chạy (daily / weekly) - Cấu hình tối đa 3 khung giờ 1 lúc */}
            {(scheduleType === 'daily' || scheduleType === 'weekly') && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Cấu Hình Khung Giờ Chạy (Tối đa 3 khung giờ trong ngày)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                  {/* Khung giờ 1 */}
                  <div>
                    <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Khung giờ 1 (Chính)
                    </span>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Khung giờ 2 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Khung giờ 2 (Tùy chọn)
                      </span>
                      {scheduleTime2 && (
                        <button
                          type="button"
                          onClick={() => setScheduleTime2('')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: 0
                          }}
                          title="Xóa khung giờ 2"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    <input
                      type="time"
                      value={scheduleTime2}
                      onChange={(e) => setScheduleTime2(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Khung giờ 3 */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Khung giờ 3 (Tùy chọn)
                      </span>
                      {scheduleTime3 && (
                        <button
                          type="button"
                          onClick={() => setScheduleTime3('')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: 0
                          }}
                          title="Xóa khung giờ 3"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    <input
                      type="time"
                      value={scheduleTime3}
                      onChange={(e) => setScheduleTime3(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Hệ thống sẽ chạy tự động tại các khung giờ đã chọn. Bỏ trống nếu chỉ cần chạy 1 hoặc 2 khung giờ.
                </p>
              </div>
            )}

            {/* Chọn Các Ngày Trong Tuần (weekly) */}
            {scheduleType === 'weekly' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Chọn Các Ngày Trong Tuần
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {dayOptions.map((d) => {
                    const isSelected = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedDays.length > 1) {
                              setSelectedDays(selectedDays.filter((x) => x !== d.value));
                            }
                          } else {
                            setSelectedDays([...selectedDays, d.value]);
                          }
                        }}
                        style={{
                          padding: '8px 0',
                          fontSize: '12px',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: isSelected ? '1px solid #2563eb' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? '#2563eb' : 'var(--bg-secondary)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tần Suất (Phút) (interval) */}
            {scheduleType === 'interval' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Tần Suất (Phút)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    style={{
                      width: '100px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>phút một lần (Gợi ý: 15, 30, 60, 120 phút)</span>
                </div>
              </div>
            )}

            {/* Custom Cron */}
            {scheduleType === 'custom_cron' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Biểu thức Cron
                </label>
                <input
                  type="text"
                  value={customCron}
                  onChange={(e) => setCustomCron(e.target.value)}
                  placeholder="ví dụ: 0 6 * * 1-5"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                  Định dạng: phút giờ ngày tháng thứ (0=CN, 1=T2...)
                </p>
              </div>
            )}

            {/* Cấu Hình Email Nhận Báo Cáo */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Mail size={13} color="#d97706" />
                  Email Nhận Báo Cáo / Cảnh Báo Tự Động
                </span>
              </label>
              <input
                type="text"
                value={scheduleEmailRecipients}
                onChange={(e) => setScheduleEmailRecipients(e.target.value)}
                placeholder="vd: it_support@goldengate.com.vn, admin@goldengate.com.vn"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Nhiều email cách nhau bằng dấu phẩy (<code>,</code>). Để trống nếu không cần gửi email.
              </p>
            </div>

            {/* Preview Box */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '12px',
                color: '#1e40af',
                lineHeight: 1.4
              }}
            >
              <strong>Xem trước lịch chạy: </strong>
              {scheduleType === 'interval'
                ? `Tự động chạy lặp lại mỗi ${intervalMinutes} phút.`
                : scheduleType === 'daily'
                ? `Tự động chạy hàng ngày vào lúc ${[scheduleTime, scheduleTime2, scheduleTime3].filter(Boolean).join(', ')}.`
                : scheduleType === 'weekly'
                ? `Tự động chạy vào lúc ${[scheduleTime, scheduleTime2, scheduleTime3].filter(Boolean).join(', ')} các ngày [${selectedDays.map((d) => dayOptions.find((o) => o.value === d)?.label).join(', ')}].`
                : `Chạy theo biểu thức Cron: ${customCron}`}
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingJob(null)}>
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSaveSchedule}
                disabled={savingSchedule}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                {savingSchedule ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Lưu Cấu Hình</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cấu Hình Email Tự Động */}
      {editingEmailJob && (
        <Modal
          isOpen={!!editingEmailJob}
          onClose={() => setEditingEmailJob(null)}
          title="Cấu Hình Email Nhận Báo Cáo / Cảnh Báo"
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Tác Vụ
              </label>
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{editingEmailJob.job_name}</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '2px' }}>{editingEmailJob.job_id}</div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Danh Sách Email Nhận Tin Tự Động
              </label>
              <textarea
                rows={3}
                value={emailRecipientsInput}
                onChange={(e) => setEmailRecipientsInput(e.target.value)}
                placeholder="Nhập email, nếu có nhiều email thì cách nhau bằng dấu phẩy (,)...&#10;Ví dụ: it_support@goldengate.com.vn, leader_it@goldengate.com.vn"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Nhập danh sách email nhận báo cáo tự động khi tác vụ kết thúc hoặc khi phát hiện cảnh báo lỗi. Nhiều email cách nhau bằng dấu phẩy (<code>,</code>).
              </p>
            </div>

            {/* Email list preview chips */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Xem trước danh sách người nhận ({emailRecipientsInput.split(',').map((s) => s.trim()).filter(Boolean).length})
              </label>
              <div
                style={{
                  minHeight: '42px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px dashed var(--border-color)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center'
                }}
              >
                {emailRecipientsInput.split(',').map((s) => s.trim()).filter(Boolean).length === 0 ? (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Chưa có email nào. Tác vụ sẽ không gửi email tự động khi hoàn thành.
                  </span>
                ) : (
                  emailRecipientsInput
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((email, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#1d4ed8',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}
                      >
                        <Mail size={11} />
                        {email}
                      </span>
                    ))
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingEmailJob(null)}>
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSaveEmail}
                disabled={savingEmail}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                {savingEmail ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Lưu Cấu Hình Email</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Xem Logs */}
      {(logModalJob || showAllLogsModal) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setLogModalJob(null);
            setShowAllLogsModal(false);
          }}
          title={showAllLogsModal ? 'Nhật Ký Toàn Bộ Tác Vụ Ngầm' : `Nhật Ký Thực Thi: ${logModalJob?.job_name}`}
          maxWidth="760px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {loadingLogs ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Đang tải nhật ký...</p>
                </div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <FileText size={28} style={{ opacity: 0.4, marginBottom: '6px' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Chưa có lịch sử thực thi nào</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Bấm nút "Chạy Thử" trên danh sách tác vụ để kích hoạt mô phỏng lần chạy đầu tiên.
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: '#111827',
                      color: '#f3f4f6',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      border: '1px solid #1f2937',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937', paddingBottom: '6px', color: '#9ca3af' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: log.status === 'success' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                          [{log.status.toUpperCase()}]
                        </span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>{log.job_name}</span>
                      </div>
                      <span style={{ fontSize: '11px' }}>
                        {log.started_at} {log.duration_seconds ? `(${log.duration_seconds}s)` : ''}
                      </span>
                    </div>

                    <div style={{ color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>{log.message}</div>

                    {log.details && (
                      <div
                        style={{
                          color: '#9ca3af',
                          fontSize: '11px',
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          padding: '8px',
                          borderRadius: '4px',
                          whiteSpace: 'pre-wrap',
                          border: '1px solid #1f2937'
                        }}
                      >
                        {log.details}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              {logModalJob?.job_id === 'job_review_missing_restaurant_info' ? (
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setLogModalJob(null);
                    setShowAllLogsModal(false);
                    handleOpenRestaurantAuditModal();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563EB',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  <Server size={13} />
                  <span>📋 Mở Bảng Rà Soát Chi Tiết (Dễ Copy)</span>
                </Button>
              ) : <div />}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setLogModalJob(null);
                  setShowAllLogsModal(false);
                }}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Báo Cáo Máy Để Qua Đêm */}
      {showOvernightModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowOvernightModal(false)}
          title="Báo Cáo Thiết Bị Để Qua Đêm (Quét Tự Động 04:00 Sáng)"
          maxWidth="960px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '80vh' }}>
            {/* Top Toolbar: Date filter, Search, Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ngày:</span>
                  <input
                    type="date"
                    value={overnightDate}
                    onChange={(e) => {
                      setOvernightDate(e.target.value);
                      fetchOvernightData(e.target.value);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  />
                  {availableDates.length > 0 && (
                    <datalist id="scan-dates-list">
                      {availableDates.map(d => (
                        <option key={d} value={d} />
                      ))}
                    </datalist>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Tìm theo SAP, tên nhà hàng, IP..."
                    value={overnightSearch}
                    onChange={(e) => setOvernightSearch(e.target.value)}
                    style={{
                      padding: '6px 12px 6px 30px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      width: '220px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScanOvernightNow}
                  disabled={isScanningOvernight}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#3B82F6', color: '#2563EB' }}
                >
                  <RefreshCw size={14} style={{ animation: isScanningOvernight ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isScanningOvernight ? 'Đang Quét...' : 'Quét Ngay'}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyExcelTable}
                  disabled={filteredOvernightItems.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10B981', borderColor: '#059669', color: '#fff' }}
                  title="Sao chép dạng bảng 4 cột (Tên Nhà Hàng | Thiết bị để qua đêm kds | Thiết bị để qua đêm pc/11/41 | email) để dán trực tiếp vào Excel hoặc Email"
                >
                  {copiedExcel ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedExcel ? 'Đã Chép Bảng!' : '📋 Sao Chép Bảng Excel'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailPrompt(true)}
                  disabled={filteredOvernightItems.length === 0 || isSendingEmail}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#6366F1', color: '#4F46E5', backgroundColor: '#EEF2FF' }}
                  title="Gửi email báo cáo danh sách dạng bảng 4 cột tới IT Helpdesk / Quản trị viên"
                >
                  <Mail size={14} />
                  <span>{isSendingEmail ? 'Đang gửi...' : '📧 Gửi Email Báo Cáo'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAllOvernight}
                  disabled={filteredOvernightItems.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#F59E0B', color: '#D97706' }}
                  title="Sao chép dạng văn bản ghi chú"
                >
                  {copiedAll ? <Check size={14} /> : <FileText size={14} />}
                  <span>{copiedAll ? 'Đã Chép Text!' : 'Chép Text Ghi Chú'}</span>
                </Button>
              </div>
            </div>

            {/* Email Prompt Dialog */}
            {showEmailPrompt && (
              <div style={{ padding: '14px 16px', borderRadius: '8px', backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#3730A3' }}>
                    📧 Gửi Email Báo Cáo Thiết Bị Để Qua Đêm (Bảng 3 cột)
                  </span>
                  <button
                    onClick={() => setShowEmailPrompt(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#6B7280' }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={reportRecipients}
                    onChange={(e) => setReportRecipients(e.target.value)}
                    placeholder="Danh sách email người nhận, cách nhau bởi dấu phẩy..."
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: '6px',
                      border: '1px solid #A5B4FC',
                      fontSize: '13px',
                      backgroundColor: '#fff'
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSendEmailReport}
                    disabled={isSendingEmail}
                    style={{ backgroundColor: '#4F46E5', borderColor: '#4338CA', color: '#fff', whiteSpace: 'nowrap' }}
                  >
                    {isSendingEmail ? 'Đang gửi...' : 'Gửi Ngay Bây Giờ'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmailPrompt(false)}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {/* Summary KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#F59E0B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Moon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 600, textTransform: 'uppercase' }}>Nhà Hàng Để Máy Qua Đêm</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#78350F' }}>{filteredOvernightItems.length} Nhà Hàng</div>
                </div>
              </div>

              <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#EF4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Số Máy Bị Quên Tắt</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#7F1D1D' }}>{totalOvernightDevicesFiltered || overnightTotalDevs} Máy (POS / PC / KDS)</div>
                </div>
              </div>
            </div>

            {/* Content Table - 3 Chuẩn Cột Theo Yêu Cầu */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              {loadingOvernight ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                  <div>Đang tải danh sách thiết bị để qua đêm...</div>
                </div>
              ) : filteredOvernightItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={36} style={{ color: '#10B981', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Không có nhà hàng nào để máy qua đêm!</div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Tất cả các máy POS (.11, .12), PC Quản Lý (.41) và KDS Bếp (.31-.38) đều đã được tắt nguồn.
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#D9E1F2', borderBottom: '1px solid #BFBFBF', textAlign: 'left', color: '#000000', fontWeight: 'bold' }}>
                      <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center', borderRight: '1px solid #BFBFBF' }}>#</th>
                      <th style={{ padding: '10px 14px', width: '36%', borderRight: '1px solid #BFBFBF' }}>Tên Nhà Hàng</th>
                      <th style={{ padding: '10px 14px', width: '22%', borderRight: '1px solid #BFBFBF' }}>Thiết bị để qua đêm kds</th>
                      <th style={{ padding: '10px 14px', width: '22%', borderRight: '1px solid #BFBFBF' }}>Thiết bị để qua đêm pc/11/41</th>
                      <th style={{ padding: '10px 14px', width: '16%', borderRight: '1px solid #BFBFBF' }}>email</th>
                      <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center' }}>Chép</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOvernightItems.map((it, idx) => {
                      const restCol = it.col_restaurant || `${it.sap_code ? it.sap_code + ' ' : ''}${it.restaurant_name} ${it.subnet ? it.subnet + 'x' : ''}`.trim();

                      // KDS devices
                      let kdsList = it.kds_items || [];
                      if (kdsList.length === 0 && it.col_kds) {
                        kdsList = it.col_kds.split('\n').map(s => s.trim()).filter(Boolean);
                      }
                      if (kdsList.length === 0 && (it.device_items || it.col_devices || it.overnight_devices)) {
                        const raw = it.device_items || (it.col_devices ? it.col_devices.split('\n') : (it.overnight_devices ? it.overnight_devices.split(',') : []));
                        kdsList = raw.map((d: string) => d.trim()).filter((d: string) => d.toLowerCase().includes('kds'));
                      }

                      // POS & PC devices
                      let posPcList = it.pos_pc_items || [];
                      if (posPcList.length === 0 && it.col_pos_pc) {
                        posPcList = it.col_pos_pc.split('\n').map(s => s.trim()).filter(Boolean);
                      }
                      if (posPcList.length === 0 && (it.device_items || it.col_devices || it.overnight_devices)) {
                        const raw = it.device_items || (it.col_devices ? it.col_devices.split('\n') : (it.overnight_devices ? it.overnight_devices.split(',') : []));
                        posPcList = raw.map((d: string) => d.trim()).filter((d: string) => !d.toLowerCase().includes('kds') && d.length > 0);
                      }

                      const emailCol = it.col_email || it.email || '';

                      return (
                        <tr
                          key={it.id || idx}
                          style={{
                            borderBottom: '1px solid #D1D5DB',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb'
                          }}
                        >
                          <td style={{ padding: '10px 12px', color: 'var(--text-muted)', textAlign: 'center', borderRight: '1px solid #E5E7EB' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827', borderRight: '1px solid #E5E7EB' }}>
                            {restCol}
                          </td>
                          <td style={{ padding: '10px 14px', borderRight: '1px solid #E5E7EB' }}>
                            {kdsList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {kdsList.map((dev, dIdx) => (
                                  <div key={dIdx} style={{ color: '#D97706', fontWeight: 600, lineHeight: 1.4 }}>
                                    {dev}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', borderRight: '1px solid #E5E7EB' }}>
                            {posPcList.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {posPcList.map((dev, dIdx) => (
                                  <div key={dIdx} style={{ color: '#DC2626', fontWeight: 600, lineHeight: 1.4 }}>
                                    {dev}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', borderRight: '1px solid #E5E7EB' }}>
                            {emailCol ? (
                              <a
                                href={`mailto:${emailCol}`}
                                style={{ color: '#2563EB', textDecoration: 'none', wordBreak: 'break-all' }}
                              >
                                {emailCol}
                              </a>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleCopySingleOvernight(it.summary_line, String(it.id))}
                              title="Sao chép dòng note"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: copiedItemKey === String(it.id) ? '#ECFDF5' : '#fff',
                                color: copiedItemKey === String(it.id) ? '#059669' : 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px'
                              }}
                            >
                              {copiedItemKey === String(it.id) ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Hiển thị <strong>{filteredOvernightItems.length}</strong> nhà hàng | Tự động chạy quét vào <strong>04:00</strong> sáng hàng ngày
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowOvernightModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Cấu Hình SSO ══════════════════════════════════════════════ */}
      {showSsoConfigModal && (
        <Modal
          isOpen={showSsoConfigModal}
          onClose={() => setShowSsoConfigModal(false)}
          title="Cấu Hình Tài Khoản SSO"
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '10px 14px', backgroundColor: '#FFFBEA', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
              💡 Tài khoản SSO dùng để đăng nhập <strong>sso.ggg.com.vn</strong> và lấy danh sách ticket từ GPMS.
              Password được mã hóa Base64 trước khi lưu.
            </div>

            {/* Username SSO */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Username SSO <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={tempSsoUsername}
                  onChange={e => setTempSsoUsername(e.target.value)}
                  placeholder="VD: dung.nguyenanh"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px 9px 32px',
                    border: '1px solid #D1D5DB', borderRadius: '6px',
                    fontSize: '13px', outline: 'none',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* Password SSO */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Password SSO {ssoConfigData?.has_password && <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 400 }}>(Đã có - để trống nếu không đổi)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSsoPassword ? 'text' : 'password'}
                  value={tempSsoPassword}
                  onChange={e => setTempSsoPassword(e.target.value)}
                  placeholder={ssoConfigData?.has_password ? '••••••••• (giữ nguyên nếu không đổi)' : 'Nhập password SSO'}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 36px 9px 12px',
                    border: '1px solid #D1D5DB', borderRadius: '6px',
                    fontSize: '13px', outline: 'none',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowSsoPassword(!showSsoPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '0' }}
                >
                  {showSsoPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Email nhận báo cáo */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email Nhận Báo Cáo (cách nhau bởi dấu phẩy)
              </label>
              <input
                type="text"
                value={tempTicketEmail}
                onChange={e => setTempTicketEmail(e.target.value)}
                placeholder="VD: abc@ggg.com.vn, xyz@ggg.com.vn"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px',
                  border: '1px solid #D1D5DB', borderRadius: '6px',
                  fontSize: '13px', outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Last run info */}
            {ssoConfigData?.last_run_at && (
              <div style={{ padding: '8px 12px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB', fontSize: '11px', color: '#6B7280' }}>
                Lần chạy cuối: <strong>{ssoConfigData.last_run_at}</strong> —
                Trạng thái: <span style={{ color: ssoConfigData.last_run_status === 'success' ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                  {ssoConfigData.last_run_status}
                </span>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowSsoConfigModal(false)}
                style={{ padding: '8px 18px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'transparent', color: '#374151', cursor: 'pointer', fontSize: '13px' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSsoConfig}
                disabled={savingSsoConfig}
                style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', cursor: savingSsoConfig ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '13px', opacity: savingSsoConfig ? 0.7 : 1 }}
              >
                {savingSsoConfig ? '⏳ Đang lưu...' : '💾 Lưu Cấu Hình'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: List Xử Lý Ticket ════════════════════════════════════════ */}
      {showTicketListModal && (
        <Modal
          isOpen={showTicketListModal}
          onClose={() => { if (!isRunningTicketBatch && !isLoadingTickets) setShowTicketListModal(false); }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Ticket theo Danh Mục — List Xử Lý</span>
              {ticketHistory?.run_mode && (
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                  backgroundColor: ticketHistory.run_mode === 'auto' ? '#EFF6FF' : '#FEF3C7',
                  color: ticketHistory.run_mode === 'auto' ? '#1D4ED8' : '#B45309',
                  border: `1px solid ${ticketHistory.run_mode === 'auto' ? '#BFDBFE' : '#FDE68A'}`
                }}>
                  {ticketHistory.run_mode === 'auto' ? '🤖 Tự động (Cron)' : '👤 Quét thủ công'}
                </span>
              )}
            </div>
          }
          maxWidth="1050px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Lịch sử lần quét & xử lý gần nhất banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
              padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <span style={{ color: '#475569' }}>
                  🕒 Quét gần nhất: <strong>{ticketHistory?.last_scanned_at || 'Chưa có lịch sử quét'}</strong>
                </span>
                <span style={{ color: '#475569' }}>
                  ⚡ Xử lý gần nhất: <strong>{ticketHistory?.last_run_at || 'Chưa xử lý'}</strong>
                </span>
                {ticketHistory?.summary?.message && (
                  <span style={{ color: '#0F766E', backgroundColor: '#CCFBF1', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                    {ticketHistory.summary.message}
                  </span>
                )}
              </div>

              {/* Nút Quét Danh Sách */}
              <button
                type="button"
                onClick={handleScanTickets}
                disabled={isLoadingTickets || isRunningTicketBatch}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 16px', borderRadius: '6px', border: 'none',
                  backgroundColor: isLoadingTickets ? '#9CA3AF' : '#F59E0B',
                  color: '#fff', cursor: isLoadingTickets ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: '12px',
                  boxShadow: '0 1px 2px rgba(245, 158, 11, 0.25)',
                  transition: 'all 0.15s ease'
                }}
                title="Đăng nhập SSO và quét danh sách ticket 3CX & G-Process mới nhất"
              >
                <RefreshCw size={13} style={{ animation: isLoadingTickets ? 'spin 1s linear infinite' : 'none' }} />
                <span>{isLoadingTickets ? 'Đang Quét SSO (30–60s)...' : '🔍 Quét Danh Sách'}</span>
              </button>
            </div>

            {/* Loading state khi quét */}
            {isLoadingTickets && (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: '#6B7280', backgroundColor: '#FFFBEA', border: '1px dashed #FCD34D', borderRadius: '8px' }}>
                <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', color: '#F59E0B', marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#B45309' }}>Đang đăng nhập SSO & quét danh sách ticket 3CX và nhiệm vụ G-Process...</div>
                <div style={{ fontSize: '12px', color: '#92400E', marginTop: '4px' }}>Hệ thống đang mở phiên làm việc Playwright ngầm, vui lòng đợi 30–60 giây</div>
              </div>
            )}

            {/* Loading initial history */}
            {isLoadingHistory && (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: '#6B7280' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#9CA3AF', margin: '0 auto 8px', display: 'block' }} />
                <div style={{ fontSize: '13px' }}>Đang tải lịch sử lần quét gần nhất...</div>
              </div>
            )}

            {/* Nội dung danh sách ticket */}
            {!isLoadingTickets && !isLoadingHistory && (
              <>
                {/* Stats & Search Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ padding: '5px 12px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '16px', fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                    📋 Tổng: {ticketHistory?.total_items || 0} mục
                    {ticketHistory && (ticketHistory.ticket_count !== undefined || ticketHistory.gprocess_count !== undefined) && (
                      <span style={{ fontSize: '11px', fontWeight: 500, marginLeft: '4px' }}>
                        ({ticketHistory.ticket_count || 0} 3CX, {ticketHistory.gprocess_count || 0} G-Process)
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '5px 12px', backgroundColor: '#FFFBEA', border: '1px solid #FCD34D', borderRadius: '16px', fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                    ☑️ Đã chọn: {selectedTicketIds.size}
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketIds(new Set((ticketHistory?.items || []).map(t => t.ticket_id)))}
                      style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '5px', cursor: 'pointer', background: '#F9FAFB', color: '#374151' }}
                    >Chọn Tất Cả</button>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketIds(new Set())}
                      style={{ padding: '4px 10px', fontSize: '11px', border: '1px solid #D1D5DB', borderRadius: '5px', cursor: 'pointer', background: '#F9FAFB', color: '#374151' }}
                    >Bỏ Chọn</button>
                  </div>
                </div>

                {/* Ô tìm kiếm */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={e => setTicketSearch(e.target.value)}
                    placeholder="Tìm theo mã, tên ticket/nhiệm vụ, người tạo, trạng thái xử lý..."
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '8px 12px 8px 32px',
                      border: '1px solid #E5E7EB', borderRadius: '6px',
                      fontSize: '12px', outline: 'none',
                      backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Bảng ticket */}
                <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1F2937', color: '#F9FAFB', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 10px', textAlign: 'center', width: '36px' }}>☑</th>
                        <th style={{ padding: '10px 10px', textAlign: 'center', width: '100px', whiteSpace: 'nowrap' }}>Phân Loại</th>
                        <th style={{ padding: '10px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Mã NV / Ticket</th>
                        <th style={{ padding: '10px 10px', textAlign: 'left' }}>Tên Nhiệm Vụ</th>
                        <th style={{ padding: '10px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Người Tạo</th>
                        <th style={{ padding: '10px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Người XL</th>
                        <th style={{ padding: '10px 10px', textAlign: 'left', whiteSpace: 'nowrap' }}>Ngày YCHT</th>
                        <th style={{ padding: '10px 10px', textAlign: 'center', width: '160px', whiteSpace: 'nowrap' }}>Kết Quả Xử Lý</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTickets.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: '#9CA3AF' }}>
                            {ticketSearch
                              ? 'Không tìm thấy mục phù hợp với từ khóa tìm kiếm.'
                              : (!ticketHistory?.items || ticketHistory.items.length === 0
                                ? 'Chưa có dữ liệu lần quét nào. Vui lòng bấm "🔍 Quét Danh Sách" ở trên để quét ticket và nhiệm vụ mới nhất.'
                                : 'Không có mục nào trong danh sách.')
                            }
                          </td>
                        </tr>
                      ) : (
                        filteredTickets.map((ticket, idx) => {
                          const isSelected = selectedTicketIds.has(ticket.ticket_id);
                          const isFailed = ticket.execution_status === 'failed';
                          const isSuccess = ticket.execution_status === 'success';
                          const isSkipped = ticket.execution_status === 'skipped';
                          return (
                            <tr
                              key={`${ticket.source_type}_${ticket.ticket_id}_${idx}`}
                              style={{
                                backgroundColor: isSelected ? '#FFFBEA' : (idx % 2 === 0 ? '#FFF' : '#F9FAFB'),
                                borderBottom: '1px solid #F3F4F6'
                              }}
                            >
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const next = new Set(selectedTicketIds);
                                    if (next.has(ticket.ticket_id)) next.delete(ticket.ticket_id);
                                    else next.add(ticket.ticket_id);
                                    setSelectedTicketIds(next);
                                  }}
                                  style={{ accentColor: '#F5B800', width: '14px', height: '14px', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {ticket.source_type === 'GPROCESS' ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                    backgroundColor: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE'
                                  }}>
                                    ⚙️ G-Process
                                  </span>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                                    backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A'
                                  }}>
                                    🎫 Ticket 3CX
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px 10px' }}>
                                <a
                                  href={ticket.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: ticket.source_type === 'GPROCESS' ? '#4F46E5' : '#D97706',
                                    fontWeight: 700, fontFamily: 'monospace', textDecoration: 'none'
                                  }}
                                  title="Mở chi tiết trên GPMS"
                                >
                                  #{ticket.ticket_id}
                                </a>
                              </td>
                              <td style={{ padding: '8px 10px', color: '#111827', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.ticket_name}>
                                {ticket.ticket_name}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#4B5563', whiteSpace: 'nowrap' }}>{ticket.created_by}</td>
                              <td style={{ padding: '8px 10px', color: '#4B5563', whiteSpace: 'nowrap' }}>{ticket.assignee}</td>
                              <td style={{ padding: '8px 10px', color: '#4B5563', whiteSpace: 'nowrap' }}>{ticket.due_date}</td>
                              <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                {isSuccess && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                    backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #86EFAC'
                                  }} title={ticket.execution_message || 'Đã hoàn thành'}>
                                    ✅ Thành công
                                  </span>
                                )}
                                {isSkipped && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                    backgroundColor: '#FFFBEA', color: '#B45309', border: '1px solid #FDE68A'
                                  }} title={ticket.execution_message || 'Bỏ qua do hết giờ timesheet'}>
                                    ⏭️ Bỏ qua
                                  </span>
                                )}
                                {isFailed && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                                      padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                      backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5'
                                    }}>
                                      ❌ Lỗi
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedErrorDetail({
                                          ticket_id: ticket.ticket_id,
                                          ticket_name: ticket.ticket_name,
                                          message: ticket.execution_message || 'Lỗi không xác định',
                                          error_details: ticket.error_details || ticket.execution_message || '',
                                          source_type: ticket.source_type
                                        });
                                      }}
                                      style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                        backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #F87171',
                                        cursor: 'pointer'
                                      }}
                                      title="Bấm để xem chi tiết log lỗi và sao chép gửi AI chẩn đoán"
                                    >
                                      <FileText size={11} />
                                      <span>Xem Logs</span>
                                    </button>
                                  </div>
                                )}
                                {!isSuccess && !isFailed && !isSkipped && (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                    backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1'
                                  }}>
                                    ⏳ Chờ xử lý
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Timesheet summary nếu có */}
                {ticketHistory?.timesheet_summary && Object.keys(ticketHistory.timesheet_summary).length > 0 && (
                  <details style={{ fontSize: '12px', color: '#6B7280' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
                      📊 Xem Timesheet Tháng Này (giờ trống còn lại / ngày)
                    </summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                      {Object.entries(ticketHistory.timesheet_summary).sort().map(([day, hours]) => (
                        <span key={day} style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                          backgroundColor: hours < 8 ? '#FEF9C3' : '#F0FDF4',
                          color: hours < 8 ? '#A16207' : '#166534',
                          border: `1px solid ${hours < 8 ? '#FDE047' : '#86EFAC'}`
                        }}>
                          {day.slice(5)}: {hours}h
                        </span>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}

            {/* Footer buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #E5E7EB', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowTicketListModal(false)}
                disabled={isRunningTicketBatch || isLoadingTickets}
                style={{ padding: '9px 18px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: 'transparent', color: '#374151', cursor: 'pointer', fontSize: '13px' }}
              >
                Đóng
              </button>

              {selectedTicketIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleRunTicketBatch}
                  disabled={isRunningTicketBatch || isLoadingTickets}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '9px 22px', borderRadius: '6px', border: 'none',
                    backgroundColor: (isRunningTicketBatch || isLoadingTickets) ? '#9CA3AF' : '#16A34A',
                    color: '#fff', cursor: (isRunningTicketBatch || isLoadingTickets) ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: '13px',
                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  {isRunningTicketBatch ? (
                    <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Đang xử lý {selectedTicketIds.size} mục...</>
                  ) : (
                    <><Play size={14} style={{ fill: '#fff' }} /> Bắt Đầu Xử Lý ({selectedTicketIds.size} Mục)</>
                  )}
                </button>
              )}
            </div>

          </div>
        </Modal>
      )}

      {/* ══ MODAL CON: Xem Logs Lỗi Chi Tiết Cho AI (LIFO modal stack) ═════════ */}
      {selectedErrorDetail && (
        <Modal
          isOpen={!!selectedErrorDetail}
          onClose={() => setSelectedErrorDetail(null)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
              <AlertCircle size={18} />
              <span>Logs Lỗi Chi Tiết — #{selectedErrorDetail.ticket_id}</span>
            </div>
          }
          maxWidth="750px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                {selectedErrorDetail.ticket_name}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                Phân loại: <strong>{selectedErrorDetail.source_type === 'GPROCESS' ? 'G-Process' : 'Ticket 3CX'}</strong>
              </div>
            </div>

            {/* Thông báo tóm tắt */}
            <div style={{
              padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
              borderRadius: '6px', color: '#991B1B', fontSize: '12px', fontWeight: 600
            }}>
              ⚠️ Nguyên nhân: {selectedErrorDetail.message}
            </div>

            {/* Khung Technical Traceback */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Technical Logs / Stack Trace:
              </div>
              <pre style={{
                margin: 0,
                padding: '12px 14px',
                backgroundColor: '#0F172A',
                color: '#F87171',
                borderRadius: '8px',
                border: '1px solid #334155',
                fontSize: '11px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineHeight: 1.5,
                maxHeight: '320px',
                overflowX: 'auto',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {selectedErrorDetail.error_details || selectedErrorDetail.message || 'Không có chi tiết stack trace.'}
              </pre>
            </div>

            {/* Nút Copy Logs & Đóng */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E7EB', paddingTop: '12px', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                💡 Bấm nút sao chép bên phải và dán cho AI để nhận phương án xử lý
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleCopyErrorLog}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', borderRadius: '6px', border: 'none',
                    backgroundColor: copiedErrorText ? '#10B981' : '#2563EB',
                    color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  <Copy size={13} />
                  <span>{copiedErrorText ? '✓ Đã Sao Chép!' : '📋 Sao Chép Logs Cho AI'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedErrorDetail(null)}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB',
                    backgroundColor: 'transparent', color: '#374151', cursor: 'pointer', fontSize: '12px'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Kết Quả Batch ════════════════════════════════════════════ */}
      {showTicketResultModal && ticketBatchResult && (
        <Modal
          isOpen={showTicketResultModal}
          onClose={() => setShowTicketResultModal(false)}
          title="Kết Quả Đóng Ticket Hàng Loạt"
          maxWidth="800px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {[
                { label: 'Tổng XL', value: ticketBatchResult.total_processed, color: '#374151', bg: '#F3F4F6' },
                { label: 'Thành Công', value: ticketBatchResult.success_count, color: '#166534', bg: '#F0FDF4' },
                { label: 'Lỗi', value: ticketBatchResult.failed_count, color: '#991B1B', bg: '#FEF2F2' },
                { label: 'Bỏ Qua', value: ticketBatchResult.skipped_count, color: '#92400E', bg: '#FFFBEA' },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px', backgroundColor: s.bg, borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              ⏱ Thời gian: <strong>{ticketBatchResult.duration_seconds}s</strong> —
              {ticketBatchResult.email_sent ? ' 📧 Đã gửi email báo cáo' : ' 📧 Email chưa được gửi (chưa cấu hình)'}
            </div>

            {/* Result table */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1F2937', color: '#F9FAFB', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Mã</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Tên Nhiệm Vụ</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Kết Quả</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Ngày Khai Báo</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Danh Mục</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketBatchResult.results.map((r, idx) => (
                    <tr key={r.ticket_id} style={{ backgroundColor: idx % 2 === 0 ? '#FFF' : '#F9FAFB' }}>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#F5B800' }}>{r.ticket_id}</td>
                      <td style={{ padding: '8px 12px', color: '#111827', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ticket_name || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: r.status === 'success' ? '#F0FDF4' : r.status === 'error' ? '#FEF2F2' : '#F9FAFB',
                          color: r.status === 'success' ? '#166534' : r.status === 'error' ? '#991B1B' : '#6B7280',
                          border: `1px solid ${r.status === 'success' ? '#86EFAC' : r.status === 'error' ? '#FCA5A5' : '#E5E7EB'}`
                        }}>
                          {r.status === 'success' ? '✅ Thành công' : r.status === 'error' ? '❌ Lỗi' : '⏭ Bỏ qua'}
                        </span>
                        {(r.status === 'error' || r.status === 'skipped') && r.reason && (
                          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>{r.reason}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#4B5563', whiteSpace: 'nowrap' }}>{r.day_used || '—'}</td>
                      <td style={{ padding: '8px 12px', color: '#4B5563', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.category_used}>{r.category_used || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowTicketResultModal(false)}
                style={{ padding: '9px 22px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Modal: Kiểm Tra Giới Hạn RAM SQL & Mongo */}
      {showRamAuditModal && (
        <Modal
          isOpen={showRamAuditModal}
          onClose={() => setShowRamAuditModal(false)}
          title={`Kiểm Tra Giới Hạn RAM: SQL Server (<= ${targetSqlGb}GB) & MongoDB (${targetMongoGb}GB)`}
          maxWidth="1200px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info & Filter toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#b45309',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '12px',
                    padding: '2px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ⭐ Tiện Ích của Dũng
                </span>

                {/* Chọn ngày scan */}
                {availableRamDates.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ngày quét:</span>
                    <select
                      value={ramAuditDate}
                      onChange={(e) => {
                        setRamAuditDate(e.target.value);
                        fetchRamAuditData(e.target.value);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {availableRamDates.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyRamExcelTable}
                  disabled={filteredRamItems.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderColor: '#10b981',
                    color: '#047857',
                    backgroundColor: copiedRamExcel ? '#ECFDF5' : '#F0FDF4',
                    fontWeight: 600
                  }}
                >
                  {copiedRamExcel ? <Check size={14} color="#059669" /> : <Copy size={14} color="#047857" />}
                  <span>{copiedRamExcel ? 'Đã Sao Chép!' : 'Sao Chép Excel'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={openRamEmailModal}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderColor: '#3B82F6',
                    color: '#1D4ED8',
                    backgroundColor: '#EFF6FF',
                    fontWeight: 600
                  }}
                  title="Gửi email báo cáo kết quả kiểm tra/xử lý RAM"
                >
                  <Mail size={14} color="#2563EB" />
                  <span>📧 Gửi Báo Cáo Email</span>
                </Button>

                {/* Nút Cấu Hình Mức RAM */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTempSqlGb(targetSqlGb);
                    setTempMongoGb(targetMongoGb);
                    setTempSqlPort(sqlPort);
                    setTempSqlUser(sqlUser);
                    setTempSqlPassword(sqlPassword);
                    setTempMongoPort(mongoPort);
                    setShowSqlPassword(false);
                    setShowRamConfigModal(true);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderColor: '#6366F1',
                    color: '#4338CA',
                    backgroundColor: '#EEF2FF',
                    fontWeight: 600
                  }}
                  title="Tùy chọn cấu hình mức RAM mong muốn cho SQL Server và MongoDB"
                >
                  <Settings size={14} color="#4F46E5" />
                  <span>⚙️ Mức RAM ({targetSqlGb}GB / {targetMongoGb}GB)</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExcludeModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderColor: '#F59E0B',
                    color: '#B45309',
                    backgroundColor: '#FFFBEB',
                    fontWeight: 600
                  }}
                  title="Cấu hình loại trừ nhà hàng có chữ TCH ở đầu hoặc các nhà hàng đặc thù khác"
                >
                  <Shield size={14} color="#D97706" />
                  <span>🛡️ Cấu hình loại trừ ({excludeKeywords.length + (skipTch ? 1 : 0)})</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleScanRamNow}
                  disabled={isScanningRam || isBatchApplyingRam}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#4B5563',
                    borderColor: '#374151',
                    color: '#fff',
                    fontWeight: 600
                  }}
                >
                  <RefreshCw size={14} style={{ animation: isScanningRam ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{isScanningRam ? 'Đang Quét Toàn Bộ NH...' : 'Quét Ngay'}</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={openBatchRamModal}
                  disabled={isScanningRam || isBatchApplyingRam}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#D97706',
                    borderColor: '#B45309',
                    color: '#fff',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(217, 119, 6, 0.3)'
                  }}
                  title={`Xử lý hàng loạt cấu hình giới hạn RAM SQL ${targetSqlGb}GB và Mongo ${targetMongoGb}GB`}
                >
                  <Zap size={14} color="#FDE68A" />
                  <span>⚡ Xử Lý Hàng Loạt ({targetSqlGb}GB & {targetMongoGb}GB)</span>
                </Button>
              </div>
            </div>

            {/* Instruction / Note Box */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #fde68a',
                fontSize: '12px',
                color: '#92400e',
                lineHeight: 1.5,
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
              <div>
                <strong>Tiêu chuẩn kỹ thuật mục tiêu:</strong><br />
                • <strong>SQL Server (.41):</strong> Kết nối IP máy Quản Lý .41 (User: <code>rk7</code> / Pass: <code>rk7</code>), kiểm tra <code>max server memory (MB)</code>. Đạt chuẩn khi <strong>&le; {Math.round(targetSqlGb * 1024)} MB ({targetSqlGb}GB)</strong>.<br />
                • <strong>MongoDB (.41, .11, .12):</strong> Thử kết nối port 27017 trên các máy Quản Lý .41 hoặc Thu Ngân .11, .12. Nếu không máy nào kết nối được &rarr; Ghi nhận <em>"NH này Mongo chưa cấu hình mở port IP"</em>. Nếu kết nối được &rarr; Kiểm tra cache WiredTiger đã giới hạn <strong>{targetMongoGb}GB</strong> hay chưa.
              </div>
            </div>

            {/* Thanh công cụ: Tìm Kiếm & Chọn Nhà Hàng Cụ Thể Để Quét */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 14px',
                backgroundColor: '#F0F9FF',
                borderRadius: '8px',
                border: '1px solid #BAE6FD',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0369A1' }}>
                <Search size={14} color="#0284C7" />
                <span>Quét Nhà Hàng Cụ Thể:</span>
              </div>

              {/* Ô Searchable Input Có Gợi Ý Trực Tiếp */}
              <div ref={restaurantSearchRef} style={{ position: 'relative', minWidth: '320px', flex: '1', maxWidth: '520px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', color: '#0284C7', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Gõ mã SAP, tên nhà hàng hoặc IP để tìm nhanh..."
                    value={restaurantSearchQuery}
                    onFocus={() => setIsRestaurantDropdownOpen(true)}
                    onChange={(e) => {
                      setRestaurantSearchQuery(e.target.value);
                      setIsRestaurantDropdownOpen(true);
                      if (!e.target.value.trim()) {
                        setSelectedRestaurantToScan('');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (selectedRestaurantToScan) {
                          handleScanSingleRam(Number(selectedRestaurantToScan));
                          setIsRestaurantDropdownOpen(false);
                        } else if (filteredSearchRestaurants.length > 0) {
                          const first = filteredSearchRestaurants[0];
                          setSelectedRestaurantToScan(first.id);
                          setRestaurantSearchQuery(`[${first.sap || ''}] ${first.res}`);
                          setIsRestaurantDropdownOpen(false);
                          handleScanSingleRam(first.id);
                        }
                      } else if (e.key === 'Escape') {
                        setIsRestaurantDropdownOpen(false);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 30px 6px 30px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1.5px solid #7DD3FC',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none',
                      boxShadow: isRestaurantDropdownOpen ? '0 0 0 3px rgba(14, 165, 233, 0.15)' : 'none'
                    }}
                  />
                  {restaurantSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setRestaurantSearchQuery('');
                        setSelectedRestaurantToScan('');
                        setIsRestaurantDropdownOpen(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px'
                      }}
                      title="Xóa lựa chọn"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Danh sách dropdown kết quả tìm kiếm */}
                {isRestaurantDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #7DD3FC',
                      borderRadius: '8px',
                      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      zIndex: 100
                    }}
                  >
                    {filteredSearchRestaurants.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '12px', color: '#64748B', textAlign: 'center' }}>
                        Không tìm thấy nhà hàng nào với từ khóa "<strong>{restaurantSearchQuery}</strong>"
                      </div>
                    ) : (
                      filteredSearchRestaurants.map((r) => {
                        const isSelected = selectedRestaurantToScan === r.id;
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSelectedRestaurantToScan(r.id);
                              setRestaurantSearchQuery(`[${r.sap || ''}] ${r.res}`);
                              setIsRestaurantDropdownOpen(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: isSelected ? '#E0F2FE' : '#FFFFFF',
                              borderBottom: '1px solid #F1F5F9',
                              transition: 'background-color 0.1s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F0F9FF';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = isSelected ? '#E0F2FE' : '#FFFFFF';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: '#E0F2FE',
                                  color: '#0369A1',
                                  border: '1px solid #BAE6FD',
                                  fontFamily: 'monospace'
                                }}
                              >
                                {r.sap || 'N/A'}
                              </span>
                              <span style={{ fontWeight: 600, color: '#1E293B' }}>{r.res}</span>
                            </div>
                            {r.ip && (
                              <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                                {r.ip}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Nút bấm Quét Nhà Hàng */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  let targetId = selectedRestaurantToScan ? Number(selectedRestaurantToScan) : null;
                  if (!targetId && filteredSearchRestaurants.length > 0) {
                    const first = filteredSearchRestaurants[0];
                    targetId = first.id;
                    setSelectedRestaurantToScan(first.id);
                    setRestaurantSearchQuery(`[${first.sap || ''}] ${first.res}`);
                  }
                  if (!targetId) {
                    showToast('Vui lòng gõ và chọn 1 nhà hàng để quét.', 'error');
                    return;
                  }
                  setIsRestaurantDropdownOpen(false);
                  handleScanSingleRam(targetId);
                }}
                disabled={Boolean(scanningRestaurantId)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#0284C7',
                  borderColor: '#0369A1',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12px',
                  padding: '6px 16px'
                }}
              >
                <RefreshCw size={13} style={{ animation: scanningRestaurantId ? 'spin 1s linear infinite' : 'none' }} />
                <span>{scanningRestaurantId ? 'Đang quét...' : 'Quét Nhà Hàng Này'}</span>
              </Button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo tên nhà hàng, mã SAP, subnet, trạng thái..."
                  value={ramAuditSearch}
                  onChange={(e) => setRamAuditSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 12px 6px 30px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Nút lọc nhanh: Chỉ xem Mongo chưa mở port */}
              <button
                type="button"
                onClick={() => setRamAuditFilter(prev => prev === 'mongo_closed' ? 'all' : 'mongo_closed')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: ramAuditFilter === 'mongo_closed' ? '#DC2626' : '#FEF2F2',
                  color: ramAuditFilter === 'mongo_closed' ? '#FFFFFF' : '#991B1B',
                  border: `1.5px solid ${ramAuditFilter === 'mongo_closed' ? '#991B1B' : '#FCA5A5'}`,
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
                title="Nhấn để lọc nhanh các nhà hàng MongoDB chưa mở port 27017"
              >
                <span>🔴 Chưa Mở Port Mongo:</span>
                <span
                  style={{
                    backgroundColor: ramAuditFilter === 'mongo_closed' ? '#991B1B' : '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}
                >
                  {mongoClosedCount}
                </span>
              </button>

              {/* Toggle bỏ qua TCH & Loại trừ */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${hideExcludedInTable ? '#FCD34D' : 'var(--border-color)'}`,
                  backgroundColor: hideExcludedInTable ? '#FFFBEB' : 'var(--input-bg, #fff)',
                  color: hideExcludedInTable ? '#92400E' : 'var(--text-secondary)',
                  userSelect: 'none'
                }}
                title="Bỏ qua (ẩn) các nhà hàng có tiền tố 'TCH' và danh sách loại trừ khỏi bảng kết quả"
              >
                <input
                  type="checkbox"
                  checked={hideExcludedInTable}
                  onChange={(e) => setHideExcludedInTable(e.target.checked)}
                />
                <span>🛡️ Bỏ qua NH 'TCH' & Loại trừ ({excludedCount})</span>
              </label>

              <select
                value={ramAuditFilter}
                onChange={(e) => setRamAuditFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              >
                <option value="all">Tất cả ({ramAuditItems.length})</option>
                <option value="custom_only">⭐ Đang áp dụng RAM Riêng ({customRamCount})</option>
                <option value="mongo_closed">🔴 MongoDB CHƯA MỞ PORT ({mongoClosedCount})</option>
                <option value="mongo_not_limited">🟠 MongoDB chưa giới hạn {targetMongoGb}GB ({mongoNotLimitedCount})</option>
                <option value="mongo_ok">🟢 MongoDB đạt chuẩn {targetMongoGb}GB ({mongoOkCount})</option>
                <option value="sql_not_limited">🔴 SQL chưa giới hạn {targetSqlGb}GB ({sqlNotLimitedCount})</option>
                <option value="sql_offline">⚪ SQL không kết nối được (.41)</option>
                <option value="not_limited">⚠️ Chưa đạt chuẩn (SQL hoặc Mongo)</option>
                <option value="both_ok">🟢 Đạt chuẩn cả 2 (SQL {targetSqlGb}GB & Mongo {targetMongoGb}GB)</option>
                <option value="only_excluded">🛡️ Chỉ xem các NH loại trừ / 'TCH' ({excludedCount})</option>
              </select>
            </div>

            {/* Table Area */}
            <div
              style={{
                maxHeight: '480px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            >
              {loadingRamAudit || isScanningRam ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    {isScanningRam ? 'Đang kết nối và kiểm tra RAM toàn bộ nhà hàng...' : 'Đang tải dữ liệu kiểm tra RAM...'}
                  </p>
                </div>
              ) : filteredRamItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle size={26} style={{ opacity: 0.5, marginBottom: '6px' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Không tìm thấy nhà hàng phù hợp bộ lọc</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '10px 12px', width: '45px', textAlign: 'center', color: 'var(--text-secondary)' }}>STT</th>
                      <th style={{ padding: '10px 12px', width: '220px', color: 'var(--text-primary)' }}>Nhà Hàng</th>
                      <th style={{ padding: '10px 12px', width: '230px', color: 'var(--text-primary)' }}>SQL Server (.41 - {targetSqlGb}GB)</th>
                      <th style={{ padding: '10px 12px', width: '240px', color: 'var(--text-primary)' }}>MongoDB (.41/.11/.12 - {targetMongoGb}GB)</th>
                      <th style={{ padding: '10px 12px', width: '130px', color: 'var(--text-primary)' }}>Đánh Giá SQL</th>
                      <th style={{ padding: '10px 12px', width: '160px', color: 'var(--text-primary)' }}>Đánh Giá MongoDB</th>
                      <th style={{ padding: '10px 12px', width: '185px', textAlign: 'center', color: 'var(--text-primary)' }}>Xử Lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRamItems.map((item, idx) => {
                      const displayIdx = (ramPageSize === -1 ? 0 : (ramCurrentPage - 1) * ramPageSize) + idx + 1;
                      const isExcluded = isRestaurantExcluded(item, skipTch, excludeKeywords);
                      return (
                        <RamAuditRow
                          key={item.restaurant_id || item.id || idx}
                          item={item}
                          displayIndex={displayIdx}
                          targetSqlGb={targetSqlGb}
                          targetMongoGb={targetMongoGb}
                          isExcluded={isExcluded}
                          isFixing={fixingRestaurantId === item.restaurant_id}
                          isScanning={scanningRestaurantId === item.restaurant_id}
                          onApplySingleRam={handleApplySingleRam}
                          onOpenConfigRam={handleOpenConfigRam}
                          onScanSingleRam={handleScanSingleRam}
                        />
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {filteredRamItems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Số dòng mỗi trang:</span>
                  <select
                    value={ramPageSize}
                    onChange={(e) => {
                      setRamPageSize(Number(e.target.value));
                      setRamCurrentPage(1);
                    }}
                    style={{
                      padding: '3px 8px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>Tất cả ({filteredRamItems.length})</option>
                  </select>

                  <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                    {ramPageSize === -1
                      ? `Hiển thị toàn bộ ${filteredRamItems.length} nhà hàng`
                      : `Hiển thị ${(ramCurrentPage - 1) * ramPageSize + 1} - ${Math.min(ramCurrentPage * ramPageSize, filteredRamItems.length)} trên tổng số ${filteredRamItems.length} nhà hàng`}
                  </span>
                </div>

                {ramPageSize !== -1 && totalRamPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setRamCurrentPage(1)}
                      disabled={ramCurrentPage <= 1}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: ramCurrentPage <= 1 ? '#F3F4F6' : '#fff',
                        color: ramCurrentPage <= 1 ? '#9CA3AF' : '#374151',
                        cursor: ramCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Trang đầu"
                    >
                      <ChevronsLeft size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRamCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={ramCurrentPage <= 1}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: ramCurrentPage <= 1 ? '#F3F4F6' : '#fff',
                        color: ramCurrentPage <= 1 ? '#9CA3AF' : '#374151',
                        cursor: ramCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                      title="Trang trước"
                    >
                      <ChevronLeft size={14} />
                      <span>Trước</span>
                    </button>

                    <span style={{ padding: '0 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ramCurrentPage} / {totalRamPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setRamCurrentPage(prev => Math.min(totalRamPages, prev + 1))}
                      disabled={ramCurrentPage >= totalRamPages}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: ramCurrentPage >= totalRamPages ? '#F3F4F6' : '#fff',
                        color: ramCurrentPage >= totalRamPages ? '#9CA3AF' : '#374151',
                        cursor: ramCurrentPage >= totalRamPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                      title="Trang sau"
                    >
                      <span>Sau</span>
                      <ChevronRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRamCurrentPage(totalRamPages)}
                      disabled={ramCurrentPage >= totalRamPages}
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: ramCurrentPage >= totalRamPages ? '#F3F4F6' : '#fff',
                        color: ramCurrentPage >= totalRamPages ? '#9CA3AF' : '#374151',
                        cursor: ramCurrentPage >= totalRamPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Trang cuối"
                    >
                      <ChevronsRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Hiển thị <strong>{filteredRamItems.length}</strong> / {ramAuditItems.length} nhà hàng {hideExcludedInTable && excludedCount > 0 ? `(Đã tự động bỏ qua ${excludedCount} NH 'TCH' & loại trừ)` : ''} | Kiểm tra & Xử lý RAM theo yêu cầu riêng (On-demand)
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowRamAuditModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Xử Lý Hàng Loạt Giới Hạn RAM SQL & Mongo */}
      {showBatchRamModal && (
        <Modal
          isOpen={showBatchRamModal}
          onClose={() => !isBatchApplyingRam && setShowBatchRamModal(false)}
          title={batchRamAction === 'remove_limit' ? '🔓 Xử Lý Hàng Loạt: Gỡ Bỏ Hoàn Toàn Giới Hạn RAM' : `⚡ Xử Lý Hàng Loạt: Giới Hạn RAM SQL (${targetSqlGb}GB) & Mongo (${targetMongoGb}GB)`}
          maxWidth="620px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner info */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: batchRamAction === 'remove_limit' ? '#FEF2F2' : '#FFFBEB',
                borderRadius: '8px',
                border: `1px solid ${batchRamAction === 'remove_limit' ? '#FECACA' : '#FDE68A'}`,
                fontSize: '12px',
                color: batchRamAction === 'remove_limit' ? '#991B1B' : '#92400E',
                lineHeight: 1.5,
                display: 'flex',
                gap: '8px'
              }}
            >
              {batchRamAction === 'remove_limit' ? (
                <>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#DC2626' }} />
                  <div>
                    <strong>Chế độ Gỡ Bỏ Hoàn Toàn Giới Hạn (Uncap RAM Hàng Loạt):</strong><br />
                    • <strong>SQL Server (.41):</strong> Thiết lập <code>max server memory = 2147483647 MB</code> (chạy không giới hạn).<br />
                    • <strong>MongoDB (.41/.11/.12):</strong> Xóa tham số <code>cacheSizeGB</code> trong <code>mongod.cfg</code> và restart service mongod.
                  </div>
                </>
              ) : (
                <>
                  <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#D97706' }} />
                  <div>
                    <strong>Quy trình chuẩn hóa RAM tự động:</strong><br />
                    • <strong>SQL Server (.41):</strong> Giới hạn <code>sp_configure 'max server memory (MB)', {Math.round(targetSqlGb * 1024)}</code><br />
                    • <strong>MongoDB (.41/.11/.12):</strong> Thiết lập WiredTiger runtime cache <code>{Math.round(targetMongoGb * 1024)}MB</code>.<br />
                    • <strong>⭐ Bảo vệ cấu hình riêng:</strong> Các nhà hàng đang dùng RAM Riêng sẽ <strong>tự động được loại trừ</strong> để giữ nguyên cấu hình!
                  </div>
                </>
              )}
            </div>

            {/* 1. Chọn loại hành động */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                1. Chọn hành động xử lý hàng loạt:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${batchRamAction === 'apply_limit' ? '#D97706' : 'var(--border-color)'}`,
                    backgroundColor: batchRamAction === 'apply_limit' ? '#FFFBEB' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="batchRamAction"
                    value="apply_limit"
                    checked={batchRamAction === 'apply_limit'}
                    onChange={() => setBatchRamAction('apply_limit')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E' }}>
                      ⚡ Giới Hạn RAM Theo Chuẩn
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                      SQL {targetSqlGb}GB & Mongo {targetMongoGb}GB.<br />
                      <span style={{ color: '#059669', fontWeight: 600 }}>⭐ Tự động loại trừ RAM Riêng</span>
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${batchRamAction === 'remove_limit' ? '#DC2626' : 'var(--border-color)'}`,
                    backgroundColor: batchRamAction === 'remove_limit' ? '#FEF2F2' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="batchRamAction"
                    value="remove_limit"
                    checked={batchRamAction === 'remove_limit'}
                    onChange={() => setBatchRamAction('remove_limit')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#B91C1C' }}>
                      🔓 Gỡ Bỏ Hoàn Toàn Giới Hạn
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                      SQL không giới hạn & xóa cacheSizeGB trong mongod.cfg.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 2. Scope Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                2. Chọn phạm vi xử lý:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${batchRamScope === 'unlimited_only' ? '#F59E0B' : 'var(--border-color)'}`,
                    backgroundColor: batchRamScope === 'unlimited_only' ? '#FFFBEB' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="batchRamScope"
                    value="unlimited_only"
                    checked={batchRamScope === 'unlimited_only'}
                    onChange={() => setBatchRamScope('unlimited_only')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      🟡 Chỉ xử lý các nhà hàng CHƯA đạt chuẩn (Khuyên dùng)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {batchRamAction === 'remove_limit'
                        ? 'Chỉ can thiệp vào các nhà hàng đang có giới hạn RAM để gỡ bỏ nhanh gọn.'
                        : `Chỉ can thiệp vào các nhà hàng đang để SQL > ${targetSqlGb}GB hoặc MongoDB khác ${targetMongoGb}GB để tiết kiệm thời gian.`}
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${batchRamScope === 'all_active' ? '#F59E0B' : 'var(--border-color)'}`,
                    backgroundColor: batchRamScope === 'all_active' ? '#FFFBEB' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="batchRamScope"
                    value="all_active"
                    checked={batchRamScope === 'all_active'}
                    onChange={() => setBatchRamScope('all_active')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      ⚪ Toàn bộ các nhà hàng đang hoạt động (ON)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Kiểm tra và thiết lập chuẩn hóa lại bộ nhớ RAM cho tất cả nhà hàng trong hệ thống.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Email Recipients */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                3. Cấu hình email nhận thông báo báo cáo:
              </label>
              <input
                type="text"
                value={batchRamRecipients}
                onChange={(e) => setBatchRamRecipients(e.target.value)}
                placeholder="VD: dung.nguyenanh@ggg.com.vn, it.support@ggg.com.vn"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Có thể nhập nhiều email phân tách bởi dấu phẩy (,). Hệ thống sẽ tự động ghi nhớ cấu hình này.
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={batchRamSendEmail}
                  onChange={(e) => setBatchRamSendEmail(e.target.checked)}
                />
                <span style={{ fontWeight: 600, color: '#111827' }}>Tự động gửi email báo cáo sau khi hoàn tất</span>
              </label>
            </div>

            {/* 4. Tùy chọn xử lý TCH & Danh sách loại trừ */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                4. Tùy chọn xử lý nhà hàng đặc thù / loại trừ:
              </label>
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#FFFBEB',
                  borderRadius: '8px',
                  border: '1px solid #FDE68A'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={batchRamSkipTch}
                    onChange={(e) => setBatchRamSkipTch(e.target.checked)}
                  />
                  <span style={{ fontWeight: 700, color: '#92400E' }}>
                    🛡️ Bỏ qua các nhà hàng bắt đầu bằng 'TCH' và danh sách loại trừ ({excludeKeywords.length + (skipTch ? 1 : 0)} cấu hình)
                  </span>
                </label>
                <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px', marginLeft: '22px', lineHeight: 1.4 }}>
                  • <strong>Đang chọn:</strong> Hệ thống sẽ tự động bỏ qua toàn bộ nhà hàng TCH và danh sách loại trừ khi thiết lập RAM.<br />
                  • <strong>Bỏ chọn:</strong> Nếu bạn muốn can thiệp cấu hình RAM cho cả các nhà hàng này.
                </div>
              </div>
            </div>

            {/* Batch Apply Result Summary */}
            {batchApplyResult && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#ECFDF5',
                  borderRadius: '8px',
                  border: '1px solid #A7F3D0',
                  fontSize: '12px',
                  color: '#065F46'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  ✅ Kết Quả Xử Lý Hàng Loạt ({batchApplyResult.scan_time}):
                </div>
                <div>• Tổng số nhà hàng đã xử lý: <strong>{batchApplyResult.total_processed}</strong></div>
                <div>• SQL Server (.41): <strong>{batchApplyResult.sql_fixed}</strong> vừa giới hạn {targetSqlGb}GB, <strong>{batchApplyResult.sql_already_ok}</strong> đã đạt sẵn.</div>
                <div>• MongoDB (.41/.11/.12): <strong>{batchApplyResult.mongo_fixed}</strong> vừa giới hạn {targetMongoGb}GB, <strong>{batchApplyResult.mongo_already_ok}</strong> đã đạt sẵn.</div>
                {batchApplyResult.email_sent ? (
                  <div style={{ color: '#047857', marginTop: '4px' }}>
                    📧 Đã gửi email báo cáo thành công tới: <strong>{batchApplyResult.recipients.join(', ')}</strong>
                  </div>
                ) : batchApplyResult.email_error ? (
                  <div style={{ color: '#B91C1C', marginTop: '4px' }}>
                    ⚠️ Lỗi gửi email: {batchApplyResult.email_error}
                  </div>
                ) : null}
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowBatchRamModal(false)}
                disabled={isBatchApplyingRam}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleRunBatchRam}
                disabled={isBatchApplyingRam}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: batchRamAction === 'remove_limit' ? '#DC2626' : '#D97706',
                  borderColor: batchRamAction === 'remove_limit' ? '#B91C1C' : '#B45309',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {isBatchApplyingRam ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Xử Lý Hàng Loạt...</span>
                  </>
                ) : batchRamAction === 'remove_limit' ? (
                  <>
                    <Unlock size={14} />
                    <span>🔓 Gỡ Bỏ Hoàn Toàn Giới Hạn Hàng Loạt</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>⚡ Bắt Đầu Xử Lý Hàng Loạt</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gửi Email Báo Cáo */}
      {showRamEmailModal && (
        <Modal
          isOpen={showRamEmailModal}
          onClose={() => !isSendingRamEmail && setShowRamEmailModal(false)}
          title="Gửi Báo Cáo Email: Giới Hạn RAM SQL (4GB) & Mongo (6GB)"
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Danh sách email người nhận:
              </label>
              <input
                type="text"
                value={ramEmailRecipientsInput}
                onChange={(e) => setRamEmailRecipientsInput(e.target.value)}
                placeholder="dung.nguyenanh@ggg.com.vn, it.support@ggg.com.vn"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Mặc định: <code>dung.nguyenanh@ggg.com.vn</code>. Có thể thêm nhiều email phân tách bởi dấu phẩy (,).
              </div>
            </div>

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#EFF6FF',
                borderRadius: '6px',
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                color: '#1E40AF',
                lineHeight: 1.5
              }}
            >
              Email sẽ gửi bảng báo cáo HTML chi tiết hiện tại của ngày <strong>{ramAuditDate || 'Hôm nay'}</strong> gồm tình trạng cấu hình SQL Server 4GB và MongoDB 6GB của toàn bộ các nhà hàng.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowRamEmailModal(false)}
                disabled={isSendingRamEmail}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSendRamEmail}
                disabled={isSendingRamEmail}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  fontWeight: 600
                }}
              >
                {isSendingRamEmail ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Gửi...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Gửi Báo Cáo Ngay</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cấu Hình Danh Sách Nhà Hàng Loại Trừ */}
      {showExcludeModal && (
        <Modal
          isOpen={showExcludeModal}
          onClose={() => !savingExcludeConfig && setShowExcludeModal(false)}
          title="🛡️ Cấu Hình Danh Sách Nhà Hàng Loại Trừ (Bỏ qua)"
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Mục 1: Loại trừ TCH */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#FFFBEB',
                borderRadius: '8px',
                border: '1px solid #FDE68A'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={skipTch}
                  onChange={(e) => setSkipTch(e.target.checked)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                    Tự động loại trừ các nhà hàng có chữ 'TCH' ở đầu (The Coffee House)
                  </div>
                  <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px', lineHeight: 1.4 }}>
                    Khi bật tùy chọn này, toàn bộ nhà hàng có tên hoặc mã SAP bắt đầu bằng <strong>'TCH'</strong> sẽ tự động được coi là loại trừ (bỏ qua khi quét và xử lý hàng loạt).
                  </div>
                </div>
              </label>
            </div>

            {/* Mục 2: Thêm từ khóa / mã SAP loại trừ khác */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Thêm mã SAP, từ khóa hoặc tên nhà hàng loại trừ bổ sung:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newExcludeKeywordInput}
                  onChange={(e) => setNewExcludeKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExcludeKeyword();
                    }
                  }}
                  placeholder="VD: 4094, Central Kitchen, Kho Đóng Gói..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleAddExcludeKeyword}
                  disabled={!newExcludeKeywordInput.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    borderColor: '#D97706',
                    color: '#B45309',
                    backgroundColor: '#FFFBEB'
                  }}
                >
                  <Plus size={14} />
                  <span>Thêm</span>
                </Button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Nhấn Enter hoặc bấm <strong>Thêm</strong>. Có thể nhập nhiều mã cách nhau bởi dấu phẩy (,).
              </div>
            </div>

            {/* Mục 3: Danh sách các từ khóa đang loại trừ */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Các từ khóa / mã SAP đang áp dụng loại trừ ({excludeKeywords.length}):</span>
                {excludeKeywords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExcludeKeywords([])}
                    style={{ fontSize: '11px', color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {excludeKeywords.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px dashed #D1D5DB', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Chưa có từ khóa loại trừ bổ sung nào.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '140px', overflowY: 'auto', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                  {excludeKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FCD34D'
                      }}
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExcludeKeyword(kw)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '1px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#B45309',
                          borderRadius: '50%'
                        }}
                        title={`Xóa '${kw}'`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowExcludeModal(false)}
                disabled={savingExcludeConfig}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSaveExcludeConfig}
                disabled={savingExcludeConfig}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#D97706',
                  borderColor: '#B45309',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {savingExcludeConfig ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Lưu Cấu Hình Loại Trừ</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Cấu Hình RAM Riêng Cho 1 Nhà Hàng Cụ Thể */}
      {showSingleRamConfigModal && selectedRamItemForConfig && (
        <Modal
          isOpen={showSingleRamConfigModal}
          onClose={() => !isApplyingSingleCustomRam && setShowSingleRamConfigModal(false)}
          title={`⚙️ Cấu Hình RAM Riêng: [${selectedRamItemForConfig.sap_code || ''}] ${selectedRamItemForConfig.restaurant_name}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Thông tin nhà hàng & Hiện trạng */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                lineHeight: 1.6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Nhà Hàng:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  {selectedRamItemForConfig.sap_code ? `[${selectedRamItemForConfig.sap_code}] ` : ''}{selectedRamItemForConfig.restaurant_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>IP Gateway / Subnet:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                  {selectedRamItemForConfig.ip_gateway} (Subnet: {selectedRamItemForConfig.subnet})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748B' }}>Hiện trạng SQL:</span>
                <span style={{ color: selectedRamItemForConfig.sql_is_limited_2gb ? '#059669' : '#DC2626', fontWeight: 600 }}>
                  {selectedRamItemForConfig.sql_status}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Hiện trạng MongoDB:</span>
                <span style={{ color: selectedRamItemForConfig.mongo_is_limited_6gb ? '#059669' : '#DC2626', fontWeight: 600 }}>
                  {selectedRamItemForConfig.mongo_status}
                </span>
              </div>
              {selectedRamItemForConfig.has_custom_ram && (
                <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FCD34D', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#92400E', fontWeight: 600 }}>
                  <Star size={14} color="#D97706" style={{ flexShrink: 0 }} />
                  <span>Đang áp dụng RAM Riêng ({selectedRamItemForConfig.custom_sql_gb ?? singleCustomSqlGb}GB SQL / {selectedRamItemForConfig.custom_mongo_gb ?? singleCustomMongoGb}GB Mongo) — Tự động loại trừ khi fix hàng loạt</span>
                </div>
              )}
            </div>

            {/* Lưu ý kỹ thuật */}
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#FFFBEB',
                borderRadius: '8px',
                border: '1px solid #FDE68A',
                fontSize: '12px',
                color: '#92400E',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              <Info size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Tùy chọn can thiệp RAM:</strong><br />
                • <strong>⚡ Xử Lý RAM Ngay (Tạm Thời):</strong> Áp dụng cấu hình RAM vừa nhập trực tiếp lên máy tính nhà hàng ngay lập tức.<br />
                • <strong>⭐ Lưu Cấu Hình Riêng & Áp Dụng:</strong> Lưu cố định nhà hàng này vào danh sách cấu hình riêng. <em>Nhà hàng sẽ tự động được loại trừ, không bị ghi đè khi chạy Xử Lý Hàng Loạt</em>.<br />
                • <strong>🔓 Gỡ Bỏ Giới Hạn:</strong> Thả không giới hạn SQL Server (2147483647 MB) và xóa cacheSizeGB trong mongod.cfg để MongoDB dùng cache mặc định.
              </div>
            </div>

            {/* Input Cấu hình Mức RAM SQL & Mongo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* SQL Server RAM */}
              <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                  💾 Mức RAM SQL Server (GB):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    step="0.5"
                    value={singleCustomSqlGb}
                    onChange={(e) => setSingleCustomSqlGb(parseFloat(e.target.value) || 2.0)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #86EFAC',
                      backgroundColor: '#FFFFFF',
                      color: '#15803D',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>GB</span>
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                  = {Math.round(singleCustomSqlGb * 1024)} MB
                </div>
              </div>

              {/* MongoDB RAM */}
              <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '6px' }}>
                  🍃 Mức RAM MongoDB (GB):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    step="0.5"
                    value={singleCustomMongoGb}
                    onChange={(e) => setSingleCustomMongoGb(parseFloat(e.target.value) || 6.0)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: '1px solid #93C5FD',
                      backgroundColor: '#FFFFFF',
                      color: '#1D4ED8',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>GB</span>
                </div>
                <div style={{ fontSize: '11px', color: '#1E40AF', marginTop: '4px' }}>
                  = {Math.round(singleCustomMongoGb * 1024)} MB (WiredTiger)
                </div>
              </div>
            </div>

            {/* Nút hành động */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveSingleRamLimit}
                  disabled={isApplyingSingleCustomRam}
                  style={{
                    borderColor: '#EF4444',
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Gỡ bỏ hoàn toàn giới hạn RAM của SQL Server và MongoDB"
                >
                  <Unlock size={13} />
                  <span>Gỡ Bỏ Giới Hạn RAM</span>
                </Button>

                {selectedRamItemForConfig.has_custom_ram && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteCustomRamConfig}
                    disabled={isApplyingSingleCustomRam}
                    style={{
                      borderColor: '#9CA3AF',
                      color: '#4B5563',
                      backgroundColor: '#F9FAFB',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Xóa cấu hình riêng và đưa về mức RAM chuẩn hệ thống"
                  >
                    <Trash2 size={13} />
                    <span>Xóa Cấu Hình Riêng</span>
                  </Button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSingleRamConfigModal(false)}
                  disabled={isApplyingSingleCustomRam}
                >
                  Hủy
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplySingleCustomRam(false)}
                  disabled={isApplyingSingleCustomRam}
                  style={{
                    borderColor: '#0284C7',
                    color: '#0369A1',
                    backgroundColor: '#F0F9FF',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Xử lý RAM trực tiếp theo mức vừa nhập ngay lập tức (không lưu cấu hình riêng)"
                >
                  <Zap size={13} />
                  <span>⚡ Xử Lý RAM Ngay (Tạm Thời)</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApplySingleCustomRam(true)}
                  disabled={isApplyingSingleCustomRam}
                  style={{
                    backgroundColor: '#4F46E5',
                    borderColor: '#4338CA',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Lưu vào danh sách cấu hình riêng (loại trừ khi fix hàng loạt) và áp dụng ngay"
                >
                  {isApplyingSingleCustomRam ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang lưu & cấu hình...</span>
                    </>
                  ) : (
                    <>
                      <Star size={13} color="#FDE68A" />
                      <span>⭐ Lưu Cấu Hình Riêng & Áp Dụng</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Tùy Chọn Cấu Hình Mức Giới Hạn RAM Mục Tiêu & Kết Nối */}
      {showRamConfigModal && (
        <Modal
          isOpen={showRamConfigModal}
          onClose={() => !savingTargetConfig && setShowRamConfigModal(false)}
          title="⚙️ Cấu Hình Mức RAM Chuẩn & Kết Nối (SQL Server & MongoDB)"
          maxWidth="620px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner hướng dẫn */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#EEF2FF',
                borderRadius: '8px',
                border: '1px solid #C7D2FE',
                fontSize: '12px',
                color: '#3730A3',
                lineHeight: 1.5,
                display: 'flex',
                gap: '8px'
              }}
            >
              <Info size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#4F46E5' }} />
              <div>
                <strong>Linh hoạt tùy chỉnh mức RAM và thông số kết nối:</strong><br />
                Các thông số bên dưới sẽ được lưu vĩnh viễn và áp dụng khi <strong>Quét (Scan)</strong> cũng như khi chạy <strong>Xử lý hàng loạt / Fix RAM</strong> cho các nhà hàng.
              </div>
            </div>

            {/* PHẦN A: SQL SERVER */}
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #C7D2FE',
                backgroundColor: '#F8FAFC'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Database size={16} color="#4F46E5" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E1B4B' }}>
                  A. Cấu Hình SQL Server (.41 máy Quản Lý)
                </span>
              </div>

              {/* 1. Mức RAM SQL */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  1. Mức giới hạn RAM SQL Server:
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Lệnh áp dụng: <code>sp_configure 'max server memory (MB)', {Math.round(tempSqlGb * 1024)}; RECONFIGURE;</code>
                </div>

                {/* Các nút chọn nhanh */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {[1, 2, 3, 4, 6, 8].map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => setTempSqlGb(gb)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: tempSqlGb === gb ? 700 : 500,
                        borderRadius: '6px',
                        border: `1px solid ${tempSqlGb === gb ? '#4F46E5' : 'var(--border-color)'}`,
                        backgroundColor: tempSqlGb === gb ? '#4F46E5' : 'var(--input-bg, #fff)',
                        color: tempSqlGb === gb ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {gb} GB {gb === 2 ? '(Mặc định)' : ''}
                    </button>
                  ))}
                </div>

                {/* Nhập số GB tùy ý */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hoặc nhập số GB:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="32"
                    value={tempSqlGb}
                    onChange={(e) => setTempSqlGb(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '75px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#4F46E5' }}>
                    GB (= {Math.round(tempSqlGb * 1024)} MB)
                  </span>
                </div>
              </div>

              {/* 2. Thông số kết nối SQL (Port, User, Password) */}
              <div style={{ paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  2. Thông số đăng nhập & Port kết nối SQL Server:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: '10px' }}>
                  {/* Port SQL */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Port SQL (Mặc định 1433):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={tempSqlPort}
                      onChange={(e) => setTempSqlPort(parseInt(e.target.value) || 1433)}
                      placeholder="1433"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontWeight: 600
                      }}
                    />
                  </div>

                  {/* Tài khoản User */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      User SQL (Mặc định rk7):
                    </label>
                    <input
                      type="text"
                      value={tempSqlUser}
                      onChange={(e) => setTempSqlUser(e.target.value)}
                      placeholder="rk7"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontWeight: 600
                      }}
                    />
                  </div>

                  {/* Mật khẩu Password có Toggle */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Mật khẩu SQL:
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showSqlPassword ? 'text' : 'password'}
                        value={tempSqlPassword}
                        onChange={(e) => setTempSqlPassword(e.target.value)}
                        placeholder="rk7"
                        style={{
                          width: '100%',
                          padding: '6px 30px 6px 8px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg, #fff)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontWeight: 600
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSqlPassword(!showSqlPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={showSqlPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showSqlPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN B: MONGODB */}
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #A7F3D0',
                backgroundColor: '#F0FDF4'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Server size={16} color="#059669" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#064E3B' }}>
                  B. Cấu Hình MongoDB (.41 / .11 / .12)
                </span>
              </div>

              {/* 1. Mức RAM Mongo */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  1. Mức giới hạn RAM MongoDB:
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Lệnh áp dụng: <code>setParameter wiredTigerEngineRuntimeConfig='cache_size={Math.round(tempMongoGb * 1024)}M'</code>
                </div>

                {/* Các nút chọn nhanh */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {[2, 3, 4, 6, 8, 10, 12].map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => setTempMongoGb(gb)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: tempMongoGb === gb ? 700 : 500,
                        borderRadius: '6px',
                        border: `1px solid ${tempMongoGb === gb ? '#059669' : 'var(--border-color)'}`,
                        backgroundColor: tempMongoGb === gb ? '#059669' : 'var(--input-bg, #fff)',
                        color: tempMongoGb === gb ? '#fff' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {gb} GB {gb === 6 ? '(Mặc định)' : ''}
                    </button>
                  ))}
                </div>

                {/* Nhập số GB tùy ý */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Hoặc nhập số GB:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="64"
                    value={tempMongoGb}
                    onChange={(e) => setTempMongoGb(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '75px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>
                    GB (= {Math.round(tempMongoGb * 1024)} MB)
                  </span>
                </div>
              </div>

              {/* 2. Port kết nối Mongo */}
              <div style={{ paddingTop: '10px', borderTop: '1px dashed #A7F3D0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: '0 0 200px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Port kết nối MongoDB (Mặc định 27017):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      value={tempMongoPort}
                      onChange={(e) => setTempMongoPort(parseInt(e.target.value) || 27017)}
                      placeholder="27017"
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg, #fff)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        fontWeight: 600
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#047857', marginTop: '12px', lineHeight: 1.4 }}>
                    Hệ thống sẽ thử kết nối Port này lần lượt trên các IP máy tính tiền: <code>.41</code>, <code>.11</code>, <code>.12</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowRamConfigModal(false)}
                disabled={savingTargetConfig}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={() => handleSaveTargetConfig(tempSqlGb, tempMongoGb, tempSqlPort, tempSqlUser, tempSqlPassword, tempMongoPort)}
                disabled={savingTargetConfig || tempSqlGb <= 0 || tempMongoGb <= 0 || !tempSqlUser.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#4F46E5',
                  borderColor: '#4338CA',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {savingTargetConfig ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Lưu Cấu Hình (SQL: {tempSqlGb}GB | Mongo: {tempMongoGb}GB)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Rà Soát Nhiệm Vụ 3CX Chưa Gán Người Xử Lý */}
      {showUnassignedModal && (
        <Modal
          isOpen={showUnassignedModal}
          onClose={() => setShowUnassignedModal(false)}
          title="Rà Soát Nhiệm Vụ 3CX Chưa Gán Người Xử Lý (GPMS)"
          maxWidth="1200px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Ngày rà soát:
                </span>
                <select
                  value={selectedUnassignedDate}
                  onChange={(e) => {
                    setSelectedUnassignedDate(e.target.value);
                    fetchUnassignedData(e.target.value);
                  }}
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontWeight: 600
                  }}
                >
                  {unassignedDates.length === 0 ? (
                    <option value="">Hôm nay ({new Date().toISOString().split('T')[0]})</option>
                  ) : (
                    unassignedDates.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))
                  )}
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => fetchUnassignedData(selectedUnassignedDate)}
                  disabled={loadingUnassigned}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <RefreshCw size={12} style={{ animation: loadingUnassigned ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Tải Lại</span>
                </Button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Nút Sao chép Excel */}
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleCopyUnassignedExcel}
                  disabled={filteredUnassignedItems.length === 0}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    backgroundColor: copiedUnassignedExcel ? '#DCFCE7' : undefined,
                    borderColor: copiedUnassignedExcel ? '#16A34A' : undefined,
                    color: copiedUnassignedExcel ? '#15803D' : undefined
                  }}
                  title="Sao chép toàn bộ danh sách dạng bảng Excel để dán vào Google Sheets / Microsoft Excel"
                >
                  {copiedUnassignedExcel ? <Check size={13} color="#15803D" /> : <Copy size={13} />}
                  <span>{copiedUnassignedExcel ? 'Đã Sao Chép Excel!' : '📋 Sao Chép Excel'}</span>
                </Button>

                {/* Nút Gửi Email */}
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowUnassignedEmailModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    backgroundColor: '#EFF6FF',
                    borderColor: '#3B82F6',
                    color: '#1D4ED8'
                  }}
                  title="Gửi báo cáo email danh sách nhiệm vụ chưa gán"
                >
                  <Mail size={13} />
                  <span>✉️ Gửi Báo Cáo Email</span>
                </Button>

                {/* Nút Quét Ngay */}
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleRunUnassignedScan}
                  disabled={scanningUnassigned}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563EB',
                    borderColor: '#1D4ED8',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  <RefreshCw size={13} style={{ animation: scanningUnassigned ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{scanningUnassigned ? 'Đang Quét GPMS...' : '🔄 Quét Ngay'}</span>
                </Button>
              </div>
            </div>

            {/* Instruction / Note Box */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#EFF6FF',
                borderRadius: '8px',
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                color: '#1E40AF',
                lineHeight: 1.5,
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#2563EB' }} />
              <div>
                <strong>Quy trình rà soát tự động:</strong> Hệ thống tự động đăng nhập GPMS qua tài khoản SSO, rà soát nhiệm vụ chưa gán người xử lý trên cả <strong>Ticket 3CX</strong> (<em>gticket/work-list</em>) và <strong>G-Process</strong> (<em>g-process/my-mission</em>), đồng thời lấy Ngày tạo của Ticket để cảnh báo kịp thời.
              </div>
            </div>

            {/* Filter Tabs & Search Bar & Counter */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setUnassignedTypeFilter('all')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    backgroundColor: unassignedTypeFilter === 'all' ? 'var(--primary-color, #2563EB)' : 'var(--bg-secondary)',
                    color: unassignedTypeFilter === 'all' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  Tất cả ({unassignedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUnassignedTypeFilter('TICKET')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    backgroundColor: unassignedTypeFilter === 'TICKET' ? '#D97706' : 'var(--bg-secondary)',
                    color: unassignedTypeFilter === 'TICKET' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  🎫 Ticket 3CX ({unassignedItems.filter(i => (i.source_type || 'TICKET') !== 'GPROCESS').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUnassignedTypeFilter('GPROCESS')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid var(--border-color)',
                    backgroundColor: unassignedTypeFilter === 'GPROCESS' ? '#4F46E5' : 'var(--bg-secondary)',
                    color: unassignedTypeFilter === 'GPROCESS' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  ⚙️ G-Process ({unassignedItems.filter(i => i.source_type === 'GPROCESS').length})
                </button>
              </div>

              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo mã, tên nhiệm vụ, người tạo..."
                  value={unassignedSearch}
                  onChange={(e) => setUnassignedSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 12px 6px 30px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: filteredUnassignedItems.length > 0 ? '#FEF2F2' : '#F0FDF4',
                  color: filteredUnassignedItems.length > 0 ? '#991B1B' : '#166534',
                  border: `1px solid ${filteredUnassignedItems.length > 0 ? '#FECACA' : '#BBF7D0'}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span>{filteredUnassignedItems.length > 0 ? '🔴' : '🟢'}</span>
                <span>Chưa Gán Người Xử Lý: {filteredUnassignedItems.length}</span>
              </div>
            </div>

            {/* Table Area */}
            <div
              style={{
                maxHeight: '480px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: '8px'
              }}
            >
              {loadingUnassigned || scanningUnassigned ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    {scanningUnassigned ? 'Đang kết nối GPMS SSO và rà soát nhiệm vụ 3CX & G-Process...' : 'Đang tải dữ liệu nhiệm vụ...'}
                  </p>
                </div>
              ) : filteredUnassignedItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <CheckCircle2 size={32} style={{ color: '#10B981', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Không có nhiệm vụ nào đang chờ gán người xử lý!
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tất cả các ticket công việc và quy trình G-Process đã được phân công hoặc chưa phát sinh nhiệm vụ mới.
                  </p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                      <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Phân Loại</th>
                      <th style={{ padding: '8px 10px', width: '110px' }}>Mã Ticket / NV</th>
                      <th style={{ padding: '8px 10px', minWidth: '200px' }}>Tên Nhiệm Vụ / Yêu Cầu</th>
                      <th style={{ padding: '8px 10px', width: '130px' }}>Người Tạo</th>
                      <th style={{ padding: '8px 10px', width: '140px' }}>Ngày Tạo</th>
                      <th style={{ padding: '8px 10px', width: '130px' }}>Hạn Xử Lý (YCHT)</th>
                      <th style={{ padding: '8px 10px', width: '150px' }}>Người Xử Lý</th>
                      <th style={{ padding: '8px 10px', width: '100px' }}>Trạng Thái</th>
                      <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassignedItems.map((item, idx) => (
                      <tr
                        key={item.ticket_id || idx}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {item.source_type === 'GPROCESS' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#EEF2FF',
                                color: '#4F46E5',
                                border: '1px solid #C7D2FE'
                              }}
                            >
                              ⚙️ G-Process
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                border: '1px solid #FDE68A'
                              }}
                            >
                              🎫 Ticket 3CX
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563EB' }}>
                          <a
                            href={item.url || (item.source_type === 'GPROCESS' ? `https://gpms.ggg.com.vn/g-process/my-mission/${item.ticket_id}` : `https://gpms.ggg.com.vn/gticket/work-list/detail?id=${item.ticket_id}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title="Mở trực tiếp trên GPMS"
                          >
                            <span>#{item.ticket_id}</span>
                            <span style={{ fontSize: '10px' }}>↗</span>
                          </a>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {item.ticket_title}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                          {item.creator || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: item.created_at && item.created_at !== '—' ? '#B45309' : 'var(--text-muted)', fontWeight: item.created_at && item.created_at !== '—' ? 600 : 400 }}>
                          {item.created_at || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                          {item.due_date || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                              border: '1px solid #FCA5A5'
                            }}
                          >
                            <span>⏳</span>
                            <span>{item.assignee_status || 'Chờ gán người xử lý'}</span>
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E'
                            }}
                          >
                            {item.status || 'Chờ phân công'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <a
                            href={item.url || (item.source_type === 'GPROCESS' ? `https://gpms.ggg.com.vn/g-process/my-mission/${item.ticket_id}` : `https://gpms.ggg.com.vn/gticket/work-list/detail?id=${item.ticket_id}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-secondary)',
                              color: '#2563EB',
                              border: '1px solid var(--border-color)',
                              fontSize: '11px',
                              textDecoration: 'none',
                              fontWeight: 600
                            }}
                            title="Mở trực tiếp trên GPMS"
                          >
                            Mở ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Tổng số dòng hiển thị: <strong>{filteredUnassignedItems.length}</strong> / {unassignedItems.length} nhiệm vụ
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowUnassignedModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Gửi Email Báo Cáo Nhiệm Vụ 3CX Chưa Gán */}
      {showUnassignedEmailModal && (
        <Modal
          isOpen={showUnassignedEmailModal}
          onClose={() => !sendingUnassignedEmail && setShowUnassignedEmailModal(false)}
          title="Gửi Báo Cáo Email: Nhiệm Vụ 3CX Chưa Gán Người Xử Lý"
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Danh sách email người nhận (phân cách bằng dấu phẩy):
              </label>
              <input
                type="text"
                value={unassignedEmailInput}
                onChange={(e) => setUnassignedEmailInput(e.target.value)}
                placeholder="dung.nguyenanh@ggg.com.vn, it.support@ggg.com.vn"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Hệ thống sẽ gửi bảng tổng hợp danh sách nhiệm vụ chưa gán người xử lý cùng ngày tạo tới các email này.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowUnassignedEmailModal(false)}
                disabled={sendingUnassignedEmail}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSendUnassignedEmail}
                disabled={sendingUnassignedEmail || !unassignedEmailInput.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  borderColor: '#1D4ED8',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {sendingUnassignedEmail ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Gửi Báo Cáo...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Gửi Báo Cáo Ngay</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Quét Mail Memo AUTO (Outlook / Salesforce) */}
      {showMailMemoModal && (
        <Modal
          isOpen={showMailMemoModal}
          onClose={() => setShowMailMemoModal(false)}
          title="Quét Mail Memo AUTO (Outlook / Salesforce)"
          maxWidth="950px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Connection Info Banner */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #93C5FD',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} color="#2563EB" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1E40AF' }}>
                    Kết nối Microsoft Outlook Desktop (MAPI)
                  </span>
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: (localAgentStatus?.online || mailMemoStatus?.desktop_connected) ? '#DEF7EC' : '#FEF3C7',
                    color: (localAgentStatus?.online || mailMemoStatus?.desktop_connected) ? '#03543F' : '#92400E',
                    border: `1px solid ${(localAgentStatus?.online || mailMemoStatus?.desktop_connected) ? '#31C48D' : '#FCD34D'}`
                  }}
                >
                  {localAgentStatus?.online 
                    ? '🟢 Đã Kết Nối Qua Máy Cá Nhân' 
                    : (mailMemoStatus?.desktop_connected ? '🟢 Đã Kết Nối Trực Tiếp' : '🟡 Chờ Bật Agent Máy Cá Nhân')}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>
                <div><strong>Tài khoản Outlook:</strong> {mailMemoStatus?.email_account || 'dung.nguyenanh@ggg.com.vn'}</div>
                <div><strong>Thư mục quét:</strong> {mailMemoStatus?.folder_name || '5. MKT (hoặc Inbox)'}</div>
                <div><strong>Cơ chế:</strong> Agent chạy trên máy tính cá nhân của bạn sẽ đọc ứng dụng Outlook Desktop và tự động đẩy dữ liệu lên Server, <strong>không cần mật khẩu & không vướng 2FA</strong>.</div>
                {mailMemoStatus?.last_scan_at && (
                  <div style={{ color: '#4B5563', fontSize: '11px', marginTop: '4px' }}>
                    Lần quét gần nhất trên Server: {mailMemoStatus.last_scan_at}
                  </div>
                )}
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #BFDBFE', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span><strong>🖥️ Local Agent Máy Cá Nhân:</strong> Đọc Outlook máy bạn khi mở web trên Server</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: localAgentStatus?.online ? '#DEF7EC' : '#FEF3C7',
                          color: localAgentStatus?.online ? '#03543F' : '#92400E',
                          border: `1px solid ${localAgentStatus?.online ? '#31C48D' : '#FCD34D'}`
                        }}
                      >
                        {localAgentStatus?.online ? '🟢 Agent Đang Bật (Online)' : '⚪ Agent Chưa Bật'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handleDownloadAgent}
                        disabled={downloadingAgent}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          padding: '3px 10px',
                          backgroundColor: '#FFFFFF',
                          borderColor: '#2563EB',
                          color: '#1D4ED8',
                          fontWeight: 700,
                          borderRadius: '6px',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)'
                        }}
                        title="Tải gói ZIP trọn bộ Agent cài đặt cho máy cá nhân (kèm file .bat tự cài lịch Task Scheduler 3 lần/ngày: 9h30, 14h00, 19h00 và khởi động cùng Windows)"
                      >
                        {downloadingAgent ? (
                          <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <Download size={12} color="#1D4ED8" />
                        )}
                        <span>{downloadingAgent ? 'Đang Tải...' : '📥 Tải Bộ Cài Agent (.zip)'}</span>
                      </Button>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#1E40AF', marginTop: '5px', fontStyle: 'italic' }}>
                    💡 Bạn có thể tải gói Agent về máy cá nhân, giải nén và nhấp đúp file <strong>"Cai_Dat_Tu_Dong_Schedule.bat"</strong> để tự động cài đặt lịch chạy 3 lần/ngày (09:30, 14:00, 19:00) và khởi động cùng Windows.
                  </div>
                </div>
              </div>
            </div>

            {/* Scan Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Quét mail trong vòng:
                </label>
                <select
                  value={mailMemoLookbackDays}
                  onChange={(e) => setMailMemoLookbackDays(Number(e.target.value))}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value={7}>7 ngày gần nhất</option>
                  <option value={14}>14 ngày gần nhất</option>
                  <option value={30}>30 ngày gần nhất</option>
                  <option value={60}>60 ngày gần nhất</option>
                  <option value={90}>90 ngày gần nhất</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={fetchMailMemoStatus}
                  disabled={loadingMailMemoStatus}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <RefreshCw size={13} style={{ animation: loadingMailMemoStatus ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Làm Mới</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleRunMailMemoScan}
                  disabled={scanningMailMemo}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563EB',
                    borderColor: '#1D4ED8',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  {scanningMailMemo ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang Quét Mail...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      <span>Quét & Tự Động Import Memo</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Last Scan Result Banner if available */}
            {mailMemoLastScanResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #A7F3D0',
                  backgroundColor: '#ECFDF5',
                  fontSize: '12px',
                  color: '#065F46',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontWeight: 700 }}>Kết Quả Lần Quét Vừa Rồi:</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>Số mail tìm thấy: <strong>{mailMemoLastScanResult.total_found ?? 0}</strong></span>
                  <span style={{ color: '#047857' }}>Import mới thành công: <strong>+{mailMemoLastScanResult.total_imported ?? 0}</strong></span>
                  <span style={{ color: '#6B7280' }}>Bỏ qua trùng mã: <strong>{mailMemoLastScanResult.total_skipped ?? 0}</strong></span>
                </div>
              </div>
            )}

            {/* Recent Imported Memos Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Danh Sách Memo Nhập Gần Đây (Tổng đã import: {mailMemoStatus?.total_imported ?? 0})
                </span>
              </div>
              <div
                style={{
                  maxHeight: '360px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '50px' }}>STT</th>
                      <th style={{ padding: '8px 10px', width: '130px' }}>Mã Memo</th>
                      <th style={{ padding: '8px 10px' }}>Tên Memo</th>
                      <th style={{ padding: '8px 10px', width: '130px' }}>Người Yêu Cầu</th>
                      <th style={{ padding: '8px 10px', width: '120px' }}>IT Phụ Trách</th>
                      <th style={{ padding: '8px 10px', width: '130px' }}>Thời Gian</th>
                      <th style={{ padding: '8px 10px', width: '90px' }}>Salesforce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!mailMemoStatus?.recent_items || mailMemoStatus.recent_items.length === 0) ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Chưa có memo nào được import từ mail gần đây. Bấm "Quét & Tự Động Import Memo" để quét.
                        </td>
                      </tr>
                    ) : (
                      mailMemoStatus.recent_items.map((m, idx) => (
                        <tr
                          key={m.memo_id || idx}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)'
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace', color: '#2563EB' }}>
                            {m.memo_code}
                            {m.total_sub && m.total_sub > 1 ? (
                              <span style={{ fontSize: '10px', color: '#6B7280', marginLeft: '4px' }}>
                                ({m.total_sub} sub)
                              </span>
                            ) : null}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>{m.ten_memo}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{m.nguoi_yeu_cau || '-'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#E0E7FF',
                                color: '#3730A3',
                                fontWeight: 600,
                                fontSize: '11px'
                              }}
                            >
                              {m.it_setup || 'Chưa gán'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                            {m.imported_at || m.received_time || '-'}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {m.link_salesforce ? (
                              <a
                                href={m.link_salesforce}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: '#0284C7',
                                  textDecoration: 'underline',
                                  fontSize: '11px',
                                  fontWeight: 600
                                }}
                              >
                                Mở Link
                              </a>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowMailMemoModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Bảng Kết Quả Quét MongoDB & Mosquitto */}
      {showMongoMosquittoModal && (
        <Modal
          isOpen={showMongoMosquittoModal}
          onClose={() => setShowMongoMosquittoModal(false)}
          title="Bảng Kết Quả Quét MongoDB Server & Mosquitto Broker Nhà Hàng"
          maxWidth="1200px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info banner */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #A7F3D0',
                backgroundColor: '#ECFDF5',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Server size={18} color="#059669" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#065F46' }}>
                    Kiểm tra dịch vụ MongoDB (Port 27017) & Mosquitto Broker (Port 1883)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: mongoMosquittoData?.total_error === 0 ? '#DEF7EC' : '#FDE8E8',
                      color: mongoMosquittoData?.total_error === 0 ? '#03543F' : '#9B1C1C',
                      border: `1px solid ${mongoMosquittoData?.total_error === 0 ? '#31C48D' : '#F98080'}`
                    }}
                  >
                    {mongoMosquittoData?.total_error === 0 ? '🟢 Tất cả NH đều đạt chuẩn' : `🔴 Có ${mongoMosquittoData?.total_error || 0} NH bị lỗi/thiếu service`}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.5 }}>
                <div><strong>Cơ chế kiểm tra:</strong> Dò quét các máy đại diện theo thứ tự <strong>.41</strong> → <strong>.11</strong> → <strong>.12</strong>. Chỉ cần 1 máy có đủ 2 port (27017 & 1883) mở thì nhà hàng được tính là <strong>Đạt Chuẩn OK</strong>.</div>
                <div><strong>Loại trừ:</strong> Tự động bỏ qua các chuỗi <strong>TCH, UT, Universal, Tea, Thecoffeehouse</strong> và NH không hoạt động.</div>
                <div><strong>Quy tắc gửi Email:</strong> Chỉ gửi email cảnh báo khi có ít nhất 1 nhà hàng bị lỗi. Nếu 100% NH đạt chuẩn thì hệ thống sẽ <strong>tự động bỏ qua không gửi email</strong>.</div>
                {mongoMosquittoData?.scan_time && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#065F46' }}>
                    🕒 Quét gần nhất: <strong>{mongoMosquittoData.scan_time}</strong> (Thời gian quét: {mongoMosquittoData.duration_seconds}s) | 📧 {mongoMosquittoData.email_status}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Tổng NH Đã Quét</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {mongoMosquittoData?.total_scanned ?? '-'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Hoạt động ON</div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #A7F3D0', backgroundColor: '#F0FDF4', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Đạt Chuẩn OK</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#15803D', marginTop: '4px' }}>
                  {mongoMosquittoData?.total_ok ?? '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>Đủ cả 2 service</div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #FECACA', backgroundColor: '#FEF2F2', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600, textTransform: 'uppercase' }}>Bị Lỗi / Thiếu Service</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#DC2626', marginTop: '4px' }}>
                  {mongoMosquittoData?.total_error ?? '-'}
                </div>
                <div style={{ fontSize: '11px', color: '#991B1B', marginTop: '2px' }}>Cần kiểm tra lại</div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Đã Bỏ Qua</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#6B7280', marginTop: '4px' }}>
                  {mongoMosquittoData?.total_excluded ?? '-'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>TCH / UT / Tea</div>
              </div>
            </div>

            {/* Filter and Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '340px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={mongoMosquittoSearch}
                    onChange={(e) => setMongoMosquittoSearch(e.target.value)}
                    placeholder="Tìm mã SAP, tên NH, subnet, IP..."
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 32px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                  />
                  {mongoMosquittoSearch && (
                    <button
                      type="button"
                      onClick={() => setMongoMosquittoSearch('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setMongoMosquittoFilter('all')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: mongoMosquittoFilter === 'all' ? '#2563EB' : 'var(--bg-primary)',
                      color: mongoMosquittoFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Tất cả ({mongoMosquittoData?.total_scanned ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMongoMosquittoFilter('error')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #FECACA',
                      backgroundColor: mongoMosquittoFilter === 'error' ? '#DC2626' : '#FEF2F2',
                      color: mongoMosquittoFilter === 'error' ? '#fff' : '#DC2626',
                      cursor: 'pointer'
                    }}
                  >
                    Bị Lỗi ({mongoMosquittoData?.total_error ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMongoMosquittoFilter('ok')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #A7F3D0',
                      backgroundColor: mongoMosquittoFilter === 'ok' ? '#16A34A' : '#F0FDF4',
                      color: mongoMosquittoFilter === 'ok' ? '#fff' : '#16A34A',
                      cursor: 'pointer'
                    }}
                  >
                    Đạt Chuẩn OK ({mongoMosquittoData?.total_ok ?? 0})
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={fetchMongoMosquittoData}
                  disabled={loadingMongoMosquitto || scanningMongoMosquitto || scanningMongoMosquittoErrors}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    cursor: (loadingMongoMosquitto || scanningMongoMosquitto || scanningMongoMosquittoErrors) ? 'not-allowed' : 'pointer'
                  }}
                  title="Tải lại kết quả lưu trong hệ thống"
                >
                  <RefreshCw size={12} className={loadingMongoMosquitto ? 'animate-spin' : ''} />
                  <span>Tải Lại</span>
                </button>

                <button
                  type="button"
                  onClick={handleScanMongoMosquittoErrorsNow}
                  disabled={scanningMongoMosquittoErrors || scanningMongoMosquitto || (mongoMosquittoData?.total_error === 0)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (mongoMosquittoData?.total_error ?? 0) > 0 ? '#DC2626' : '#9CA3AF',
                    color: '#fff',
                    cursor: (scanningMongoMosquittoErrors || scanningMongoMosquitto || (mongoMosquittoData?.total_error === 0)) ? 'not-allowed' : 'pointer',
                    boxShadow: (mongoMosquittoData?.total_error ?? 0) > 0 ? '0 1px 2px rgba(220, 38, 38, 0.25)' : 'none'
                  }}
                  title="Chỉ quét lại các nhà hàng hiện đang bị lỗi để cập nhật sau khi xử lý"
                >
                  {scanningMongoMosquittoErrors ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang Quét Lại Lỗi...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      <span>Quét Lại ({(mongoMosquittoData?.total_error || 0)}) Nhà Lỗi</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleScanMongoMosquittoNow}
                  disabled={scanningMongoMosquitto || scanningMongoMosquittoErrors}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#fff',
                    cursor: (scanningMongoMosquitto || scanningMongoMosquittoErrors) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)'
                  }}
                  title="Quét tức thì toàn bộ nhà hàng và cập nhật kết quả"
                >
                  {scanningMongoMosquitto ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang Quét...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} style={{ fill: '#fff' }} />
                      <span>Quét Lại Toàn Bộ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div
              style={{
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-primary)'
              }}
            >
              <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 10px', width: '40px', color: 'var(--text-secondary)' }}>STT</th>
                      <th style={{ padding: '8px 10px', width: '70px', color: 'var(--text-secondary)' }}>Mã SAP</th>
                      <th style={{ padding: '8px 10px', minWidth: '180px', color: 'var(--text-secondary)' }}>Tên Nhà Hàng</th>
                      <th style={{ padding: '8px 10px', width: '110px', color: 'var(--text-secondary)' }}>Dải Subnet</th>
                      <th style={{ padding: '8px 10px', width: '120px', color: 'var(--text-secondary)' }}>Máy Đại Diện</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center', color: 'var(--text-secondary)' }}>MongoDB (27017)</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center', color: 'var(--text-secondary)' }}>Mosquitto (1883)</th>
                      <th style={{ padding: '8px 10px', width: '85px', textAlign: 'center', color: 'var(--text-secondary)' }}>Đánh Giá</th>
                      <th style={{ padding: '8px 10px', minWidth: '200px', color: 'var(--text-secondary)' }}>Chi Tiết / Ghi Chú</th>
                      <th style={{ padding: '8px 10px', width: '85px', textAlign: 'center', color: 'var(--text-secondary)' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMongoMosquitto ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                          <div>Đang tải danh sách kết quả...</div>
                        </td>
                      </tr>
                    ) : filteredMongoMosquittoItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          Chưa có dữ liệu hoặc không tìm thấy nhà hàng nào phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredMongoMosquittoItems.map((item, idx) => (
                        <tr
                          key={item.restaurant_id || idx}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: !item.is_ok ? 'rgba(254, 242, 242, 0.5)' : (idx % 2 === 0 ? 'var(--bg-primary)' : 'rgba(0,0,0,0.015)')
                          }}
                        >
                          <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, fontFamily: 'monospace', color: '#2563EB' }}>
                            {item.sap_code}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {item.restaurant_name}
                            {item.brand_name && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                                ({item.brand_name})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                            {item.subnet}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, fontFamily: 'monospace', color: item.is_ok ? '#059669' : '#DC2626' }}>
                            {item.representative_ip}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: item.mongo_ok ? '#DEF7EC' : '#FDE8E8',
                                color: item.mongo_ok ? '#03543F' : '#9B1C1C'
                              }}
                            >
                              {item.mongo_ok ? 'Running' : 'Tắt / Lỗi'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: item.mosquitto_ok ? '#DEF7EC' : '#FDE8E8',
                                color: item.mosquitto_ok ? '#03543F' : '#9B1C1C'
                              }}
                            >
                              {item.mosquitto_ok ? 'Running' : 'Tắt / Lỗi'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: item.is_ok ? '#10B981' : '#EF4444',
                                color: '#fff'
                              }}
                            >
                              {item.is_ok ? 'OK' : 'LỖI'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: item.is_ok ? 'var(--text-secondary)' : '#DC2626', fontSize: '11px' }}>
                            {item.note}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleScanSingleRestaurant(item.sap_code)}
                              disabled={scanningSingleSap === item.sap_code || scanningMongoMosquitto || scanningMongoMosquittoErrors}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 7px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: scanningSingleSap === item.sap_code ? '#FEF3C7' : 'var(--bg-primary)',
                                color: !item.is_ok ? '#DC2626' : 'var(--text-secondary)',
                                cursor: (scanningSingleSap === item.sap_code || scanningMongoMosquitto || scanningMongoMosquittoErrors) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Kiểm tra lại kết nối port riêng cho nhà [${item.sap_code}]`}
                            >
                              <RefreshCw size={10} className={scanningSingleSap === item.sap_code ? 'animate-spin' : ''} />
                              <span>{scanningSingleSap === item.sap_code ? 'Đang quét...' : 'Quét lại'}</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Hiển thị <strong>{filteredMongoMosquittoItems.length}</strong> / <strong>{mongoMosquittoData?.total_scanned ?? 0}</strong> nhà hàng
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowMongoMosquittoModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Rà Soát Thông Tin Nhà Hàng Còn Thiếu */}
      {showRestaurantAuditModal && (
        <Modal
          isOpen={showRestaurantAuditModal}
          onClose={() => setShowRestaurantAuditModal(false)}
          title="Rà Soát Thông Tin Nhà Hàng Còn Thiếu"
          maxWidth="1150px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info banner */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid #93C5FD',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ListChecks size={18} color="#2563EB" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1E40AF' }}>
                    Rà Soát Dữ Liệu Hồ Sơ Nhà Hàng & Ping Tín Hiệu Router / VPN
                  </span>
                </div>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#DEF7EC',
                    color: '#03543F',
                    border: '1px solid #31C48D'
                  }}
                >
                  🟢 Tự Động Lọc & Ping Tín Hiệu Router
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>
                <div>
                  <strong>Tiêu chuẩn thông tin:</strong>{' '}
                  Mã SAP (4 hoặc 5 số) &bull; Cost Center (&ge; 5 ký tự) &bull; Mã RK7 (&ge; 3 số) &bull; Ngày Khai Trương (Khác 01/01/1999) &bull; Trạng thái hoạt động (ON mới tính là xong, NEW chưa xong, OFF bỏ qua).
                </div>
                <div>
                  <strong>Cơ chế Ping thông minh:</strong>{' '}
                  Nếu nhà hàng còn thiếu thông tin, hệ thống tự động ping kiểm tra tín hiệu router (.1).
                  Nếu <strong>Mất tín hiệu (Offline)</strong> &rarr; Xem như chưa hoạt động, <strong>đánh dấu bỏ qua</strong> (không gửi mail).
                  Nếu <strong>Có tín hiệu (Online)</strong> &rarr; Nhà hàng đang hoạt động thực tế nhưng chưa hoàn thiện hồ sơ &rarr; <strong>Đánh dấu CẦN BỔ SUNG</strong> và thông báo email.
                </div>
                {restaurantAuditResult?.target_time && (
                  <div style={{ color: '#4B5563', fontSize: '11px', marginTop: '4px' }}>
                    Lần rà soát gần nhất trên Server: <strong>{restaurantAuditResult.target_time}</strong>
                  </div>
                )}

                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #BFDBFE', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span><strong>🖥️ Ping Tín Hiệu Local Server:</strong> Ping ICMP trực tiếp tới IP Router/VPN (.1) với cơ chế Retry chống báo lỗi giả</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: (restaurantAuditResult?.need_reminder_count ?? 0) > 0 ? '#FEE2E2' : '#DEF7EC',
                          color: (restaurantAuditResult?.need_reminder_count ?? 0) > 0 ? '#DC2626' : '#03543F',
                          border: `1px solid ${(restaurantAuditResult?.need_reminder_count ?? 0) > 0 ? '#FCA5A5' : '#31C48D'}`
                        }}
                      >
                        {(restaurantAuditResult?.need_reminder_count ?? 0) > 0
                          ? `🔴 ${restaurantAuditResult?.need_reminder_count} NH Cần Bổ Sung`
                          : '🟢 0 NH Cần Bổ Sung'}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handleCopyAllRestaurantAuditReminders}
                        disabled={!restaurantAuditResult || (restaurantAuditResult.need_reminder_count === 0)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          padding: '3px 10px',
                          backgroundColor: '#FFFFFF',
                          borderColor: '#2563EB',
                          color: '#1D4ED8',
                          fontWeight: 700,
                          borderRadius: '6px',
                          boxShadow: '0 1px 2px rgba(37, 99, 235, 0.1)'
                        }}
                        title="Sao chép toàn bộ danh sách lời nhắc nhở cho các nhà hàng online cần bổ sung (để gửi Zalo / Teams / Email)"
                      >
                        {copiedAllRestaurantAudit ? <Check size={12} color="#16A34A" /> : <Copy size={12} color="#1D4ED8" />}
                        <span>{copiedAllRestaurantAudit ? 'Đã Sao Chép Toàn Bộ!' : '📋 Sao Chép Toàn Bộ Nhắc Nhở'}</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setShowAuditEmailPrompt(true)}
                        disabled={!restaurantAuditResult || (restaurantAuditResult.need_reminder_count === 0)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          padding: '3px 10px',
                          backgroundColor: '#FFFFFF',
                          borderColor: '#059669',
                          color: '#065F46',
                          fontWeight: 700,
                          borderRadius: '6px',
                          boxShadow: '0 1px 2px rgba(5, 150, 105, 0.1)'
                        }}
                        title="Gửi email nhắc nhở bổ sung dữ liệu tới bộ phận phụ trách"
                      >
                        <Send size={12} color="#059669" />
                        <span>✉️ Gửi Email Nhắc Nhở</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={handleOpenExclusionModal}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          padding: '3px 10px',
                          backgroundColor: '#FFFFFF',
                          borderColor: '#8B5CF6',
                          color: '#6D28D9',
                          fontWeight: 700,
                          borderRadius: '6px',
                          boxShadow: '0 1px 2px rgba(139, 92, 246, 0.1)'
                        }}
                        title="Cấu hình danh sách các nhà hàng / thương hiệu loại bỏ mặc định khỏi đợt rà soát (The Coffee House, TCH, Universal, TEA...)"
                      >
                        <Sliders size={12} color="#7C3AED" />
                        <span>🚫 Cấu Hình Loại Bỏ ({restaurantAuditResult?.excluded_count ?? auditExcludedKeywords.length})</span>
                      </Button>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#1E40AF', marginTop: '5px', fontStyle: 'italic' }}>
                    💡 Chỉ những nhà hàng <strong>ĐANG HOẠT ĐỘNG (Ping thấy tín hiệu Router)</strong> mới đưa vào danh sách thông báo mail nhắc nhở. Các nhà hàng thuộc danh sách loại bỏ (TCH, Universal, TEA...) hoặc mất mạng sẽ tự động được bỏ qua.
                  </div>
                </div>
              </div>
            </div>

            {/* Scan Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Bộ lọc:
                  </label>
                  <select
                    value={restaurantAuditFilter}
                    onChange={(e) => setRestaurantAuditFilter(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      fontWeight: 600
                    }}
                  >
                    <option value="need_reminder">🔴 Cần bổ sung ({restaurantAuditResult?.need_reminder_count ?? 0} nhà)</option>
                    <option value="valid">🟢 Đầy đủ thông tin ({restaurantAuditResult?.valid_count ?? 0} nhà)</option>
                    <option value="all">Tất cả ({restaurantAuditResult?.all_items?.length ?? 0} nhà đang hoạt động)</option>
                  </select>
                </div>

                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={restaurantAuditSearch}
                    onChange={(e) => setRestaurantAuditSearch(e.target.value)}
                    placeholder="Tìm tên NH, mã SAP, IP..."
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--input-bg, #fff)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={fetchRestaurantAuditLatest}
                  disabled={loadingRestaurantAudit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                >
                  <RefreshCw size={13} style={{ animation: loadingRestaurantAudit ? 'spin 1s linear infinite' : 'none' }} />
                  <span>Làm Mới</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleRunRestaurantAuditScan}
                  disabled={scanningRestaurantAudit}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563EB',
                    borderColor: '#1D4ED8',
                    color: '#fff',
                    fontWeight: 700
                  }}
                >
                  {scanningRestaurantAudit ? (
                    <>
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang Rà Soát & Ping Router...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      <span>Rà Soát Ngay</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Last Scan Result Banner if available */}
            {restaurantAuditResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${(restaurantAuditResult.need_reminder_count > 0) ? '#FECACA' : '#A7F3D0'}`,
                  backgroundColor: (restaurantAuditResult.need_reminder_count > 0) ? '#FEF2F2' : '#ECFDF5',
                  fontSize: '12px',
                  color: (restaurantAuditResult.need_reminder_count > 0) ? '#991B1B' : '#065F46',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontWeight: 700 }}>Kết Quả Lần Rà Soát Vừa Rồi ({restaurantAuditResult.target_time}):</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <span>Tổng số nhà hàng: <strong>{restaurantAuditResult.total_scanned}</strong></span>
                  <span style={{ color: '#059669' }}>Đầy đủ thông tin: <strong>{restaurantAuditResult.valid_count}</strong></span>
                  <span style={{ color: '#DC2626' }}>Online CẦN BỔ SUNG: <strong>{restaurantAuditResult.need_reminder_count}</strong></span>
                  <span style={{ color: '#6B7280' }}>Bỏ qua (Chưa hoạt động / Mất mạng): <strong>{restaurantAuditResult.skipped_offline_count}</strong></span>
                  <span style={{ color: '#7C3AED' }}>Loại bỏ theo cấu hình: <strong>{restaurantAuditResult.excluded_count ?? 0}</strong></span>
                </div>
              </div>
            )}

            {/* Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Danh Sách Nhà Hàng Rà Soát (Hiển thị: {filteredRestaurantAuditItems.length}/{restaurantAuditResult?.all_items?.length ?? 0})
                </span>
                {restaurantAuditResult?.need_reminder_count ? (
                  <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                    ⚠️ Phát hiện {restaurantAuditResult.need_reminder_count} nhà hàng online chưa đầy đủ thông tin
                  </span>
                ) : null}
              </div>

              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '8px 10px', minWidth: '200px' }}>Tên Nhà Hàng</th>
                      <th style={{ padding: '8px 8px', width: '70px', textAlign: 'center' }}>Mã SAP</th>
                      <th style={{ padding: '8px 8px', width: '90px', textAlign: 'center' }}>Cost Center</th>
                      <th style={{ padding: '8px 8px', width: '70px', textAlign: 'center' }}>Mã RK7</th>
                      <th style={{ padding: '8px 8px', width: '95px', textAlign: 'center' }}>Ngày KT</th>
                      <th style={{ padding: '8px 8px', width: '105px', textAlign: 'center' }}>IP Router</th>
                      <th style={{ padding: '8px 8px', width: '95px', textAlign: 'center' }}>Tín Hiệu</th>
                      <th style={{ padding: '8px 10px', minWidth: '220px' }}>Mục Còn Thiếu</th>
                      <th style={{ padding: '8px 8px', width: '125px', textAlign: 'center' }}>Kết Luận</th>
                      <th style={{ padding: '8px 8px', width: '80px', textAlign: 'center' }}>Sao Chép</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRestaurantAuditItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {loadingRestaurantAudit ? 'Đang tải dữ liệu rà soát...' : 'Chưa có dữ liệu rà soát nào hoặc không tìm thấy kết quả phù hợp. Bấm "Rà Soát Ngay" để quét.'}
                        </td>
                      </tr>
                    ) : (
                      filteredRestaurantAuditItems.map((item, idx) => {
                        const isNeed = item.category === 'need_reminder';
                        const isOffline = item.category === 'skipped_offline';
                        const isExcluded = item.category === 'excluded';
                        const isCopied = copiedRestaurantId === item.id;

                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isNeed ? '#FEF2F2' : isExcluded ? '#FAF5FF' : (idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'),
                              transition: 'background-color 0.15s'
                            }}
                          >
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              <div>{item.res}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                                Trạng thái DB: {item.trangthai}
                                {item.brand && ` • Thương hiệu: ${item.brand}`}
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                              {item.missing_fields.includes('Thiếu Mã SAP') ? (
                                <span style={{ color: '#DC2626', fontWeight: 700 }}>{item.sap} ⚠️</span>
                              ) : (
                                <span>{item.sap}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                              {item.missing_fields.includes('Thiếu Cost Center') ? (
                                <span style={{ color: '#DC2626', fontWeight: 700 }}>{item.coscenter} ⚠️</span>
                              ) : (
                                <span>{item.coscenter}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontFamily: 'monospace' }}>
                              {item.missing_fields.includes('Thiếu Mã RK7') ? (
                                <span style={{ color: '#DC2626', fontWeight: 700 }}>{item.rk7} ⚠️</span>
                              ) : (
                                <span>{item.rk7}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: '11px' }}>
                              {item.missing_fields.includes('Thiếu Ngày Khai Trương') || item.missing_fields.some(m => m.includes('01/01/1999')) ? (
                                <span style={{ color: '#DC2626', fontWeight: 700 }}>{item.ngay_khaitruong} ⚠️</span>
                              ) : (
                                <span>{item.ngay_khaitruong}</span>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px' }}>
                              {item.ip}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                              {isExcluded ? (
                                <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EDE9FE', color: '#7C3AED' }}>
                                  🚫 Bỏ Qua
                                </span>
                              ) : item.is_up ? (
                                <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DEF7EC', color: '#03543F', border: '1px solid #31C48D' }}>
                                  🟢 Online
                                </span>
                              ) : item.category === 'valid' ? (
                                <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E0E7FF', color: '#3730A3' }}>
                                  🟢 Đầy Đủ
                                </span>
                              ) : (
                                <span style={{ padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #D1D5DB' }}>
                                  ⚪ Mất Tín Hiệu
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {isExcluded ? (
                                <span style={{ color: '#7C3AED', fontSize: '11px', fontStyle: 'italic', fontWeight: 500 }}>
                                  Loại trừ theo cấu hình ({item.matched_keyword})
                                </span>
                              ) : item.missing_fields.length === 0 ? (
                                <span style={{ color: '#059669', fontSize: '11px', fontWeight: 600 }}>✓ Đầy đủ thông tin</span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {item.missing_fields.map((mf, mi) => (
                                    <span
                                      key={mi}
                                      style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        backgroundColor: isNeed ? '#FEE2E2' : '#F3F4F6',
                                        color: isNeed ? '#DC2626' : '#6B7280',
                                        border: `1px solid ${isNeed ? '#FCA5A5' : '#D1D5DB'}`
                                      }}
                                    >
                                      {mf}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                              {isExcluded ? (
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#EDE9FE', color: '#6D28D9', border: '1px solid #C4B5FD', display: 'inline-block' }}>
                                  🚫 Loại Bỏ ({item.matched_keyword || 'Cấu hình'})
                                </span>
                              ) : isNeed ? (
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DC2626', color: '#fff' }}>
                                  🔴 Cần Bổ Sung
                                </span>
                              ) : isOffline ? (
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#E5E7EB', color: '#4B5563' }}>
                                  ⚪ Bỏ Qua
                                </span>
                              ) : (
                                <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#DEF7EC', color: '#03543F' }}>
                                  🟢 Đầy Đủ
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'center' }}>
                              {item.is_missing && !isExcluded ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => handleCopySingleRestaurantReminder(item)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '3px 7px',
                                    fontSize: '11px',
                                    backgroundColor: isCopied ? '#ECFDF5' : '#fff',
                                    borderColor: isCopied ? '#10B981' : 'var(--border-color)',
                                    color: isCopied ? '#059669' : 'var(--text-primary)'
                                  }}
                                  title={`Sao chép nội dung nhắc nhở: ${item.res}`}
                                >
                                  {isCopied ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                                  <span>{isCopied ? 'Đã chép' : 'Chép'}</span>
                                </Button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-</span>
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

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Hiển thị <strong>{filteredRestaurantAuditItems.length}</strong> / <strong>{restaurantAuditResult?.all_items?.length ?? 0}</strong> nhà hàng đang hoạt động
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowRestaurantAuditModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sub-modal: Gửi Email Nhắc Nhở Bổ Sung Dữ Liệu */}
      {showAuditEmailPrompt && (
        <Modal
          isOpen={showAuditEmailPrompt}
          onClose={() => setShowAuditEmailPrompt(false)}
          title="Gửi Email Nhắc Nhở Bổ Sung Thông Tin Nhà Hàng"
          maxWidth="550px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Hệ thống sẽ gửi email báo cáo chi tiết kèm danh sách{' '}
              <strong>{restaurantAuditResult?.need_reminder_count ?? 0} nhà hàng đang hoạt động</strong> còn thiếu thông tin tới các địa chỉ bên dưới:
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Danh sách Email người nhận (ngăn cách bằng dấu phẩy):
              </label>
              <input
                type="text"
                value={auditEmailRecipientsInput}
                onChange={(e) => setAuditEmailRecipientsInput(e.target.value)}
                placeholder="it.helpdesk@ggg.com.vn, dung.nguyenanh@ggg.com.vn"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg, #fff)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAuditEmailPrompt(false)}
                disabled={sendingAuditEmail}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSendAuditEmailNow}
                disabled={sendingAuditEmail || !auditEmailRecipientsInput.trim()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#059669',
                  borderColor: '#047857',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {sendingAuditEmail ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Gửi Email...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Gửi Email Ngay</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Sub-modal: Cấu Hình Danh Sách Nhà Hàng Loại Bỏ Mặc Định */}
      {showAuditExclusionModal && (
        <Modal
          isOpen={showAuditExclusionModal}
          onClose={() => setShowAuditExclusionModal(false)}
          title="Cấu Hình Danh Sách Nhà Hàng Loại Bỏ Mặc Định"
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Info notice */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#F5F3FF',
                border: '1px solid #DDD6FE',
                color: '#5B21B6',
                fontSize: '12px',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={14} color="#7C3AED" />
                <span>Quy tắc loại trừ thông minh:</span>
              </div>
              <div>
                Hệ thống sẽ <strong>tự động bỏ qua</strong> (không rà soát thiếu thông tin, không ping router và không gửi email nhắc nhở) bất kỳ nhà hàng nào có <strong>Tên Nhà Hàng</strong>, <strong>Thương Hiệu</strong>, hoặc <strong>Mã SAP</strong> trùng khớp với danh sách bên dưới.
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#6D28D9', fontStyle: 'italic' }}>
                * Từ viết tắt ngắn (&le; 4 ký tự như TCH, TEA) được so khớp theo từng từ trọn vẹn, không bắt nhầm các tên khác.
              </div>
            </div>

            {/* Add new keyword input */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                + Thêm từ khóa, thương hiệu hoặc mã SAP cần loại bỏ:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newExclusionKeywordInput}
                  onChange={(e) => setNewExclusionKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddExclusionKeyword();
                    }
                  }}
                  placeholder="Ví dụ: The Coffee House, TCH, Universal, TEA, Kho, Xưởng..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg, #fff)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleAddExclusionKeyword}
                  disabled={!newExclusionKeywordInput.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#7C3AED',
                    borderColor: '#6D28D9',
                    color: '#fff',
                    fontWeight: 700,
                    padding: '0 14px'
                  }}
                >
                  <Plus size={13} />
                  <span>Thêm</span>
                </Button>
              </div>
            </div>

            {/* List of active exclusion keywords */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Danh sách đang áp dụng ({auditExcludedKeywords.length} mục):
                </span>
                <button
                  type="button"
                  onClick={handleResetDefaultExclusionKeywords}
                  style={{
                    fontSize: '11px',
                    color: '#2563EB',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                  title="Đặt lại về 4 thương hiệu mặc định: The Coffee House, TCH, Universal, TEA"
                >
                  ↺ Khôi phục mặc định (4 mục)
                </button>
              </div>

              <div
                style={{
                  minHeight: '80px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  alignContent: 'flex-start'
                }}
              >
                {auditExcludedKeywords.length === 0 ? (
                  <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px 0' }}>
                    Chưa có mục nào trong danh sách loại bỏ. Bấm "Khôi phục mặc định" để nạp lại.
                  </div>
                ) : (
                  auditExcludedKeywords.map((kw, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#EDE9FE',
                        color: '#6D28D9',
                        border: '1px solid #C4B5FD',
                        boxShadow: '0 1px 2px rgba(109, 40, 217, 0.08)'
                      }}
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusionKeyword(kw)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '1px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#7C3AED'
                        }}
                        title={`Xóa "${kw}" khỏi danh sách`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setShowAuditExclusionModal(false)}
                disabled={savingExclusionConfig}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSaveExclusionConfigAndRescan}
                disabled={savingExclusionConfig}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#7C3AED',
                  borderColor: '#6D28D9',
                  color: '#fff',
                  fontWeight: 700
                }}
              >
                {savingExclusionConfig ? (
                  <>
                    <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Lưu & Rà Soát...</span>
                  </>
                ) : (
                  <>
                    <Zap size={13} />
                    <span>Lưu Cấu Hình & Rà Soát Lại</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobManagementPage;
