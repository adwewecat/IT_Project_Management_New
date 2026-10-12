import React, { useState } from 'react';
import {
  ListChecks,
  FileText,
  Database,
  Store,
  AlertTriangle,
  ArrowRight,
  Sun,
  Calendar,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PendingSummaryResponse } from '../../services/dashboardService';

export interface DailyPendingTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: PendingSummaryResponse | null;
  userName?: string | null;
  fullName?: string | null;
  isPrivilegedUser: boolean; // dung.nguyenanh, admin, super admin
  onNavigate: (path: string) => void;
}

export const DailyPendingTasksModal: React.FC<DailyPendingTasksModalProps> = ({
  isOpen,
  onClose,
  summary,
  userName,
  fullName,
  isPrivilegedUser,
  onNavigate,
}) => {
  const [scope, setScope] = useState<'my' | 'total'>('my');

  if (!isOpen) return null;

  const now = new Date();
  const todayFormatted = now.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate items based on scope
  const checklistCount = scope === 'my' ? (summary?.items?.checklist?.my ?? 0) : (summary?.items?.checklist?.total ?? 0);
  const memoCount = scope === 'my' ? (summary?.items?.memo?.my ?? 0) : (summary?.items?.memo?.total ?? 0);
  const pimCount = scope === 'my' ? (summary?.items?.pim?.my ?? 0) : (summary?.items?.pim?.total ?? 0);
  const projectsCount = scope === 'my' ? (summary?.items?.projects?.my ?? 0) : (summary?.items?.projects?.total ?? 0);
  const setupNhCount = scope === 'my' ? (summary?.items?.setup_nh?.my ?? 0) : (summary?.items?.setup_nh?.total ?? 0);
  const incidentsCount = scope === 'my' ? (summary?.items?.incidents?.my ?? 0) : (summary?.items?.incidents?.total ?? 0);

  const totalPending = checklistCount + memoCount + pimCount + projectsCount + setupNhCount + incidentsCount;

  const taskModules = [
    {
      key: 'checklist',
      title: 'Checklist Các Công Việc',
      count: checklistCount,
      unit: 'đợt',
      desc: 'Đợt checklist công việc đang thực hiện',
      icon: <ListChecks size={20} color="#D97706" />,
      link: '/app/checklists',
      bgLight: '#FFFBEA',
      borderColor: '#FCD34D',
    },
    {
      key: 'memo',
      title: 'Quản Lý Memo',
      count: memoCount,
      unit: 'memo',
      desc: 'Memo đang tiếp nhận / chờ setup POS',
      icon: <FileText size={20} color="#0284C7" />,
      link: '/app/memo',
      bgLight: '#F0F9FF',
      borderColor: '#BAE6FD',
    },
    {
      key: 'pim',
      title: 'PIM (Menu & Giá Bán)',
      count: pimCount,
      unit: 'yêu cầu',
      desc: 'Yêu cầu SO / Menu đang chờ xử lý',
      icon: <Database size={20} color="#7C3AED" />,
      link: '/pim',
      bgLight: '#F5F3FF',
      borderColor: '#DDD6FE',
    },
    {
      key: 'projects',
      title: 'Quản Lý Dự Án',
      count: projectsCount,
      unit: 'dự án',
      desc: 'Dự án đang triển khai / chưa xong',
      icon: <Briefcase size={20} color="#2563EB" />,
      link: '/app/projects',
      bgLight: '#EFF6FF',
      borderColor: '#BFDBFE',
    },
    {
      key: 'setup_nh',
      title: 'Setup Nhà Hàng Mới',
      count: setupNhCount,
      unit: 'nhà hàng',
      desc: 'Tiến độ checklist setup nhà hàng',
      icon: <Store size={20} color="#059669" />,
      link: '/app/setup-restaurants',
      bgLight: '#ECFDF5',
      borderColor: '#A7F3D0',
    },
    {
      key: 'incidents',
      title: 'Báo Cáo Sự Vụ / Sự Cố',
      count: incidentsCount,
      unit: 'sự vụ',
      desc: 'Sự cố phát sinh chưa giải quyết',
      icon: <AlertTriangle size={20} color="#DC2626" />,
      link: '/app/incidents',
      bgLight: '#FEF2F2',
      borderColor: '#FECACA',
    },
  ];

  const handleGoTo = (link: string) => {
    onClose();
    onNavigate(link);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="720px"
      title={
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
            <Sun size={20} />
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Thông Báo Nhiệm Vụ Đầu Ngày Mới 🌅
            </div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              {todayFormatted}
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Calendar size={14} />
            <span>Thông báo tự động xuất hiện vào lần truy cập đầu tiên mỗi ngày</span>
          </div>
          <Button
            variant="primary"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--color-primary, #F5B800)',
              color: '#111827',
              fontWeight: 700,
              padding: '8px 20px',
            }}
          >
            Đã Nắm Thông Tin & Bắt Đầu
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Banner greeting & scope switch */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
            border: '1px solid #FCD34D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#92400E' }}>
              Xin chào, {fullName || userName || 'Bạn'}!
            </div>
            <div style={{ fontSize: '13px', color: '#B45309', marginTop: '2px' }}>
              Hôm nay bạn có <strong>{totalPending}</strong> công việc tồn đọng cần tập trung xử lý.
            </div>
          </div>

          {isPrivilegedUser && (
            <div
              style={{
                display: 'inline-flex',
                borderRadius: '6px',
                border: '1px solid #FCD34D',
                backgroundColor: '#FFFFFF',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setScope('my')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: scope === 'my' ? 700 : 500,
                  backgroundColor: scope === 'my' ? 'var(--color-primary, #F5B800)' : 'transparent',
                  color: scope === 'my' ? '#111827' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Việc của tôi
              </button>
              <button
                type="button"
                onClick={() => setScope('total')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: scope === 'total' ? 700 : 500,
                  backgroundColor: scope === 'total' ? 'var(--color-primary, #F5B800)' : 'transparent',
                  color: scope === 'total' ? '#111827' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Toàn hệ thống
              </button>
            </div>
          )}
        </div>

        {/* Task Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {taskModules.map((item) => {
            const hasPending = item.count > 0;
            return (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${hasPending ? item.borderColor : 'var(--border-color)'}`,
                  backgroundColor: hasPending ? item.bgLight : 'var(--bg-secondary)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${item.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.title}
                      </span>
                      {hasPending ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#FFFFFF',
                            color: item.key === 'incidents' ? '#DC2626' : '#92400E',
                            border: `1px solid ${item.borderColor}`,
                          }}
                        >
                          {item.count} {item.unit}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            backgroundColor: '#F0FDF4',
                            color: '#16A34A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Đã xong
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGoTo(item.link)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderColor: item.borderColor,
                    backgroundColor: '#FFFFFF',
                    color: 'var(--text-primary)',
                    flexShrink: 0,
                  }}
                >
                  <span>Mở xử lý</span>
                  <ArrowRight size={13} />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
