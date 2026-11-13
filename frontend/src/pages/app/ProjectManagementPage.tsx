import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  History,
  X,
  UserPlus,
  User,
  CheckSquare,
  Send,
  Paperclip,
  Check,
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw
} from 'lucide-react';
import {
  Project,
  ProjectMember,
  MemberTask,
  ProjectActivityLog,
  ImportResult,
  TeamMemberItem
} from '../../types/project';
import { projectService } from '../../services/projectService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { DateInput } from '../../components/ui/DateInput';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import { ProjectDescriptionModal } from '../../components/projects/ProjectDescriptionModal';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsAdmin } from '../../utils/authUtils';

// Helpers
const removeAccents = (str: string) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return <span>{text}</span>;
  const cleanQ = removeAccents(query.trim()).toLowerCase();
  const cleanText = removeAccents(text).toLowerCase();
  const idx = cleanText.indexOf(cleanQ);
  if (idx === -1) return <span>{text}</span>;
  const before = text.substring(0, idx);
  const match = text.substring(idx, idx + query.trim().length);
  const after = text.substring(idx + query.trim().length);
  return (
    <span>
      {before}
      <mark
        style={{
          backgroundColor: '#FEF08A',
          color: '#854D0E',
          fontWeight: 700,
          padding: '1px 4px',
          borderRadius: '3px'
        }}
      >
        {match}
      </mark>
      {after}
    </span>
  );
};

export const ProjectManagementPage: React.FC = () => {
  // Authentication & Admin check: Chỉ quyền Quản trị (Admin) và Super Admin mới được tạo dự án, thêm thành viên, giao task
  const { user } = useAuth();
  const isAdmin = checkIsAdmin(user);

  // Selection states for bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);

  // =====================
  // DỰ ÁN & TIẾN ĐỘ (PROJECTS & TASKS)
  // =====================
  const [projects, setProjects] = useState<Project[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'completed'>('in-progress');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyShowMatches, setOnlyShowMatches] = useState<boolean>(true);

  // Accordion states - DEFAULT COLLAPSED
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const [expandedMembers, setExpandedMembers] = useState<Record<number, boolean>>({});

  // Team App members
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState<boolean>(false);

  // Helper to get date string 2 months ago (YYYY-MM-DD)
  const getDefaultLogsStartDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return d.toISOString().slice(0, 10);
  };

  // Activity logs drawer & filters (Limit 200)
  const [showLogsDrawer, setShowLogsDrawer] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<ProjectActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logsFilterProject, setLogsFilterProject] = useState<string>('');
  const [logsProjectSearch, setLogsProjectSearch] = useState<string>('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState<boolean>(false);
  const [logsFilterActor, setLogsFilterActor] = useState<string>('');
  const [isActorDropdownOpen, setIsActorDropdownOpen] = useState<boolean>(false);
  const [logsFilterStartDate, setLogsFilterStartDate] = useState<string>(getDefaultLogsStartDate());
  const [logsFilterEndDate, setLogsFilterEndDate] = useState<string>('');

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportSearchQuery, setExportSearchQuery] = useState<string>('');
  const [exportSelectedProjectIds, setExportSelectedProjectIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState<boolean>(false);

  // Modals for projects
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState<boolean>(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [selectedProjectIdForMember, setSelectedProjectIdForMember] = useState<number | null>(null);
  const [addMemberSearch, setAddMemberSearch] = useState<string>('');
  const [addMemberSelectedName, setAddMemberSelectedName] = useState<string>('');
  const [addMemberCustomMode, setAddMemberCustomMode] = useState<boolean>(false);
  const [addMemberCustomName, setAddMemberCustomName] = useState<string>('');
  const [addMemberRoleFilter, setAddMemberRoleFilter] = useState<'all' | 'app' | 'admin'>('app');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState<boolean>(false);
  const [selectedMemberIdForTask, setSelectedMemberIdForTask] = useState<number | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Description Modal state
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState<boolean>(false);
  const [selectedProjectForDescription, setSelectedProjectForDescription] = useState<Project | null>(null);

  const handleOpenDescriptionModal = (project: Project) => {
    setSelectedProjectForDescription(project);
    setIsDescriptionModalOpen(true);
  };

  // Review Task states (Đánh giá task: OK / Fail)
  const [reviewFailModalTask, setReviewFailModalTask] = useState<MemberTask | null>(null);
  const [reviewFailNote, setReviewFailNote] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // QUICK ASSIGN MODAL (Giao việc nhanh không cần file excel)
  const [isQuickAssignModalOpen, setIsQuickAssignModalOpen] = useState<boolean>(false);
  const [qaProjectMode, setQaProjectMode] = useState<'existing' | 'new'>('existing');
  const [qaSelectedProjectId, setQaSelectedProjectId] = useState<string>('');
  const [qaProjectSearch, setQaProjectSearch] = useState<string>('');
  const [qaNewProjectName, setQaNewProjectName] = useState<string>('');

  const [qaSelectedMemberName, setQaSelectedMemberName] = useState<string>('');
  const [qaMemberSearch, setQaMemberSearch] = useState<string>('');
  const [qaCustomMemberMode, setQaCustomMemberMode] = useState<boolean>(false);
  const [qaNewCustomMemberName, setQaNewCustomMemberName] = useState<string>('');

  const [qaTaskName, setQaTaskName] = useState<string>('');
  const [qaDeadline, setQaDeadline] = useState<string>('');
  const [qaAttachmentFile, setQaAttachmentFile] = useState<File | null>(null);
  const [submittingQa, setSubmittingQa] = useState<boolean>(false);

  // Form states
  const [projectNameInput, setProjectNameInput] = useState<string>('');
  const [projectDeadlineInput, setProjectDeadlineInput] = useState<string>('');
  const [taskNameInput, setTaskNameInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);


  // Global Alert
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlertInfo({ type, message });
    setTimeout(() => setAlertInfo(null), 5000);
  };

  // 1. Fetch Projects
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const statusParam = statusFilter === 'all' ? undefined : statusFilter;
      const data = await projectService.getProjects(statusParam, searchQuery || undefined);
      setProjects(data);

      // Auto expand matches ONLY when user is actively searching with keyword
      const cleanQ = removeAccents(searchQuery).toLowerCase().trim();
      if (cleanQ) {
        const nextP: Record<number, boolean> = {};
        const nextM: Record<number, boolean> = {};

        data.forEach(p => {
          let pHasMatch = false;
          if (removeAccents(p.ProjectName).toLowerCase().includes(cleanQ) || (p.ProjectCode && removeAccents(p.ProjectCode).toLowerCase().includes(cleanQ))) {
            pHasMatch = true;
          }

          p.members.forEach(m => {
            let mHasMatch = false;
            if (removeAccents(m.MemberName).toLowerCase().includes(cleanQ)) {
              mHasMatch = true;
            }
            if (m.tasks.some(t => removeAccents(t.TaskName).toLowerCase().includes(cleanQ))) {
              mHasMatch = true;
            }

            if (mHasMatch) {
              nextM[m.MemberID] = true;
              pHasMatch = true;
            }
          });

          if (pHasMatch) {
            nextP[p.ProjectID] = true;
          }
        });

        setExpandedProjects(nextP);
        setExpandedMembers(nextM);
      }
      // When searchQuery is empty, DO NOT auto expand! Keep collapsed on initial load.
    } catch (err: any) {
      console.error('Error loading projects:', err);
      showAlert('error', 'Không thể tải danh sách dự án. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setLoadingProjects(false);
    }
  }, [statusFilter, searchQuery]);

  // 2. Fetch Team App Members
  const fetchTeamMembers = useCallback(async () => {
    setLoadingTeamMembers(true);
    try {
      const data = await projectService.getTeamMembers();
      setTeamMembers(data);
    } catch (err: any) {
      console.error('Error loading team members:', err);
    } finally {
      setLoadingTeamMembers(false);
    }
  }, []);

  // Fetch all projects (unfiltered by status/search) for dropdowns & modals
  const fetchAllProjects = useCallback(async () => {
    try {
      const data = await projectService.getProjects();
      setAllProjects(data);
    } catch (err: any) {
      console.error('Error loading all projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchAllProjects();
    fetchTeamMembers();
  }, [fetchProjects, fetchAllProjects, fetchTeamMembers]);

  // Today ISO string for date comparisons
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Eligible existing projects for Quick Assign:
  // "chỉ show dự án đang có đang chưa quá ngày hoàn thành"
  const eligibleExistingProjects = useMemo(() => {
    return projects.filter(p => {
      if (p.Status === 'completed') return false;
      if (!p.Deadline) return true; // Chưa đặt hạn chót -> vẫn đang thực hiện, chưa quá hạn
      return p.Deadline >= todayStr; // Hạn chót từ hôm nay trở về sau -> chưa quá hạn
    });
  }, [projects, todayStr]);

  // Filtered eligible projects by quick assign search query
  const filteredEligibleProjects = useMemo(() => {
    if (!qaProjectSearch.trim()) return eligibleExistingProjects;
    const q = removeAccents(qaProjectSearch).toLowerCase().trim();
    return eligibleExistingProjects.filter(p =>
      removeAccents(p.ProjectName).toLowerCase().includes(q) ||
      (p.ProjectCode && removeAccents(p.ProjectCode).toLowerCase().includes(q))
    );
  }, [eligibleExistingProjects, qaProjectSearch]);

  // Filtered Team App members by member search query
  const filteredTeamMembers = useMemo(() => {
    if (!qaMemberSearch.trim()) return teamMembers;
    const q = removeAccents(qaMemberSearch).toLowerCase().trim();
    return teamMembers.filter(m =>
      removeAccents(m.full_name).toLowerCase().includes(q) ||
      removeAccents(m.username).toLowerCase().includes(q)
    );
  }, [teamMembers, qaMemberSearch]);

  // Open Quick Assign Modal
  const handleOpenQuickAssign = (preselectedProjectId?: number, preselectedMemberId?: number) => {
    fetchTeamMembers();

    if (preselectedProjectId) {
      setQaProjectMode('existing');
      setQaSelectedProjectId(String(preselectedProjectId));
      setQaNewProjectName('');
      if (preselectedMemberId) {
        const proj = projects.find(p => p.ProjectID === preselectedProjectId);
        const mem = proj?.members.find(m => m.MemberID === preselectedMemberId);
        if (mem) {
          setQaSelectedMemberName(mem.MemberName);
        }
      }
    } else {
      if (eligibleExistingProjects.length > 0) {
        setQaProjectMode('existing');
        setQaSelectedProjectId(String(eligibleExistingProjects[0].ProjectID));
      } else {
        setQaProjectMode('new');
        setQaSelectedProjectId('');
      }
      setQaNewProjectName('');
      setQaSelectedMemberName('');
    }

    setQaProjectSearch('');
    setQaMemberSearch('');
    setQaCustomMemberMode(false);
    setQaNewCustomMemberName('');
    setQaTaskName('');
    setQaDeadline('');
    setQaAttachmentFile(null);
    setIsQuickAssignModalOpen(true);
  };

  // Submit Quick Assign
  const handleSubmitQuickAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    let pId: number | undefined = undefined;
    let pName: string | undefined = undefined;

    if (qaProjectMode === 'existing') {
      if (!qaSelectedProjectId) {
        showAlert('error', 'Vui lòng chọn một dự án đang có trong danh sách!');
        return;
      }
      pId = parseInt(qaSelectedProjectId, 10);
    } else {
      if (!qaNewProjectName.trim()) {
        showAlert('error', 'Vui lòng nhập tên dự án mới!');
        return;
      }
      pName = qaNewProjectName.trim();
    }

    const finalMemberName = qaCustomMemberMode ? qaNewCustomMemberName.trim() : qaSelectedMemberName.trim();
    if (!finalMemberName) {
      showAlert('error', 'Vui lòng chọn hoặc nhập người phụ trách (Thành viên)!');
      return;
    }

    if (!qaTaskName.trim()) {
      showAlert('error', 'Vui lòng nhập nội dung công việc (Task)!');
      return;
    }

    setSubmittingQa(true);
    try {
      let uploadedUrl: string | undefined = undefined;
      if (qaAttachmentFile) {
        showAlert('success', `Đang tải lên file đính kèm: ${qaAttachmentFile.name}...`);
        const uploadRes = await projectService.uploadAttachment(qaAttachmentFile);
        uploadedUrl = uploadRes.file_url;
      }

      const res = await projectService.quickAssignTask({
        project_id: pId,
        project_name: pName,
        member_name: finalMemberName,
        task_name: qaTaskName.trim(),
        deadline: qaDeadline || null,
        attachment: uploadedUrl || null
      });

      showAlert('success', res.message);
      setIsQuickAssignModalOpen(false);

      // Auto expand newly assigned project and member
      setExpandedProjects(prev => ({ ...prev, [res.project_id]: true }));
      if (res.member_id) {
        setExpandedMembers(prev => ({ ...prev, [res.member_id]: true }));
      }

      fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi giao việc!');
    } finally {
      setSubmittingQa(false);
    }
  };

  // Toggle Project accordion
  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  // Toggle Member accordion
  const toggleMember = (memberId: number) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // Expand all / Collapse all
  const handleExpandAll = () => {
    const nextP: Record<number, boolean> = {};
    const nextM: Record<number, boolean> = {};
    projects.forEach(p => {
      nextP[p.ProjectID] = true;
      p.members.forEach(m => { nextM[m.MemberID] = true; });
    });
    setExpandedProjects(nextP);
    setExpandedMembers(nextM);
  };

  const handleCollapseAll = () => {
    setExpandedProjects({});
    setExpandedMembers({});
  };

  // Toggle Task
  const handleToggleTask = async (taskId: number, currentDone: boolean) => {
    const newDone = !currentDone;
    try {
      const res = await projectService.toggleTask(taskId, newDone);
      setProjects(prev =>
        prev.map(p => {
          let projectDoneCount = 0;
          let projectTotalCount = 0;
          const updatedMembers = p.members.map(m => {
            const updatedTasks = m.tasks.map(t => {
              if (t.TaskID === taskId) return res.task;
              return t;
            });
            const allTasksDone = updatedTasks.length > 0 && updatedTasks.every(t => t.Done);
            updatedTasks.forEach(t => {
              projectTotalCount++;
              if (t.Done) projectDoneCount++;
            });
            return {
              ...m,
              tasks: updatedTasks,
              CompletedAt: allTasksDone ? res.member_completed_at : null
            };
          });

          const pct = projectTotalCount > 0 ? Math.round((projectDoneCount / projectTotalCount) * 1000) / 10 : 0;
          return {
            ...p,
            members: updatedMembers,
            total_tasks: projectTotalCount,
            done_tasks: projectDoneCount,
            progress_percent: pct,
            Status: (res.project_status as any) || p.Status
          };
        })
      );
    } catch (err: any) {
      console.error('Error toggling task:', err);
      showAlert('error', 'Lỗi khi cập nhật trạng thái công việc!');
    }
  };

  // Review Task (OK / Fail / Reset) - Admin & Super Admin
  const handleReviewTask = async (task: MemberTask, newStatus: 'ok' | 'fail' | null, note?: string) => {
    if (!isAdmin) {
      showAlert('error', 'Chỉ Quản trị viên mới có quyền đánh giá công việc!');
      return;
    }

    try {
      const updated = await projectService.reviewTask(task.TaskID, {
        review_status: newStatus,
        review_note: note
      });

      // Update in projects state
      setProjects(prev =>
        prev.map(p => ({
          ...p,
          members: p.members.map(m => ({
            ...m,
            tasks: m.tasks.map(t => (t.TaskID === task.TaskID ? { ...t, ...updated } : t))
          }))
        }))
      );

      // Update in allProjects state as well
      setAllProjects(prev =>
        prev.map(p => ({
          ...p,
          members: p.members.map(m => ({
            ...m,
            tasks: m.tasks.map(t => (t.TaskID === task.TaskID ? { ...t, ...updated } : t))
          }))
        }))
      );

      const statusMsg =
        newStatus === 'ok'
          ? 'Đã đánh giá ĐẠT (OK)'
          : newStatus === 'fail'
          ? 'Đã đánh giá KHÔNG ĐẠT (FAIL)'
          : 'Đã hủy đánh giá';
      showAlert('success', `${statusMsg} công việc "${task.TaskName}"!`);
    } catch (err: any) {
      console.error('Error reviewing task:', err);
      showAlert('error', err.response?.data?.detail || 'Lỗi khi lưu đánh giá công việc!');
    }
  };

  const handleOpenReviewFailModal = (task: MemberTask) => {
    setReviewFailModalTask(task);
    setReviewFailNote(task.ReviewNote || '');
  };

  const handleSubmitReviewFail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFailModalTask) return;
    setSubmittingReview(true);
    try {
      await handleReviewTask(reviewFailModalTask, 'fail', reviewFailNote.trim() || undefined);
      setReviewFailModalTask(null);
      setReviewFailNote('');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Add Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameInput.trim()) {
      showAlert('error', 'Vui lòng nhập tên dự án!');
      return;
    }
    setSubmitting(true);
    try {
      const created = await projectService.createProject({
        ProjectName: projectNameInput.trim(),
        Deadline: projectDeadlineInput || null
      });
      showAlert('success', `Đã tạo dự án "${projectNameInput.trim()}" thành công!`);
      setIsAddProjectModalOpen(false);
      setProjectNameInput('');
      setProjectDeadlineInput('');
      fetchProjects();
      // Mở ngay popup thêm mô tả dự án theo yêu cầu của user
      handleOpenDescriptionModal(created);
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi tạo dự án!');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Project
  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !projectNameInput.trim()) return;
    setSubmitting(true);
    try {
      await projectService.updateProject(editingProject.ProjectID, {
        ProjectName: projectNameInput.trim(),
        Deadline: projectDeadlineInput || null
      });
      showAlert('success', 'Đã cập nhật thông tin dự án!');
      setIsEditProjectModalOpen(false);
      fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi cập nhật dự án!');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async (p: Project) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa dự án "${p.ProjectName}"? Toàn bộ thành viên và task liên quan sẽ bị xóa vĩnh viễn!`)) {
      return;
    }
    try {
      await projectService.deleteProject(p.ProjectID);
      showAlert('success', `Đã xóa dự án "${p.ProjectName}"!`);
      fetchProjects();
    } catch (err: any) {
      showAlert('error', 'Lỗi khi xóa dự án!');
    }
  };

  // Open Add Member Modal
  const handleOpenAddMemberModal = (projectId: number) => {
    setSelectedProjectIdForMember(projectId);
    setAddMemberSearch('');
    setAddMemberSelectedName('');
    setAddMemberCustomMode(false);
    setAddMemberCustomName('');
    setAddMemberRoleFilter('app');
    setIsAddMemberModalOpen(true);
    fetchTeamMembers();
  };

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectIdForMember) return;
    const finalMemberName = addMemberCustomMode ? addMemberCustomName.trim() : addMemberSelectedName.trim();
    if (!finalMemberName) {
      showAlert('error', 'Vui lòng chọn thành viên hoặc nhập tên người phụ trách!');
      return;
    }
    setSubmitting(true);
    try {
      await projectService.addMember(selectedProjectIdForMember, {
        MemberName: finalMemberName
      });
      showAlert('success', `Đã thêm thành viên "${finalMemberName}" vào dự án!`);
      // Auto expand project so user sees newly added member right away
      setExpandedProjects(prev => ({ ...prev, [selectedProjectIdForMember]: true }));
      setIsAddMemberModalOpen(false);
      setAddMemberSearch('');
      setAddMemberSelectedName('');
      setAddMemberCustomName('');
      fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi thêm thành viên!');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async (m: ProjectMember) => {
    if (!window.confirm(`Bạn có chắc muốn xóa thành viên "${m.MemberName}" và các công việc liên quan?`)) return;
    try {
      await projectService.deleteMember(m.MemberID);
      showAlert('success', `Đã xóa thành viên "${m.MemberName}"!`);
      fetchProjects();
    } catch (err: any) {
      showAlert('error', 'Lỗi khi xóa thành viên!');
    }
  };

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberIdForTask || !taskNameInput.trim()) return;
    setSubmitting(true);
    try {
      await projectService.addTask(selectedMemberIdForTask, {
        TaskName: taskNameInput.trim()
      });
      showAlert('success', 'Đã thêm công việc mới thành công!');
      setIsAddTaskModalOpen(false);
      setTaskNameInput('');
      fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi thêm công việc!');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async (t: MemberTask) => {
    if (!window.confirm(`Bạn có chắc muốn xóa công việc: "${t.TaskName}"?`)) return;
    try {
      await projectService.deleteTask(t.TaskID);
      showAlert('success', 'Đã xóa công việc!');
      fetchProjects();
    } catch (err: any) {
      showAlert('error', 'Lỗi khi xóa công việc!');
    }
  };

  // Export Excel (all, single project, or multiple selected projects)
  const handleExportExcel = async (projectId?: number, projectIds?: number[]) => {
    setExporting(true);
    try {
      showAlert('success', 'Đang tạo file Excel xuất dữ liệu dự án...');
      const targetProj = projectId ? projects.find(p => p.ProjectID === projectId) : null;
      const blob = await projectService.exportExcel(projectId, projectIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let projSuffix = '';
      if (targetProj) {
        projSuffix = `_${targetProj.ProjectCode || targetProj.ProjectName.replace(/\s+/g, '_')}`;
      } else if (projectIds && projectIds.length > 0) {
        projSuffix = `_${projectIds.length}_du_an`;
      }
      a.download = `Danh_Sach_Du_An${projSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err) {
      showAlert('error', 'Lỗi khi tải file Excel!');
    } finally {
      setExporting(false);
    }
  };

  // Download Sample Template
  const handleDownloadSample = async () => {
    try {
      showAlert('success', 'Đang tải file mẫu Excel (.xlsx)...');
      const blob = await projectService.downloadSampleTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Mau_Import_Du_An.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showAlert('error', 'Lỗi khi tải mẫu Excel!');
    }
  };

  // Import Excel
  const handleImportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await projectService.importExcel(importFile);
      setImportResult(res);
      showAlert('success', res.message);
      fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi import file Excel!');
    } finally {
      setImporting(false);
    }
  };

  // Activity Logs (fetch max 200 rows with filters)
  const fetchActivityLogs = async (overrideParams?: {
    projectId?: string;
    actor?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoadingLogs(true);
    try {
      const pId = overrideParams?.projectId !== undefined ? overrideParams.projectId : logsFilterProject;
      const actor = overrideParams?.actor !== undefined ? overrideParams.actor : logsFilterActor;
      const sDate = overrideParams?.startDate !== undefined ? overrideParams.startDate : logsFilterStartDate;
      const eDate = overrideParams?.endDate !== undefined ? overrideParams.endDate : logsFilterEndDate;

      const logs = await projectService.getActivityLogs({
        limit: 200,
        project_id: pId ? parseInt(pId, 10) : undefined,
        action_by: actor || undefined,
        start_date: sDate || undefined,
        end_date: eDate || undefined,
      });
      setActivityLogs(logs);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenLogsDrawer = () => {
    fetchAllProjects();
    fetchTeamMembers();
    const defaultStart = getDefaultLogsStartDate();
    setLogsFilterStartDate(defaultStart);
    setLogsFilterEndDate('');
    setShowLogsDrawer(true);
    fetchActivityLogs({ startDate: defaultStart, endDate: '' });
  };

  const handleResetLogsFilter = () => {
    const defaultStart = getDefaultLogsStartDate();
    setLogsFilterProject('');
    setLogsProjectSearch('');
    setIsProjectDropdownOpen(false);
    setLogsFilterActor('');
    setIsActorDropdownOpen(false);
    setLogsFilterStartDate(defaultStart);
    setLogsFilterEndDate('');
    fetchActivityLogs({ projectId: '', actor: '', startDate: defaultStart, endDate: '' });
  };

  // =====================
  // BULK TOGGLE & COMPLETION HANDLERS
  // =====================
  const handleBulkToggle = async (done: boolean) => {
    if (selectedTaskIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedTaskIds);
      const res = await projectService.bulkToggleTasks(ids, done);
      showAlert('success', res.message);
      setSelectedTaskIds(new Set());
      await fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi cập nhật hàng loạt!');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleToggleAllProjectTasks = async (projectId: number, done: boolean) => {
    setIsBulkProcessing(true);
    try {
      const res = await projectService.toggleAllProjectTasks(projectId, done);
      showAlert('success', res.message);
      await fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi cập nhật dự án!');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleToggleAllMemberTasks = async (memberId: number, done: boolean) => {
    setIsBulkProcessing(true);
    try {
      const res = await projectService.toggleAllMemberTasks(memberId, done);
      showAlert('success', res.message);
      await fetchProjects();
    } catch (err: any) {
      showAlert('error', err.response?.data?.detail || 'Lỗi khi cập nhật thành viên!');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleSelectTask = (taskId: number, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleSelectAllTasksOfMember = (member: ProjectMember, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      const mIds = member.tasks.map(t => t.TaskID);
      const allSelected = mIds.length > 0 && mIds.every(id => next.has(id));
      if (allSelected) {
        mIds.forEach(id => next.delete(id));
      } else {
        mIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Helper date format chuẩn dd-mm-yyyy
  const formatDate = (dateStr: string | null | undefined) => formatDateDDMMYYYY(dateStr, '');

  const formatDateTime = (dateStr: string | null | undefined) =>
    formatDateTimeDDMMYYYY(dateStr, { fallback: '' });

  const isOverdue = (deadlineStr: string | null, status: string) => {
    if (!deadlineStr || status === 'completed') return false;
    const deadline = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadline < today;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', padding: '16px 20px', boxSizing: 'border-box' }}>
      {/* Alert */}
      {alertInfo && (
        <Alert
          type={alertInfo.type}
          message={alertInfo.message}
          onClose={() => setAlertInfo(null)}
        />
      )}

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          backgroundColor: 'var(--bg-card)',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary-light, #FFF8D6)',
              color: 'var(--color-primary-text, #111827)',
              border: '1px solid #FDE68A'
            }}
          >
            <Briefcase size={24} color="#B48200" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Quản Lý Dự Án
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Theo dõi tiến độ triển khai công việc và phân công nhiệm vụ cho thành viên
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* BUTTON GIAO VIỆC NHANH - Chỉ Quản trị viên & Super Admin */}
          {isAdmin && (
            <button
              onClick={() => handleOpenQuickAssign()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--color-primary, #F5B800)',
                color: '#111827',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 18px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(245, 184, 0, 0.3)'
              }}
              title="Giao việc trực tiếp cho thành viên mà không cần file Excel"
            >
              <Send size={15} />
              <span>+ Giao Việc Nhanh</span>
            </button>
          )}

          {/* TẠO DỰ ÁN - Chỉ Quản trị viên & Super Admin */}
          {isAdmin && (
            <button
              onClick={() => {
                setProjectNameInput('');
                setProjectDeadlineInput('');
                setIsAddProjectModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '13px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              <span>Tạo Dự Án</span>
            </button>
          )}

          {/* IMPORT EXCEL - Chỉ Quản trị viên & Super Admin */}
          {isAdmin && (
            <button
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setIsImportModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontWeight: 500,
                fontSize: '13px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              <Upload size={15} />
              <span>Import Excel</span>
            </button>
          )}

          <button
            onClick={() => {
              setExportSearchQuery('');
              setExportSelectedProjectIds([]);
              setIsExportModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '13px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
            title="Tải dữ liệu Excel (tất cả dự án hoặc chọn một hay nhiều dự án)"
          >
            <Download size={15} />
            <span>Tải Excel</span>
          </button>

          <button
            onClick={handleOpenLogsDrawer}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '13px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
          >
            <History size={15} />
            <span>Nhật Ký</span>
          </button>

          <button
            onClick={fetchProjects}
            disabled={loadingProjects}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              cursor: 'pointer'
            }}
            title="Làm mới danh sách"
          >
            <RefreshCw size={15} className={loadingProjects ? 'spin' : ''} />
          </button>
        </div>
      </div>
        <>
          {/* Toolbar: Filter pills + Search */}
          <Card padding="sm" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                {/* Status Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: '4px' }}>
                    Bộ lọc trạng thái:
                  </span>
                  {[
                    { id: 'all', label: 'Tất cả dự án', count: projects.length },
                    { id: 'in-progress', label: 'Đang thực hiện', count: projects.filter(p => p.Status === 'in-progress').length },
                    { id: 'completed', label: 'Đã hoàn thành', count: projects.filter(p => p.Status === 'completed').length }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: statusFilter === tab.id ? '1px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color)',
                        backgroundColor: statusFilter === tab.id ? 'var(--color-primary-subtle, rgba(245, 184, 0, 0.16))' : 'var(--bg-card)',
                        color: statusFilter === tab.id ? 'var(--color-primary-text, #F5B800)' : 'var(--text-secondary)',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <span>{tab.label}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '1px 7px',
                          borderRadius: '9999px',
                          backgroundColor: statusFilter === tab.id ? 'var(--color-primary, #F5B800)' : 'var(--bg-hover)',
                          color: statusFilter === tab.id ? '#000000' : 'var(--text-secondary)',
                          lineHeight: '1.3',
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search input & Expand controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '440px', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: '320px'
                    }}
                  >
                    <Search
                      size={16}
                      color="#9CA3AF"
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      placeholder="Tìm kiếm dự án, thành viên, task (VD: ashima, kds...)"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 32px 7px 32px',
                        fontSize: '13px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box'
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9CA3AF'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleExpandAll}
                    style={{
                      padding: '7px 10px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="Mở rộng toàn bộ"
                  >
                    Mở hết
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    style={{
                      padding: '7px 10px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title="Thu gọn toàn bộ"
                  >
                    Thu gọn
                  </button>
                </div>
              </div>

              {/* Search Active Notification & Filter Option */}
              {searchQuery.trim() && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: '#FEFCE8',
                    border: '1px solid #FEF08A',
                    fontSize: '12px',
                    color: '#854D0E'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Search size={14} color="#B45309" />
                    <span>
                      Đang lọc theo từ khóa: <strong>"{searchQuery}"</strong> (Tự động mở rộng các mục khớp)
                    </span>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={onlyShowMatches}
                      onChange={e => setOnlyShowMatches(e.target.checked)}
                      style={{ accentColor: '#B45309', cursor: 'pointer' }}
                    />
                    <span>Chỉ hiển thị dòng/thành viên khớp (ẩn dòng thừa)</span>
                  </label>
                </div>
              )}
            </div>
          </Card>

          {/* Project List Content */}
          {loadingProjects ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)'
              }}
            >
              <RefreshCw size={28} className="spin" color="#B48200" style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                Đang tải dữ liệu dự án từ máy chủ...
              </p>
            </div>
          ) : projects.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px'
                }}
              >
                <Briefcase size={26} color="#9CA3AF" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                Không có dự án nào phù hợp với từ khóa "{searchQuery}"
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', maxWidth: '460px' }}>
                {isAdmin ? 'Hãy thử kiểm tra lại từ khóa tìm kiếm hoặc nhấn nút bên dưới để giao việc mới.' : 'Hãy thử kiểm tra lại từ khóa tìm kiếm hoặc chọn bộ lọc khác.'}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Xóa bộ lọc
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleOpenQuickAssign()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      backgroundColor: 'var(--color-primary, #F5B800)',
                      color: '#111827',
                      cursor: 'pointer'
                    }}
                  >
                    <Send size={15} />
                    <span>+ Giao Việc Nhanh</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {projects.map(project => {
                const isExpanded = !!expandedProjects[project.ProjectID];
                const overdue = isOverdue(project.Deadline, project.Status);
                const cleanQ = removeAccents(searchQuery).toLowerCase().trim();

                // Compute matched tasks in this project
                const matchedTasksList: { memberName: string; taskName: string }[] = [];
                project.members.forEach(m => {
                  m.tasks.forEach(t => {
                    if (cleanQ && removeAccents(t.TaskName).toLowerCase().includes(cleanQ)) {
                      matchedTasksList.push({ memberName: m.MemberName, taskName: t.TaskName });
                    }
                  });
                });

                // Filter members and tasks if search is active
                const displayedMembers = project.members.map(member => {
                  const memberNameMatch = cleanQ && removeAccents(member.MemberName).toLowerCase().includes(cleanQ);
                  const matchingTasks = member.tasks.filter(t => {
                    if (!cleanQ) return true;
                    return removeAccents(t.TaskName).toLowerCase().includes(cleanQ);
                  });

                  return {
                    ...member,
                    memberNameMatch,
                    matchingTasks,
                    hasMatches: memberNameMatch || matchingTasks.length > 0
                  };
                }).filter(m => {
                  if (!cleanQ || !onlyShowMatches) return true;
                  return m.hasMatches;
                });

                return (
                  <div
                    key={project.ProjectID}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      border: cleanQ && matchedTasksList.length > 0 ? '2px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-sm)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Project Header Box - Clickable row */}
                    <div
                      onClick={() => toggleProject(project.ProjectID)}
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                        backgroundColor: 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        userSelect: 'none'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                      }}
                    >
                      {/* Left: Accordion toggle + Project info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '280px' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            flexShrink: 0
                          }}
                        >
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3
                              onClick={() => toggleProject(project.ProjectID)}
                              style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                margin: 0,
                                cursor: 'pointer'
                              }}
                            >
                              {highlightMatch(project.ProjectName, searchQuery)}
                            </h3>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <span>{project.members.length} thành viên</span>
                            <span>•</span>
                            <span>{project.total_tasks} công việc</span>
                            {project.Deadline && (
                              <>
                                <span>•</span>
                                <span style={{ color: overdue ? 'var(--color-error)' : 'var(--text-muted)', fontWeight: overdue ? 600 : 400 }}>
                                  Hạn: {formatDate(project.Deadline)} {overdue && '(Quá hạn)'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Progress bar & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {/* Status Badge */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: project.Status === 'completed' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(245, 184, 0, 0.14)',
                            color: project.Status === 'completed' ? '#4ADE80' : '#FBBF24',
                            border: `1px solid ${project.Status === 'completed' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 184, 0, 0.35)'}`
                          }}
                        >
                          {project.Status === 'completed' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                          <span>{project.Status === 'completed' ? 'Hoàn thành' : 'Đang thực hiện'}</span>
                        </span>

                        {/* Progress bar */}
                        <div style={{ minWidth: '150px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Tiến độ</span>
                            <span style={{ color: project.progress_percent === 100 ? '#4ADE80' : 'var(--text-primary)' }}>
                              {project.progress_percent}% ({project.done_tasks}/{project.total_tasks})
                            </span>
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: '8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--border-color, #334155)',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${project.progress_percent}%`,
                                height: '100%',
                                borderRadius: '4px',
                                backgroundColor: project.progress_percent === 100 ? '#22C55E' : 'var(--color-primary, #F5B800)',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </div>

                        {/* Action buttons (clicking buttons does not toggle row) */}
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          {/* Export Excel (available to all users) */}
                          <button
                            onClick={() => {
                              handleExportExcel(project.ProjectID);
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid rgba(34, 197, 94, 0.35)',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              cursor: 'pointer',
                              color: '#4ADE80',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Tải riêng dự án này ra file Excel"
                          >
                            <Download size={14} />
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Tải Excel</span>
                          </button>

                          {/* Nút Thêm / Xem Mô Tả Dự Án */}
                          <button
                            onClick={() => handleOpenDescriptionModal(project)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-md)',
                              border: project.Description ? '1.5px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-color)',
                              backgroundColor: project.Description ? 'rgba(59, 130, 246, 0.14)' : 'var(--bg-card)',
                              color: project.Description ? '#60A5FA' : 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                              fontSize: '12px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Xem & Thêm mô tả chi tiết, hình ảnh (Ctrl+V) và tệp tin đính kèm"
                          >
                            <FileText size={14} color={project.Description ? '#60A5FA' : 'currentColor'} />
                            <span>{project.Description ? 'Mô Tả & File' : '+ Thêm Mô Tả'}</span>
                            {(project.Images || project.Files) && (
                              <span style={{ fontSize: '10px', backgroundColor: '#2563EB', color: '#fff', borderRadius: '10px', padding: '1px 5px', fontWeight: 700 }}>
                                📎
                              </span>
                            )}
                          </button>

                          {/* Bulk complete all tasks in project (Available for all authenticated users) */}
                          <button
                            onClick={() => handleToggleAllProjectTasks(project.ProjectID, project.Status !== 'completed')}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid ' + (project.Status === 'completed' ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-color)'),
                              backgroundColor: project.Status === 'completed' ? 'rgba(34, 197, 94, 0.14)' : 'var(--bg-card)',
                              color: project.Status === 'completed' ? '#4ADE80' : 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontWeight: 600,
                              fontSize: '12px',
                              transition: 'all 0.15s ease'
                            }}
                            title={project.Status === 'completed' ? 'Đánh dấu dự án chưa hoàn thành' : 'Đánh dấu tất cả công việc trong dự án đã hoàn thành'}
                          >
                            <CheckCircle2 size={14} color={project.Status === 'completed' ? '#4ADE80' : '#10B981'} />
                            <span>{project.Status === 'completed' ? '✓ Đã xong hết' : '✓ Xong tất cả việc'}</span>
                          </button>

                          {/* Admin Only Actions: + Thành viên, Sửa, Xóa */}
                          {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => {
                                  handleOpenAddMemberModal(project.ProjectID);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  borderRadius: 'var(--radius-md)',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                                title="Thêm thành viên vào dự án"
                              >
                                <UserPlus size={14} />
                                <span>+ Thành viên</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingProject(project);
                                  setProjectNameInput(project.ProjectName);
                                  setProjectDeadlineInput(project.Deadline || '');
                                  setIsEditProjectModalOpen(true);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  padding: '6px'
                                }}
                                title="Chỉnh sửa dự án"
                              >
                                <Edit2 size={16} />
                              </button>

                              <button
                                onClick={() => handleDeleteProject(project)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--danger-color)',
                                  padding: '6px'
                                }}
                                title="Xóa toàn bộ dự án"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Members & Tasks Container */}
                    {isExpanded && (
                      <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* ── KHUNG MÔ TẢ DỰ ÁN & TÀI LIỆU ĐÍNH KÈM (NẾU CÓ) ── */}
                        {(project.Description || project.Images || project.Files) && (
                          <div
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderRadius: '8px',
                              border: '1.5px solid rgba(59, 130, 246, 0.35)',
                              padding: '14px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={16} color="var(--color-primary, #60A5FA)" />
                                <span style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--color-primary, #60A5FA)' }}>
                                  Mô Tả Chi Tiết &amp; Diễn Giải Sự Vụ Dự Án
                                </span>
                                {project.DescriptionUpdatedBy && (
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    (Cập nhật bởi: {project.DescriptionUpdatedBy})
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenDescriptionModal(project)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: '1px solid rgba(59, 130, 246, 0.4)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                  color: 'var(--color-primary, #60A5FA)',
                                  cursor: 'pointer'
                                }}
                              >
                                <Edit2 size={12} />
                                <span>Chỉnh Sửa Mô Tả</span>
                              </button>
                            </div>

                            {/* Text Description */}
                            {project.Description && (
                              <div
                                style={{
                                  fontSize: '13px',
                                  color: 'var(--text-primary)',
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap',
                                  backgroundColor: 'var(--bg-primary)',
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                {project.Description}
                              </div>
                            )}

                            {/* Images Grid */}
                            {project.Images && (() => {
                              try {
                                const parsedImgs = JSON.parse(project.Images);
                                if (Array.isArray(parsedImgs) && parsedImgs.length > 0) {
                                  return (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                      {parsedImgs.map((url: string, i: number) => (
                                        <a
                                          key={i}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            width: '90px',
                                            height: '70px',
                                            display: 'block'
                                          }}
                                          title={`Xem ảnh ${i + 1}`}
                                        >
                                          <img
                                            src={url}
                                            alt={`Image ${i + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  );
                                }
                              } catch {}
                              return null;
                            })()}

                            {/* Files List */}
                            {project.Files && (() => {
                              try {
                                const parsedFiles = JSON.parse(project.Files);
                                if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
                                  return (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                      {parsedFiles.map((url: string, i: number) => {
                                        const fn = url.split('/').pop() || `File_${i + 1}`;
                                        return (
                                          <a
                                            key={i}
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            download
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                              padding: '4px 10px',
                                              borderRadius: '6px',
                                              backgroundColor: 'var(--bg-primary)',
                                              border: '1px solid var(--border-color)',
                                              color: 'var(--text-primary)',
                                              fontSize: '12px',
                                              textDecoration: 'none',
                                              fontWeight: 600
                                            }}
                                          >
                                            <Paperclip size={13} color="var(--color-primary, #60A5FA)" />
                                            <span>{fn}</span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                              } catch {}
                              return null;
                            })()}
                          </div>
                        )}

                        {displayedMembers.length === 0 ? (
                          <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div>
                              {cleanQ && onlyShowMatches
                                ? 'Không có thành viên hoặc task nào khớp với từ khóa tìm kiếm.'
                                : 'Dự án này chưa có thành viên nào.'}
                            </div>
                            {(!cleanQ || !onlyShowMatches) && isAdmin && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddMemberModal(project.ProjectID)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--color-primary, #60A5FA)',
                                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <UserPlus size={14} />
                                  <span>+ Thêm Thành Viên</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          displayedMembers.map(member => {
                            const isMemberExpanded = !!expandedMembers[member.MemberID];
                            const memberDoneCount = member.tasks.filter(t => t.Done).length;
                            const memberTotalCount = member.tasks.length;
                            const isAllMemberDone = memberTotalCount > 0 && memberDoneCount === memberTotalCount;

                            // If searching and onlyShowMatches, show only matched tasks
                            const rawTasksToRender = (cleanQ && onlyShowMatches && !member.memberNameMatch)
                              ? member.matchingTasks
                              : member.tasks;

                            // Sắp xếp: công việc chưa hoàn thành (Done === false) ưu tiên hiển thị trước
                            const tasksToRender = [...rawTasksToRender].sort((a, b) => {
                              if (a.Done === b.Done) return a.TaskID - b.TaskID;
                              return a.Done ? 1 : -1;
                            });

                            return (
                              <div
                                key={member.MemberID}
                                style={{
                                  backgroundColor: 'var(--bg-card)',
                                  borderRadius: 'var(--radius-md)',
                                  border: member.hasMatches && cleanQ ? '1px solid #F5B800' : '1px solid var(--border-color)',
                                  overflow: 'hidden'
                                }}
                              >
                                {/* Member Header - Clickable row */}
                                <div
                                  onClick={() => toggleMember(member.MemberID)}
                                  style={{
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    borderBottom: isMemberExpanded ? '1px solid var(--border-color)' : 'none',
                                    backgroundColor: isAllMemberDone ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s ease',
                                    userSelect: 'none'
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = isAllMemberDone ? 'rgba(34, 197, 94, 0.16)' : 'var(--bg-hover)';
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = isAllMemberDone ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-card)';
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-secondary)',
                                        flexShrink: 0
                                      }}
                                    >
                                      {isMemberExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <div
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          backgroundColor: 'rgba(99, 102, 241, 0.18)',
                                          color: '#818CF8',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '11px',
                                          fontWeight: 700
                                        }}
                                      >
                                        <User size={13} />
                                      </div>
                                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {highlightMatch(member.MemberName, searchQuery)}
                                      </span>
                                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        ({memberDoneCount}/{memberTotalCount} hoàn thành)
                                      </span>
                                      {cleanQ && member.matchingTasks.length > 0 && (
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            backgroundColor: 'rgba(234, 179, 8, 0.2)',
                                            color: '#FACC15'
                                          }}
                                        >
                                          {member.matchingTasks.length} task khớp
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    onClick={e => e.stopPropagation()}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    {member.tasks.length > 0 && (
                                      <>
                                        {/* Select all tasks of this member for bulk action */}
                                        <button
                                          type="button"
                                          onClick={(e) => handleSelectAllTasksOfMember(member, e)}
                                          style={{
                                            padding: '3px 7px',
                                            fontSize: '11px',
                                            fontWeight: 500,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: member.tasks.length > 0 && member.tasks.every(t => selectedTaskIds.has(t.TaskID)) ? 'rgba(59, 130, 246, 0.2)' : 'var(--bg-card)',
                                            color: member.tasks.length > 0 && member.tasks.every(t => selectedTaskIds.has(t.TaskID)) ? 'var(--color-primary, #60A5FA)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                          }}
                                          title="Chọn hoặc bỏ chọn tất cả công việc của thành viên này để thao tác hàng loạt"
                                        >
                                          <CheckSquare size={12} />
                                          <span>{member.tasks.length > 0 && member.tasks.every(t => selectedTaskIds.has(t.TaskID)) ? 'Bỏ chọn' : 'Chọn việc'}</span>
                                        </button>

                                        {/* Toggle all tasks of this member */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleAllMemberTasks(member.MemberID, !member.tasks.every(t => t.Done))}
                                          style={{
                                            padding: '3px 8px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid ' + (member.tasks.every(t => t.Done) ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-color)'),
                                            backgroundColor: member.tasks.every(t => t.Done) ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-card)',
                                            color: member.tasks.every(t => t.Done) ? '#22C55E' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                          title={member.tasks.every(t => t.Done) ? 'Đánh dấu chưa hoàn thành các task của thành viên' : 'Đánh dấu hoàn thành toàn bộ việc của thành viên này'}
                                        >
                                          <CheckCircle2 size={12} color={member.tasks.every(t => t.Done) ? '#22C55E' : '#10B981'} />
                                          <span>{member.tasks.every(t => t.Done) ? '✓ Đã xong hết' : `✓ Xong hết (${member.tasks.length})`}</span>
                                        </button>
                                      </>
                                    )}

                                    {isAdmin && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setSelectedMemberIdForTask(member.MemberID);
                                            setTaskNameInput('');
                                            setIsAddTaskModalOpen(true);
                                          }}
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-card)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                          }}
                                        >
                                          <Plus size={13} />
                                          <span>+ Task</span>
                                        </button>

                                        <button
                                          onClick={() => handleDeleteMember(member)}
                                          style={{
                                            padding: '4px 6px',
                                            borderRadius: 'var(--radius-sm)',
                                            border: 'none',
                                            backgroundColor: 'transparent',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)'
                                          }}
                                          title="Xóa thành viên"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Task List */}
                                {isMemberExpanded && (
                                  <div style={{ padding: '8px 16px 12px 36px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {tasksToRender.length === 0 ? (
                                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0' }}>
                                        {isAdmin ? 'Chưa có công việc nào. Hãy nhấn "+ Task" để giao việc.' : 'Chưa có công việc nào.'}
                                      </p>
                                    ) : (
                                      tasksToRender.map(task => {
                                        const isTaskMatch = cleanQ && removeAccents(task.TaskName).toLowerCase().includes(cleanQ);

                                        return (
                                          <div
                                            key={task.TaskID}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              padding: '6px 8px',
                                              borderRadius: 'var(--radius-sm)',
                                              backgroundColor: selectedTaskIds.has(task.TaskID)
                                                ? 'rgba(59, 130, 246, 0.15)'
                                                : (isTaskMatch ? 'rgba(234, 179, 8, 0.15)' : (task.Done ? 'rgba(255, 255, 255, 0.02)' : 'var(--bg-card)')),
                                              border: selectedTaskIds.has(task.TaskID)
                                                ? '1px solid rgba(59, 130, 246, 0.4)'
                                                : (isTaskMatch ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid var(--border-color)')
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                              {/* Checkbox chọn hàng loạt */}
                                              <input
                                                type="checkbox"
                                                checked={selectedTaskIds.has(task.TaskID)}
                                                onChange={e => handleSelectTask(task.TaskID, e)}
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                  width: '15px',
                                                  height: '15px',
                                                  cursor: 'pointer',
                                                  accentColor: 'var(--color-primary, #2563EB)',
                                                  flexShrink: 0
                                                }}
                                                title="Chọn việc này để thao tác hàng loạt"
                                              />

                                              <label
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '8px',
                                                  cursor: 'pointer',
                                                  fontSize: '13px',
                                                  color: task.Done ? 'var(--text-muted)' : 'var(--text-primary)',
                                                  textDecoration: task.Done ? 'line-through' : 'none',
                                                  flex: 1
                                                }}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={task.Done}
                                                  onChange={() => handleToggleTask(task.TaskID, task.Done)}
                                                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#16A34A', flexShrink: 0 }}
                                                />
                                                <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                  <span>{highlightMatch(task.TaskName, searchQuery)}</span>
                                                {task.Attachment && (
                                                  <a
                                                    href={task.Attachment.startsWith('http') ? task.Attachment : task.Attachment}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '4px',
                                                      padding: '2px 8px',
                                                      borderRadius: '4px',
                                                      backgroundColor: 'rgba(234, 179, 8, 0.15)',
                                                      color: '#FACC15',
                                                      fontSize: '11px',
                                                      fontWeight: 600,
                                                      textDecoration: 'none',
                                                      border: '1px solid rgba(234, 179, 8, 0.35)'
                                                    }}
                                                    title="Xem / Tải file đính kèm"
                                                  >
                                                    <Paperclip size={12} />
                                                    <span>Tệp đính kèm</span>
                                                  </a>
                                                )}
                                              </span>
                                            </label>
                                          </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                              {task.Done && task.CompletedAt && (
                                                <span style={{ fontSize: '11px', color: '#16A34A', whiteSpace: 'nowrap' }}>
                                                  ✓ {formatDateTime(task.CompletedAt)}
                                                </span>
                                              )}

                                              {/* Đánh giá Task (Admin & Super Admin) */}
                                              {isAdmin ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <button
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      handleReviewTask(task, task.ReviewStatus === 'ok' ? null : 'ok');
                                                    }}
                                                    style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '3px',
                                                      padding: '2px 8px',
                                                      fontSize: '11px',
                                                      fontWeight: 600,
                                                      borderRadius: '12px',
                                                      border: task.ReviewStatus === 'ok' ? '1px solid #16A34A' : '1px solid var(--border-color)',
                                                      backgroundColor: task.ReviewStatus === 'ok' ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-card)',
                                                      color: task.ReviewStatus === 'ok' ? '#22C55E' : 'var(--text-secondary)',
                                                      cursor: 'pointer',
                                                      transition: 'all 0.15s ease'
                                                    }}
                                                    title={
                                                      task.ReviewStatus === 'ok'
                                                        ? `Đã đánh giá ĐẠT bởi ${task.ReviewedBy || 'Admin'} (${formatDateTime(task.ReviewedAt)}). Bấm để hủy.`
                                                        : 'Bấm để đánh giá: Đạt (OK)'
                                                    }
                                                  >
                                                    <CheckCircle2 size={12} color={task.ReviewStatus === 'ok' ? '#22C55E' : 'var(--text-muted)'} />
                                                    <span>OK</span>
                                                  </button>

                                                  <button
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      handleOpenReviewFailModal(task);
                                                    }}
                                                    style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '3px',
                                                      padding: '2px 8px',
                                                      fontSize: '11px',
                                                      fontWeight: 600,
                                                      borderRadius: '12px',
                                                      border: task.ReviewStatus === 'fail' ? '1px solid #DC2626' : '1px solid var(--border-color)',
                                                      backgroundColor: task.ReviewStatus === 'fail' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg-card)',
                                                      color: task.ReviewStatus === 'fail' ? '#EF4444' : 'var(--text-secondary)',
                                                      cursor: 'pointer',
                                                      transition: 'all 0.15s ease'
                                                    }}
                                                    title={
                                                      task.ReviewStatus === 'fail'
                                                        ? `Đã đánh giá FAIL bởi ${task.ReviewedBy || 'Admin'} (${formatDateTime(task.ReviewedAt)})${task.ReviewNote ? ': ' + task.ReviewNote : ''}. Bấm để sửa hoặc hủy.`
                                                        : 'Bấm để đánh giá: Không đạt (Fail)'
                                                    }
                                                  >
                                                    <XCircle size={12} color={task.ReviewStatus === 'fail' ? '#EF4444' : 'var(--text-muted)'} />
                                                    <span>Fail</span>
                                                  </button>

                                                  {task.ReviewStatus === 'fail' && task.ReviewNote && (
                                                    <span
                                                      style={{
                                                        fontSize: '11px',
                                                        color: '#EF4444',
                                                        fontStyle: 'italic',
                                                        maxWidth: '140px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                      }}
                                                      title={`Lý do: ${task.ReviewNote}`}
                                                    >
                                                      ({task.ReviewNote})
                                                    </span>
                                                  )}
                                                  {task.Done && !task.ReviewStatus && (
                                                    <span style={{ fontSize: '11px', color: '#22C55E', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                                      (Mặc định: Thành công)
                                                    </span>
                                                  )}
                                                </div>
                                              ) : (
                                                task.Done && (
                                                  <span
                                                    style={{
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '3px',
                                                      padding: '2px 8px',
                                                      fontSize: '11px',
                                                      fontWeight: 600,
                                                      borderRadius: '12px',
                                                      border: task.ReviewStatus === 'fail' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)',
                                                      backgroundColor: task.ReviewStatus === 'fail' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                                      color: task.ReviewStatus === 'fail' ? '#EF4444' : '#22C55E'
                                                    }}
                                                    title={
                                                      task.ReviewStatus === 'fail'
                                                        ? `Đã đánh giá FAIL bởi ${task.ReviewedBy || 'Admin'} (${formatDateTime(task.ReviewedAt)})${task.ReviewNote ? ': ' + task.ReviewNote : ''}`
                                                        : (task.ReviewStatus === 'ok'
                                                            ? `Đã đánh giá ĐẠT bởi ${task.ReviewedBy || 'Admin'} (${formatDateTime(task.ReviewedAt)})`
                                                            : 'Hoàn thành thành công (Mặc định)')
                                                    }
                                                  >
                                                    {task.ReviewStatus === 'fail' ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                                                    <span>
                                                      {task.ReviewStatus === 'fail'
                                                        ? 'Fail'
                                                        : (task.ReviewStatus === 'ok' ? 'Đạt OK' : 'Hoàn thành thành công')}
                                                    </span>
                                                  </span>
                                                )
                                              )}

                                              {isAdmin && (
                                                <button
                                                  onClick={() => handleDeleteTask(task)}
                                                  style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    padding: '2px'
                                                  }}
                                                  title="Xóa task"
                                                >
                                                  <X size={14} />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}

      {/* 0. MODAL: GIAO VIỆC NHANH (QUICK ASSIGN) */}
      <Modal
        isOpen={isQuickAssignModalOpen}
        onClose={() => setIsQuickAssignModalOpen(false)}
        title="⚡ Giao Việc Nhanh Cho Thành Viên"
      >
        <form onSubmit={handleSubmitQuickAssign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ITEM 1: DỰ ÁN (2 Options) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              1. Dự án <span style={{ color: '#DC2626' }}>*</span>
            </label>

            {/* Segmented Radio Options */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setQaProjectMode('existing');
                  if (eligibleExistingProjects.length > 0 && !qaSelectedProjectId) {
                    setQaSelectedProjectId(String(eligibleExistingProjects[0].ProjectID));
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: qaProjectMode === 'existing' ? '2px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color)',
                  backgroundColor: qaProjectMode === 'existing' ? 'rgba(245, 184, 0, 0.15)' : 'var(--bg-card)',
                  color: qaProjectMode === 'existing' ? 'var(--color-primary, #F5B800)' : 'var(--text-secondary)'
                }}
              >
                <span>📁 Dự án đang có</span>
                <span
                  style={{
                    backgroundColor: qaProjectMode === 'existing' ? 'rgba(245, 184, 0, 0.25)' : 'var(--bg-secondary)',
                    color: qaProjectMode === 'existing' ? 'var(--color-primary, #F5B800)' : 'var(--text-muted)',
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}
                >
                  {eligibleExistingProjects.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQaProjectMode('new')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: qaProjectMode === 'new' ? '2px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color)',
                  backgroundColor: qaProjectMode === 'new' ? 'rgba(245, 184, 0, 0.15)' : 'var(--bg-card)',
                  color: qaProjectMode === 'new' ? 'var(--color-primary, #F5B800)' : 'var(--text-secondary)'
                }}
              >
                <span>✨ Nhập tên dự án mới</span>
              </button>
            </div>

            {/* Option 1 Detail: Dự án đang có */}
            {qaProjectMode === 'existing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Search input for existing projects */}
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="Tìm kiếm dự án chưa quá hạn hoàn thành..."
                    value={qaProjectSearch}
                    onChange={e => setQaProjectSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 30px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  {qaProjectSearch && (
                    <button
                      type="button"
                      onClick={() => setQaProjectSearch('')}
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

                {/* Projects Selectable List */}
                <div
                  style={{
                    maxHeight: '145px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '4px'
                  }}
                >
                  {filteredEligibleProjects.length === 0 ? (
                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Không có dự án nào phù hợp (hoặc tất cả đã quá hạn hoàn thành).
                    </div>
                  ) : (
                    filteredEligibleProjects.map(p => {
                      const isSelected = qaSelectedProjectId === String(p.ProjectID);
                      return (
                        <div
                          key={p.ProjectID}
                          onClick={() => setQaSelectedProjectId(String(p.ProjectID))}
                          style={{
                            padding: '8px 10px',
                            marginBottom: '3px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isSelected ? 'rgba(245, 184, 0, 0.15)' : 'transparent',
                            border: isSelected ? '1px solid rgba(245, 184, 0, 0.4)' : '1px solid transparent',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {p.ProjectCode && (
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#F59E0B',
                                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                    padding: '1px 5px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  {p.ProjectCode}
                                </span>
                              )}
                              <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: 'var(--text-primary)' }}>
                                {p.ProjectName}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>📅 Hạn: {p.Deadline ? formatDate(p.Deadline) : 'Chưa đặt'}</span>
                              <span>👥 {p.members.length} thành viên</span>
                              <span>✓ {p.done_tasks}/{p.total_tasks} task</span>
                            </div>
                          </div>
                          {isSelected && <Check size={16} color="#F5B800" style={{ flexShrink: 0, marginLeft: '8px' }} />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Option 2 Detail: Nhập tên dự án mới */}
            {qaProjectMode === 'new' && (
              <input
                type="text"
                placeholder="Nhập tên dự án mới (VD: Nâng cấp POS 2026, KDS Ashima...)..."
                value={qaNewProjectName}
                onChange={e => setQaNewProjectName(e.target.value)}
                required={qaProjectMode === 'new'}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-primary, #F5B800)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* ITEM 2: NGƯỜI PHỤ TRÁCH (THÀNH VIÊN) - PHÂN QUYỀN TEAM APP */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                2. Người phụ trách (Thành viên) <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <button
                type="button"
                onClick={() => setQaCustomMemberMode(!qaCustomMemberMode)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary, #F5B800)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {qaCustomMemberMode ? '← Chọn từ Team App' : '+ Nhập tên khác'}
              </button>
            </div>

            {qaCustomMemberMode ? (
              <input
                type="text"
                placeholder="Nhập tên người phụ trách..."
                value={qaNewCustomMemberName}
                onChange={e => setQaNewCustomMemberName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Search input for Team App members */}
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    color="#9CA3AF"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="text"
                    placeholder="Tìm thành viên Team App (họ tên, username)..."
                    value={qaMemberSearch}
                    onChange={e => setQaMemberSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px 7px 30px',
                      fontSize: '12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      boxSizing: 'border-box',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  {qaMemberSearch && (
                    <button
                      type="button"
                      onClick={() => setQaMemberSearch('')}
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

                {/* Team App Members Grid / List */}
                <div
                  style={{
                    maxHeight: '130px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '4px'
                  }}
                >
                  {loadingTeamMembers ? (
                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Đang tải danh sách Team App...
                    </div>
                  ) : filteredTeamMembers.length === 0 ? (
                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Không tìm thấy thành viên phù hợp.
                    </div>
                  ) : (
                    filteredTeamMembers.map(m => {
                      const memberDisplayName = m.full_name || m.username;
                      const isSelected = qaSelectedMemberName === memberDisplayName || qaSelectedMemberName === m.username;
                      const initial = (m.full_name ? m.full_name.charAt(0) : m.username.charAt(0)).toUpperCase();

                      return (
                        <div
                          key={m.id}
                          onClick={() => setQaSelectedMemberName(memberDisplayName)}
                          style={{
                            padding: '6px 10px',
                            marginBottom: '2px',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: isSelected ? 'rgba(245, 184, 0, 0.15)' : 'transparent',
                            border: isSelected ? '1px solid rgba(245, 184, 0, 0.4)' : '1px solid transparent',
                            transition: 'background-color 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? 'var(--color-primary, #F5B800)' : 'var(--bg-secondary)',
                                color: isSelected ? '#111827' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              {initial}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)' }}>
                              {m.full_name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              @{m.username}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                backgroundColor: m.role_name === 'Ban Quản trị' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                color: m.role_name === 'Ban Quản trị' ? '#F59E0B' : '#818CF8',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}
                            >
                              {m.role_name || 'Team App'}
                            </span>

                          </div>
                          {isSelected && <Check size={14} color="#F5B800" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ITEM 3: NỘI DUNG CÔNG VIỆC (TASK) * */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              3. Nội dung công việc (Task) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <textarea
              placeholder="VD: Cấu hình và kiểm tra kết nối hệ thống máy in nhà hàng Ashima..."
              value={qaTaskName}
              onChange={e => setQaTaskName(e.target.value)}
              required
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* ITEM 4: HẠN CHÓT HOÀN THÀNH (TÙY CHỌN) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              4. Hạn chót hoàn thành (tùy chọn)
            </label>
            <DateInput
              min={todayStr}
              value={qaDeadline}
              onChange={setQaDeadline}
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          {/* ITEM 5: FILE ĐÍNH KÈM NẾU CÓ */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              5. File đính kèm (nếu có)
            </label>
            {!qaAttachmentFile ? (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  border: '1px dashed var(--border-color, #D1D5DB)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}
              >
                <Paperclip size={15} color="#9CA3AF" />
                <span>Bấm vào đây để chọn tệp đính kèm (PDF, Excel, Word, Ảnh...)</span>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setQaAttachmentFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(245, 184, 0, 0.15)',
                  border: '1px solid rgba(245, 184, 0, 0.35)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <Paperclip size={16} color="#F5B800" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {qaAttachmentFile.name}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({(qaAttachmentFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setQaAttachmentFile(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Bỏ file này"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsQuickAssignModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={submittingQa}>
              {submittingQa ? 'Đang giao việc...' : '⚡ Giao Việc Ngay'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 1. Modal: Thêm Dự Án Mới */}
      <Modal
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        title="Thêm Dự Án Mới"
      >
        <form onSubmit={handleAddProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Tên dự án <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Triển Khai KDS Đợt 4..."
              value={projectNameInput}
              onChange={e => setProjectNameInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Hạn chót hoàn thành (Deadline)
            </label>
            <DateInput
              value={projectDeadlineInput}
              onChange={setProjectDeadlineInput}
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsAddProjectModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo Dự Án'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Modal: Sửa Dự Án */}
      <Modal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        title="Chỉnh Sửa Thông Tin Dự Án"
      >
        <form onSubmit={handleEditProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Tên dự án <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={projectNameInput}
              onChange={e => setProjectNameInput(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Hạn chót hoàn thành
            </label>
            <DateInput
              value={projectDeadlineInput}
              onChange={setProjectDeadlineInput}
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsEditProjectModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Modal: Thêm Thành Viên */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Thêm Thành Viên Vào Dự Án"
        maxWidth="560px"
      >
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Thông tin dự án đang được chọn */}
          {(() => {
            const targetProj = (allProjects.find(p => p.ProjectID === selectedProjectIdForMember) ||
                                projects.find(p => p.ProjectID === selectedProjectIdForMember));
            return (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px'
                }}
              >
                <Briefcase size={16} color="var(--color-primary, #F5B800)" />
                <span style={{ color: 'var(--text-muted)' }}>Dự án mục tiêu:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {targetProj?.ProjectName || 'Dự án đã chọn'}
                </span>
              </div>
            );
          })()}

          {/* Nút chuyển chế độ: Chọn danh sách / Nhập tự do */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAddMemberCustomMode(false)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                border: !addMemberCustomMode ? '2px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color)',
                backgroundColor: !addMemberCustomMode ? 'rgba(245, 184, 0, 0.15)' : 'var(--bg-card)',
                color: !addMemberCustomMode ? 'var(--color-primary, #F5B800)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <User size={14} />
              <span>Chọn Thành Viên Hệ Thống</span>
            </button>
            <button
              type="button"
              onClick={() => setAddMemberCustomMode(true)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '12px',
                fontWeight: 600,
                border: addMemberCustomMode ? '2px solid var(--color-primary, #F5B800)' : '1px solid var(--border-color)',
                backgroundColor: addMemberCustomMode ? 'rgba(245, 184, 0, 0.15)' : 'var(--bg-card)',
                color: addMemberCustomMode ? 'var(--color-primary, #F5B800)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s'
              }}
            >
              <Edit2 size={14} />
              <span>Nhập Tên Tùy Ý Khác</span>
            </button>
          </div>

          {!addMemberCustomMode ? (
            <div>
              {/* Ô tìm kiếm thành viên */}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search
                  size={14}
                  color="#9CA3AF"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Gõ tên hoặc username để tìm..."
                  value={addMemberSearch}
                  onChange={e => setAddMemberSearch(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 30px 8px 32px',
                    fontSize: '13px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {addMemberSearch && (
                  <button
                    type="button"
                    onClick={() => setAddMemberSearch('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Nhóm lọc nhanh */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {[
                  { key: 'app', label: 'Team IT App' },
                  { key: 'admin', label: 'Ban Quản trị' },
                  { key: 'all', label: 'Tất cả nhân sự' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setAddMemberRoleFilter(tab.key as any)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: addMemberRoleFilter === tab.key ? 700 : 500,
                      border: '1px solid',
                      borderColor: addMemberRoleFilter === tab.key ? '#F5B800' : 'var(--border-color)',
                      backgroundColor: addMemberRoleFilter === tab.key ? 'rgba(245, 184, 0, 0.18)' : 'var(--bg-card)',
                      color: addMemberRoleFilter === tab.key ? 'var(--color-primary, #F5B800)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Danh sách thành viên */}
              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '4px'
                }}
              >
                {(() => {
                  const q = removeAccents(addMemberSearch).toLowerCase().trim();
                  const filtered = teamMembers.filter(m => {
                    if (addMemberRoleFilter === 'app' && m.role_name !== 'Team IT App') return false;
                    if (addMemberRoleFilter === 'admin' && m.role_name !== 'Ban Quản trị') return false;

                    if (!q) return true;
                    return (
                      removeAccents(m.full_name).toLowerCase().includes(q) ||
                      removeAccents(m.username).toLowerCase().includes(q) ||
                      (m.role_name && removeAccents(m.role_name).toLowerCase().includes(q))
                    );
                  });

                  if (loadingTeamMembers) {
                    return (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Đang tải danh sách nhân sự...
                      </div>
                    );
                  }

                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Không tìm thấy thành viên nào khớp với từ khóa. Bạn có thể bấm <strong>"Nhập Tên Tùy Ý Khác"</strong> ở trên.
                      </div>
                    );
                  }

                  return filtered.map(m => {
                    const memberDisplayName = m.full_name || m.username;
                    const isSelected = addMemberSelectedName === memberDisplayName || addMemberSelectedName === m.username;
                    const initial = (m.full_name ? m.full_name.charAt(0) : m.username.charAt(0)).toUpperCase();
                    const isApp = m.role_name === 'Team IT App';
                    const isAdmin = m.role_name === 'Ban Quản trị';

                    return (
                      <div
                        key={m.id}
                        onClick={() => setAddMemberSelectedName(memberDisplayName)}
                        style={{
                          padding: '8px 10px',
                          marginBottom: '3px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: isSelected ? 'rgba(245, 184, 0, 0.15)' : 'transparent',
                          border: isSelected ? '1px solid rgba(245, 184, 0, 0.4)' : '1px solid transparent',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: isSelected
                                ? 'var(--color-primary, #F5B800)'
                                : isApp
                                ? 'rgba(99, 102, 241, 0.18)'
                                : isAdmin
                                ? 'rgba(245, 158, 11, 0.18)'
                                : 'var(--bg-secondary)',
                              color: isSelected
                                ? '#111827'
                                : isApp
                                ? '#818CF8'
                                : isAdmin
                                ? '#F59E0B'
                                : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          >
                            {initial}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: 'var(--text-primary)' }}>
                                {highlightMatch(m.full_name || m.username, addMemberSearch)}
                              </span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  backgroundColor: isApp ? 'rgba(99, 102, 241, 0.18)' : isAdmin ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-secondary)',
                                  color: isApp ? '#818CF8' : isAdmin ? '#F59E0B' : 'var(--text-muted)'
                                }}
                              >
                                {m.role_name || 'Thành viên'}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              @{m.username}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={16} color="#F5B800" />}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Tag đã chọn */}
              {addMemberSelectedName && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    color: '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Check size={14} color="#22C55E" />
                  <span>Đã chọn: <strong>{addMemberSelectedName}</strong></span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Họ và tên thành viên phụ trách <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Nguyễn Vũ Minh Thức (Team IT App)..."
                value={addMemberCustomName}
                onChange={e => setAddMemberCustomName(e.target.value)}
                required={addMemberCustomMode}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                * Nhập họ tên thành viên hoặc đối tác phối hợp triển khai dự án.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <Button variant="outline" type="button" onClick={() => setIsAddMemberModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={
                submitting ||
                (addMemberCustomMode ? !addMemberCustomName.trim() : !addMemberSelectedName.trim())
              }
            >
              {submitting ? 'Đang thêm...' : 'Thêm Thành Viên'}
            </Button>
          </div>
        </form>
      </Modal>


      {/* 4. Modal: Thêm Task */}
      <Modal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        title="Thêm Công Việc Mới (Task)"
      >
        <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Nội dung công việc <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              placeholder="VD: Cấu hình Switch và kiểm tra kết nối thiết bị KDS..."
              value={taskNameInput}
              onChange={e => setTaskNameInput(e.target.value)}
              required
              rows={3}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="outline" type="button" onClick={() => setIsAddTaskModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang thêm...' : 'Thêm Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal: Import Excel */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Nhập Dữ Liệu Dự Án Từ Excel"
      >
        <form onSubmit={handleImportExcel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Banner Tải File Mẫu */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(245, 184, 0, 0.12)',
              border: '1px solid rgba(245, 184, 0, 0.35)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={20} color="#F5B800" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary, #F5B800)' }}>
                  Chưa có file mẫu Excel chuẩn?
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Tải mẫu Excel chuẩn hệ thống để điền thông tin dự án đúng cấu trúc
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#111827',
                backgroundColor: 'var(--color-primary, #F5B800)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <Download size={14} />
              Tải File Mẫu
            </button>
          </div>

          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
              Hệ thống hỗ trợ tự động bóc tách Dự án, Thành viên và Công việc tương ứng từ file Excel.
            </p>
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <Upload size={32} color="#9CA3AF" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Chọn file Excel định dạng .xlsx hoặc .xls
              </div>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={e => setImportFile(e.target.files ? e.target.files[0] : null)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="outline" type="button" onClick={() => setIsImportModalOpen(false)}>
              Đóng
            </Button>
            <Button variant="primary" type="submit" disabled={importing || !importFile}>
              {importing ? 'Đang xử lý...' : 'Tiến Hành Import'}
            </Button>
          </div>

          {importResult && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Alert
                type={importResult.success ? 'success' : 'error'}
                message={importResult.message}
              />
              {importResult.success && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false);
                      if (projects && projects.length > 0) {
                        handleOpenDescriptionModal(projects[0]);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <FileText size={15} />
                    <span>Thêm Mô Tả / File Đính Kèm Cho Dự Án Vừa Import</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </Modal>

      {/* 6.5. Modal: Xuất Báo Cáo Excel (Tất cả hoặc Chọn nhiều Dự Án) */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Tải Dữ Liệu Dự Án Ra File Excel"
        maxWidth="650px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Bạn có thể tải toàn bộ danh sách hoặc dùng ô tìm kiếm và chọn các checkbox bên dưới để tải riêng 1 hoặc nhiều dự án cùng lúc.
          </p>

          {/* Search box for projects */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              color="#9CA3AF"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh tên dự án hoặc mã dự án..."
              value={exportSearchQuery}
              onChange={e => setExportSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                fontSize: '13px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {exportSearchQuery && (
              <button
                onClick={() => setExportSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Select Buttons */}
          {(() => {
            const cleanQ = removeAccents(exportSearchQuery).toLowerCase().trim();
            const filtered = projects.filter(p => {
              if (!cleanQ) return true;
              return (
                removeAccents(p.ProjectName).toLowerCase().includes(cleanQ) ||
                (p.ProjectCode && removeAccents(p.ProjectCode).toLowerCase().includes(cleanQ))
              );
            });

            const allFilteredSelected =
              filtered.length > 0 && filtered.every(p => exportSelectedProjectIds.includes(p.ProjectID));

            const handleToggleSelectAll = () => {
              if (allFilteredSelected) {
                const filteredIds = new Set(filtered.map(p => p.ProjectID));
                setExportSelectedProjectIds(prev => prev.filter(id => !filteredIds.has(id)));
              } else {
                const combined = new Set([...exportSelectedProjectIds, ...filtered.map(p => p.ProjectID)]);
                setExportSelectedProjectIds(Array.from(combined));
              }
            };

            const toggleProjectSelect = (pId: number) => {
              setExportSelectedProjectIds(prev =>
                prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
              );
            };

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      {allFilteredSelected ? 'Bỏ chọn danh sách lọc' : 'Chọn tất cả trong lọc'}
                    </button>
                    {exportSelectedProjectIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExportSelectedProjectIds([])}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        Bỏ chọn tất cả ({exportSelectedProjectIds.length})
                      </button>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Đã chọn: <strong style={{ color: 'var(--color-primary, #F5B800)' }}>{exportSelectedProjectIds.length}</strong> / {projects.length} dự án
                  </span>
                </div>

                {/* Projects Checkbox List */}
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                >
                  {filtered.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      Không tìm thấy dự án nào khớp với từ khóa "{exportSearchQuery}".
                    </div>
                  ) : (
                    filtered.map(p => {
                      const isChecked = exportSelectedProjectIds.includes(p.ProjectID);
                      return (
                        <label
                          key={p.ProjectID}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isChecked ? 'rgba(245, 184, 0, 0.15)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProjectSelect(p.ProjectID)}
                            style={{ accentColor: 'var(--color-primary, #F5B800)', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {p.ProjectName}
                              </span>
                              {p.ProjectCode && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    padding: '1px 6px',
                                    borderRadius: '4px'
                                  }}
                                >
                                  {p.ProjectCode}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>{p.members.length} thành viên</span>
                              <span>•</span>
                              <span>{p.total_tasks} công việc ({p.progress_percent}%)</span>
                              <span>•</span>
                              <span style={{ color: p.Status === 'completed' ? '#16A34A' : '#D97706', fontWeight: 500 }}>
                                {p.Status === 'completed' ? 'Đã hoàn thành' : 'Đang thực hiện'}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </>
            );
          })()}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button variant="outline" type="button" onClick={() => setIsExportModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="primary"
              type="button"
              disabled={exporting}
              onClick={() => {
                if (exportSelectedProjectIds.length === 1) {
                  handleExportExcel(exportSelectedProjectIds[0]);
                } else if (exportSelectedProjectIds.length > 1) {
                  handleExportExcel(undefined, exportSelectedProjectIds);
                } else {
                  handleExportExcel();
                }
              }}
            >
              {exporting ? (
                'Đang xuất file...'
              ) : (
                <>
                  <Download size={15} style={{ marginRight: '6px' }} />
                  {exportSelectedProjectIds.length > 0
                    ? `Tải ${exportSelectedProjectIds.length} Dự Án Đã Chọn`
                    : 'Tải Toàn Bộ Dự Án'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. Modal / Drawer: Nhật Ký Hoạt Động */}
      <Modal
        isOpen={showLogsDrawer}
        onClose={() => setShowLogsDrawer(false)}
        title="Nhật Ký Thao Tác Dự Án (Activity Logs)"
        maxWidth="820px"
      >
        {/* Thanh Lọc Bộ Lọc Nhật Ký */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} color="var(--color-primary, #F5B800)" /> Bộ lọc nhật ký (Tối đa 200 dòng gần nhất)
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Đang hiển thị {activityLogs.length} dòng
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            {/* Lọc theo Dự án (Gõ tìm kiếm trực tiếp + Dropdown danh sách) */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Dự án (Tìm kiếm hoặc chọn)
              </label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={13}
                  color="#9CA3AF"
                  style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Gõ tên dự án..."
                  value={
                    isProjectDropdownOpen
                      ? logsProjectSearch
                      : logsFilterProject
                      ? (allProjects.find(p => String(p.ProjectID) === logsFilterProject)?.ProjectName ||
                         projects.find(p => String(p.ProjectID) === logsFilterProject)?.ProjectName ||
                         logsProjectSearch)
                      : logsProjectSearch
                  }
                  onFocus={() => {
                    setIsProjectDropdownOpen(true);
                    if (!logsProjectSearch && logsFilterProject) {
                      const sel = allProjects.find(p => String(p.ProjectID) === logsFilterProject) ||
                                  projects.find(p => String(p.ProjectID) === logsFilterProject);
                      if (sel) setLogsProjectSearch(sel.ProjectName);
                    }
                  }}
                  onChange={e => {
                    setLogsProjectSearch(e.target.value);
                    setIsProjectDropdownOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 26px 6px 26px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
                {logsFilterProject || logsProjectSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLogsFilterProject('');
                      setLogsProjectSearch('');
                      setIsProjectDropdownOpen(true);
                    }}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown danh sách dự án tìm thấy */}
              {isProjectDropdownOpen && (
                <>
                  <div
                    onClick={() => setIsProjectDropdownOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 998
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 999,
                      marginTop: '3px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      maxHeight: '220px',
                      overflowY: 'auto'
                    }}
                  >
                    <div
                      onClick={() => {
                        setLogsFilterProject('');
                        setLogsProjectSearch('');
                        setIsProjectDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      -- Tất cả dự án --
                    </div>

                    {(() => {
                      const sourceList = allProjects.length > 0 ? allProjects : projects;
                      const q = removeAccents(logsProjectSearch).toLowerCase().trim();
                      const filtered = sourceList.filter(p => {
                        if (!q) return true;
                        return (
                          removeAccents(p.ProjectName).toLowerCase().includes(q) ||
                          (p.ProjectCode && removeAccents(p.ProjectCode).toLowerCase().includes(q))
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                            Không tìm thấy dự án nào khớp với "{logsProjectSearch}"
                          </div>
                        );
                      }

                      return filtered.map(p => {
                        const isSelected = logsFilterProject === String(p.ProjectID);
                        return (
                          <div
                            key={p.ProjectID}
                            onClick={() => {
                              setLogsFilterProject(String(p.ProjectID));
                              setLogsProjectSearch(p.ProjectName);
                              setIsProjectDropdownOpen(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'rgba(245, 184, 0, 0.15)' : 'transparent',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {p.ProjectName}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                              <span>{p.members?.length || 0} thành viên</span>
                              <span>•</span>
                              <span style={{ color: p.Status === 'completed' ? '#16A34A' : '#D97706' }}>
                                {p.Status === 'completed' ? 'Đã xong' : 'Đang làm'}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Lọc theo Người thực hiện (Gợi ý IT App + Nhập tùy ý có dấu/không dấu) */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Người thực hiện (IT App / Nhập bất kỳ)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Gõ tên hoặc chọn IT App..."
                  value={logsFilterActor}
                  onFocus={() => setIsActorDropdownOpen(true)}
                  onChange={e => {
                    setLogsFilterActor(e.target.value);
                    setIsActorDropdownOpen(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 26px 6px 10px',
                    fontSize: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
                {logsFilterActor ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLogsFilterActor('');
                      setIsActorDropdownOpen(true);
                    }}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                  >
                    <X size={13} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsActorDropdownOpen(!isActorDropdownOpen)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: 0
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown danh sách thành viên IT App */}
              {isActorDropdownOpen && (
                <>
                  <div
                    onClick={() => setIsActorDropdownOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 998
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 999,
                      marginTop: '3px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      maxHeight: '210px',
                      overflowY: 'auto'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-primary, #F5B800)',
                        backgroundColor: 'rgba(245, 184, 0, 0.15)',
                        borderBottom: '1px solid rgba(245, 184, 0, 0.25)'
                      }}
                    >
                      Danh sách nhân sự (Team App & Ban Quản trị):
                    </div>

                    <div
                      onClick={() => {
                        setLogsFilterActor('');
                        setIsActorDropdownOpen(false);
                      }}
                      style={{
                        padding: '7px 10px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      -- Tất cả người thực hiện --
                    </div>

                    {teamMembers
                      .filter(m => {
                        if (!logsFilterActor.trim()) return true;
                        const q = removeAccents(logsFilterActor).toLowerCase().trim();
                        return (
                          removeAccents(m.full_name).toLowerCase().includes(q) ||
                          removeAccents(m.username).toLowerCase().includes(q) ||
                          (m.role_name && removeAccents(m.role_name).toLowerCase().includes(q))
                        );
                      })
                      .map(m => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setLogsFilterActor(m.username);
                            setIsActorDropdownOpen(false);
                          }}
                          style={{
                            padding: '7px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: logsFilterActor === m.username ? 'rgba(245, 184, 0, 0.15)' : 'transparent'
                          }}
                          onMouseEnter={e => {
                            if (logsFilterActor !== m.username) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                          }}
                          onMouseLeave={e => {
                            if (logsFilterActor !== m.username) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {m.full_name || m.username}
                            </span>
                            {m.role_name && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: m.role_name === 'Ban Quản trị' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(99, 102, 241, 0.18)',
                                  color: m.role_name === 'Ban Quản trị' ? '#F59E0B' : '#818CF8',
                                  fontWeight: 600
                                }}
                              >
                                {m.role_name}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            @{m.username}
                          </span>
                        </div>
                      ))}


                    {/* Common system usernames */}
                    {['admin'].filter(u => {
                      if (!logsFilterActor.trim()) return true;
                      const q = removeAccents(logsFilterActor).toLowerCase().trim();
                      return u.includes(q);
                    }).map(u => (
                      <div
                        key={u}
                        onClick={() => {
                          setLogsFilterActor(u);
                          setIsActorDropdownOpen(false);
                        }}
                        style={{
                          padding: '7px 10px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid var(--border-color)'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-primary, #F5B800)' }}>Quản trị hệ thống</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Từ ngày (Mặc định 2 tháng trước) */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Từ ngày
              </label>
              <DateInput
                value={logsFilterStartDate}
                onChange={setLogsFilterStartDate}
                compact
                containerStyle={{ width: '100%' }}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>

            {/* Đến ngày */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                Đến ngày
              </label>
              <DateInput
                value={logsFilterEndDate}
                onChange={setLogsFilterEndDate}
                compact
                containerStyle={{ width: '100%' }}
                style={{ height: '30px', fontSize: '12px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleResetLogsFilter}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={() => fetchActivityLogs()}
              disabled={loadingLogs}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--color-primary, #F5B800)',
                color: '#111827',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Search size={13} />
              Lọc Nhật Ký
            </button>
          </div>
        </div>

        {/* Danh Sách Logs */}
        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
          {loadingLogs ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="spin" color="#B48200" style={{ marginBottom: '8px' }} />
              <div>Đang tải nhật ký thao tác...</div>
            </div>
          ) : activityLogs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không tìm thấy nhật ký hoạt động nào phù hợp.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activityLogs.map(log => (
                <div
                  key={log.LogID}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {log.ActionBy || 'Hệ thống'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(245, 184, 0, 0.18)',
                          color: '#F5B800'
                        }}
                      >
                        {log.ActionType}
                      </span>
                      {log.ProjectName && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60A5FA'
                          }}
                        >
                          📁 {log.ProjectName}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      {formatDateTime(log.ActionTime)}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {log.Message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Đánh giá Không đạt (Fail) */}
      <Modal
        isOpen={!!reviewFailModalTask}
        onClose={() => setReviewFailModalTask(null)}
        title="Đánh Giá Không Đạt (Fail)"
        maxWidth="480px"
      >
        {reviewFailModalTask && (
          <form onSubmit={handleSubmitReviewFail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Đánh giá công việc: <strong style={{ color: 'var(--text-primary)' }}>"{reviewFailModalTask.TaskName}"</strong>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Lý do / Ghi chú đánh giá (tùy chọn):
              </label>
              <textarea
                value={reviewFailNote}
                onChange={e => setReviewFailNote(e.target.value)}
                placeholder="Nhập lý do chưa đạt (VD: Chưa cài xong KDS, lỗi máy in, thiếu phụ kiện...)..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              {reviewFailModalTask.ReviewStatus === 'fail' ? (
                <button
                  type="button"
                  onClick={() => {
                    handleReviewTask(reviewFailModalTask, null);
                    setReviewFailModalTask(null);
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy đánh giá (Reset)
                </button>
              ) : (
                <div />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="outline" type="button" onClick={() => setReviewFailModalTask(null)}>
                  Đóng
                </Button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <XCircle size={15} />
                  <span>{submittingReview ? 'Đang lưu...' : 'Xác nhận Fail'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Mô tả chi tiết & Đính kèm file / Paste ảnh */}
      <ProjectDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => {
          setIsDescriptionModalOpen(false);
          setSelectedProjectForDescription(null);
        }}
        project={selectedProjectForDescription}
        onSuccess={(updated) => {
          setProjects(prev => prev.map(p => p.ProjectID === updated.ProjectID ? { ...p, ...updated } : p));
          setAllProjects(prev => prev.map(p => p.ProjectID === updated.ProjectID ? { ...p, ...updated } : p));
          fetchProjects();
        }}
      />

      {/* Floating Bulk Action Bar */}
      {selectedTaskIds.size > 0 && (
        <div
          className="floating-bulk-bar"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
            <CheckSquare size={18} color="#F5B800" />
            <span>Đã chọn <strong style={{ color: '#F5B800' }}>{selectedTaskIds.size}</strong> công việc</span>
          </div>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

          <button
            type="button"
            disabled={isBulkProcessing}
            onClick={() => handleBulkToggle(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={15} />
            <span>{isBulkProcessing ? 'Đang cập nhật...' : 'Đánh dấu Đã Xong (Done)'}</span>
          </button>

          <button
            type="button"
            disabled={isBulkProcessing}
            onClick={() => handleBulkToggle(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#475569',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: isBulkProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCcw size={15} />
            <span>Bỏ Hoàn Thành</span>
          </button>

          <button
            type="button"
            disabled={isBulkProcessing}
            onClick={() => setSelectedTaskIds(new Set())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'transparent',
              color: '#94A3B8',
              border: 'none',
              padding: '8px 10px',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <X size={15} />
            <span>Hủy chọn</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementPage;
