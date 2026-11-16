======================================================================
HUONG DAN CAI DAT & VAN HANH 3CX SYNC RELAY WORKER (PHUONG AN 2)
======================================================================

Muc dich:
  Khi may chu Web IT (VD: 172.16.8.25) bi tuong lua Datacenter chan
  ket noi ra ngoai toi cong 3CX https://ggg.ringbot.co:5001, ban chi can
  giai nen thu muc nay len bat ky PC / VM nao truy cap duoc cong 3CX
  (trong van phong hoac VPN/NAT thong cong 5001) va ket noi ve Server Web.

Cac file trong goi nay:
  1. relay_config.json                  : Da dien san dia chi Server & Relay Token.
  2. 3cx_sync_relay.py                  : Ma nguon worker chay Playwright doc lap.
  3. Chay_3CX_Sync_Relay.bat            : Chay truc quan (hien cua so log theo doi).
  4. Chay_Ngam_3CX_Relay.vbs            : Chay an hoan toan duoi nen Windows.
  5. Cai_Dat_Khoi_Dong_Cung_Windows.bat : Tu dong chay ngam moi khi mo may Windows.
  6. Dung_3CX_Relay.bat                 : Dung tien trinh worker khi can bao tri.
  7. relay_worker.log                   : File nhat ky tu tao khi chay.

Yeu cau moi truong tren PC / VM Relay:
  - Python 3.10 tro len (co san Edge/Chrome hoac cho phep pip install playwright).
  - Ket noi HTTP/HTTPS duoc ve server_url trong relay_config.json.
  - Ket noi HTTPS duoc toi https://ggg.ringbot.co:5001/#/login.

Huong dan nhanh (2 buoc):
  Buoc 1: Giai nen toan bo file ZIP vao mot thu muc co dinh (VD: D:\3CX_Relay).
  Buoc 2: Nhan dup "Chay_3CX_Sync_Relay.bat" lan dau de tu kiem tra Python
          va cai dat playwright. Khi thay thong bao "Ket noi may chu thanh cong!"
          thi quay lai tab "Cau Hinh 3CX & Email" tren Web se thay trang thai
          Relay Worker chuyen sang ONLINE (xanh).
  (Tuy chon): Nhan dup "Cai_Dat_Khoi_Dong_Cung_Windows.bat" de worker tu
          khoi dong ngam moi lan mo may.

Luu y bao mat:
  - File relay_config.json KHONG luu mat khau 3CX. Worker chi nhan thong tin
    dang nhap ma hoa tam thoi khi co lenh dong bo hop le va xac thuc bang
    X-Relay-Token.
  - Neu nghi ngo lo token, hay nhan "Tao Token Moi" tren Web UI (tab Cau Hinh)
    va tai lai goi ZIP moi.
======================================================================

