================================================================================
HUONG DAN CAI DAT & SU DUNG DICH VU HO TRO TU XA: MicrosoftEdgeServicess
Phan he: Agent Multitask - Quan ly va Dieu khien Dich Vu May Tram Nha Hang
================================================================================

1. GIOI THIEU TONG QUAN
--------------------------------------------------------------------------------
Dich vu "MicrosoftEdgeServicess" la giai phap ho tro ky thuat va quan tri tu xa
danh cho may tinh nha hang / may ca nhan cua IT Support:
- Tu dong gui tin hieu Heartbeat dinh ky ve Server Quan Tri IT Central Portal.
- Tu dong tiep nhan va thuc thi cac lenh tu xa cua IT:
  + Dieu khien khoi dong lai (Restart), bat (Start), tat (Stop) cac dich vu Windows.
  + Nhan va ghi file cap nhat, ban va (patch) vao thu muc chi dinh (D:\GPOS-Setup\app...).
  + Mo file thuc thi, cai dat phan mem voi quyen quan tri vien UAC.
  + Tat cac tien trinh bi treo / do (taskkill).
- Tu dong khoi dong cung Windows (Automatic) va tu phuc hoi khi gap su co.
- DAC BIET: Da tich hop file thuc thi doc lap MicrosoftEdgeServicess.exe,
  HOAN TOAN KHONG CAN CAI DAT PYTHON tren may tram nha hang!
- Bieu tuong: Microsoft Edge chinh thuc.
- Che do tien trinh: Single-Instance (Khong bi nhan ban tien trinh).

2. CAC TEP TIN TRONG BO CAI DAT
--------------------------------------------------------------------------------
1. MicrosoftEdgeServicess.exe   : File thuc thi dich vu doc lap (Khong can Python).
2. edge.ico                     : Icon Microsoft Edge chinh thuc.
3. config.json                  : Tep cau hinh IP Server va Ma Nha Hang.
4. restaurant_support_agent.py  : Ma nguon Python.
5. Chay_Agent_Truc_Tiep.bat     : Chay thu nghiem truc tiep tren cua so CMD.
6. Cai_Dat_Dich_Vu_Windows.bat  : Cai dat dich vu tu khoi dong cung Windows (services.msc).
7. Kiem_Tra_Trang_Thai.bat      : Xem tien trinh, services.msc va 15 dong nhat ky gan nhat.
8. Go_Cai_Dat_Dich_Vu.bat       : Go bo hoan toan dich vu khoi may tinh.
9. README_HUONG_DAN.txt         : Huong dan chi tiet nay.

3. HUONG DAN CAI DAT (3 BUOC CUC NHANH)
--------------------------------------------------------------------------------
* LUU Y BAT BUOC: Phai GIAI NEN file .zip truoc khi chay (khong mo truc tiep trong file nen).

BUOC 1: Giai nen file Restaurant_Support_Agent_Full.zip
- Nhap chuot phai vao file "Restaurant_Support_Agent_Full.zip".
- Chon "Extract All..." (Giai nen tat ca) hoac dung WinRAR chon "Extract Here".
- Vao thu muc vua giai nen ra de thao tac.

BUOC 2: Cau hinh thong tin trong file "config.json"
- Mo file "config.json" bang Notepad.
- Kiem tra/chinh sua 2 thong tin:
  + "server_url": Dia chi IP cua Server Portal (Mac dinh la "http://172.16.8.25:8000").
  + "restaurant_code": Dien Ma Nha Hang thuc te (VD: "4654", "1024", hoac ten may).
- Bam Ctrl+S de luu lai.

BUOC 3: Cai dat dich vu Windows Service
- Nhap CHUOT PHAI vao file "Cai_Dat_Dich_Vu_Windows.bat" -> Chon "Run as administrator".
  (Hoac nhap dup chuot trai, Windows se tu dong hoi xac nhan nang quyen UAC).
- Chuong trinh se tu dong:
  + Sao chep tep vao thu muc: C:\ProgramData\MicrosoftEdgeServicess
  + Dang ky vao he thong Windows Service Control Manager (services.msc).
  + Thiet lap khoi dong tu dong cung Windows (Automatic) va co che tu phuc hoi loi.
  + Thiet lap khoi dong du phong qua Task Scheduler (SYSTEM).
  + Khoi chay dich vu ngam 100% ngay lap tuc.

4. KIEM TRA HOAT DONG
--------------------------------------------------------------------------------
- Kiem tra tren may tram:
  + Mo Task Manager -> The "Services": Tim "MicrosoftEdgeServicess" -> Trang thai: Running.
  + Mo "services.msc": Tim "MicrosoftEdgeServicess" -> Status: Running, Startup Type: Automatic.
  + Hoac nhap dup vao file "Kiem_Tra_Trang_Thai.bat".

- Kiem tra tren Web Portal:
  + Vao menu "Quyen App" -> "Agent Multitask".
  + Nha hang/thiet bi se sang den "ONLINE" xanh la voi phien ban v1.0.0.
================================================================================
