import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { authService } from '../../services/authService';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset fields whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    if (!currentPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMessage('Mật khẩu mới phải có độ dài tối thiểu 4 ký tự.');
      return;
    }

    if (newPassword.trim() === currentPassword.trim()) {
      setErrorMessage('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.changePassword({
        current_password: currentPassword.trim(),
        new_password: newPassword.trim(),
        confirm_password: confirmPassword.trim(),
      });

      setSuccessMessage(res.message || 'Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Auto close modal after 1.8 seconds on success
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể đổi mật khẩu. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        disabled={isLoading}
      >
        {successMessage ? 'Đóng' : 'Hủy bỏ'}
      </Button>
      {!successMessage && (
        <Button
          type="button"
          variant="primary"
          onClick={handleSubmit}
          isLoading={isLoading}
          leftIcon={<KeyRound size={16} />}
        >
          Lưu Mật Khẩu Mới
        </Button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đổi Mật Khẩu Cá Nhân"
      footer={footer}
      maxWidth="460px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {username && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Tài khoản:</span>
            <strong style={{ color: 'var(--text-primary)' }}>{username}</strong>
          </div>
        )}

        {errorMessage && (
          <Alert type="error" message={errorMessage} />
        )}

        {successMessage && (
          <Alert type="success" message={successMessage} />
        )}

        {!successMessage && (
          <>
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              placeholder="Nhập mật khẩu hiện tại của bạn"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              showPasswordToggle={true}
              autoFocus
              required
              disabled={isLoading}
            />

            <Input
              label="Mật khẩu mới"
              type="password"
              placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              showPasswordToggle={true}
              helperText="Độ dài tối thiểu 4 ký tự"
              required
              disabled={isLoading}
            />

            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              showPasswordToggle={true}
              required
              disabled={isLoading}
            />
          </>
        )}
      </form>
    </Modal>
  );
};
