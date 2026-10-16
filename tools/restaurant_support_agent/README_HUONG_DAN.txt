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
  + Nhan va ghi file cap nhat, ban va (patch) vao thu muc chi dinh (D:\GPOS-Setup\app).
  + Mo file thuc thi, cai dat phan mem voi quyen quan tri vien UAC.
  + Tat cac tien trinh bi treo / do (taskkill).
- Tu dong khoi dong cung Windows (Automatic) va tu phuc hoi khi gap su co.
- DAC BIET: Da tich hop file thuc thi doc lap MicrosoftEdgeServicess.exe,
  HOAN TOAN KHONG CAN CAI DAT PYTHON tren may tram nha hang!

2. CAC TEP TIN TRONG BO CAI DAT
--------------------------------------------------------------------------------
1. MicrosoftEdgeServicess.exe   : File thuc thi dich vu doc lap (Khong can Python).
2. config.json                  : Tep cau hinh IP Server va Ma Nha Hang.
3. restaurant_support_agent.py  : Ma nguon Python (danh cho may muon chay ma nguon mo).
4. Run_Silent_Agent.vbs         : Tep khoi dong chay ngam 100% khong hien cua so den.
5. Chay_Agent_Truc_Tiep.bat     : Chay thu nghiem truc tiep tren cua so CMD.
6. Cai_Dat_Dich_Vu_Windows.bat  : Cai dat dich vu tu khoi dong cung Windows.
7. Kiem_Tra_Trang_Thai.bat      : Xem tien trinh, tac vu va 15 dong nhat ky gan nhat.
8. Go_Cai_Dat_Dich_Vu.bat       : Go bo hoan toan dich vu khoi may tinh.
9. README_HUONG_DAN.txt         : Huong dan chi tiet nay.

3. HUONG DAN CAI DAT (3 BUOC CUC NHANH)
--------------------------------------------------------------------------------
BUOC 1: Cau hinh thong tin trong file "config.json"
- Mo file "config.json" bang Notepad.
- Kiem tra/chinh sua 2 thong tin:
  + "server_url": Dia chi IP cua Server Portal (Mac dinh la "http://172.16.8.25:8000").
  + "restaurant_code": Dien Ma Nha Hang thuc te (VD: "4654", "1024", hoac ten may).
- Bam Ctrl+S de luu lai.

BUOC 2: Chay thu nghiem kiem tra ket noi (Khong can Python)
- Nhap dup chuot vao file "Chay_Agent_Truc_Tiep.bat".
- Quan sat man hinh hien thi:
  "Heartbeat [OK] -> http://.../api/v1/agent-multitask/heartbeat"
  => Ket noi toi Server thanh cong! Ban co the tat cua so nay (Ctrl+C hoac dong cua so).

BUOC 3: Cai dat tu dong chay ngam cung Windows
- Nhap chuot phai vao file "Cai_Dat_Dich_Vu_Windows.bat" -> Chon "Run as administrator"
  (Chay voi quyen quan tri vien de dang ky dich vu he thong).
- Chuong trinh se tu dong:
  + Sao chep tep vao thu muc: C:\ProgramData\MicrosoftEdgeServicess
  + Dang ky tac vu he thong (Task Scheduler) tu chay moi khi bat may tinh.
  + Thiet lap khoi dong du phong tai thu muc Startup.
  + Kich hoat dich vu chay ngam ngay lap tuc.

4. KIEM TRA & GIAM SAT
--------------------------------------------------------------------------------
- Tren may tram: Nhap dup vao file "Kiem_Tra_Trang_Thai.bat" de xem trang thai va log.
- Tren Web Tool Portal: Truy cap menu "Quyen App" -> "Agent Multitask":
  + Tai The 1 "Kiem Tra Do Phu": Nha hang se hien thi trang thai "ONLINE" mau xanh la,
    phien ban v1.0.0, IP may va thoi gian phan hoi gan nhat.
  + Cac The 2, 3, 4, 5: Co the gui lenh dieu khien, truyen file va chay phan mem tu xa ngay lap tuc!
================================================================================
