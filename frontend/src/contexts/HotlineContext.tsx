import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { hotlineService } from '../services/hotlineService';
import { HotlineCallData } from '../types/hotline';
import { useAuth } from './AuthContext';
import { checkIsSuperAdmin, checkIsDungOrSuperAdmin } from '../utils/authUtils';

import { UserInfo } from '../types/auth';

function getIpPrefix(ip?: string | null): string {
  if (!ip) return '';
  const clean = ip.replace(/[^0-9.]/g, '.').replace(/\.+$/, '');
  const parts = clean.split('.');
  if (parts.length >= 3) {
    return parts.slice(0, 3).join('.') + '.';
  }
  return '';
}

function isAgentMatch(dutyUser?: string | null, curUser?: UserInfo | null): boolean {
  if (!curUser) return false;
  if (!dutyUser) return true; // Cuộc gọi chung cho cả team
  const d = dutyUser.trim().toLowerCase();
  const u = (curUser.username || '').trim().toLowerCase();
  if (!d) return true;
  if (!u) return false;
  if (d === '3cx pwa client' || d === 'pbx server' || d === 'ring group') return true;

  // 1. Hỗ trợ danh sách nhiều agent ngăn cách bằng dấu phẩy, chấm phẩy hoặc sổ đứng (vd 'dung.nguyenanh,tri.tnm')
  const agents = d.split(/[,;|]/).map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (agents.includes(u)) return true;

  // 2. Chuẩn hóa loại bỏ ký tự đặc biệt để so sánh
  const cleanU = u.replace(/[^a-z0-9]/g, '');
  for (const agent of agents) {
    if (agent === u) return true;
    const cleanD = agent.replace(/[^a-z0-9]/g, '');
    if (cleanD === cleanU) return true;
    if (cleanD.length >= 3 && cleanU.length >= 3 && (cleanU.includes(cleanD) || cleanD.includes(cleanU))) return true;

    // So sánh với mã nhân viên / máy nhánh EXT (manv) nếu có
    if (curUser.manv) {
      const cleanManv = curUser.manv.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanManv && (cleanManv === cleanD || cleanD.includes(cleanManv))) return true;
    }

    // So sánh email prefix nếu có
    if (curUser.email) {
      const emailPrefix = curUser.email.split('@')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (emailPrefix === cleanD || (cleanD.length >= 3 && (emailPrefix.includes(cleanD) || cleanD.includes(emailPrefix)))) return true;
    }

    // So sánh họ tên không dấu (ví dụ: "Nguyen Anh Dung" -> "nguyenanhdung" match với "nguyenanh")
    if (curUser.full_name) {
      const cleanName = curUser.full_name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      if (cleanName.includes(cleanD) && cleanD.length >= 3) return true;
    }

    // Quản trị viên / Super Admin bí danh
    if (curUser.is_super_admin && (cleanD.includes('dung') || cleanD.includes('nguyenanh') || cleanD.includes('admin'))) {
      return true;
    }
  }

  return false;
}

interface HotlineContextType {
  isHotlineActive: boolean;
  toggleHotlineDuty: () => Promise<void>;
  missedHotlineCount: number;
  setMissedHotlineCount: React.Dispatch<React.SetStateAction<number>>;
  incomingCall: HotlineCallData | null;
  dismissIncomingCall: () => void;
  isMissedCallsModalOpen: boolean;
  openMissedCallsModal: () => void;
  closeMissedCallsModal: () => void;
  isGuideModalOpen: boolean;
  openGuideModal: () => void;
  closeGuideModal: () => void;
  vncModalOpen: boolean;
  vncRestaurantName: string;
  vncIpPrefix: string;
  openVncModal: (restaurantName: string, ipPrefix: string) => void;
  closeVncModal: () => void;
  hotlineToast: { message: string; type: 'info' | 'success' | 'warning' } | null;
  setHotlineToast: React.Dispatch<React.SetStateAction<{ message: string; type: 'info' | 'success' | 'warning' } | null>>;
  latestNonRestaurantCall: {
    id: number;
    ext: string;
    caller_raw_text?: string | null;
    restaurant_name?: string | null;
    call_status: string;
    created_at?: string;
  } | null;
  dismissNonRestaurantCall: () => void;
  canAccessHotline: boolean;
  canManageHotline: boolean;
  refreshMissedCount: () => Promise<void>;
}

const HotlineContext = createContext<HotlineContextType | undefined>(undefined);

export const HotlineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Trạng thái bật/tắt trực hotline (mặc định BẬT cho người có quyền để máy mới không bị mất thông báo)
  const [isHotlineActive, setIsHotlineActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('hotline_duty_active');
    if (saved !== null) return saved === 'true';
    return true;
  });

  // Số lượng cuộc gọi nhỡ (Badge)
  const [missedHotlineCount, setMissedHotlineCount] = useState<number>(0);

  // Cuộc gọi đến hiện tại
  const [incomingCall, setIncomingCall] = useState<HotlineCallData | null>(null);

  // Cuộc gọi không phải nhà hàng gần nhất (để hiển thị thanh thông báo trên trang Danh Sách Nhà Hàng)
  const [latestNonRestaurantCall, setLatestNonRestaurantCall] = useState<{
    id: number;
    ext: string;
    caller_raw_text?: string | null;
    restaurant_name?: string | null;
    call_status: string;
    created_at?: string;
  } | null>(null);
  const [dismissedCallId, setDismissedCallId] = useState<number | null>(null);

  // Modal cuộc gọi nhỡ (2 Tab)
  const [isMissedCallsModalOpen, setIsMissedCallsModalOpen] = useState<boolean>(false);

  // Modal hướng dẫn cài đặt 3CX PWA
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);

  // Modal VNC/KDS kết nối từ xa
  const [vncModalOpen, setVncModalOpen] = useState<boolean>(false);
  const [vncRestaurantName, setVncRestaurantName] = useState<string>('');
  const [vncIpPrefix, setVncIpPrefix] = useState<string>('');

  // Toast thông báo hotline
  const [hotlineToast, setHotlineToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Phân quyền trực hotline
  const [canAccessHotline, setCanAccessHotline] = useState<boolean>(false);
  const [canManageHotline, setCanManageHotline] = useState<boolean>(false);

  // Ref chống spam toast timer
  const toastTimerRef = useRef<any>(null);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'warning', duration = 8000) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setHotlineToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setHotlineToast(null);
    }, duration);
  }, []);

  // Âm báo nhẹ khi có cuộc gọi đến
  const playHotlineBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (_) {}
  }, []);

  // Kiểm tra phân quyền trực hotline
  useEffect(() => {
    if (!user) {
      setCanAccessHotline(false);
      setCanManageHotline(false);
      return;
    }

    const isPrivileged = checkIsDungOrSuperAdmin(user) || checkIsSuperAdmin(user);
    if (isPrivileged) {
      setCanAccessHotline(true);
      setCanManageHotline(true);
      return;
    }

    // 1. Kiểm tra trực tiếp từ permissions trong token/user state (phân quyền RBAC từ DB)
    const hasDutyPermission = Boolean(
      user.permissions?.['hotline_3cx_duty'] ||
      user.permissions?.['view_hotline_3cx_duty'] ||
      user.permissions?.['update_hotline_3cx_duty']
    );

    if (hasDutyPermission) {
      setCanAccessHotline(true);
      setCanManageHotline(Boolean(user.permissions?.['update_hotline_3cx_duty'] || user.permissions?.['hotline_3cx_duty']));
      return;
    }

    // 2. Kiểm tra qua API backend
    const userRoles = (user.roles || []).join(',');
    hotlineService
      .checkUserPermission(user.username, userRoles, false)
      .then((res) => {
        setCanAccessHotline(res.can_access || hasDutyPermission);
        setCanManageHotline(res.can_manage || hasDutyPermission);
      })
      .catch(() => {
        // Fallback: nếu lỗi kiểm tra API thì cho phép nếu role là admin, helpdesk, app hoặc có permission
        const rolesLower = (user.roles || []).map((r) => r.toLowerCase());
        const hasAccess = rolesLower.includes('admin') || rolesLower.includes('helpdesk') || rolesLower.includes('app') || hasDutyPermission;
        setCanAccessHotline(hasAccess);
        setCanManageHotline(hasAccess);
      });
  }, [user]);

  // Ref chống lặp xử lý cuộc gọi reo
  const lastHandledVncCallIdRef = useRef<number | null>(null);
  const lastAlertedNonResCallIdRef = useRef<number | null>(null);
  const dismissedCallIdsRef = useRef<Set<number>>(new Set());

  // Đóng/Ẩn banner thông báo cuộc gọi không phải nhà hàng
  const dismissNonRestaurantCall = useCallback(() => {
    if (latestNonRestaurantCall) {
      const callId = latestNonRestaurantCall.id;
      dismissedCallIdsRef.current.add(callId);
      setDismissedCallId(callId);
      lastAlertedNonResCallIdRef.current = callId;
      hotlineService.resolveMissedCall(callId).catch(() => {});
      hotlineService.endCall(callId).catch(() => {});
    }
    setLatestNonRestaurantCall(null);
  }, [latestNonRestaurantCall]);

  // Tải số lượng cuộc gọi nhỡ ban đầu
  const refreshMissedCount = useCallback(async () => {
    try {
      const res = await hotlineService.getStatus(user?.username);
      setMissedHotlineCount(res.unresolved_missed_calls_count || 0);
    } catch (_) {}
  }, [user?.username]);

  useEffect(() => {
    if (canAccessHotline) {
      refreshMissedCount();
    }
  }, [canAccessHotline, refreshMissedCount]);

  // POLLING ĐỊNH KỲ (Mỗi 2.5s): Đảm bảo cập nhật tức thì ngay cả khi SSE bị IIS / Proxy đệm (buffering)
  useEffect(() => {
    if (!canAccessHotline) return;

    let isMounted = true;
    const pollStatus = async () => {
      try {
        const res = await hotlineService.getStatus(user?.username);
        if (!isMounted) return;

        // 1. Tự động cập nhật số lượng cuộc gọi nhỡ trên Badge
        const count = res.unresolved_missed_calls_count ?? 0;
        setMissedHotlineCount(count);

        // 2. Kiểm tra nếu có cuộc gọi đang reo (current_call)
        if (res.current_call) {
          const cur = res.current_call;
          const curDuty = (cur.duty_user || '').trim().toLowerCase();
          const hasSpecificAgent = Boolean(
            curDuty &&
            curDuty !== '3cx pwa client' &&
            curDuty !== 'pbx server' &&
            curDuty !== 'ring group'
          );

          // Kiểm tra xem cuộc gọi này có dành cho máy của tôi không
          const isForMe = hasSpecificAgent ? isAgentMatch(curDuty, user) : true;

          if (isForMe) {
            // Đảm bảo nút trực Hotline tự động BẬT khi có cuộc gọi gửi tới mình
            if (!isHotlineActive) {
              setIsHotlineActive(true);
              localStorage.setItem('hotline_duty_active', 'true');
            }

            // LUÔN LUÔN set incomingCall để GlobalHotlineOverlay hiển thị banner nổi bật trên mọi màn hình!
            setIncomingCall(cur);

            if (cur.restaurant && cur.restaurant.id) {
              // LÀ NHÀ HÀNG: Tự động bung modal VNC/KDS
              if (lastHandledVncCallIdRef.current !== cur.call_id) {
                lastHandledVncCallIdRef.current = cur.call_id;
                playHotlineBeep();
                const r = cur.restaurant;
                const formattedTitle = `${r.sap ? r.sap + ' ' : ''}${r.res || ''}${r.rk7 ? ' (RK7: ' + r.rk7 + ')' : ''}${r.ip ? ' ' + r.ip : ''}`.trim();
                const prefix = getIpPrefix(r.ip);
                if (prefix) {
                  setVncRestaurantName(formattedTitle);
                  setVncIpPrefix(prefix);
                  setVncModalOpen(true);
                  hotlineService.markCallAnswered(cur.call_id, user?.username).catch(() => {});
                }
                const searchKeyword = (r.sap && r.sap.length >= 2 ? r.sap : (r.res || '')).trim();
                if (searchKeyword) {
                  window.dispatchEvent(new CustomEvent('hotline_filter_restaurant', { detail: { keyword: searchKeyword } }));
                }
                showToast(`📞 Cuộc gọi đến từ ${r.res} (Line: ${cur.ext}) — Đang kết nối VNC/KDS`, 'success', 10000);
              }
            } else {
              // KHÔNG PHẢI NHÀ HÀNG (CUỘC GỌI NỘI BỘ / TEST THỬ NGHIỆM):
              if ((dismissedCallId && cur.call_id === dismissedCallId) || dismissedCallIdsRef.current.has(cur.call_id)) {
                setLatestNonRestaurantCall(null);
                return;
              }

              if (lastAlertedNonResCallIdRef.current !== cur.call_id) {
                lastAlertedNonResCallIdRef.current = cur.call_id;
                playHotlineBeep();
                showToast(
                  `📞 Cuộc gọi đến từ: ${cur.ext}${cur.caller_raw_text ? ' (' + cur.caller_raw_text + ')' : ''} — ⚠️ Cuộc gọi nội bộ / Không thuộc Nhà Hàng`,
                  'warning',
                  12000
                );
              }
              setLatestNonRestaurantCall({
                id: cur.call_id,
                ext: cur.ext,
                caller_raw_text: cur.caller_raw_text || null,
                restaurant_name: cur.restaurant_name || null,
                call_status: 'INCOMING',
                created_at: cur.created_at,
              });
            }
          }
        } else {
          // Không có cuộc gọi đang reo -> Đóng incomingCall nếu trước đó đang hiển thị
          setIncomingCall((prev) => (prev ? null : prev));

          // Kiểm tra latest_call_info
          if (res.latest_call_info && !res.latest_call_info.is_restaurant && !res.latest_call_info.is_resolved) {
            if ((dismissedCallId && res.latest_call_info.id === dismissedCallId) || dismissedCallIdsRef.current.has(res.latest_call_info.id)) {
              setLatestNonRestaurantCall(null);
              return;
            }

            const infoDuty = (res.latest_call_info.duty_user || '').trim().toLowerCase();
            const isForMe = infoDuty ? isAgentMatch(infoDuty, user) : isHotlineActive;
            if (isForMe) {
              setLatestNonRestaurantCall({
                id: res.latest_call_info.id,
                ext: res.latest_call_info.ext,
                caller_raw_text: res.latest_call_info.caller_raw_text || null,
                restaurant_name: res.latest_call_info.restaurant_name || null,
                call_status: res.latest_call_info.call_status,
                created_at: res.latest_call_info.created_at,
              });
            } else {
              setLatestNonRestaurantCall(null);
            }
          } else {
            setLatestNonRestaurantCall(null);
          }
        }
      } catch (_) {}
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [canAccessHotline, isHotlineActive, dismissedCallId, playHotlineBeep, showToast, user]);

  // Lắng nghe sự kiện SSE 3CX Toàn Ứng Dụng (Global)
  useEffect(() => {
    if (!canAccessHotline) return;

    const unsubscribe = hotlineService.connectEvents(
      (callData) => {
        // Sự kiện cuộc gọi đến (incoming_call)
        const curDuty = (callData.duty_user || '').trim().toLowerCase();
        const hasSpecificAgent = Boolean(
          curDuty &&
          curDuty !== '3cx pwa client' &&
          curDuty !== 'pbx server' &&
          curDuty !== 'ring group'
        );

        const isForMe = hasSpecificAgent ? isAgentMatch(curDuty, user) : true;
        if (!isForMe) {
          console.warn(`[Hotline-3CX SSE] Bỏ qua cuộc gọi từ ${callData.ext} vì được 3CX gửi riêng cho Agent "${curDuty}", tài khoản hiện tại "${user?.username}" không khớp.`);
          return;
        }

        // Tự động bật hotline khi có cuộc gọi đến
        if (!isHotlineActive) {
          setIsHotlineActive(true);
          localStorage.setItem('hotline_duty_active', 'true');
        }

        playHotlineBeep();
        // LUÔN LUÔN set incomingCall để GlobalHotlineOverlay hiển thị banner nổi bật!
        setIncomingCall(callData);

        if (callData.restaurant && callData.restaurant.id) {
          // LÀ NHÀ HÀNG: Tự động mở popup modal kết nối từ xa VNC/KDS
          const r = callData.restaurant;
          const formattedTitle = `${r.sap ? r.sap + ' ' : ''}${r.res || ''}${r.rk7 ? ' (RK7: ' + r.rk7 + ')' : ''}${r.ip ? ' ' + r.ip : ''}`.trim();
          const prefix = getIpPrefix(r.ip);
          if (prefix) {
            setVncRestaurantName(formattedTitle);
            setVncIpPrefix(prefix);
            setVncModalOpen(true);
            hotlineService.markCallAnswered(callData.call_id, user?.username).catch(() => {});
          }

          const searchKeyword = (r.sap && r.sap.length >= 2 ? r.sap : (r.res || '')).trim();
          if (searchKeyword) {
            window.dispatchEvent(new CustomEvent('hotline_filter_restaurant', { detail: { keyword: searchKeyword } }));
          }

          showToast(`📞 Cuộc gọi đến từ ${r.res} (Line: ${callData.ext}) — Đang kết nối VNC/KDS`, 'success', 10000);
        } else {
          // KHÔNG PHẢI NHÀ HÀNG (CUỘC GỌI NỘI BỘ / THỬ NGHIỆM):
          setLatestNonRestaurantCall({
            id: callData.call_id,
            ext: callData.ext,
            caller_raw_text: callData.caller_raw_text || null,
            restaurant_name: callData.restaurant_name || null,
            call_status: 'INCOMING',
            created_at: callData.created_at,
          });
          showToast(
            `📞 Cuộc gọi đến từ: ${callData.ext}${callData.caller_raw_text ? ' (' + callData.caller_raw_text + ')' : ''} — ⚠️ Cuộc gọi nội bộ / Không thuộc Nhà Hàng`,
            'warning',
            12000
          );
        }
      },
      (callData) => {
        // Cuộc gọi nhỡ (missed_call)
        setIncomingCall(null);
        refreshMissedCount();
        const curDuty = (callData.duty_user || '').trim().toLowerCase();
        const hasSpecificAgent = Boolean(
          curDuty &&
          curDuty !== '3cx pwa client' &&
          curDuty !== 'pbx server' &&
          curDuty !== 'ring group'
        );

        const isNotRes = !callData.restaurant;
        if (isNotRes) {
          // Cuộc gọi nội bộ nhỡ: HIỂN THỊ NẾU ĐÍCH DANH MÁY CỦA TÔI HOẶC TÔI ĐANG TRỰC
          const isForMe = hasSpecificAgent ? isAgentMatch(curDuty, user) : isHotlineActive;
          if (isForMe) {
            setLatestNonRestaurantCall({
              id: callData.call_id,
              ext: callData.ext,
              caller_raw_text: callData.caller_raw_text || null,
              restaurant_name: callData.restaurant_name || null,
              call_status: 'MISSED',
              created_at: callData.created_at,
            });
            showToast(
              `⚠️ Cuộc gọi nhỡ: ${callData.ext}${callData.caller_raw_text ? ' (' + callData.caller_raw_text + ')' : ''} — [Cuộc gọi nội bộ]`,
              'warning',
              10000
            );
          }
        } else {
          if (isHotlineActive) {
            showToast(
              `⚠️ Cuộc gọi nhỡ từ Nhà Hàng: ${callData.ext}${callData.caller_raw_text ? ' (' + callData.caller_raw_text + ')' : ''}`,
              'warning',
              10000
            );
          }
        }
      },
      () => {
        // Kết thúc cuộc gọi (call_ended)
        setIncomingCall(null);
        setLatestNonRestaurantCall((prev) => {
          if (prev && prev.call_status === 'INCOMING') {
            return null;
          }
          return prev;
        });
        refreshMissedCount();
      },
      () => {
        // Đã xử lý cuộc gọi nhỡ (missed_call_resolved)
        refreshMissedCount();
        setLatestNonRestaurantCall(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isHotlineActive, canAccessHotline, playHotlineBeep, showToast, refreshMissedCount]);

  // Bật/tắt chế độ trực hotline
  const toggleHotlineDuty = async () => {
    const nextState = !isHotlineActive;
    try {
      await hotlineService.toggleDuty(nextState, user?.username);
      setIsHotlineActive(nextState);
      localStorage.setItem('hotline_duty_active', String(nextState));
      showToast(
        nextState
          ? 'Đã BẬT Nghe Hotline (Đang tự động bắt cuộc gọi từ 3CX PWA trên mọi màn hình)'
          : 'Đã TẮT Nghe Hotline',
        nextState ? 'success' : 'info',
        4000
      );
    } catch (err) {
      console.error('Lỗi toggle hotline:', err);
      setIsHotlineActive(nextState);
      localStorage.setItem('hotline_duty_active', String(nextState));
    }
  };

  const openVncModal = useCallback((name: string, prefix: string) => {
    setVncRestaurantName(name);
    setVncIpPrefix(prefix);
    setVncModalOpen(true);
  }, []);

  const closeVncModal = useCallback(() => {
    setVncModalOpen(false);
  }, []);

  const openMissedCallsModal = useCallback(() => {
    setIsMissedCallsModalOpen(true);
  }, []);

  const closeMissedCallsModal = useCallback(() => {
    setIsMissedCallsModalOpen(false);
    refreshMissedCount();
  }, [refreshMissedCount]);

  const openGuideModal = useCallback(() => {
    setIsGuideModalOpen(true);
  }, []);

  const closeGuideModal = useCallback(() => {
    setIsGuideModalOpen(false);
  }, []);

  const dismissIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return (
    <HotlineContext.Provider
      value={{
        isHotlineActive,
        toggleHotlineDuty,
        missedHotlineCount,
        setMissedHotlineCount,
        incomingCall,
        dismissIncomingCall,
        isMissedCallsModalOpen,
        openMissedCallsModal,
        closeMissedCallsModal,
        isGuideModalOpen,
        openGuideModal,
        closeGuideModal,
        vncModalOpen,
        vncRestaurantName,
        vncIpPrefix,
        openVncModal,
        closeVncModal,
        hotlineToast,
        setHotlineToast,
        latestNonRestaurantCall,
        dismissNonRestaurantCall,
        canAccessHotline,
        canManageHotline,
        refreshMissedCount,
      }}
    >
      {children}
    </HotlineContext.Provider>
  );

};

export const useHotline = () => {
  const context = useContext(HotlineContext);
  if (!context) {
    throw new Error('useHotline must be used within a HotlineProvider');
  }
  return context;
};
