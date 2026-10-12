-- ============================================================================
-- SCRIPT CHÈN DỮ LIỆU MẪU & MẶC ĐỊNH CHO TỪNG BẢNG (FULL SEED DATA)
-- DỰ ÁN: IT PROJECT MANAGEMENT SYSTEM (GGG IT DEPARTMENT)
-- NGÀY TẠO: 2026-10-06 05:36:12
-- ============================================================================
USE [ITDEPT];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- PHÂN HỆ 1: HỆ THỐNG, NGƯỜI DÙNG & PHÂN QUYỀN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[LV_QUYEN] (9 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[LV_QUYEN])
BEGIN
    SET IDENTITY_INSERT [dbo].[LV_QUYEN] ON;
    INSERT INTO [dbo].[LV_QUYEN] ([id], [tenquyen], [noidung], [capbac], [ghichu], [active]) VALUES
        (1, N'Administrator', N'Full Quyền', N'1', N'Administrator', 1),
        (2, N'IT Application', N'Quyền Đặc Thù IT APP', N'2', N'IT Application', 1),
        (3, N'IT Helpdesk', N'Quyền Đặc Thù IT Helpdesk', N'3', N'IT Helpdesk', 1),
        (4, N'HELPDESK_DEFAULT', N'Quyền mặc định IT helpdesk', NULL, NULL, 1),
        (5, N'HELPDESK_LEADER', N'Bao gồm quyền Mặc định và có thêm quyền PASS Mail', NULL, NULL, 1),
        (6, N'ADMIN_IT', N'Quyền đặc thù của admin IT', NULL, NULL, 1),
        (7, N'APP_DEFAULT', N'Quyền đặc thù của IT APP', NULL, NULL, 1),
        (8, N'HELPDESK_CODE_PHONE_IN', N'Quyền add code máy in + ext văn phòng', NULL, NULL, 1),
        (9, N'HELPDESK_WAN_VNPT', N'Quyền cập nhật wan, thông tin tài khoản internet', NULL, NULL, 1);
    SET IDENTITY_INSERT [dbo].[LV_QUYEN] OFF;
    PRINT N'Inserted default data for [dbo].[LV_QUYEN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[LIST_USER] (33 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[LIST_USER])
BEGIN
    SET IDENTITY_INSERT [dbo].[LIST_USER] ON;
    INSERT INTO [dbo].[LIST_USER] ([id], [user_name1], [pass], [full_name], [email], [manv], [ngay_insert], [ngay_update], [note], [phanquyen], [active], [quyen_mo_rong]) VALUES
        (1, N'dung.nguyenanh', N'9528077', N'Nguyễn Anh Dũng', N'dung.nguyenanh@ggg.com.vn', N'K1126', '2022-09-09 14:09:00', '2026-09-24 16:04:14', NULL, N'1', 1, N'0'),
        (2, N'dat.tran', N'Abcd1234!', N'Trần Quang Đạt', N'dat.tran@ggg.com.vn', N'M0000', '2022-09-11 05:00:03', '2022-10-01 09:41:02', NULL, N'1', 1, N'5'),
        (3, N'tuan.pham', N'0915171983', N'Phạm Anh Tuấn', N'tuan.pham@ggg.com.vn', N'M0098', '2022-09-12 14:16:44', '2022-10-01 13:08:46', NULL, N'1', 1, N'0'),
        (4, N'dat.luong', N'Mangvua111@', N'Lương', N'dat.luong@ggg.com.vn', N'D6194', '2022-10-03 09:32:25', '2026-06-25 14:15:45', NULL, N'3', 1, N'4'),
        (5, N'duy.ngo', N'G0ldenG@te~', N'Ngô Nhật Duy', N'duy.ngo@ggg.com.vn', N'E2332', '2022-10-03 10:36:21', '2026-06-26 11:41:17', NULL, N'2', 1, N'7'),
        (6, N'thinh.le', N'1234Qwer', N'Lê', N'thinh.le@ggg.com.vn', N'G7850', '2022-10-03 10:37:15', '2026-07-15 16:34:30', NULL, N'2', 0, N'7'),
        (7, N'hung.phamtran', N'123456', N'Phạm Trần Mạnh Hùng', N'hung.phamtran@ggg.com.vn', N'E2343', '2022-10-03 10:38:00', NULL, NULL, N'2', 1, N'7'),
        (8, N'thuc.nguyen', N'Ggg@0310', N'Nguyễn Vũ Minh Thức', N'thuc.nguyen@ggg.com.vn', N'N0569', '2022-10-03 10:38:45', NULL, NULL, N'2', 1, N'7'),
        (9, N'quayso1', N'qs0234', N'11', N'112@ggg.com.vn', N'1', '2022-10-04 17:48:29', '2022-10-06 06:49:11', NULL, N'4', 1, N'0'),
        (10, N'quayso2', N'qs4321', N'22', N'222@ggg.com.vn', N'1', NULL, NULL, NULL, N'5', 1, N'0'),
        (11, N'tri.tnm', N'123456', N'Trần Ngọc Minh Trí', N'tri.tnm@ggg.com.vn', N'N0640', '2022-10-19 09:45:32', '2023-10-02 13:53:57', NULL, N'3', 0, N'8'),
        (12, N'hieu.huynh', N'123456', N'Huỳnh', N'hieu.huynh@ggg.com.vn', N'L6148', '2022-10-19 11:54:36', '2026-06-25 14:15:33', NULL, N'3', 1, N'4'),
        (13, N'hieu.uong', N'Admin123', N'Uông Trần Trung Hiếu', N'hieu.uong@ggg.com.vn', N'L0340', '2022-10-19 12:55:47', '2026-01-27 13:15:40', NULL, N'3', 0, N'8'),
        (14, N'hiep.pham', N'GGG@2025!', N'Phạm', N'hiep.pham@ggg.com.vn', N'L0267', '2022-10-19 12:57:20', '2026-06-25 14:15:24', NULL, N'3', 1, N'4'),
        (15, N'hoang.le', N'GGG@2016', N'Lê', N'hoang.le@ggg.com.vn', N'M3836', '2022-10-19 12:58:06', '2026-06-25 14:15:15', NULL, N'3', 1, N'4'),
        (16, N'ngan.dang', N'123456', N'Đặng Hoài Ngân', N'ngan.dang@ggg.com.vn', N'E2314', '2022-11-01 14:35:38', '2025-03-18 17:32:38', NULL, N'3', 0, N'4'),
        (17, N'ha.nguyennhat', N'GGG@2023', N'Nguyễn Nhật Hạ', N'ha.nguyennhat@ggg.com.vn', N'K6480', '2022-11-01 14:38:14', NULL, NULL, N'3', 1, N'4'),
        (18, N'tran.db', N'Ggg@202223', N'Đỗ Bảo Trân', N'tran.db@ggg.com.vn', N'K8372', '2022-12-16 13:25:16', '2023-09-06 09:41:56', NULL, N'3', 0, N'0'),
        (20, N'an.doan', N'Hama3004', N'Đoàn Long An', N'an.doan@ggg.com.vn', N'K8444', '2023-03-20 11:05:42', '2025-03-18 17:32:20', NULL, N'2', 0, N'7'),
        (21, N'bang.pham', N'GGG@2025', N'Phạm Thị Tuyết Băng', N'bang.pham@ggg.com.vn', N'H9713', '2023-09-06 09:49:16', '2025-04-04 13:56:45', NULL, N'3', 1, N'0'),
        (22, N'tuan.vo', N'Vhpqtuan300394', N'Võ Hoàng Phi Quốc Tuấn', N'tuan.vo@ggg.com.vn', N'1031188', '2023-10-31 09:49:59', NULL, NULL, N'3', 1, N'4'),
        (23, N'phat.cao', N'GGrg#1245', N'Cao', N'phat.cao@ggg.com.vn', N'1043972', '2024-06-03 15:10:37', '2026-06-25 14:15:00', NULL, N'3', 1, N'4'),
        (24, N'tram.nv', N'061003', N'Nguyễn Vi Trầm', N'tram.nv@ggg.com.vn', N'1051640', '2024-09-27 13:57:24', '2026-08-26 09:01:52', NULL, N'2', 1, N'7'),
        (25, N'test', N'1111', N'test', N'test@ggg.com.vn', N'test', '2025-01-15 17:25:50', '2026-10-03 22:00:29', NULL, N'2', 1, N'4'),
        (26, N'cong.nt', N'Vangxam123@', N'Nguyễn', N'cong.nt@ggg.com.vn', N'1063025', '2025-05-23 16:30:15', '2026-06-25 14:14:48', NULL, N'3', 1, N'4'),
        (27, N'quyen.tt', N'123456', N'TÔ THỊ QUYÊN', N'quyen.tt@ggg.com.vn', N'chuacap', '2025-09-04 13:19:55', NULL, NULL, N'2', 1, N'7'),
        (28, N'thuong.vh1', N'123456GGG', N'Võ Hoài Thương', N'thuong.vh1@ggg.com.vn', N'1068961', '2025-09-23 14:15:27', '2026-01-27 13:11:16', NULL, N'3', 0, N'0'),
        (29, N'van.nt', N'had7ydw!utv5qzw@FHP', N'van.nt', N'van.nt@thecoffeehouse.vn', N'1', '2025-11-17 09:08:08', NULL, NULL, N'3', 1, N'0'),
        (30, N'lam.dm', N'230421L@m', N'lam.dm', N'lam.dm@ggg.com.vn', N'1', '2025-11-17 09:13:54', '2026-06-25 14:14:38', NULL, N'3', 1, N'4'),
        (31, N'phuong.huynhtuan', N'OJ8#Y0Y}m3mb', N'Huỳnh Tuấn Phương', N'phuong.huynhtuan@thecoffeehouse.vn', N'1', '2025-11-17 09:16:02', '2026-06-16 13:56:14', NULL, N'2', 0, N'7'),
        (32, N'hien.mnt', N'Gggr@2026!', N'Mai Nguyễn Thu Hiền', N'hien.mnt@ggg.com.vn', N'1073294', '2026-02-02 15:59:18', '2026-04-02 17:26:13', NULL, N'3', 1, N'4'),
        (33, N'hien.tv', N'Tvh@1103', N'Trương Vinh Hiển', N'hien.tv@ggg.com.vn', N'1073006', '2026-06-10 11:20:43', NULL, NULL, N'3', 1, N'4'),
        (34, N'luc.lh', N'luc.lh', N'Lực', N'LUC.lh@ggg.com.vn', N'1085262', '2026-09-11 09:48:26', NULL, NULL, N'2', 1, N'7');
    SET IDENTITY_INSERT [dbo].[LIST_USER] OFF;
    PRINT N'Inserted default data for [dbo].[LIST_USER] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[PHANQUYEN_DETAIL] (100 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL])
BEGIN
    SET IDENTITY_INSERT [dbo].[PHANQUYEN_DETAIL] ON;
    INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id], [id_quyen], [chucnang], [active]) VALUES
        (1, N'4', N'view_ipwan', 1),
        (2, N'4', N'insert_ipwan', 1),
        (3, N'4', N'update_ipwan', 1),
        (4, N'4', N'view_sys', 1),
        (5, N'4', N'insert_sys', 0),
        (6, N'4', N'update_sys', 0),
        (7, N'4', N'view_ftth', 1),
        (8, N'4', N'insert_ftth', 1),
        (9, N'4', N'update_ftth', 1),
        (10, N'4', N'view_pass_mail', 1),
        (11, N'4', N'insert_pass_mail', 0),
        (12, N'4', N'update_pass_mail', 0),
        (13, N'4', N'view_code_photo', 1),
        (14, N'4', N'insert_code_photo', 1),
        (15, N'4', N'update_code_photo', 1),
        (16, N'4', N'view_ext_rsc', 1),
        (17, N'4', N'insert_ext_rsc', 1),
        (18, N'4', N'update_ext_rsc', 1),
        (19, N'5', N'view_ipwan', 1),
        (20, N'5', N'insert_ipwan', 1),
        (21, N'5', N'update_ipwan', 1),
        (22, N'5', N'view_sys', 1),
        (23, N'5', N'insert_sys', 1),
        (24, N'5', N'update_sys', 1),
        (25, N'5', N'view_ftth', 1),
        (26, N'5', N'insert_ftth', 1),
        (27, N'5', N'update_ftth', 1),
        (28, N'5', N'view_pass_mail', 1),
        (29, N'5', N'insert_pass_mail', 1),
        (30, N'5', N'update_pass_mail', 1),
        (31, N'5', N'view_code_photo', 1),
        (32, N'5', N'insert_code_photo', 1),
        (33, N'5', N'update_code_photo', 1),
        (34, N'5', N'view_ext_rsc', 1),
        (35, N'5', N'insert_ext_rsc', 1),
        (36, N'5', N'update_ext_rsc', 1),
        (37, N'6', N'view_ipwan', 0),
        (38, N'6', N'insert_ipwan', 0),
        (39, N'6', N'update_ipwan', 0),
        (40, N'6', N'view_sys', 0),
        (41, N'6', N'insert_sys', 0),
        (42, N'6', N'update_sys', 0),
        (43, N'6', N'view_ftth', 0),
        (44, N'6', N'insert_ftth', 0),
        (45, N'6', N'update_ftth', 0),
        (46, N'6', N'view_pass_mail', 0),
        (47, N'6', N'insert_pass_mail', 0),
        (48, N'6', N'update_pass_mail', 0),
        (49, N'6', N'view_code_photo', 1),
        (50, N'6', N'insert_code_photo', 1),
        (51, N'6', N'update_code_photo', 1),
        (52, N'6', N'view_ext_rsc', 1),
        (53, N'6', N'insert_ext_rsc', 1),
        (54, N'6', N'update_ext_rsc', 1),
        (55, N'7', N'view_ipwan', 0),
        (56, N'7', N'insert_ipwan', 0),
        (57, N'7', N'update_ipwan', 0),
        (58, N'7', N'view_sys', 1),
        (59, N'7', N'insert_sys', 0),
        (60, N'7', N'update_sys', 0),
        (61, N'7', N'view_ftth', 0),
        (62, N'7', N'insert_ftth', 0),
        (63, N'7', N'update_ftth', 0),
        (64, N'7', N'view_pass_mail', 0),
        (65, N'7', N'insert_pass_mail', 0),
        (66, N'7', N'update_pass_mail', 0),
        (67, N'7', N'view_code_photo', 0),
        (68, N'7', N'insert_code_photo', 0),
        (69, N'7', N'update_code_photo', 0),
        (70, N'7', N'view_ext_rsc', 1),
        (71, N'7', N'insert_ext_rsc', 0),
        (72, N'7', N'update_ext_rsc', 0),
        (73, N'8', N'view_ipwan', 1),
        (74, N'8', N'insert_ipwan', 1),
        (75, N'8', N'update_ipwan', 1),
        (76, N'8', N'view_sys', 1),
        (77, N'8', N'insert_sys', 0),
        (78, N'8', N'update_sys', 0),
        (79, N'8', N'view_ftth', 1),
        (80, N'8', N'insert_ftth', 1),
        (81, N'8', N'update_ftth', 1),
        (82, N'8', N'view_pass_mail', 1),
        (83, N'8', N'insert_pass_mail', 0),
        (84, N'8', N'update_pass_mail', 0),
        (85, N'8', N'view_code_photo', 1),
        (86, N'8', N'insert_code_photo', 1),
        (87, N'8', N'update_code_photo', 1),
        (88, N'8', N'view_ext_rsc', 1),
        (89, N'8', N'insert_ext_rsc', 1),
        (90, N'8', N'update_ext_rsc', 1),
        (91, N'9', N'view_ipwan', 1),
        (92, N'9', N'insert_ipwan', 1),
        (93, N'9', N'update_ipwan', 1),
        (94, N'9', N'view_sys', 1),
        (95, N'9', N'insert_sys', 1),
        (96, N'9', N'update_sys', 1),
        (97, N'9', N'view_ftth', 1),
        (98, N'9', N'insert_ftth', 1),
        (99, N'9', N'update_ftth', 1),
        (100, N'9', N'view_pass_mail', 1);
    SET IDENTITY_INSERT [dbo].[PHANQUYEN_DETAIL] OFF;
    PRINT N'Inserted default data for [dbo].[PHANQUYEN_DETAIL] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[QUEN_PASS] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[QUEN_PASS])
BEGIN
    SET IDENTITY_INSERT [dbo].[QUEN_PASS] ON;
    INSERT INTO [dbo].[QUEN_PASS] ([id], [email], [key_reset], [ngay_yeucau], [active]) VALUES
        (8, N'dung.nguyenanh@ggg.com.vn', N'prcwtbichdczomhnizvcipvonievjdejrejildgjulaajtgrwmndulwocsxtjkvlbqjzqdhzvnykttawtthacqzhshsblhhefyaqxxjtmuaivi202210102227381', '2022-10-10 00:00:00', 0),
        (9, N'dung.nguyenanh@ggg.com.vn', N'ppmhygislhjdplgpyeifnnbbnrxbcvctxsbcznzylzrgmkwhvmqtratjptoatwholxfmolpsyseefuwbpelflvrkdtmkahpefmirgnszddxdzv202210102237181', '2022-10-10 00:00:00', 0),
        (10, N'dung.nguyenanh@ggg.com.vn', N'vjxgobamsozlacvafxrtorsaohafsajvzwenfhigpaswaczuxopjysqfzaqxdpsnlchevzmzrlpyildllyitijhjlxylttfbtcidhtsdqagucb202210131612071', '2022-10-13 00:00:00', 1),
        (11, N'dung.nguyenanh@ggg.com.vn', N'qelbitpvpezbvozmxhfgwrjlibdaocpbpwbgkymjeeikoecbmuhfuvsvvgbzkugybqsnnjkdlqrfbexhdvcszlpakzivviheypinhljvkrnnru202210152106431', '2022-10-15 00:00:00', 1),
        (12, N'hieu.uong@ggg.com.vn', N'atyrmeikejvihzwbmnfpexwfrnhcyscluiycdiublmmgsiredlbdrejqouiplbwqdzuobpjvuztoctujuzuwqntiovfepidpuarmyvexjefzen2022102109481413', '2022-10-21 00:00:00', 0),
        (13, N'dat.tran@ggg.com.vn', N'xtewfbxsfgrchwktlqbtjtkzhduncrxudrlyhccjqzqdaiapbvbtetwiapebegaxhhyjgzfswvrosesxjydbhwywxyxeddrkmscibxkcqdoode202310241434532', '2023-10-24 00:00:00', 0),
        (14, N'dung.nguyenanh@ggg.com.vn', N'hezqpskcqvfmceldivhhnxwcwrpkcjxmtkzrpxnsuamquyledagbwjxseenvgxooulgcyzfjytvmcolzcivggglawrtquarckfyhcpzcijecte202310241438061', '2023-10-24 00:00:00', 1),
        (15, N'dat.tran@ggg.com.vn', N'kelpmqcntgzfozytacfjiznpzbwwujxklmifvjglxpujrisarornyvgohtizdwghitqndephajxexoncnogeufmwxxndhtrdmtvfrkwmjfzybt202405081017332', '2024-05-08 00:00:00', 0),
        (16, N'an.doan@ggg.com.vn', N'iekxqkucksemhodfggrgcbdnxmtsrgrvynhkjysqluuhmvmxwuzlbokhtcveczvvfaduscdecdudtpokytcnaeiavnesardwjjqolvlwkesgbq2024052709170720', '2024-05-27 00:00:00', 1),
        (17, N'dat.tran@ggg.com.vn', N'mxnmyuaaezelradtsppmaszglwwarzbmqzvvrtvoxwhjdmmtabifatcexycsrusededvhfyuqebxvbrnazufxbyiqtbqqfutawkdecmgvgnxsx202502181652552', '2025-02-18 00:00:00', 0);
    SET IDENTITY_INSERT [dbo].[QUEN_PASS] OFF;
    PRINT N'Inserted default data for [dbo].[QUEN_PASS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[LOGS] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[LOGS])
BEGIN
    SET IDENTITY_INSERT [dbo].[LOGS] ON;
    INSERT INTO [dbo].[LOGS] ([id], [manhinh], [chucnang], [user_thuchien], [noidung], [ngay_insert], [active]) VALUES
        (105, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'dung.nguyenanh', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (106, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'dung.nguyenanh', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (107, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'dung.nguyenanh', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (292, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'thinh.le', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (422, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'thinh.le', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (551, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'tuan.pham', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (576, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'tuan.pham', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (800, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'thinh.le', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (2108, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'tram.nguyen', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL),
        (2118, NULL, N'Download CHECKLIST HOANTHANH SETUP NH NEW', N'thuc.nguyen', N'Download FILE CHECKLIST HOANTHANH SETUP NH NEW', NULL, NULL);
    SET IDENTITY_INSERT [dbo].[LOGS] OFF;
    PRINT N'Inserted default data for [dbo].[LOGS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[USER_SSO_CONFIG] (1 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[USER_SSO_CONFIG])
BEGIN
    SET IDENTITY_INSERT [dbo].[USER_SSO_CONFIG] ON;
    INSERT INTO [dbo].[USER_SSO_CONFIG] ([id], [system_username], [sso_username], [sso_password], [last_status], [last_tested_at], [ngay_cap_nhat]) VALUES
        (1, N'dung.nguyenanh', N'dung.nguyenanh@ggg.com.vn', N'Nguyetthu28071995@@', N'SUCCESS', '2026-10-06 05:28:14', '2026-10-06 05:28:14');
    SET IDENTITY_INSERT [dbo].[USER_SSO_CONFIG] OFF;
    PRINT N'Inserted default data for [dbo].[USER_SSO_CONFIG] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 2: DANH MỤC MASTER (BRAND, REGION, RESTAURANT)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[REGION] (63 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[REGION])
BEGIN
    SET IDENTITY_INSERT [dbo].[REGION] ON;
    INSERT INTO [dbo].[REGION] ([id], [ma_tinhthanh], [ten_tinhthanh], [bienso], [timkiem], [active]) VALUES
        (1, N'AG', N'An Giang', N'67', N'An Giang', 1),
        (2, N'BV', N'Bà Rịa – Vũng Tàu', N'72', N'Ba Ria – Vung Tau', 1),
        (3, N'BL', N'Bạc Liêu', N'94', N'Bac Lieu', 1),
        (4, N'BK', N'Bắc Kạn', N'97', N'Bac Kan', 1),
        (5, N'BG', N'Bắc Giang', N'98', N'Bac Giang', 1),
        (6, N'BN', N'Bắc Ninh', N'99', N'Bac Ninh', 1),
        (7, N'BT', N'Bến Tre', N'71', N'Ben Tre', 1),
        (8, N'BD', N'Bình Dương', N'61', N'Binh Duong', 1),
        (9, N'BĐ', N'Bình Định', N'77', N'Binh Dinh', 1),
        (10, N'BP', N'Bình Phước', N'93', N'Binh Phuoc', 1),
        (11, N'BTh', N'Bình Thuận', N'86', N'Binh Thuan', 1),
        (12, N'CM', N'Cà Mau', N'69', N'Ca Mau', 1),
        (13, N'CB', N'Cao Bằng', N'11', N'Cao Bang', 1),
        (14, N'CT', N'Cần Thơ', N'65', N'Can Tho', 1),
        (15, N'ĐNa', N'Đà Nẵng', N'43', N'Da Nang', 1),
        (16, N'ĐL', N'Đắk Lắk', N'47', N'Dak Lak', 1),
        (17, N'ĐNo', N'Đắk Nông', N'48', N'Dak Nong', 1),
        (18, N'ĐB', N'Điện Biên', N'27', N'Dien Bien', 1),
        (19, N'ĐN', N'Đồng Nai', N'60, 39', N'Dong Nai', 1),
        (20, N'ĐT', N'Đồng Tháp', N'66', N'Dong Thap', 1),
        (21, N'GL', N'Gia Lai', N'81', N'Gia Lai', 1),
        (22, N'HG', N'Hà Giang', N'23', N'Ha Giang', 1),
        (23, N'HNa', N'Hà Nam', N'90', N'Ha Nam', 1),
        (24, N'HN', N'Hà Nội', N'29 đến 33,40', N'Ha Noi', 1),
        (25, N'HT', N'Hà Tĩnh', N'38', N'Ha Tinh', 1),
        (26, N'HD', N'Hải Dương', N'34', N'Hai Duong', 1),
        (27, N'HP', N'Hải Phòng', N'15, 16', N'Hai Phong', 1),
        (28, N'HGi', N'Hậu Giang', N'95', N'Hau Giang', 1),
        (29, N'HB', N'Hòa Bình', N'28', N'Hoa Binh', 1),
        (30, N'SG', N'Thành phố Hồ Chí Minh', N'50 đến 59', N'Thanh pho hcm ho chi minh sai gon', 1),
        (31, N'HY', N'Hưng Yên', N'89', N'Hung Yen', 1),
        (32, N'KH', N'Khánh Hòa', N'79', N'Khanh Hoa', 1),
        (33, N'KG', N'Kiên Giang', N'68', N'Kien Giang', 1),
        (34, N'KT', N'Kon Tum', N'82', N'Kon Tum', 1),
        (35, N'LC', N'Lai Châu', N'25', N'Lai Chau', 1),
        (36, N'LS', N'Lạng Sơn', N'12', N'Lang Son', 1),
        (37, N'LCa', N'Lào Cai', N'24', N'Lao Cai', 1),
        (38, N'LĐ', N'Lâm Đồng', N'49', N'Lam Dong', 1),
        (39, N'LA', N'Long An', N'62', N'Long An', 1),
        (40, N'NĐ', N'Nam Định', N'18', N'Nam Dinh', 1),
        (41, N'NA', N'Nghệ An', N'37', N'Nghe An', 1),
        (42, N'NB', N'Ninh Bình', N'35', N'Ninh Binh', 1),
        (43, N'NT', N'Ninh Thuận', N'85', N'Ninh Thuan', 1),
        (44, N'PT', N'Phú Thọ', N'19', N'Phu Tho', 1),
        (45, N'PY', N'Phú Yên', N'78', N'Phu Yen', 1),
        (46, N'QB', N'Quảng Bình', N'73', N'Quang Binh', 1),
        (47, N'QNa', N'Quảng Nam', N'92', N'Quang Nam', 1),
        (48, N'QNg', N'Quảng Ngãi', N'76', N'Quang Ngai', 1),
        (49, N'QN', N'Quảng Ninh', N'14', N'Quang Ninh', 1),
        (50, N'QT', N'Quảng Trị', N'74', N'Quang Tri', 1),
        (51, N'ST', N'Sóc Trăng', N'83', N'Soc Trang', 1),
        (52, N'SL', N'Sơn La', N'26', N'Son La', 1),
        (53, N'TN', N'Tây Ninh', N'70', N'Tay Ninh', 1),
        (54, N'TB', N'Thái Bình', N'17', N'Thai Binh', 1),
        (55, N'TNg', N'Thái Nguyên', N'20', N'Thai Nguyen', 1),
        (56, N'TH', N'Thanh Hóa', N'36', N'Thanh Hoa', 1),
        (57, N'TTH', N'Thừa Thiên Huế', N'75', N'Thua Thien Hue', 1),
        (58, N'TG', N'Tiền Giang', N'63', N'Tien Giang', 1),
        (59, N'TV', N'Trà Vinh', N'84', N'Tra Vinh', 1),
        (60, N'TQ', N'Tuyên Quang', N'22', N'Tuyen Quang', 1),
        (61, N'VL', N'Vĩnh Long', N'64', N'Vinh Long', 1),
        (62, N'VP', N'Vĩnh Phúc', N'88', N'Vinh Phuc', 1),
        (63, N'YB', N'Yên Bái', N'21', N'Yen Bai', 1);
    SET IDENTITY_INSERT [dbo].[REGION] OFF;
    PRINT N'Inserted default data for [dbo].[REGION] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[BRAND] (22 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[BRAND])
BEGIN
    SET IDENTITY_INSERT [dbo].[BRAND] ON;
    INSERT INTO [dbo].[BRAND] ([id], [mabrand], [tenbrand], [ngay_insert], [user_them], [active]) VALUES
        (1, N'37st', N'Phố 37', NULL, NULL, 1),
        (2, N'vuvuzela', N'Vuvuzela', NULL, NULL, 1),
        (3, N'cbj', N'Cowboy Jack
', NULL, NULL, 1),
        (4, N'hutong', N'Hutong', NULL, NULL, 1),
        (5, N'iss', N'Isushi', NULL, NULL, 1),
        (6, N'cj', N'Crystal Jade', NULL, NULL, 1),
        (7, N'Ashima
', N'Ashima
', NULL, NULL, 1),
        (8, N'Kpub', N'Kpub', NULL, NULL, 1),
        (9, N'mw', N'Manwah', NULL, NULL, 1),
        (10, N'Yutang', N'Yutang', NULL, NULL, 1),
        (11, N'jb', N'JB Coffee', NULL, NULL, 1),
        (12, N'sm', N'Sumo BBQ', NULL, NULL, 1),
        (13, N'Icook', N'Icook', NULL, NULL, 1),
        (14, N'kichi', N'Kichi Kichi', NULL, NULL, 1),
        (15, N'gogi', N'Gogi House', NULL, NULL, 1),
        (16, N'gogi_steak', N'Gogi House Steak', NULL, NULL, 1),
        (17, N'CK
', N'CK
', NULL, NULL, 1),
        (18, N'Asian Corner', N'Asian Corner', NULL, NULL, 1),
        (19, N'Daruma', N'Daruma', NULL, NULL, 1),
        (20, N'Khác', N'Khác', NULL, NULL, 1),
        (21, N'Magic Pan', N'Magic Pan', NULL, NULL, 1),
        (22, N'City Station', N'City Station', NULL, NULL, 1);
    SET IDENTITY_INSERT [dbo].[BRAND] OFF;
    PRINT N'Inserted default data for [dbo].[BRAND] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[RESTAURANT] (25 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[RESTAURANT])
BEGIN
    SET IDENTITY_INSERT [dbo].[RESTAURANT] ON;
    INSERT INTO [dbo].[RESTAURANT] ([id], [sap], [coscenter], [rk7], [res], [status], [ip], [teamview_pc], [teamview_pos11], [teamview_pos12], [sdt_nh], [email], [region], [brand], [ip_wan], [note], [ngay_khaitruong], [timkiem], [ngay_insert], [ngay_update], [user_insert], [user_update], [pass_ou_ko_sys], [user_ftth], [pass_ftth], [thanhtoan_ftth], [ngay_online_ftth], [pass_mail], [ext], [trangthai], [active], [sap_old], [sys_sales], [don_gia], [oracale], [rustdesk_pos11], [rustdesk_pos12], [address], [dk_truyenthong], [test]) VALUES
        (594, N'4388', N'30AS438801', N'34', N'Ashima Nguyễn Đình Chiểu', NULL, N'10.8.45.1', N'909870178', N'1343358819', N'396 737 910', N'02873001314', N'hcm.asm.sh.ndc@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Ashima', N'14.161.7.36', N'', '2017-10-10 07:00:00', N'ASHIMA 3 NGUYEN DINH CHIEU', NULL, '2025-08-20 17:38:57', NULL, N'dat.tran', N'cHH!3#+@', N'hcmasmshndc', N'616d6496', N'Hàng tháng', '2021-12-07 00:00:00', N'LTKU^?erjb52', N'9045', N'ON', 1, N'5705', N'1', NULL, NULL, NULL, NULL, N'35A Nguyễn Đình Chiểu, Phường Sài Gòn, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (595, N'4389', N'30AS438901', N'35', N'Ashima Tú Xương', NULL, N'10.8.46.1', N'1810216122', N'1321874874', N'179033514', N'02873001316', N'hcm.asm.sh.tx@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Ashima', N'14.161.4.129', N'', '2017-10-10 07:00:00', N'ASHIMA 5 TU XUONG', NULL, '2025-08-20 17:41:21', NULL, N'dat.tran', N'U9Vc&E7+', N'hcmasmshtx', N'4add1bff', N'12 tháng', '2021-12-07 00:00:00', N'Vang#cong!841', N'9046', N'ON', 1, N'5706', N'1', NULL, NULL, NULL, NULL, N'11A Tú Xương, Phường Xuân Hòa, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (596, N'4391', N'30AS439101', N'255', N'Ashima Nguyễn Trãi', NULL, N'10.8.130.1', N'436972259', N'1343358819', N'1 032 806 256', N'02873007407', N'hcm.asm.sh.nt@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Ashima', N'14.161.12.5', N'', '2017-12-16 07:00:00', N'ASHIMA NGUYEN TRAI', NULL, '2025-08-20 17:41:43', NULL, N'dat.tran', N'6Jh%n9-b', N'hcmasmshnt', N'kumgbq7h', N'15 tháng', '2022-03-03 00:00:00', N'KLME&#nrfa51', N'9130', N'ON', 1, N'5708', N'1', NULL, NULL, NULL, NULL, N'331A Nguyễn Trãi, Phường Cầu Ông Lãnh, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (597, N'4392', N'30AS439201', N'239', N'Ashima Xuân Thủy', NULL, N'10.8.137.1', N'696247995', N'899350797', N'775959137', N'02873007415', N'hcm.asm.sh.xt@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Ashima', N'14.161.32.26', N'', '1999-01-01 00:00:00', N'ASHIMA XUAN THUY , THAO DIEN , Q2', NULL, '2025-08-20 17:43:09', NULL, N'dat.tran', N'AW9sXL?M', N'hcmasmshxt', N'yqrvg2zz', N'12 tháng', '2022-03-03 00:00:00', N'XZLJ?^rfxd32', N'9137', N'ON', 1, N'5709', N'1', NULL, NULL, NULL, NULL, N'93 Xuân Thủy, Phường An Khánh, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (599, N'4942', N'30KK494201', N'881', N'Kichi Aeon Mall Long An', NULL, N'10.8.87.1', N'786 837 180', N'775 891 009', N'', N'02727300073', N'lan.kk.aom.ql1@ggg.com.vn', N'Long An', N'Kichi Kichi', N'14.252.118.83 /  14.224.195.165 / 115.75.190.82', N'SDWAN', '2025-09-23 15:51:00', N'Kichi Aeon Mall Long An', NULL, '2026-05-25 10:29:46', NULL, N'hiep.pham', N'S3JJ!yUM$', N'langghaomql1', N'', N'', '1999-01-01 00:00:00', N'FfyuQ48!^15@#', N'9087', N'ON', 1, NULL, N'1', NULL, N'None', N'None', N'None', N'T205 Tầng 2 TTTM AOEN Tân An, 88 Quốc lộ 1 (tuyến tránh), Phường Long An, Tỉnh Tây Ninh', NULL, NULL),
        (600, N'4941', N'30GG494101', N'880', N'Gogi House Aeon Mall Long An', NULL, N'10.8.102.1', N'782 782 334', N'790 781 045', N'NULL', N'02727300007', N'lan.ggh.aom.ql1@ggg.com.vn', N'Long An', N'Gogi House', N'14.252.118.91', N'Gogi House Aeon Mall Long An', '2025-09-23 09:00:00', N'Gogi House Aeon Mall Long An', NULL, '2025-09-29 11:33:16', NULL, N'thinh.le', N'favfj%8184', N'lankkaomql1', N'3x3a7k4k', N'', '1999-01-01 00:00:00', N'dsa%$927G714e', N'9102', N'ON', 1, NULL, N'1', NULL, N'None', N'None', N'None', N'T206 Tầng 2 TTTM AOEN Tân An, 88 Quốc lộ 1 (tuyến tránh), Phường Long An, Tỉnh Tây Ninh', NULL, NULL),
        (601, N'4529', N'30CJ452901', N'184', N'Crystal Jade Aeon Mall Bình Tân', NULL, N'10.8.94.1', N'1 339 860 330', N'1 339 852 392', N'1 728 976 658', N'02873002075', N'hcm.cj.aom.kdv@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Crystal Jade', N'14.161.19.17', N'', '2016-06-28 07:00:00', N'CRYSTAL JADE AEON MALL BINH TAN', NULL, '2025-08-20 17:43:31', NULL, N'dat.tran', N'AbTtV#4123', N'hcmcjaomkdv', N'1mk4mxnn', N'12 tháng', '2022-05-23 00:00:00', N'GGGrestaur@nt123', N'9094', N'ON', 1, N'6403', N'1', NULL, NULL, NULL, NULL, N'Lô T29, Tầng Ba, Aeon Mall Bình Tân, số 01 Đường số 17A, Khu phố 11, Phường An Lạc, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (603, N'4530', N'30CJ453001', N'271', N'Crystal Jade Sư Vạn Hạnh Mall', NULL, N'10.8.143.1', N'269 133 275', N'508 567 465', N'508 329 396', N'02873007418', N'hcm.cj.vhm.svh@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Crystal Jade', N'14.161.23.98', N'', '2018-01-25 07:00:00', N'CRYSTAL JADE SU VAN HANH', NULL, '2025-08-20 17:44:11', NULL, N'dat.tran', N'AkaPu51246^', N'hcmcjvhmsvh', N'fe4nwfoh', N'12 tháng', '2022-03-22 00:00:00', N'Gg%1@muah77', N'9143', N'ON', 1, N'6404', N'1', NULL, NULL, NULL, NULL, N'Tầng 5, Lô 5-06 Trung Tâm Thương Mại Vạn Hạnh Mall, Số 11 Sư Vạn Hạnh, Phường Hòa Hưng, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (606, N'4317', N'30KK431701', N'574', N'Kichi Emart Gò Vấp', NULL, N'10.8.71.1', N'371 477 274', N'357 729 060', N'NONE', N'02873002032', N'hcm.kk.ema.pvt@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Kichi Kichi', N'14.224.239.2 / 14.224.238.254 / 14.224.239.2', N'SDWAN', '2022-06-01 07:00:00', N'KICHI EMART PHAN VAN TRI Kichi Emart Go Vap Kichi Emart Go Vap Kichi Emart Go Vap', NULL, '2026-09-11 15:35:38', NULL, N'dat.tran', N'31&nvem$fc', N'hcmkkemapvt', N'0', N'Hàng tháng', '1999-01-01 00:00:00', N'AWMN&?qmix48', N'9071', N'ON', 1, N'4516', N'1', NULL, N'None', N'None', N'None', N'Tầng 1, lô F1-05 Trung tâm thương mại E-mart, 366 Phan Văn Trị, Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam', N'', NULL),
        (607, N'4074', N'30GG407401', N'471', N'Gogi House Trường Sơn', NULL, N'10.8.28.1', N'201 884 642', N'1457853116', N'207493620', N'02873009191', N'hcm.ggh.sh.ts@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.7.42 / 58.186.119.99 / 115.73.213.184', N'SDWAN', '2018-02-14 07:00:00', N'GOGI TRUONG SON', NULL, '2026-04-16 16:23:52', NULL, N'hiep.pham', N'GGH@TS123', N'hcmgghshts', N'jhhg8wad', N'12 tháng', '2022-05-25 00:00:00', N'Vang#cong!9128', N'9028', N'ON', 1, N'4214', N'1', NULL, N'None', N'None', N'None', N'14 Trường Sơn, Phường Tân Sơn Hòa, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (608, N'4996', N'30KK499601', N'937', N'Kichi Kichi Bcons Thống Nhất', NULL, N'10.8.29.1', N'', N'', N'', N'02747300538', N'hcm.kk.bcm.tn@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Kichi Kichi', N'', N'Kichi Kichi Bcons Thống Nhất sử dụng lại IP Gogi House Nguyễn Thái Học', '2020-06-24 07:00:00', N'Kichi Kichi Bcons Thống Nhất sử dụng lại IP Gogi House Nguyễn Thái Học Kichi Kichi Bcons Thong Nhat Kichi Kichi Bcons Thong Nhat', NULL, '2026-09-07 18:07:28', NULL, N'dat.tran', N'MNhah$1871', N'fbr00mbsp', N'2j7x2n6A', N'', '1999-01-01 00:00:00', N'JfyQ7167c5,ah', N'9029', N'ON', 1, NULL, N'1', NULL, N'None', N'None', N'None', N'Lầu 1 (Mã số L1-01), Trung Tâm Thương Mại Bcons City Mall_ 38 Đường Thống Nhất, Phường Đông Hoà, Thành Phố Hồ Chí Minh', N'', NULL),
        (609, N'4027', N'30GG402701', N'59', N'Gogi House Lê Văn Sỹ', NULL, N'10.8.30.1', N'1 105 208 208', N'1 109 545 867', N'1 166 126 372', N'02873000614', N'hcm.ggh.sh.lvs@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.5.31', N'', '2020-06-24 07:00:00', N'GOGI LE VAN SY', NULL, '2026-03-25 16:16:22', NULL, N'dat.tran', N'LvS$ggH@2066', N'hcmgghshlvs', N'f1xxz73o', N'12 tháng', '2022-03-31 00:00:00', N'PJEG?#whdr87', N'9030', N'ON', 1, N'4154', N'1', NULL, N'None', N'None', N'None', N'254-256 Lê Văn Sỹ, Phường Nhiêu Lộc, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (610, N'4028', N'30GG402801', N'99', N'Gogi Phan Xích Long', NULL, N'10.8.33.1', N'479 126 809', N'848 734 847', N'1 191 999 154', N'02873000865', N'hcm.ggh.sh.pxl@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.6.17', N'', '2015-08-07 07:00:00', N'GOGI PHAN XICH LONG', NULL, '2026-06-10 17:21:39', NULL, N'dat.tran', N'GgpxL@0112', N'hcmgghshpxl', N'gz0pd0tz', N'12 tháng', '2022-03-15 00:00:00', N'NESY@&gof6$1', N'9033', N'ON', 1, N'4155', N'1', NULL, N'None', N'None', N'None', N'143 Phan Xích Long , Phường Cầu Kiệu, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (611, N'4031', N'30GG403101', N'81', N'Gogi Vincom Đồng Khởi', NULL, N'10.8.34.1', N'413528065', N'1540926430', N'1553044784', N'02873000917', N'hcm.ggh.vcr.dk@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.7.44', N'', '2020-06-24 07:00:00', N'GOGI VINCOM B , LE THANH TON , DONG KHOI', NULL, '2025-10-27 17:36:21', NULL, N'dat.tran', N'GGVrc@7817%', N'hcmgghvcrdk', N'mjxdfjws', N'12 tháng', '2022-03-17 00:00:00', N'Hy2s&*dujb83', N'9034', N'ON', 1, N'4158', N'1', NULL, N'None', N'None', N'None', N'B3-23-24 Tòa nhà Vincom Center, 70-72 Lê Thánh Tôn, Phường Sài Gòn, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (612, N'4029', N'30GG402901', N'102', N'Gogi Vincom Thủ Đức', NULL, N'10.8.35.1', N'1 497 641 608', N'1429159992', N'550 874 934', N'02873001193', N'hcm.ggh.vcr.vvn@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.6.58', N'', '2020-06-25 07:00:00', N'GOGI VINCOM THU DUC', NULL, '2025-08-20 17:50:55', NULL, N'dat.tran', N'5pFd*^x&', N'hcmgghvcrvvn', N'cb9a9dec', N'12 tháng', '2022-05-21 00:00:00', N'SFKV^[ndpx18', N'9035', N'ON', 1, N'4156', N'1', NULL, NULL, NULL, NULL, N'Gian hàng L3-02B+02C, Trung tâm Thương mại Vincom, Số 216 Võ Văn Ngân, Phường Thủ Đức, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (613, N'4030', N'30GG403001', N'77', N'Gogi Vivo City', NULL, N'10.8.36.1', N'878 210 528', N'1 282 446 874', N'1 262 395 339', N'02873001194', N'hcm.ggh.vvc.nvl@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.32.41 / 58.186.119.97 / 113.171.81.54', N'SDWAN', '2020-06-26 07:00:00', N'GOGI VIVO CITY', NULL, '2026-06-04 14:06:12', NULL, N'hiep.pham', N'GGG@4015a', N'hcmgghvvcnvl', N'dmanlrke', N'12 tháng', '2022-03-15 00:00:00', N'JNRF*^oXny54', N'9036', N'ON', 1, N'4157', N'1', NULL, N'None', N'None', N'None', N'Lô 04-12A, TTTM SC Vivo City, Số 1058 Nguyễn Văn Linh, Khu phố 1, Phường Tân Hưng, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (614, N'5031', N'30GG503101', N'941', N'Gogi House Ninh Thuận', NULL, N'10.8.60.1', N'556 106 399', N'1 453 037 520', N'', N'02597300079', N'kha.ggh.sh.tnt@ggg.com.vn', N'Khánh Hòa', N'Gogi House', N'113.161.248.132', N'Gogi House Ninh Thuận sử dụng lại IP GG Vincom Quang Trung', '2026-01-01 01:01:00', N'Gogi House Ninh Thuận sử dụng lại IP GG Vincom Quang Trung', NULL, '2026-06-18 11:23:24', NULL, N'quyen.tt', N'$JdSX7v#&61', N'fbr008o77', N'303730217', N'12 tháng', '2022-03-08 00:00:00', N'NXGS#[tbaq37&1', N'9060', N'ON', 1, N'4160', N'1', NULL, N'None', N'None', N'None', N'Số 56-58 Trần Nhân Tông, khu K1, Phường Phan Rang, Tỉnh Khánh Hoà, Việt Nam', NULL, NULL),
        (615, N'4032', N'30GG403201', N'127', N'Gogi SSG Văn Thánh', NULL, N'10.8.64.1', N'1 469 310 956', N'1 244 960 695', N'1 550 666 268', N'02873001682', N'hcm.ggh.ssg.dbp@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.32.91', N'', '2020-06-24 07:00:00', N'GOGI SSG VAN THANH', NULL, '2025-08-21 12:54:23', NULL, N'dat.tran', N'3Vy_nQHE', N'hcmgghssgdbp', N'1dlh5eqw', N'12 tháng', '2022-03-10 00:00:00', N'B0tomoLaj13142$', N'9064', N'ON', 1, N'4159', N'1', NULL, NULL, NULL, NULL, N'L4-02 Tầng 4, Trung tâm thương mại Pearl Plaza, Số 561A Điện Biên Phủ, Phường Thạnh Mỹ Tây, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (616, N'4035', N'30GG403501', N'152', N'Gogi Aeon Tân Phú', NULL, N'10.8.73.1', N'1 315 840 769', N'1 310 552 808', N'1 533 504 379', N'02873002047', N'hcm.ggh.aom.bbtt@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.6.204', N'', '2020-06-26 07:00:00', N'GOGI AEON TAN PHU', NULL, '2025-11-07 10:13:09', NULL, N'cong.nt', N'QWEKgK9912$', N'hcmgghaombbtt', N'391ca8be', N'12 tháng', '2022-05-27 00:00:00', N'BJHZ!\gopy65', N'9073', N'ON', 1, N'4162', N'1', NULL, N'None', N'None', N'None', N'T45, tầng 3 TTTM Aeon Tân Phú Celadon, 30 Tân Thắng, Phường Sơn Kỳ, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (617, N'4034', N'30GG403401', N'151', N'Gogi Emart Phan Văn Trị', NULL, N'10.8.69.1', N'1 276 386 619', N'849 209 965', N'870 272 375', N'02873001985', N'hcm.ggh.ema.pvt@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.241.242.15 / 14.224.237.33 / 14.224.239.34', N'SDWAN', '2020-06-25 07:00:00', N'GOGI EMART PHAN VAN TRI', NULL, '2026-04-16 16:30:03', NULL, N'hiep.pham', N'^_TN8e+s', N'hcmgghemapvt', N'figkruds', N'12 tháng', '2022-03-24 00:00:00', N'YALW&!psyu52', N'9069', N'ON', 1, N'4161', N'1', NULL, N'None', N'None', N'None', N'Tầng 1, lô F1-04 Trung tâm thương mại E-Mart, 366 Phan Văn Trị , Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (618, N'4036', N'30GG403601', N'161', N'Gogi Lê Văn Việt', NULL, N'10.8.81.1', N'1 320 385 030', N'1 327 131 531', N'1 327 153 602', N'02873002082', N'hcm.ggh.vcr.lvv@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.23.103', N'', '2016-03-25 07:00:00', N'GOGI LE VAN VIET', NULL, '2025-08-21 13:07:26', NULL, N'dat.tran', N'ggLVV#123', N'hcmgghvcrlvv', N'a3416484', N'12 tháng', '2022-05-19 00:00:00', N'$V@ngc0ng6789', N'9081', N'ON', 1, N'4163', N'1', NULL, NULL, NULL, NULL, N'Tầng L4-03 Trung tâm Thương mại Vincom Lê Văn Việt, Số 50 Lê Văn Việt, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (619, N'4037', N'30GG403701', N'172', N'Gogi Lotte Gò Vấp', NULL, N'10.8.86.1', N'984 381 205', N'988068639', N'217 697 191', N'02873002065', N'hcm.ggh.lte.pvt@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.241.224.236', N'', '2016-04-28 07:00:00', N'GOGI LOTTE GO VAP', NULL, '2025-10-01 09:40:50', NULL, N'dat.tran', N'GrgT%1977%$', N'hcmgghltepv', N'mbgndslg', N'12 tháng', '2022-03-29 00:00:00', N'GffdT58(7@eta79', N'9086', N'ON', 1, N'4164', N'1', NULL, N'None', N'None', N'None', N'Lô 1F1, Tầng 1 TTTM Lotte Mart Gò Vấp, Số 18 Phan Văn Trị, Phường Gò Vấp, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (620, N'4038', N'30GG403801', N'182', N'Gogi Aeon Mall Bình Tân', NULL, N'10.8.96.1', N'1 729 814 077', N'623999471', N'906 195 859', N'02873002078', N'hcm.ggh.aom.kdv@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.19.21', N'', '2016-06-30 07:00:00', N'GOGI AEON MALL BINH TAN', NULL, '2025-09-05 11:22:13', NULL, N'dat.tran', N'4x$yQ3Gt%1&', N'hcmgghaomkdv', N'5mfstnns', N'12 tháng', '2022-05-23 00:00:00', N'Vang#cong!799', N'9096', N'ON', 1, N'4165', N'1', NULL, NULL, NULL, NULL, N'Lô T27-T28, Tầng Ba, Aeon Mall Bình Tân, số 01 Đường số 17A, Khu phố 11, Phường An Lạc, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (621, N'4039', N'30GG403901', N'189', N'Gogi Saigon Centre', NULL, N'10.8.104.1', N'949159334', N'1735833390', N'1 004 542 430', N'02873002141', N'hcm.ggh.sgc.nkkn@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.5.69', N'', '2016-07-28 07:00:00', N'GOGI SAIGON CENTRE', NULL, '2025-08-21 13:11:25', NULL, N'dat.tran', N'WelcomEggg!771', N'hcmgghsgcnkkn', N'izx6qy2k', N'12 tháng', '2021-12-10 00:00:00', N'WZKQ]&gmtu27', N'9104', N'ON', 1, N'4166', N'1', NULL, NULL, NULL, NULL, N'Gian hàng L5-08C, Trung tâm mua sắm Saigon Centre, 67 Lê Lợi, Phường Sài Gòn, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL),
        (623, N'4040', N'30GG404001', N'4', N'Gogi Nguyễn Hồng Đào', NULL, N'10.8.115.1', N'1 446 910 614', N'1329272474', N'1 446 910 614', N'02873002149', N'hcm.ggh.sh.nhd@ggg.com.vn', N'Thành phố Hồ Chí Minh', N'Gogi House', N'14.161.6.33', N'', '2016-11-26 07:00:00', N'GOGI NGUYEN HONG DAO', NULL, '2025-08-21 13:14:07', NULL, N'dat.tran', N'BgyY^!7id0', N'hcmgghshnhd', N'0', N'Hàng tháng', '2021-12-14 00:00:00', N'MTCY&@jbcy68', N'9115', N'ON', 1, N'4168', N'1', NULL, NULL, NULL, NULL, N'127-129-131 Nguyễn Hồng Đào, Phường Tân Bình, Thành phố Hồ Chí Minh, Việt Nam', NULL, NULL);
    SET IDENTITY_INSERT [dbo].[RESTAURANT] OFF;
    PRINT N'Inserted default data for [dbo].[RESTAURANT] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[SOFTWARE_VERSIONS] (5 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[SOFTWARE_VERSIONS])
BEGIN
    SET IDENTITY_INSERT [dbo].[SOFTWARE_VERSIONS] ON;
    INSERT INTO [dbo].[SOFTWARE_VERSIONS] ([id], [phan_mem], [phien_ban], [ngay_update], [noi_dung_update], [nguoi_update], [active], [created_at], [updated_at]) VALUES
        (1, N'KDS', N'v2.4.0', '2026-09-17 14:17:33', N'Bản cập nhật hiển thị đơn gọi món nhà bếp thời gian thực', N'Admin', 1, '2026-09-17 14:17:33', '2026-09-17 14:17:33'),
        (2, N'CO', N'v1.8.2', '2026-09-17 14:17:33', N'Bản cập nhật Central Order đồng bộ thực đơn', N'Admin', 1, '2026-09-17 14:17:33', '2026-09-17 14:17:33'),
        (3, N'SO', N'v1.6.5', '2026-09-17 14:17:33', N'Bản cập nhật Smart Order thanh toán và tích điểm', N'Admin', 1, '2026-09-17 14:17:33', '2026-09-17 14:17:33'),
        (4, N'GPOS-CO-SO', N'v3.1.0', '2026-09-17 14:17:33', N'Bản phát hành tích hợp liên thông GPOS với CO và SO', N'Admin', 1, '2026-09-17 14:17:33', '2026-09-17 14:17:33'),
        (5, N'GPOS-KDS', N'v2.5.1', '2026-09-17 14:17:33', N'Bản cập nhật đồng bộ trạng thái chế biến món GPOS và KDS', N'Admin', 1, '2026-09-17 14:17:33', '2026-09-17 14:17:33');
    SET IDENTITY_INSERT [dbo].[SOFTWARE_VERSIONS] OFF;
    PRINT N'Inserted default data for [dbo].[SOFTWARE_VERSIONS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[CHUANHOA_IN] (79 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[CHUANHOA_IN])
BEGIN
    SET IDENTITY_INSERT [dbo].[CHUANHOA_IN] ON;
    INSERT INTO [dbo].[CHUANHOA_IN] ([id], [brand], [PRINT_NAME], [IP_PRINT], [TRANGTHAI], [KDS_NAME], [IP_KDS], [ACTIVE]) VALUES
        (1, N'Sumo', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (2, N'Sumo', N'NONG', N'52', N'TRUE', N'BEP_NONG_52', N'', 1),
        (3, N'Sumo', N'BEP THIT', N'53', N'TRUE', N'BEP_THIT_53', N'', 1),
        (4, N'Sumo', N'RAU', N'54', N'TRUE', N'BEP_LANH_SALAD_54', N'', 1),
        (5, N'Isushi', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (6, N'Isushi', N'ALC_LANH', N'52', N'TRUE', N'Lanh Sashimi', N'52', 1),
        (7, N'Isushi', N'BF_LANH', N'53', N'TRUE', N'Lanh_Sushi 1', N'53', 1),
        (8, N'Isushi', N'ALC_NONG', N'54', N'TRUE', N'Food control/Nong', N'54', 1),
        (9, N'Isushi', N'BF_NONG', N'55', N'TRUE', N'Salad', N'', 1),
        (10, N'Manwah', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (11, N'Manwah', N'LAU', N'52', N'TRUE', N'', N'', 1),
        (12, N'Manwah', N'THIT', N'53', N'TRUE', N'KDS_THIT', N'53', 1),
        (13, N'Manwah', N'RAU', N'54', N'TRUE', N'KDS_RAUNAM', N'', 1),
        (14, N'Manwah', N'HAISAN', N'55', N'TRUE', N'KDS_HAISAN', N'55', 1),
        (15, N'Manwah', N'VIEN_TOFU', N'56', N'TRUE', N'', N'', 1),
        (16, N'KPUB', N'BAR', N'51', N'FALSE', N'', N'', 1),
        (17, N'KPUB', N'BEPNONG', N'52', N'FALSE', N'KDS_NONG', N'', 1),
        (18, N'KPUB', N'BEPTHIT', N'53', N'FALSE', N'KDS_THIT', N'53', 1),
        (19, N'Hutong', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (20, N'Hutong', N'BEPNONG', N'52', N'TRUE', N'', N'', 1),
        (21, N'Hutong', N'BEPTHIT', N'53', N'TRUE', N'KDS_THIT', N'53', 1),
        (22, N'Hutong', N'BEPRAU_MY', N'54', N'TRUE', N'', N'', 1),
        (23, N'Hutong', N'BEPVIEN_HAISAN', N'55', N'TRUE', N'KDS_HAISAN', N'55', 1),
        (24, N'Gogi House', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (25, N'Gogi House', N'BEPTHIT', N'52', N'TRUE', N'KDS_THIT', N'52', 1),
        (26, N'Gogi House', N'BEPNONG', N'53', N'TRUE', N'KDS_NONG', N'53', 1),
        (27, N'Gogi House', N'BEPRAU', N'54', N'TRUE', N'KDS_LANH_SALAD', N'54', 1),
        (38, N'Crystal Jade', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (39, N'Crystal Jade', N'BBQ', N'52', N'TRUE', N'BBQ', N'', 1),
        (40, N'Crystal Jade', N'BEP_XAO', N'53', N'TRUE', N'Food control/Nong', N'', 1),
        (41, N'Crystal Jade', N'HUTIEU_MY_CHAO', N'54', N'TRUE', N'', N'', 1),
        (42, N'Crystal Jade', N'DIMSUM', N'55', N'TRUE', N'DIMSUM', N'', 1),
        (43, N'Manwah', N'THIT_TUOI', N'57', N'TRUE', N'KDS_THITTUOI', N'', 1),
        (55, N'ASHIMA', N'BAR', N'51', N'FALSE', N'', N'', 1),
        (56, N'ASHIMA', N'BEPNONG', N'52', N'FALSE', N'BEPNONG', N'', 1),
        (57, N'ASHIMA', N'BEPTHIT', N'53', N'FALSE', N'BEPTHIT', N'', 1),
        (58, N'ASHIMA', N'BEP_RAU_NAM', N'54', N'FALSE', N'BEP_SALAD', N'', 1),
        (59, N'ASHIMA', N'', N'', N'FALSE', N'BEP_NAM', N'', 1),
        (60, N'KICHI KICHI', N'BEP_BAR_51', N'51', N'TRUE', N'', N'', 1),
        (61, N'KICHI KICHI', N'BEP_LAU_52', N'52', N'TRUE', N'Food control/Cửa ra đồ', N'', 1),
        (62, N'KICHI KICHI', N'BEP_BEP_53', N'53', N'TRUE', N'', N'', 1),
        (63, N'37st', N'BEP_BAR_51', N'51', N'TRUE', NULL, NULL, 0),
        (64, N'37st', N'BEP_BEP_52', N'52', N'TRUE', NULL, NULL, 0),
        (65, N'37st', N'BEP_CHE_53', N'53', N'TRUE', NULL, NULL, 0),
        (66, N'Shogun', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (67, N'Shogun', N'SASHIMI', N'52', N'TRUE', N'LANH_SASHIMI_SALAD', N'', 1),
        (68, N'Shogun', N'NONG', N'53', N'TRUE', N'KDS_NONG', N'', 1),
        (69, N'Shogun', N'THIT', N'54', N'TRUE', N'KDS_THIT', N'', 1),
        (70, N'Shogun', N'NUONG', N'55', N'TRUE', N'', N'', 1),
        (71, N'Shogun', N'SALAD', N'56', N'TRUE', N'', N'', 1),
        (72, N'Gogi Steak', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (73, N'Gogi Steak', N'NONG', N'52', N'TRUE', N'', N'', 1),
        (74, N'Gogi Steak', N'THIT', N'53', N'TRUE', N'', N'', 1),
        (75, N'Gogi Steak', N'RAU', N'54', N'TRUE', N'', N'', 1),
        (76, N'CloudPot', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (77, N'CloudPot', N'THIT', N'52', N'TRUE', N'THIT_HAISAN', N'', 1),
        (78, N'CloudPot', N'HAISAN', N'53', N'TRUE', N'', N'', 1),
        (79, N'CloudPot', N'RAU', N'54', N'TRUE', N'RAU_SALAD', N'', 1),
        (80, N'CloudPot', N'DIMSUM', N'55', N'TRUE', N'DIMSUM', N'', 1),
        (81, N'HANG CUON', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (82, N'HANG CUON', N'NONG', N'52', N'TRUE', N'CHIEN', N'', 1),
        (83, N'HANG CUON', N'CUON', N'53', N'TRUE', N'', N'', 1),
        (84, N'HANG CUON', N'', N'', N'TRUE', N'SALAD', N'', 1),
        (85, N'HANG CUON', N'', N'', N'TRUE', N'SO_CHE', N'', 1),
        (86, N'HANG CUON', N'', N'', N'TRUE', N'Food control', N'', 1),
        (87, N'Happy Bull', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (88, N'Happy Bull', N'THIT', N'52', N'TRUE', N'KDS_THIT', N'', 1),
        (89, N'Happy Bull', N'NONG', N'53', N'TRUE', N'', N'', 1),
        (90, N'Happy Bull', N'RAU', N'54', N'TRUE', N'', N'', 1),
        (91, N'Man Tang Guo', N'BAR', N'51', N'TRUE', N'KDS_BAR_TRANGMIENG', N'', 1),
        (92, N'Man Tang Guo', N'NONG', N'52', N'TRUE', N'KDS_LAU', N'', 1),
        (93, N'Man Tang Guo', N'THIT', N'53', N'TRUE', N'KDS_THIT', N'', 1),
        (94, N'Man Tang Guo', N'RAU', N'54', N'TRUE', N'KDS_RAU', N'', 1),
        (95, N'Man Tang Guo', N'VIEN', N'55', N'TRUE', N'KDS_HAISAN', N'', 1),
        (96, N'Wow!Yakiniku', N'BAR', N'51', N'TRUE', N'', N'', 1),
        (97, N'Wow!Yakiniku', N'NONG', N'53', N'TRUE', N'KDS_NONG', N'', 1),
        (98, N'Wow!Yakiniku', N'THIT', N'52', N'TRUE', N'Food control/THIT', N'', 1),
        (99, N'Wow!Yakiniku', N'RAU', N'54', N'TRUE', N'', N'', 1),
        (100, N'Isushi', N'', N'', N'TRUE', N'Lanh Sushi 2', N'', 1);
    SET IDENTITY_INSERT [dbo].[CHUANHOA_IN] OFF;
    PRINT N'Inserted default data for [dbo].[CHUANHOA_IN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[EXT_RSC] (42 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[EXT_RSC])
BEGIN
    SET IDENTITY_INSERT [dbo].[EXT_RSC] ON;
    INSERT INTO [dbo].[EXT_RSC] ([id], [nhanvien], [email], [manv], [so_ext], [phongban], [note], [ngay_insert], [user_insert], [ngay_update], [user_update], [active]) VALUES
        (40, N'Kha, Tran Trong ( DNG | OPS Dept )', N'kha.tran@ggg.com.vn', NULL, N'7001', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (41, N'Huy, Phan Quang (DNG | OPS Dept)', N'huy.phanquang@ggg.com.vn', NULL, N'7002', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (42, N'Ly, Le Thi Sau ( DNG | OPS Dept )', N'ly.lt@ggg.com.vn', NULL, N'7003', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (43, N'Tin, Phan Trong ( DNG | OPS Dept )', N'tin.phan@ggg.com.vn', NULL, N'7004', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (44, N'Tuyen, Le Thi Bich ( DNG | HR Dept )', N'tuyen.lethi@ggg.com.vn', NULL, N'7005', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (45, N'Vi, Nguyen Thi Tuong ( DNG | OPS )', N'vi.ntt@ggg.com.vn', NULL, N'7006', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (46, N'Minh, Nguyen Thi Ngoc ( DNG | HR Dept )', N'minh.nguyen@ggg.com.vn', NULL, N'7007', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (47, N'Mai, Tran Thi Hoang ( DNG | HR Dept )', N'mai.tran@ggg.com.vn', NULL, N'7008', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (48, N'Dung, Tran Le Kieu ( DNG | ACC Dept )', N'dung.tranle@ggg.com.vn', NULL, N'7009', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (49, N'Lieu, Le Thi Thuy ( DNG | ACC Dept )', N'lieu.le@ggg.com.vn', NULL, N'7010', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (50, N'Van, Dinh Thi Hong ( DNG | ACC Dept )', N'van.dinh@ggg.com.vn', NULL, N'7011', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (51, N'Uyen, Nguyen Thi Thu ( DNG | ACC Dept )', N'uyen.nguyen@ggg.com.vn', NULL, N'7012', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (52, N'Huy, Tu Tan ( DNG | ACC Dept )', N'huy.tu@ggg.com.vn', NULL, N'7013', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (53, N'Ha, Nguyen Thi Thanh ( DNG | Procurement Dept )', N'ha.nguyenthi@ggg.com.vn', NULL, N'7014', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (54, N'Hanh, Huynh Thi My ( DNG | DC Dept )', N'hanh.huynh@ggg.com.vn', NULL, N'7015', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (55, N'Nguyen, Thi Thu Uyen (DNG|FA)', N'uyen.nguyen@ggg.com.vn', NULL, N'7016', NULL, N'VP ĐÀ NẴNG', NULL, NULL, NULL, NULL, 1),
        (56, N'Loc, Dinh Thanh ( KH | ACC Dept )', N'loc.dt@ggg.com.vn', NULL, N'7020', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (57, N'Trinh, Huynh Thi My (NTG | ACC Dept)', N'trinh.huynh@ggg.com.vn', NULL, N'7021', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (58, N'Tuyen, Nguyen Thi Thanh ( NTG | HR Dept )', N'tuyen.nguyenthi@ggg.com.vn', NULL, N'7022', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (59, N'Vu, Le Duy ( HCM | AMM Dept )', N'kha.baotri@ggg.com.vn', NULL, N'7023', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (60, N'Tri, Pham Thanh ( HCM | AMM Dept)', N'kha.baotri1@ggg.com.vn', NULL, N'7024', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (61, N'Huy, Le Duc ( HCM | AMM Dept)', N'kha.baotri2@ggg.com.vn', NULL, N'7025', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (62, N'Minh, Lai The ( NTG | DC Dept)', N'kha.warehouse@ggg.com.vn', NULL, N'7026', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (63, N'Nhi, Nguyen Do Y ( NTG | ACC Dept )', N'nhi.nguyen@ggg.com.vn', NULL, N'7027', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (64, N'Bong, Nguyen Thi ( NTG | HR Dept )', N'bong.nguyen@ggg.com.vn', NULL, N'7028', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (65, N'Hiep, Vo Dang Nhi ( NTG | OPS Dept )', N'hiep.vo@ggg.com.vn', NULL, N'7029', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (66, N'Tam, Truong Thi Minh ( HCM | Procurement Dept )', N'tam.truong@ggg.com.vn', NULL, N'7030', NULL, N'VP KHÁNH HÒA', NULL, NULL, NULL, NULL, 1),
        (67, N'Võ Thị Phương Thủy', N'', NULL, N'7101', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (68, N'Vương Thanh Nhi', N'', NULL, N'7102', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (69, N'Nguyễn Thị Ngọc Dung', N'', NULL, N'7103', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (70, N'Lê Huỳnh Anh Thư', N'', NULL, N'7104', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (71, N'Huỳnh Thanh Danh', N'', NULL, N'7105', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (72, N'Lê Thanh Ân', N'', NULL, N'7106', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (73, N'Trần Tuấn Anh', N'', NULL, N'7107', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (74, N'Nguyễn Lê Đông', N'', N'NONE', N'7108', N'None', N'', NULL, NULL, '2024-10-03 15:45:33', N'dung.nguyenanh', 1),
        (75, N'To Thanh Quyen CTH HR Dept', N'', NULL, N'7041', NULL, N'VP CẦN THƠ', NULL, NULL, NULL, NULL, 1),
        (76, N'Tran Thi Hong Thuy CTH HR Dept', N'', NULL, N'7042', NULL, N'VP CẦN THƠ', NULL, NULL, NULL, NULL, 1),
        (77, N'Pham Ngoc Duan CTH AMM Dept', N'', NULL, N'7043', NULL, N'VP CẦN THƠ', NULL, NULL, NULL, NULL, 1),
        (78, N'Nguyễn Thị Ngọc Thúy / thuy.ntn1@ggg.com.vn / 29/09/2022', N'', NULL, N'', NULL, N'VP HCM', NULL, NULL, NULL, NULL, 1),
        (79, N'Test NV Extension Updated', N'test_ext_automation@ggg.com.vn', N'TEST9999', N'8888', N'IT Dept', N'Unit test note', '2026-09-18 09:57:18', N'admin', '2026-09-18 09:57:18', N'admin', 0),
        (80, N'Test NV Extension Updated', N'test_ext_automation@ggg.com.vn', N'TEST9999', N'8888', N'IT Dept', N'Unit test note', '2026-09-18 10:10:35', N'admin', '2026-09-18 10:10:35', N'admin', 0),
        (81, N'Test NV Extension Updated', N'test_ext_automation@ggg.com.vn', N'TEST9999', N'8888', N'IT Dept', N'Unit test note', '2026-09-18 17:31:52', N'admin', '2026-09-18 17:31:52', N'admin', 0);
    SET IDENTITY_INSERT [dbo].[EXT_RSC] OFF;
    PRINT N'Inserted default data for [dbo].[EXT_RSC] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[CODE_PHOTO] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[CODE_PHOTO])
BEGIN
    SET IDENTITY_INSERT [dbo].[CODE_PHOTO] ON;
    INSERT INTO [dbo].[CODE_PHOTO] ([id], [hientrang], [manv], [name], [email], [pass_code], [cmnd_sdt], [cty], [donvi], [bophan], [chucdanh], [code_dept], [note], [ngay_insert], [ngay_update], [user_insert], [user_update], [timkiem], [active]) VALUES
        (1, N'ON', N'D2325', N'Lê Thanh Linh', N'', N'30590', N'12760', NULL, NULL, N'Maintenance', N'Technician', N'10', N'', NULL, '2023-10-24 14:48:57', NULL, N'dung.nguyenanh', N'Le Thanh Linh', 1),
        (2, N'On', N'D2343', N'Nguyễn Viết Thuận', N'', N'02245', N'37465', NULL, NULL, N'Maintenance', N'Technician', N'10', NULL, NULL, NULL, NULL, NULL, N'Nguyen Viet Thuan', 1),
        (3, N'On', N'D6188', N'Vũ Ngọc Tuyến', N'', N'26444', N'20574', NULL, NULL, N'HR', N'Driver', N'4', NULL, NULL, NULL, NULL, NULL, N'Vu Ngoc Tuyen', 1),
        (4, N'On', N'D6200', N'Nguyễn Văn Lộc', N'', N'60045', N'97265', NULL, NULL, N'Maintenance', N'Technician', N'10', NULL, NULL, NULL, NULL, NULL, N'Nguyen Van Loc', 1),
        (5, N'On', N'D7529', N'Đặng Văn Lưng', N'', N'53423', N'96663', NULL, NULL, N'Maintenance', N'Technician', N'10', NULL, NULL, NULL, NULL, NULL, N'Dang Van Lung', 1),
        (6, N'On', N'D9769', N'Phan Thiên Tú', N'', N'44571', N'13031', NULL, NULL, N'HR', N'Trainee', N'4', NULL, NULL, NULL, NULL, NULL, N'Phan Thien Tu', 1),
        (7, N'On', N'D9771', N'Dương Mỹ Thiện', N'', N'16959', N'01439', NULL, NULL, N'HR', N'Trainee', N'4', NULL, NULL, NULL, NULL, NULL, N'Duong My Thien', 1),
        (8, N'On', N'D9772', N'Ngô Hữu Hùng Phong', N'', N'04772', N'00322', NULL, NULL, N'Maintenance', N'Technician', N'10', NULL, NULL, NULL, NULL, NULL, N'Ngo Huu Hung Phong', 1),
        (9, N'On', N'D9773', N'Lê Tuấn Anh', N'', N'20439', N'48119', NULL, NULL, N'HR', N'Driver', N'4', NULL, NULL, NULL, NULL, NULL, N'Le Tuan Anh', 1),
        (10, N'On', N'D9777', N'Trần Tuyên', N'', N'62548', N'51038', NULL, NULL, N'Maintenance', N'Technician', N'10', NULL, NULL, NULL, NULL, NULL, N'Tran Tuyen', 1);
    SET IDENTITY_INSERT [dbo].[CODE_PHOTO] OFF;
    PRINT N'Inserted default data for [dbo].[CODE_PHOTO] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 3: QUẢN LÝ MEMO & CHIẾN DỊCH SALESFORCE RK7
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[MEMO] (12 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[MEMO])
BEGIN
    SET IDENTITY_INSERT [dbo].[MEMO] ON;
    INSERT INTO [dbo].[MEMO] ([id], [ma_memo], [subject_mail], [ngay_batdau], [ngay_ketthuc], [it_setup], [giahan], [ngay_tiepnhan], [trangthai], [hoanthanh], [nguoi_gui], [huong_dan], [ten_file_memo], [note], [ngay_insert], [ngay_update], [active], [ReviewStatus], [ReviewNote], [ReviewedBy], [ReviewedAt], [ma_tua]) VALUES
        (7263, N'402600GG053', N'https://g-loyalty.lightning.force.com/lightning/r/Campaign_Memo__c/a0LRA00000hZDKz2AO/view', '2026-09-10 00:00:00', '2026-10-31 00:00:00', N'tram.nv', N'0', '2026-09-11 00:00:00', N'2', N'9999-12-30', NULL, N'', N'', NULL, '2026-09-11 13:26:29', '2026-09-11 14:08:22', 1, NULL, NULL, NULL, NULL, N'A0001.01'),
        (7264, N'402600MT022', N'https://g-loyalty.my.salesforce.com/a0LRA00000i194j', '2026-10-01 00:00:00', '2026-11-30 00:00:00', N'quyen.tt', N'0', '2026-09-14 11:48:23', N'0', N'9999-12-30', NULL, N'', N'', NULL, '2026-09-14 11:48:23', NULL, 1, NULL, NULL, NULL, NULL, N'A0001.02'),
        (7265, N'402600MT021', N'https://g-loyalty.my.salesforce.com/a0LRA00000i172v', '2026-10-01 00:00:00', '2026-11-30 00:00:00', N'duy.ngo', N'0', '2026-09-14 00:00:00', N'2', N'9999-12-30', NULL, N'<p><img src="[Hình ảnh mẫu]" /></p>
', N'', NULL, '2026-09-14 11:49:08', '2026-09-15 10:01:18', 1, NULL, NULL, NULL, NULL, N'A0001.03'),
        (7266, N'402600DN013', N'', '2026-09-09 00:00:00', '2026-10-31 00:00:00', N'hung.phamtran', N'0', '2026-09-14 15:04:53', N'0', N'9999-12-30', NULL, N'', N'', NULL, '2026-09-14 15:04:53', NULL, 1, NULL, NULL, NULL, NULL, N'A0001.04'),
        (7267, N'302620YT004', N'', '2026-09-01 00:00:00', '2026-09-30 00:00:00', N'thuc.nguyen', N'0', '2026-09-15 00:00:00', N'2', N'9999-12-30', NULL, N'<p><img src="[Hình ảnh mẫu]" /></p>
', N'', NULL, '2026-09-15 15:36:30', '2026-09-15 16:05:53', 1, NULL, NULL, NULL, NULL, N'A0001.05'),
        (7268, N'402600AS017', N'', '2026-09-13 00:00:00', '2026-10-09 00:00:00', N'tram.nv', N'0', '2026-09-16 09:17:35', N'0', N'9999-12-30', NULL, N'', N'', NULL, '2026-09-16 09:17:35', NULL, 1, NULL, NULL, NULL, NULL, N'A0001.06'),
        (7281, N'402600CK001', N'https://g-loyalty.my.salesforce.com/a0LRA00000iX9eH', NULL, NULL, N'quyen.tt', N'0', '2026-09-26 17:06:40', N'0', NULL, N'Linh, Mai Phương (HN | MKT)', N'Yêu cầu tạo nút RK từ Salesforce Loyalty:
- Mã Memo: 402600CK001
- Tên Memo: CK_Combo rủ rê 99K
- Người gửi yêu cầu: Linh, Mai Phương (HN | MKT)
- Danh sách Sub-Memo cần tạo (1 sub):
  • Sub-Memo 402600CK00102: CK_Combo rủ rê 99K
- Link Salesforce: https://g-loyalty.my.salesforce.com/a0LRA00000iX9eH
', NULL, N'Tự động import từ Mail (1 sub-memo)', '2026-09-26 17:06:40', '2026-09-26 17:06:40', 1, NULL, NULL, NULL, NULL, N'A0002.01'),
        (7282, N'302621SG004', N'https://g-loyalty.my.salesforce.com/a0LRA00000iuzvV', NULL, NULL, N'luc.lh', N'0', '2026-09-26 17:06:40', N'0', NULL, N'Ánh, Nguyễn Ngọc (HCM | MKT)', N'Yêu cầu tạo nút RK từ Salesforce Loyalty:
- Mã Memo: 302621SG004
- Tên Memo: SG_GIẢM 10% _BOOKING GG MAPS_LPS_SGGP
- Người gửi yêu cầu: Ánh, Nguyễn Ngọc (HCM | MKT)
- Danh sách Sub-Memo cần tạo (3 sub):
  • Sub-Memo 302621SG004.01: SG_GIẢM 10% _BOOKING GG MAPS_LPS_SGGP
  • Sub-Memo 302621SG004.02: SG_COUPON 50K BF 419K ÁP DỤNG NHÓM 2 _LPS_SG GPT10
  • Sub-Memo 302621SG004.03: SG_COUPON 100K BF 419K ÁP DỤNG KHUNG GIỜ TỪ 14H-17H _LPS_SG GPT10
- Link Salesforce: https://g-loyalty.my.salesforce.com/a0LRA00000iuzvV
', NULL, N'Tự động import từ Mail (3 sub-memo)', '2026-09-26 17:06:40', '2026-09-26 17:06:40', 1, NULL, NULL, NULL, NULL, N'A0002.02'),
        (7283, N'402600SS022', N'https://g-loyalty.my.salesforce.com/a0LRA00000io6bx', NULL, NULL, N'duy.ngo', N'0', '2026-09-26 17:06:40', N'0', NULL, N'Thủy Mai Thị (HN | GRO)', N'Yêu cầu tạo nút RK từ Salesforce Loyalty:
- Mã Memo: 402600SS022
- Tên Memo: SS_Giảm 50K cho HĐ 350K _GRO_ChurnT10
- Người gửi yêu cầu: Thủy Mai Thị (HN | GRO)
- Danh sách Sub-Memo cần tạo (4 sub):
  • Sub-Memo 402600SS022.01: SS_Giảm 50K cho HĐ 350K _GRO_ChurnT10
  • Sub-Memo 402600SS022.02: SS_Giảm 100K cho HĐ 600K_GRO_ChurnT10
  • Sub-Memo 402600SS022.03: SS_Giảm 200K cho HĐ 1000K _GRO_ChurnT10
  • Sub-Memo 402600SS022.04: SS_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Link Salesforce: https://g-loyalty.my.salesforce.com/a0LRA00000io6bx
', NULL, N'Tự động import từ Mail (4 sub-memo)', '2026-09-26 17:06:40', '2026-09-26 17:06:40', 1, NULL, NULL, NULL, NULL, N'A0002.03'),
        (7284, N'402600LC012', N'https://g-loyalty.my.salesforce.com/a0LRA00000ioOAf', NULL, NULL, N'hung.phamtran', N'0', '2026-09-26 17:06:40', N'0', NULL, N'Thủy Mai Thị (HN | GRO)', N'Yêu cầu tạo nút RK từ Salesforce Loyalty:
- Mã Memo: 402600LC012
- Tên Memo: LC_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Người gửi yêu cầu: Thủy Mai Thị (HN | GRO)
- Danh sách Sub-Memo cần tạo (4 sub):
  • Sub-Memo 402600LC012.01: LC_Giảm 50K cho HĐ 350K _GRO_ChurnT10
  • Sub-Memo 402600LC012.02: LC_Giảm 100K cho HĐ 600K_GRO_ChurnT10
  • Sub-Memo 402600LC012.03: LC_Giảm 200K cho HĐ 1000K _GRO_ChurnT10
  • Sub-Memo 402600LC012.04: LC_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Link Salesforce: https://g-loyalty.my.salesforce.com/a0LRA00000ioOAf
', NULL, N'Tự động import từ Mail (4 sub-memo)', '2026-09-26 17:06:40', '2026-09-26 17:06:40', 1, NULL, NULL, NULL, NULL, N'A0002.04'),
        (7285, N'402600SG036', N'https://g-loyalty.my.salesforce.com/a0LRA00000is6yL', NULL, NULL, N'thuc.nguyen', N'0', '2026-09-26 17:06:40', N'0', NULL, N'Thủy Mai Thị (HN | GRO)', N'Yêu cầu tạo nút RK từ Salesforce Loyalty:
- Mã Memo: 402600SG036
- Tên Memo: SG_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Người gửi yêu cầu: Thủy Mai Thị (HN | GRO)
- Danh sách Sub-Memo cần tạo (4 sub):
  • Sub-Memo 402600SG036.01: SG_Giảm 50K cho HĐ 350K _GRO_ChurnT10
  • Sub-Memo 402600SG036.02: SG_Giảm 100K cho HĐ 600K_GRO_ChurnT10
  • Sub-Memo 402600SG036.03: SG_Giảm 200K cho HĐ 1000K _GRO_ChurnT10
  • Sub-Memo 402600SG036.04: SG_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Link Salesforce: https://g-loyalty.my.salesforce.com/a0LRA00000is6yL
', NULL, N'Tự động import từ Mail (4 sub-memo)', '2026-09-26 17:06:40', '2026-09-26 17:06:40', 1, NULL, NULL, NULL, NULL, N'A0002.05'),
        (7286, N'402600KP025', N'https://g-loyalty.my.salesforce.com/a0LRA00000irxbh', NULL, NULL, N'tram.nv', N'0', '2026-09-26 17:06:40', N'0', NULL, N'Thủy Mai Thị (HN | GRO)', N'Yêu cầu tạo nút RK từ Salesforce Loyalty:
- Mã Memo: 402600KP025
- Tên Memo: KP_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Người gửi yêu cầu: Thủy Mai Thị (HN | GRO)
- Danh sách Sub-Memo cần tạo (3 sub):
  • Sub-Memo 402600KP025.02: KP_Giảm 100K cho HĐ 600K_GRO_ChurnT10
  • Sub-Memo 402600KP025.03: KP_Giảm 200K cho HĐ 1000K _GRO_ChurnT10
  • Sub-Memo 402600KP025.04: KP_Giảm 100K cho HĐ 500K_GRO_ChurnT10
- Link Salesforce: https://g-loyalty.my.salesforce.com/a0LRA00000irxbh
', NULL, N'Tự động import từ Mail (3 sub-memo)', '2026-09-26 17:06:40', '2026-09-26 17:06:40', 1, NULL, NULL, NULL, NULL, N'A0002.06');
    SET IDENTITY_INSERT [dbo].[MEMO] OFF;
    PRINT N'Inserted default data for [dbo].[MEMO] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[MEMO_TEMPLATE_CONFIG] (5 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[MEMO_TEMPLATE_CONFIG])
BEGIN
    SET IDENTITY_INSERT [dbo].[MEMO_TEMPLATE_CONFIG] ON;
    INSERT INTO [dbo].[MEMO_TEMPLATE_CONFIG] ([id], [config_key], [config_val]) VALUES
        (1, N'to_emails', N'DCORP Support <19006140@dcorp.com.vn>; LOI Nguyen (DCORP | HCM) <d.loinq@dcorp.com.vn>; ''TUAN Nguyen (DCORP | HCM)'' <d.tuannv@dcorp.com.vn>; support@dcorp.com.vn; quan.pham@ggg.com.vn;'),
        (2, N'mkt_link', N'https://goldengatetradeservice.sharepoint.com/:x:/s/CAMNANGTHONGTIN/IQCMsLY2xKEmSKrDPc1VpU_JAU4LDzEBTzgph82KZqAZjOA?e=xOsFGO'),
        (3, N'email_body', CAST(N'<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; color: #1e293b; line-height: 1.55;" bis_skin_checked="1">
    <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Dear Anh/Chị,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">MEMO đã được setup trên POS.</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Memo bắt đầu từ:&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã IO (Memo):</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Link Setup:</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Hướng dẫn:&nbsp;&nbsp;</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;" id="docs-internal-guid-1a95b8c3-7fff-2b8d-7e27-f5302972105d"><br></b></p><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Các điều kiện nút bấm nhà hàng xem trong </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">file đính kèm</span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> hoặc truy cập </span><' AS nvarchar(max)) + CAST(N'span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">link G-Process </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">đế áp dụng đúng chương trình</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Anh/chị Nhà Hàng vui lòng xem kỹ danh sách </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nhà Hàng được áp dụng</span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">.</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:12pt;" role="presentation"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Các </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nhà Hàng không áp dụng</span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> anh/chị vui lòng bỏ qua mail này. Cần thêm thông tin cơ chế chương trình anh/chị vui lòng liên hệ team MKT phụ trách brand của mình để được giải đáp</span></p></li></ul><p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#ffff00;background-color:#000000;font-weight:700;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nhà hàng lưu ý kiểm tra nút bấm giảm trước khi đóng giao dịch!</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-fami' AS nvarchar(max)) + CAST(N'ly:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Internal Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “.....................”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: ………………….</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Lưu ý </span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">:</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">NH kiểm tra nếu</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:10pt;font-fa' AS nvarchar(max)) + CAST(N'mily:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">chưa có nút bấm báo ngay hotline Dcorp 19006140 nhân phím 1</span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">để được hỗ trợ .</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nếu đã có nút bấm vui lòng kiểm tra kỹ lại xem thông tin setup đã chính xác so với MEMO</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">, có sai sót trong quá trình vận hành NH vui lòng báo ngay hotline IT nhấn phím 2, không liên hệ được hotline vui lòng gọi trực tiếp IT gửi hướng dẫn memo để điều chỉnh chính xác</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">trước khi bán</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> .(Mặc định Nhà hàng không phản hồi nghĩa là SETUP MEMO trên POS đã chính xác với nội dung memo MKT ban hành, mọi sai sót sau khi bán IT hoàn toàn không chịu trách nhiệm,nên mong NH kiểm tra kỹ trước khi bán )</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">@Dear team Dcorp,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;' AS nvarchar(max)) + CAST(N'"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Vui lòng tiếp nhận thông tin support khi cần thiết nhé</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">@Dear team MKT,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Team vui lòng hướng dẫn thêm các cơ chế cho nhà hàng dễ vận hành nhé</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-------------------------------------------------------------------------------------------------------------------------</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">&nbsp;-------------------------------------------------------------------------------------------------------------------------</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nếu là Voucher sau Thuế thì setup trong nhóm Voucher Internal hay External</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">1.</span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Trong nhóm External vui lòng cung cấp thêm mã SAP PartnerCode</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-fa' AS nvarchar(max)) + CAST(N'mily:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">2.</span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher cần setup mệnh giá bao nhiêu, Có xuất Hóa Đơn hay không</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Những phần trên có thể trao đổi với chị Hiền ACC để được hướng dẫn</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:''Times New Roman'',serif;color:#ff0000;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Lưu ý : Memo “Lũy Kế” tự động , hướng&nbsp; dẫn NH chỉ thao tác bấm 1 lần</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Tặng món</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn đúng món -- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Tặng món MKT</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> -- &gt; chọn “.....................”&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: …………………………….</span></p><p dir="ltr" style' AS nvarchar(max)) + CAST(N'="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã Món Tặng : …………………………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Internal Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “.....................”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: ………………….</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#0b5394;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">TGS discount campaign</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">TGS discount campaign</span><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">--' AS nvarchar(max)) + CAST(N' &gt; chọn “Coupon”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: …………………………….</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Đóng Giao dịch -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher - Internal</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> -- &gt; chọn “voucher”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Đóng Giao dịch -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher - External</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “voucher”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr' AS nvarchar(max)) + CAST(N'" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Promotion&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Promotion</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> -- &gt; chọn “...............”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-style: normal; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;"><span style="background-color: rgb(255, 255, 0);"><b>Promotion áp dụng cho món
</b></span></span><span style="background-color: transparent; font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">Chọn Món Ăn-- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="background-color: transparent; font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-weight: 700; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">Promotion</span><span style="background-color: transparent; font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-variant: normal; vertical-align: baseline; white-space: pre-wrap;"> -- &gt; chọn “...............”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p dir="ltr" style="line-height:1.38;margi' AS nvarchar(max)) + CAST(N'n-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">GRO Discount Campaign</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">GRO Discount Campaign </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “...............”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Giảm giá ngân ngân hàng</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền --&gt; Giảm giá&nbsp; --&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Giảm giá ngân ngân hàng</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-col' AS nvarchar(max)) + CAST(N'or:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “...............”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Công nợ</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Đóng giao dịch -&gt; Công nợ -&gt; chọn </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">“VIETLIFE”</span></p><p style="margin: 0 0 10px 0;"></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-&gt; quẹt thẻ quản lý -&gt; nhập tên người gửi hợp đông -&gt; xác nhận</span></p><div bis_skin_checked="1"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></div>
</div>' AS nvarchar(max))),
        (4, N'memo_round_robin_excluded', N'[]'),
        (5, N'memo_rotation_state', N'{"prefix": "A", "round_num": 2, "member_idx": 1, "last_ma_tua": "A0002.01", "last_user": "duy.ngo", "updated_at": "2026-09-28 12:10:05"}');
    SET IDENTITY_INSERT [dbo].[MEMO_TEMPLATE_CONFIG] OFF;
    PRINT N'Inserted default data for [dbo].[MEMO_TEMPLATE_CONFIG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[MEMO_TEMPLATE_BRANDS] (45 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[MEMO_TEMPLATE_BRANDS])
BEGIN
    SET IDENTITY_INSERT [dbo].[MEMO_TEMPLATE_BRANDS] ON;
    INSERT INTO [dbo].[MEMO_TEMPLATE_BRANDS] ([id], [brand_name], [cc_emails], [active]) VALUES
        (1, N'Ashima', N'trang.hoangminh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (2, N'Ashima Forest', N'trang.hoangminh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (3, N'Bập Bùng', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (4, N'Blue Bay', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (5, N'Càng Đỏ', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (6, N'Catering', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (7, N'Chả cá Vạn Vạn', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (8, N'Chay', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (9, N'Chibo', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (10, N'Chixmax', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (11, N'Cloud Pot', N'loc.tt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (12, N'Crystal Jade', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (13, N'Dao Niu Guo', N'tram.nn@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (14, N'Flychef', N'linh.nk@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (15, N'Gogi House', N'huong.nguyenngoc@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (16, N'Hàng Cuốn', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (17, N'Happy Bull', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (18, N'Hutong', N'tram.nn@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (19, N'iSushi', N'loc.tt@ggg.com.vn;nhi.letuyet@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (20, N'Kichi Kichi', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (21, N'K-Pub', N'hau.nguyen@ggg.com.vn;huong.nguyenngoc@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hau.nguyen@ggg.com.vn;huong.nguyenngoc@ggg.com.vn', 1),
        (22, N'Ktop', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (23, N'Lách Ca Lách Cách', N'anh.nguyen@ggg.com.vn;huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (24, N'Lách Ta Lách Tách', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (25, N'Mama''s Bakery', N'phuong.tq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (26, N'Man Tang Guo', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (27, N'Manwah', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (28, N'NgonYa', N'tram.nn@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (29, N'Daruma', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (30, N'Phở Inn', N'Hang.nmt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (31, N'Phở Inn China', N'Hang.nmt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (32, N'Pizza 360', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (33, N'Sakura Yakiniku', N'nhi.hq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (34, N'Shogun', N'anh.nguyen@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (35, N'Sumo Yakiniku', N'huong.nguyenngoc@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (36, N'SushiX', N'loc.tt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (37, N'The Coffee House', N'Trang.tt@ggg.com.vn;tuan.ln1@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (38, N'Union Pizza', N'Thu.nh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (39, N'Universal Coffee', N'phuong.tq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (40, N'Universal Tea', N'phuong.tq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (41, N'Vuvuzela', N'tuan.ln1@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (42, N'Woomaster', N'Thu.nh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (43, N'Wow!Yakiniku', N'Thu.nh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (44, N'Yu Tang', N'tuan.ln1@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
        (45, N'Bò vui', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1);
    SET IDENTITY_INSERT [dbo].[MEMO_TEMPLATE_BRANDS] OFF;
    PRINT N'Inserted default data for [dbo].[MEMO_TEMPLATE_BRANDS] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 4: CHECKLIST SETUP NHÀ HÀNG MỚI
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[LIST_SETUP_NH_NEW] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[LIST_SETUP_NH_NEW])
BEGIN
    SET IDENTITY_INSERT [dbo].[LIST_SETUP_NH_NEW] ON;
    INSERT INTO [dbo].[LIST_SETUP_NH_NEW] ([id], [TEN_NH], [NGAY_DUKIEN_KHAITRUONG], [IT_PHUTRACH], [AM_PHUTRACH], [NOTE_THEM], [TRANGTHAI], [NGAY_INSERT], [NGAY_UPDATE], [ACTIVE], [ReviewStatus], [ReviewNote], [ReviewedBy], [ReviewedAt], [BRAND]) VALUES
        (1, N'Mala Gang Nguyễn Văn Trỗi', '2025-02-20 00:00:00', N'Thịnh', N'Hai, Pham Van ( HCM | OPS ) <hai.pham@ggg.com.vn>', N'Nhà hàng không có POS 12', N'Đã Hoàn Thành', '2025-02-06 14:36:43', '2026-06-19 09:39:27', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (2, N'Hutong Đề Thám Q1', '2000-02-20 00:00:00', N'Thịnh', N'Chau, Tran Ai ( HCM | OPS ) <chau.tran@ggg.com.vn>', N'2000 - chưa có ngày', N'Đã Hoàn Thành', '2025-02-06 14:38:41', '2026-06-21 18:42:51', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (3, N'CloudPot ViVo City Q7', '2000-02-20 00:00:00', N'Duy', N'Huong, Huynh Thi Xuan ( HCM | OPS ) <huong.huynh@ggg.com.vn>', N'2000 - là chưa có ngày dự kiến', N'Đã Hoàn Thành', '2025-02-06 14:39:17', '2026-06-19 09:39:26', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (4, N'IR Pasteur Q1', '2000-01-01 00:00:00', N'Thức', N'Gam, Bui Hong ( HCM | OPS ) <gam.bui@ggg.com.vn>', N'', N'Đã Hoàn Thành', '2025-02-06 14:40:42', '2026-06-21 18:42:54', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (5, N'Woomaster Lê Quý Đôn (convert từ Shogun Lê Quý Đôn đã đóng cửa)', '2025-02-20 00:00:00', N'Hùng', N'BU Tô Hải Giang', N'Đã xong', N'Đã Hoàn Thành', '2025-02-20 10:19:12', '2026-06-19 09:39:27', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (6, N'Kichi Kichi KNG MALL VT', '2025-04-18 00:00:00', N'Trầm', N'BU Võ Hoàng Dũng', N'FW: THÔNG BÁO PLANT NH MỚI KHU VỰC SBU_ KICHI KICHI KNG MALL VŨNG TÀU', N'Đã Hoàn Thành', '2025-03-03 14:59:35', '2026-06-19 09:39:26', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (7, N'Hàng Cuốn Phan Xích Long', '2025-04-30 00:00:00', N'Thịnh', N'Hy, Bui Van ( HCM | OPS ) <hy.bui@ggg.com.vn>', N'Profit Center	30HC4850
Cost Center	30HC485001
', N'Đã Hoàn Thành', '2025-04-09 15:45:59', '2026-06-21 18:42:58', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (8, N'Cloudpot Vincom Thảo Điền', '2025-04-30 00:00:00', N'Hùng', N'Huỳnh Thị Xuân Hương', N'Cost Center: 30CD475501
Profit Center: 30CD4755
', N'Đã Hoàn Thành', '2025-04-11 13:36:54', '2026-06-21 18:42:59', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (9, N'Hàng Cuốn PC COOP Sư Vạn Hạnh', '1999-01-01 00:00:00', N'Trầm', N'', N'', N'Đã Hoàn Thành', '2025-04-11 14:07:59', '2026-06-19 09:39:26', 1, NULL, NULL, NULL, NULL, N'GGG'),
        (10, N'Happy Bull Ariyana Khánh Hòa', '1999-01-01 00:00:00', N'Duy', N'', N'', N'Đã Hoàn Thành', '2025-04-11 14:09:41', '2026-06-22 21:22:39', 1, NULL, NULL, NULL, NULL, N'GGG');
    SET IDENTITY_INSERT [dbo].[LIST_SETUP_NH_NEW] OFF;
    PRINT N'Inserted default data for [dbo].[LIST_SETUP_NH_NEW] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[CHECKLIST_SETUP_NH_NEW] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[CHECKLIST_SETUP_NH_NEW])
BEGIN
    SET IDENTITY_INSERT [dbo].[CHECKLIST_SETUP_NH_NEW] ON;
    INSERT INTO [dbo].[CHECKLIST_SETUP_NH_NEW] ([id], [NOIDUNG], [NGAY_INSERT], [NGAY_UPDATE], [GHICHU], [NHOM], [STT], [ACTIVE]) VALUES
        (1, N'Login phần mềm RK7-Manager và bắt đầu check/cấu hình.', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 1, 1),
        (2, N'Cài đặt "Các Máy POS Và Thiết Bị"', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 2, 1),
        (3, N'Tạo nhà hàng mới theo các thiết bị sau: (Dcorp sẽ tạo khi có mã RK7)
-MID
-Máy TN
-Máy Order(nếu có pos phụ, không có không cần tạo)', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 3, 1),
        (4, N'Điền các tham số cho MID, TN, ORDER - Đặt tên giống tên chuẩn các nhà hàng khác
-Ví dụ nhà hàng mới là cloudpot giga thì đặt tên là MID = CDHCM761-MID, TN = CDHCM781-TN
-Profitcenter
-SAPCODE
-GGGRCO
-Tên NH', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 4, 1),
        (5, N'Vào thiết bị máy TN
Thêm các máy in trong phần CÁC MÁY IN, đặt tên và gán module đúng theo từng máy.
Coppy hoặc tạo theo đúng chuẩn in đã chuẩn hóa trước đó
Ví dụ: Cloudpot máy in thịt là .52 thì tạo module máy in TM200#2 
gán Printer Address 10.9.120.52 ( máy in Thịt của Cloudpot Gigamall, tùy theo IP của từng nhà hàng do team Helpdesk gửi)', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 5, 1),
        (6, N'Cài đặt ""Sơ Đồ Dịch Vụ"" tại RK7-manager
- Tạo sơ đồ dịch vụ ứng với nhà hàng mới
- Coppy/hoặc tạo dịch vụ in đúng theo chuẩn hóa brand đang chạy
- Gán máy in cho từng dịch vụ ( VD: dịch vụ IN Thịt -> gán với máy in .52)', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 6, 1),
        (7, N'Kéo dịch vụ in vào tham số -> "Sử dụng sơ đồ dịch vụ in" -> Gán dịch vụ in vào nhà hàng mới', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 7, 1),
        (8, N'Setup sơ đồ bàn tại Thiết lập tham số -> Sơ đồ bàn và buồng. (Setup theo sơ đồ bàn Ops gửi)', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 8, 1),
        (9, N'Tạo nhân viên mới -> ""Nhân Viên"" -> Tạo nhân viên theo rule Quản lý, Trợ lý, Giám Sát, Thu Ngân, Phục vụ -> Gán mã thẻ POS cho NH theo thông tin Ops gửi, hoặc có thể gán trước mã và gửi cho NH luôn. 
Sau khi tạo đồng bộ luôn tham số GPOS để hệ thống sync luôn tài khoản CO/SO', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 9, 1),
        (10, N'Tạo tài khoản RK7-Report cho nhà hàng tại "Nhân Viên" trên RK7', '2024-12-20 14:11:31', NULL, NULL, N'RK7-MANAGER', 10, 1);
    SET IDENTITY_INSERT [dbo].[CHECKLIST_SETUP_NH_NEW] OFF;
    PRINT N'Inserted default data for [dbo].[CHECKLIST_SETUP_NH_NEW] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL])
BEGIN
    SET IDENTITY_INSERT [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] ON;
    INSERT INTO [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] ([id], [ID_NH_NEW], [STT], [NOIDUNG], [NHOM], [NGAY_INSERT], [GHICHU], [HOANTHANH], [NGAY_HOANTHANH], [USER_HOANTHANH], [ACTIVE]) VALUES
        (1, 1, 1, N'Login phần mềm RK7-Manager và bắt đầu check/cấu hình.', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:07:53', N'thinh.le', 0),
        (2, 1, 2, N'Cài đặt "Các Máy POS Và Thiết Bị"', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:09:10', N'thinh.le', 0),
        (3, 1, 3, N'Tạo nhà hàng mới theo các thiết bị sau: (Dcorp sẽ tạo khi có mã RK7)
-MID
-Máy TN
-Máy Order(nếu có pos phụ, không có không cần tạo)', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:07:55', N'thinh.le', 0),
        (4, 1, 4, N'Điền các tham số cho MID, TN, ORDER - Đặt tên giống tên chuẩn các nhà hàng khác
-Ví dụ nhà hàng mới là cloudpot giga thì đặt tên là MID = CDHCM761-MID, TN = CDHCM781-TN
-Profitcenter
-SAPCODE
-GGGRCO
-Tên NH', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:09:10', N'thinh.le', 0),
        (5, 1, 5, N'Vào thiết bị máy TN
Thêm các máy in trong phần CÁC MÁY IN, đặt tên và gán module đúng theo từng máy.
Coppy hoặc tạo theo đúng chuẩn in đã chuẩn hóa trước đó
Ví dụ: Cloudpot máy in thịt là .52 thì tạo module máy in TM200#2 
gán Printer Address 10.9.120.52 ( máy in Thịt của Cloudpot Gigamall, tùy theo IP của từng nhà hàng do team Helpdesk gửi)', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:07:59', N'thinh.le', 0),
        (6, 1, 6, N'Cài đặt ""Sơ Đồ Dịch Vụ"" tại RK7-manager
- Tạo sơ đồ dịch vụ ứng với nhà hàng mới
- Coppy/hoặc tạo dịch vụ in đúng theo chuẩn hóa brand đang chạy
- Gán máy in cho từng dịch vụ ( VD: dịch vụ IN Thịt -> gán với máy in .52)', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:07:59', N'thinh.le', 0),
        (7, 1, 7, N'Kéo dịch vụ in vào tham số -> "Sử dụng sơ đồ dịch vụ in" -> Gán dịch vụ in vào nhà hàng mới', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:08:00', N'thinh.le', 0),
        (8, 1, 8, N'Setup sơ đồ bàn tại Thiết lập tham số -> Sơ đồ bàn và buồng. (Setup theo sơ đồ bàn Ops gửi)', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:08:01', N'thinh.le', 0),
        (9, 1, 9, N'Tạo nhân viên mới -> ""Nhân Viên"" -> Tạo nhân viên theo rule Quản lý, Trợ lý, Giám Sát, Thu Ngân, Phục vụ -> Gán mã thẻ POS cho NH theo thông tin Ops gửi, hoặc có thể gán trước mã và gửi cho NH luôn. 
Sau khi tạo đồng bộ luôn tham số GPOS để hệ thống sync luôn tài khoản CO/SO', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:08:02', N'thinh.le', 0),
        (10, 1, 10, N'Tạo tài khoản RK7-Report cho nhà hàng tại "Nhân Viên" trên RK7', N'RK7-MANAGER', NULL, N'', NULL, '2025-03-20 13:09:10', N'thinh.le', 0);
    SET IDENTITY_INSERT [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] OFF;
    PRINT N'Inserted default data for [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 5: QUẢN LÝ TÀI SẢN & THIẾT BỊ PIM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[PIM] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[PIM])
BEGIN
    SET IDENTITY_INSERT [dbo].[PIM] ON;
    INSERT INTO [dbo].[PIM] ([id], [id_yeu_cau], [chuoi], [ten_menu], [mo_ta], [thoi_gian_thuc_hien], [link_yeu_cau], [ngay_insert], [trang_thai_thuc_hien], [user_thuc_hien], [user_hoan_thanh], [user_update], [thoi_gian_hoan_thanh], [thoi_gian_update], [so], [gui_mail]) VALUES
        (1, N'11753', N'LC - Lách Ca Lách Cách', N'Lách Ca Lách Cách_MN (V28.0)', N'Cài món mới', '2026-08-27 09:05:47', N'https://pim.ggg.com.vn/menu-detail-update-lto/11753/', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Quyên', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (2, N'11847', N'DN - Dao Niu Guo', N'Dao Niu Guo_MN (V21.0)', N'TRIỂN KHAI CÁC BƯỚC TIẾP CHO BST NỘI TẠNG - LTO - HCM- LOTTE Q11', '2026-09-15 14:54:38', N'https://pim.ggg.com.vn/menu-detail-update-lto/11847/', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Hùng', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (3, N'11849', N'HT - Hutong', N'Hutong_MN (V37.0)', N'RE: HT_Listing Sốt thái chanh đào & Lườn cá ngừ clear tồn', '2026-09-15 15:02:06', N'https://pim.ggg.com.vn/menu-detail-update-lto/11849/', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Duy', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (4, N'11857', N'SM - Sumogoya', N'Sumogoya_MN_SBU (V23.0)', N'Cài vé extra 99k', '2026-09-16 10:39:59', N'https://pim.ggg.com.vn/menu-detail-update-lto/11857/', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Thức', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (5, N'11858', N'CJ - Crystal Jade', N'Crystal Jade_MN (V35.0)', N'Cài 4 set mới', '2026-09-16 11:03:01', N'https://pim.ggg.com.vn/menu-detail-update-lto/11858/', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Trầm', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (6, N'16508', N'SS', N'MN_SS_Chỉnh BOM món', N'MN_SS_Chỉnh BOM món', '2026-02-24 10:38:48', N'https://pim.ggg.com.vn/sell-dish-set-action/16508', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Quyên', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (7, N'16789', N'GG', N'MN_GG thay đổi món trong combo', N'MN_GG thay đổi món trong combo', '2026-03-19 16:21:46', N'https://pim.ggg.com.vn/sell-dish-set-action/16789', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Hùng', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (8, N'16876', N'VX', N'MN_VX_Chỉnh BOM món', N'MN_VX_Chỉnh BOM món', '2026-03-25 14:41:27', N'https://pim.ggg.com.vn/sell-dish-set-action/16876', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Duy', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (9, N'18958', N'WY', N'MN_NEW STORE OPENING - NHÀ HÀNG WOW YAKINIKU 5162', N'MN_NEW STORE OPENING - NHÀ HÀNG WOW YAKINIKU 5162', '2026-08-24 17:52:33', N'https://pim.ggg.com.vn/sell-dish-set-action/18958', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Thức', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành'),
        (10, N'18960', N'CD', N'MN _KHAI BÁO CD VINCOM AN GIANG 5099', N'MN _KHAI BÁO CD VINCOM AN GIANG 5099', '2026-09-04 22:16:24', N'https://pim.ggg.com.vn/sell-dish-set-action/18960', '2026-09-17 14:18:46', N'chưa hoàn thành', N'Trầm', NULL, NULL, NULL, NULL, N'chưa hoàn thành', N'chưa hoàn thành');
    SET IDENTITY_INSERT [dbo].[PIM] OFF;
    PRINT N'Inserted default data for [dbo].[PIM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[PIM_CONFIG] (1 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[PIM_CONFIG])
BEGIN
    SET IDENTITY_INSERT [dbo].[PIM_CONFIG] ON;
    INSERT INTO [dbo].[PIM_CONFIG] ([id], [sso_username], [sso_password], [ngay_cap_nhat], [user_cap_nhat]) VALUES
        (1, N'dung.nguyenanh@ggg.com.vn', N'Nguyetthu28071995@@', '2026-09-17 14:17:33', N'system');
    SET IDENTITY_INSERT [dbo].[PIM_CONFIG] OFF;
    PRINT N'Inserted default data for [dbo].[PIM_CONFIG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[PIM_LOG] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[PIM_LOG])
BEGIN
    SET IDENTITY_INSERT [dbo].[PIM_LOG] ON;
    INSERT INTO [dbo].[PIM_LOG] ([id], [id_yeu_cau], [hanh_dong], [noi_dung], [user_thuc_hien], [thoi_gian]) VALUES
        (1, N'11753', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu menu | Phân công xoay vòng cho Quyên', N'Hệ thống', '2026-09-17 14:18:46'),
        (2, N'11847', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu menu | Phân công xoay vòng cho Hùng', N'Hệ thống', '2026-09-17 14:18:46'),
        (3, N'11849', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu menu | Phân công xoay vòng cho Duy', N'Hệ thống', '2026-09-17 14:18:46'),
        (4, N'11857', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu menu | Phân công xoay vòng cho Thức', N'Hệ thống', '2026-09-17 14:18:46'),
        (5, N'11858', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu menu | Phân công xoay vòng cho Trầm', N'Hệ thống', '2026-09-17 14:18:46'),
        (6, N'16508', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu món bán | Phân công xoay vòng cho Quyên', N'Hệ thống', '2026-09-17 14:18:46'),
        (7, N'16789', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu món bán | Phân công xoay vòng cho Hùng', N'Hệ thống', '2026-09-17 14:18:46'),
        (8, N'16876', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu món bán | Phân công xoay vòng cho Duy', N'Hệ thống', '2026-09-17 14:18:46'),
        (9, N'18958', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu món bán | Phân công xoay vòng cho Thức', N'Hệ thống', '2026-09-17 14:18:46'),
        (10, N'18960', N'Tự động phân công', N'Nguồn: Quản lý yêu cầu món bán | Phân công xoay vòng cho Trầm', N'Hệ thống', '2026-09-17 14:18:46');
    SET IDENTITY_INSERT [dbo].[PIM_LOG] OFF;
    PRINT N'Inserted default data for [dbo].[PIM_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[PIM_SCHEDULE] (1 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[PIM_SCHEDULE])
BEGIN
    SET IDENTITY_INSERT [dbo].[PIM_SCHEDULE] ON;
    INSERT INTO [dbo].[PIM_SCHEDULE] ([id], [time_1], [time_2], [time_3], [is_active], [last_run], [last_status], [ngay_cap_nhat], [user_cap_nhat]) VALUES
        (1, N'03:00', N'12:00', N'16:30', 1, '2026-10-06 03:00:10', N'Thành công lúc 03:00 (Quét: 11 | Mới: 0 | Cập nhật: 11)', '2026-09-17 14:17:33', N'system');
    SET IDENTITY_INSERT [dbo].[PIM_SCHEDULE] OFF;
    PRINT N'Inserted default data for [dbo].[PIM_SCHEDULE] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[PIM_USER_THUCHIEN] (5 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[PIM_USER_THUCHIEN])
BEGIN
    SET IDENTITY_INSERT [dbo].[PIM_USER_THUCHIEN] ON;
    INSERT INTO [dbo].[PIM_USER_THUCHIEN] ([id], [ten_user], [ho_ten], [email], [thu_tu], [active], [ngay_tao]) VALUES
        (1, N'Quyên', N'Tô Thị Quyên', N'quyen.tt@ggg.com.vn', 1, 1, '2026-09-17 14:17:33'),
        (2, N'Hùng', N'Phạm Trần Mạnh Hùng', N'hung.phamtran@ggg.com.vn', 2, 1, '2026-09-17 14:17:33'),
        (3, N'Duy', N'Ngô Nhựt Duy', N'duy.ngo@ggg.com.vn', 3, 1, '2026-09-17 14:17:33'),
        (4, N'Thức', N'Nguyễn Thức', N'thuc.nguyen@ggg.com.vn', 4, 1, '2026-09-17 14:17:33'),
        (5, N'Trầm', N'Nguyễn Vi Trầm', N'tram.nv@ggg.com.vn', 5, 1, '2026-09-17 14:17:33');
    SET IDENTITY_INSERT [dbo].[PIM_USER_THUCHIEN] OFF;
    PRINT N'Inserted default data for [dbo].[PIM_USER_THUCHIEN] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 6: QUẢN LÝ DỰ ÁN & TIẾN ĐỘ THÀNH VIÊN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[ALLAPP_PM] (20 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[ALLAPP_PM])
BEGIN
    SET IDENTITY_INSERT [dbo].[ALLAPP_PM] ON;
    INSERT INTO [dbo].[ALLAPP_PM] ([id], [project_name], [pm_project], [ngay_trienkhai], [ngay_update], [note_them], [active]) VALUES
        (1, N'B2C (Payment Hub, eInvoice, Evoucher)', N'Nguyễn Thị Thu Quỳnh / 0374484465', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (2, N'B2C (TGS, CLM)', N'Nguyễn Thị Thu Quỳnh / 0374484465', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (3, N'B2C (Booking, Ecom, G-Deli)', N'Trần Văn Quang / 0983037537', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (4, N'CO/SO, QR Code Order, KDS, Kiosk', N'Nguyễn Duy Tuấn/ 0375310277', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (5, N'Ghero', N'Nguyễn Thị Hạnh / 098 222 2365', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (6, N'Gchecklist', N'Nguyễn Thị Duyên / 0988940795', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (7, N'SAP', N'Nguyễn Thị Trang/ 09447779 80', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (8, N'PO Portal', N'Phạm Văn Đáp/ 0948101019', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (9, N'GStars', N'Nguyễn Thị Hạnh / 098 222 2365', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (10, N'DMP', N'Nguyễn Văn Giáp/0986500380', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (11, N'SSO', N'Phạm Văn Đáp/ 0948101019', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (12, N'GRMS', N'Nguyễn Thúy Hồng/ 085 300 6181', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (13, N'IHRP', N'Nguyễn Thị Duyên / 0988940795', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (14, N'GPMS', N'Nguyễn Thị Mai Hương/0983160584
huong.ntm@ggg.com.vn', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (15, N'Ebidding', N'Phạm Văn Đáp/ 0948101019
dap.pv@ggg.com.vn
thuoc.nguyen@ggg.com.vn', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (16, N'RK', N'Nguyễn Duy Tuấn/ 0375310277', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (17, N'CSM', N'Nguyễn Duy Tuấn/ 0375310277', '2026-06-27 12:13:28', '2026-06-27 21:52:15', NULL, 1),
        (18, N'TEST_APP_1789700242', N'Updated Tester / 0911111111', '2026-09-18 09:57:22', '2026-09-18 09:57:22', N'Automated test note', 0),
        (19, N'TEST_APP_1789701038', N'Updated Tester / 0911111111', '2026-09-18 10:10:38', '2026-09-18 10:10:38', N'Automated test note', 0),
        (20, N'TEST_APP_1789727516', N'Updated Tester / 0911111111', '2026-09-18 17:31:56', '2026-09-18 17:31:56', N'Automated test note', 0);
    SET IDENTITY_INSERT [dbo].[ALLAPP_PM] OFF;
    PRINT N'Inserted default data for [dbo].[ALLAPP_PM] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 7: GHI NHẬN SỰ VỤ, SỰ CỐ & SAI PHẠM IT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[GHINHAN_SUVU] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[GHINHAN_SUVU])
BEGIN
    SET IDENTITY_INSERT [dbo].[GHINHAN_SUVU] ON;
    INSERT INTO [dbo].[GHINHAN_SUVU] ([id], [APPNAME], [NOIDUNG], [TRANGTHAI], [DATE_INSERT], [DATE_LOI], [USER_INSERT], [ACTIVE], [IS_PRIVATE], [RESTAURANT_ID], [RESTAURANT_NAME], [SAP_CODE], [RK7_CODE], [IP_ADDRESS], [ASSIGN_TYPE], [ASSIGNED_TO], [ASSIGNED_NAME], [PROGRESS_NOTES], [IMAGES], [FILES], [RESOLVED_AT], [RESOLVED_BY], [DATE_UPDATE], [USER_UPDATE]) VALUES
        (1, NULL, N'Lỗi trang doitacdoanhnghiep , phần chi tiêu nội bộ không thể truy cập,  báo lỗi 500. từ 17h00', 1, '2026-07-04 19:43:46', '2026-07-04 00:00:00', N'dung.nguyenanh', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (2, NULL, N'Nhiều trường hợp doitacdoanhnghiep phần thẻ chi tiêu nội bộ không sinh hạn mức tháng/quý mới, dẫn tới nhiều trường hợp phải check và xử lý vận hành khó
Link ticket : https://gpms.ggg.com.vn/gticket/work-list/detail?id=1673856', 1, '2026-07-05 08:26:14', '2026-07-01 00:00:00', N'dung.nguyenanh', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (3, NULL, N'Phía IT ghi nhận nhiều trường hợp combo/ món con không cập nhật thời gian chế biến món dù IT đã cập nhật trên RK7 và có đồng bộ từ RK7 về Gmonitor , từ Gmonitor xuống NH. NH đồng bộ KDS vẫn không cập nhật

Sau khi kiểm tra nhiều lần, IT đã vào DB của 3 NH để check thì ghi nhận thời gian chế biến món giữ nguyên. IT phải chỉnh tay như hình bên dưới. Vậy anh vui lòng check lại giúp em nhé
Link ticket : https://gpms.ggg.com.vn/gticket/work-list/detail?id=1673043', 1, '2026-07-05 08:26:44', '2026-06-28 00:00:00', N'dung.nguyenanh', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (4, NULL, N'"- Lỗi QR Order không quét được (Gogi Hùng Vương Plazza)
- G-Monitor: đồng bộ tiến trình treo (BlueBay Aeon Bình Tân)"
Thức ghi Nhận', 1, '2026-07-20 13:55:02', '2026-07-19 00:00:00', N'dung.nguyenanh', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (5, NULL, N'Lỗi Đơn Deli do phía DF1 chuyển DB trong giờ vận hành, hotline gọi về nhiều. IT đã mail phía DF 1 xử lý ', 1, '2026-07-30 10:40:27', '2026-07-28 00:00:00', N'dung.nguyenanh', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (6, NULL, N'Lỗi KDS khi update Version GPOS KDS v1.0.44 ALL Nhà Hàng Miền Nam
', 1, '2026-08-05 11:57:31', '2026-08-05 00:00:00', N'dung.nguyenanh', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (7, NULL, N'Lỗi đóng bàn thanh toán online trên CO -> POS không tự kết bàn', 1, '2026-08-08 21:40:10', '2026-08-08 00:00:00', N'thuc.nguyen', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (8, NULL, N'Gogi House Aeon Mall Bình Dương: Lỗi double bàn trên SO/CO -> có báo group DF nhưng chưa được phản hồi', 1, '2026-08-16 17:06:10', '2026-08-16 00:00:00', N'thuc.nguyen', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (9, NULL, N'Memo 402600CJ014: Tặng món kèm điều kiện đặt tổng bill tối thiếu -> sẽ không giảm được -> dcorp báo là phải bỏ tích ràng buộc tổng bill (Crystal Jade Đà Nẵng)', 1, '2026-08-16 18:02:28', '2026-08-16 00:00:00', N'thuc.nguyen', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        (10, NULL, N'Thanh toán CO tới bước "Thanh toán ngay" thì bill hiển thị 0đ (Gogi House Nguyễn Kim Bình Dương)', 1, '2026-08-16 20:10:14', '2026-08-16 00:00:00', N'thuc.nguyen', 1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT [dbo].[GHINHAN_SUVU] OFF;
    PRINT N'Inserted default data for [dbo].[GHINHAN_SUVU] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[GHINHAN_SAIPHAM] (5 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[GHINHAN_SAIPHAM])
BEGIN
    SET IDENTITY_INSERT [dbo].[GHINHAN_SAIPHAM] ON;
    INSERT INTO [dbo].[GHINHAN_SAIPHAM] ([id], [NGUOI_SAIPHAMM], [NOIDUNG], [DATE_SAIPHAM], [GIAITRINH], [TRANGTHAI], [DATE_INSERT], [DATE_UPDATE], [USER_INSERT], [USER_UPDATE], [ACTIVE], [LOAI_SAIPHAM], [HO_TEN], [IMAGES], [FILES]) VALUES
        (1, N'duy.ngo', N'q', '2026-10-02 00:00:00', NULL, 0, '2026-10-02 09:21:04', '2026-10-02 09:21:04', N'dung.nguyenanh', N'dung.nguyenanh', 1, N'other', N'Ngô Nhật Duy', N'["/uploads/violations/04ad7c3792b9_screenshot_2026-10-02T02-20-46-607Z_1.png"]', NULL),
        (2, N'tram.nv', N'q', '2026-10-02 00:00:00', NULL, 0, '2026-10-02 09:21:04', '2026-10-02 09:21:04', N'dung.nguyenanh', N'dung.nguyenanh', 1, N'other', N'Nguyễn Vi Trầm', N'["/uploads/violations/04ad7c3792b9_screenshot_2026-10-02T02-20-46-607Z_1.png"]', NULL),
        (3, N'thuc.nguyen', N'q', '2026-10-02 00:00:00', NULL, 0, '2026-10-02 09:21:04', '2026-10-02 09:21:04', N'dung.nguyenanh', N'dung.nguyenanh', 1, N'other', N'Nguyễn Vũ Minh Thức', N'["/uploads/violations/04ad7c3792b9_screenshot_2026-10-02T02-20-46-607Z_1.png"]', NULL),
        (4, N'hung.phamtran', N'q', '2026-10-02 00:00:00', NULL, 0, '2026-10-02 09:21:04', '2026-10-02 09:21:04', N'dung.nguyenanh', N'dung.nguyenanh', 1, N'other', N'Phạm Trần Mạnh Hùng', N'["/uploads/violations/04ad7c3792b9_screenshot_2026-10-02T02-20-46-607Z_1.png"]', NULL),
        (5, N'quyen.tt', N'q', '2026-10-02 00:00:00', NULL, 0, '2026-10-02 09:21:04', '2026-10-02 09:21:04', N'dung.nguyenanh', N'dung.nguyenanh', 1, N'other', N'TÔ THỊ QUYÊN', N'["/uploads/violations/04ad7c3792b9_screenshot_2026-10-02T02-20-46-607Z_1.png"]', NULL);
    SET IDENTITY_INSERT [dbo].[GHINHAN_SAIPHAM] OFF;
    PRINT N'Inserted default data for [dbo].[GHINHAN_SAIPHAM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[NOTE_CASE_CHUA_XULYXONG] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[NOTE_CASE_CHUA_XULYXONG])
BEGIN
    SET IDENTITY_INSERT [dbo].[NOTE_CASE_CHUA_XULYXONG] ON;
    INSERT INTO [dbo].[NOTE_CASE_CHUA_XULYXONG] ([ID], [NOIDUNG], [TRANGTHAI], [DATE_INSERT], [DATE_UPDATE], [USER_INSERT], [USER_UPDATE], [ACTIVE]) VALUES
        (1, N'2 KDS .33 .34', 1, '2026-07-13 13:29:39', '2026-07-27 10:55:17', N'hung.phamtran', N'hung.phamtran', 1),
        (2, N'2 KDS 32 33', 1, '2026-07-13 13:30:13', NULL, N'hung.phamtran', NULL, 1),
        (3, N'2 KDS 32 , 34', 1, '2026-07-13 13:30:38', NULL, N'hung.phamtran', NULL, 1),
        (4, N'2 KDS 32, 33', 1, '2026-07-13 13:30:54', NULL, N'hung.phamtran', NULL, 1),
        (5, N'2 KDS 32 33', 1, '2026-07-13 13:31:11', NULL, N'hung.phamtran', NULL, 1),
        (6, N'2 KDS 32 , 33', 1, '2026-07-13 13:31:52', NULL, N'hung.phamtran', NULL, 1),
        (7, N'2 KDS 32, 33', 1, '2026-07-13 13:32:20', NULL, N'hung.phamtran', NULL, 1),
        (8, N'2 KDS 32,33', 1, '2026-07-13 13:32:33', NULL, N'hung.phamtran', NULL, 1),
        (9, N'3 KDS 32,33,34', 1, '2026-07-13 13:32:58', NULL, N'hung.phamtran', NULL, 1),
        (10, N'1 KDS THỊT', 1, '2026-07-13 13:49:28', NULL, N'hung.phamtran', NULL, 1);
    SET IDENTITY_INSERT [dbo].[NOTE_CASE_CHUA_XULYXONG] OFF;
    PRINT N'Inserted default data for [dbo].[NOTE_CASE_CHUA_XULYXONG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[NOTE_THEM] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[NOTE_THEM])
BEGIN
    SET IDENTITY_INSERT [dbo].[NOTE_THEM] ON;
    INSERT INTO [dbo].[NOTE_THEM] ([id], [lien_quan], [noidung], [trangthai], [active]) VALUES
        (1, N'CO_VER', N'v1.6.85', N'active', 1),
        (2, N'CO_DATE', N'14/08/2026', N'active', 1),
        (3, N'SO_VER', N'v2.4.102', N'active', 1),
        (4, N'SO_DATE', N'14/08/2026', N'active', 1),
        (5, N'KDS_VER', N'v1.4.47', N'active', 1),
        (6, N'KDS_DATE', N'14/08/2026', N'active', 1),
        (7, N'GPOS_VER', N'v2.4.151.1', N'active', 1),
        (8, N'GPOS_DATE', N'14/08/2026', N'active', 1),
        (9, N'GPOS_KDS_VER', N'v1.0.45.1', N'active', 1),
        (10, N'GPOS_KDS_DATE', N'14/08/2026', N'active', 1);
    SET IDENTITY_INSERT [dbo].[NOTE_THEM] OFF;
    PRINT N'Inserted default data for [dbo].[NOTE_THEM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[TRE_HAN] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[TRE_HAN])
BEGIN
    SET IDENTITY_INSERT [dbo].[TRE_HAN] ON;
    INSERT INTO [dbo].[TRE_HAN] ([ID], [PHANLOAI], [NOIDUNG], [USER_TREHAN], [NGAY_DEADLINE], [NGAY_HTTT], [GIAHAN], [LYDO_GIAHAN], [PHEDUYET_GIAHAN], [TRANGTHAI], [DATE_INSERT], [DATE_UPDATE], [USER_INSERT], [USER_UPDATE], [ACTIVE], [SOURCE_ID]) VALUES
        (4, N'MEMO', N'MEMO trễ hạn: [S&P] Gia hạn memo E-voucher (402400XX018)', N'duy.ngo', '2026-07-06 10:26:01', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-21 06:45:19', N'system', N'dung.nguyenanh', 0, 7035),
        (5, N'MEMO', N'MEMO trễ hạn: [S&P] Gia hạn memo E-voucher (402400XX018)', N'duy.ngo', '2026-07-06 10:26:11', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-21 06:45:25', N'system', N'dung.nguyenanh', 0, 7036),
        (84, N'PIM', N'Yêu cầu PIM trễ hạn: KK - Món mới / Menu mới (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11377/)', N'duy.ngo', '2026-07-17 08:49:05', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-22 10:33:13', N'system', N'dung.nguyenanh', 0, 267),
        (85, N'PIM', N'Yêu cầu PIM trễ hạn: GG - Món mới / Menu mới (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11369/)', N'hung.phamtran', '2026-07-20 09:16:03', '2026-07-20 20:21:36', NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-21 06:38:40', N'system', N'dung.nguyenanh', 0, 272),
        (86, N'PROJECT', N'Dự án trễ hạn: CHECK PHÂN LỚP IN', N'hung.phamtran', '2026-07-19 00:00:00', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-22 10:32:30', N'system', N'dung.nguyenanh', 0, 3),
        (87, N'PROJECT', N'Dự án trễ hạn: CHECK PHÂN LỚP IN', N'tram.nv', '2026-07-19 00:00:00', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-22 10:32:27', N'system', N'dung.nguyenanh', 0, 3),
        (88, N'PROJECT', N'Dự án trễ hạn: CHECK PHÂN LỚP IN', N'duy.ngo', '2026-07-19 00:00:00', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-22 10:32:23', N'system', N'dung.nguyenanh', 0, 3),
        (89, N'PROJECT', N'Dự án trễ hạn: CHECK PHÂN LỚP IN', N'thuc.nguyen', '2026-07-19 00:00:00', NULL, NULL, NULL, NULL, 5, '2026-07-21 06:19:53', '2026-07-22 10:32:20', N'system', N'dung.nguyenanh', 0, 3),
        (171, N'PIM', N'Yêu cầu PIM trễ hạn: ASM - Combo chỉnh sửa / Combo mới (Link: https://pim.ggg.com.vn/sell-dish-detail/18481)', N'duy.ngo', '2026-07-27 11:27:21', NULL, NULL, NULL, NULL, 0, '2026-07-27 11:49:21', '2026-07-30 11:51:56', N'system', N'system', 0, 286),
        (172, N'PIM', N'Yêu cầu PIM trễ hạn: ISS - Xóa món / Off giá (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11518/)', N'hung.phamtran', '2026-07-30 10:01:41', NULL, NULL, NULL, NULL, 0, '2026-07-30 10:06:14', '2026-08-04 11:56:22', N'system', N'system', 0, 291);
    SET IDENTITY_INSERT [dbo].[TRE_HAN] OFF;
    PRINT N'Inserted default data for [dbo].[TRE_HAN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[TICKET] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[TICKET])
BEGIN
    SET IDENTITY_INSERT [dbo].[TICKET] ON;
    INSERT INTO [dbo].[TICKET] ([id], [EMAIL], [NOIDUNG], [DATE_TIEPNHAN], [USER_SUPPORT], [TEAM], [DATE_INSERT], [DATE_UPDATE], [ACTIVE], [IT_UPDATE]) VALUES
        (4, N'HCM.GGH.AOM.KDV@GGG.COM.VN', N'RE: KHÔNG ĐĂNG NHẬP ĐƯỢC QUẢN LÝ TIP', '2023-03-02 09:06:23', N'hung.phamtran', N'IT APP HCM', NULL, '2023-03-13 08:41:11', 0, N'hung.phamtran'),
        (5, N'HCM.SM.SH.PAT@GGG.COM.VN', N'hỗ trợ sap', '2023-03-02 11:52:17', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-20 09:59:15', 0, N'duy.ngo'),
        (10, N'HCM.GGH.EMA.PVT@GGG.COM.VN', N'Cập nhật lại thông tin thẻ POS', '2023-03-13 08:53:55', N'hung.phamtran', N'IT APP HCM', NULL, '2023-03-14 17:27:02', 0, N'hung.phamtran'),
        (11, N'DNI.MW.BC.XLHN@GGG.COM.VN', N'Xóa đơn hàng trên PO Portal', '2023-03-13 09:56:49', N'hung.phamtran', N'IT APP HCM', NULL, '2023-03-14 17:26:59', 0, N'hung.phamtran'),
        (12, N'HCM.KK.AOM.KDV@GGG.COM.VN', N'hỗ trợ đăng nhập SAP', '2023-03-13 10:26:46', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-13 11:00:04', 0, N'duy.ngo'),
        (13, N'BDG.KP.AOM.DLBD@GGG.COM.VN', N'hỗ trợ xuất điều chuyển trên SAP', '2023-03-13 11:55:34', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-13 13:11:49', 0, N'duy.ngo'),
        (14, N'DNI.GGH.BC.XLHN@GGG.COM.VN', N'hỗ trợ hủy hàng SAP', '2023-03-13 14:09:27', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-21 11:27:14', 0, N'duy.ngo'),
        (15, N'DNG.KK.VCR.NQ@GGG.COM.VN', N'hỗ trợ trả hàng về xưởng', '2023-03-13 14:27:41', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-13 15:46:10', 0, N'duy.ngo'),
        (16, N'HCM.ISS.SH.CT@GGG.COM.VN', N'hỗ trợ đăng nhập ssc', '2023-03-13 15:34:00', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-13 15:45:47', 0, N'duy.ngo'),
        (17, N'HCM.KK.SH.LQD@GGG.COM.VN', N'ssc', '2023-03-13 16:29:17', N'duy.ngo', N'IT APP HCM', NULL, '2023-03-13 17:22:52', 0, N'duy.ngo');
    SET IDENTITY_INSERT [dbo].[TICKET] OFF;
    PRINT N'Inserted default data for [dbo].[TICKET] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 8: LỊCH TRỰC, NGHỈ PHÉP & BÁO CÁO DOANH THU
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[LICHTRUC_HOTLINE] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[LICHTRUC_HOTLINE])
BEGIN
    SET IDENTITY_INSERT [dbo].[LICHTRUC_HOTLINE] ON;
    INSERT INTO [dbo].[LICHTRUC_HOTLINE] ([id], [THANG], [NOIDUNG], [NGAY_INSERT], [USER_INSERT], [TEAM], [ACTIVE]) VALUES
        (32, N'3', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:48:41', N'dung.nguyenanh', N'APP', 1),
        (33, N'4', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:49:02', N'dung.nguyenanh', N'APP', 1),
        (34, N'5', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:49:20', N'dung.nguyenanh', N'APP', 1),
        (35, N'6', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:49:38', N'dung.nguyenanh', N'APP', 1),
        (36, N'7', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:49:56', N'dung.nguyenanh', N'APP', 1),
        (37, N'8', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:52:08', N'dung.nguyenanh', N'APP', 1),
        (38, N'9', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-05-22 10:52:24', N'dung.nguyenanh', N'APP', 1),
        (54, N'10', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-10-29 17:06:53', N'dung.nguyenanh', N'APP', 0),
        (55, N'11', N'<p><img src="[Hình ảnh mẫu]" /></p>
', '2024-10-29 17:07:23', N'dung.nguyenanh', N'APP', 1),
        (56, N'12', N'<p><img src="[Hình ảnh mẫu]" /></p>', '2026-09-18 17:31:52', N'admin', N'APP', 1);
    SET IDENTITY_INSERT [dbo].[LICHTRUC_HOTLINE] OFF;
    PRINT N'Inserted default data for [dbo].[LICHTRUC_HOTLINE] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[lich_truc] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[lich_truc])
BEGIN
    SET IDENTITY_INSERT [dbo].[lich_truc] ON;
    INSERT INTO [dbo].[lich_truc] ([id], [ngay], [is_holiday], [hotline_1], [hotline_2], [mail_sang_1], [mail_sang_2], [mail_chieu_1], [mail_chieu_2], [toi_chinh], [toi_phu], [weekend_ca1_chinh], [weekend_ca1_phu], [weekend_ca2_chinh], [weekend_ca2_phu], [created_at], [updated_at]) VALUES
        (1, '2026-07-01 00:00:00', 0, N'Hùng', N'Quyên', N'Duy', N'', N'Quyên', N'', N'Duy', N'Quyên', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (2, '2026-07-02 00:00:00', 0, N'Quyên', N'Thức', N'Hùng', N'', N'Thức', N'', N'Hùng', N'Thức', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (3, '2026-07-03 00:00:00', 0, N'Trầm', N'Duy', N'Thịnh', N'', N'Duy', N'', N'Thịnh', N'Duy', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (4, '2026-07-04 00:00:00', 0, N'', N'', N'', N'', N'', N'', N'', N'', N'Quyên', N'Thức', N'Thức', N'Quyên', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (5, '2026-07-05 00:00:00', 0, N'', N'', N'', N'', N'', N'', N'', N'', N'Thức', N'Quyên', N'Quyên', N'Thức', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (6, '2026-07-06 00:00:00', 0, N'Hùng', N'Trầm', N'Thịnh', N'', N'Duy', N'', N'Thịnh', N'Duy', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (7, '2026-07-07 00:00:00', 0, N'Thức', N'Quyên', N'Hùng', N'', N'Quyên', N'', N'Hùng', N'Quyên', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (8, '2026-07-08 00:00:00', 0, N'Trầm', N'Thịnh', N'Thức', N'', N'Thịnh', N'', N'Thức', N'Thịnh', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (9, '2026-07-09 00:00:00', 0, N'Duy', N'Hùng', N'Quyên', N'', N'Hùng', N'', N'Quyên', N'Hùng', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39'),
        (10, '2026-07-10 00:00:00', 0, N'Thịnh', N'Trầm', N'Duy', N'', N'Thức', N'', N'Duy', N'Thức', N'', N'', N'', N'', '2026-07-04 16:21:39', '2026-07-04 16:21:39');
    SET IDENTITY_INSERT [dbo].[lich_truc] OFF;
    PRINT N'Inserted default data for [dbo].[lich_truc] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[STAFF_LEAVE_TYPES] (6 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[STAFF_LEAVE_TYPES])
BEGIN
    SET IDENTITY_INSERT [dbo].[STAFF_LEAVE_TYPES] ON;
    INSERT INTO [dbo].[STAFF_LEAVE_TYPES] ([id], [CODE], [NAME], [COLOR], [SORT_ORDER], [IS_ACTIVE], [DATE_INSERT], [DATE_UPDATE], [USER_INSERT], [USER_UPDATE]) VALUES
        (1, N'annual_leave', N'Nghỉ phép cả ngày', N'#3B82F6', 1, 1, '2026-09-25 14:47:53', NULL, N'system', NULL),
        (2, N'half_day_morning', N'Nghỉ nửa ngày ca sáng', N'#8B5CF6', 2, 1, '2026-09-25 14:47:53', NULL, N'system', NULL),
        (3, N'half_day_afternoon', N'Nghỉ nửa ngày ca chiều', N'#A855F7', 3, 1, '2026-09-25 14:47:53', NULL, N'system', NULL),
        (4, N'early_leave', N'Xin về sớm', N'#F59E0B', 4, 1, '2026-09-25 14:47:53', NULL, N'system', NULL),
        (5, N'unpaid_leave', N'Nghỉ không lương', N'#EF4444', 5, 1, '2026-09-25 14:47:53', NULL, N'system', NULL),
        (6, N'other', N'Lý do khác', N'#6B7280', 6, 1, '2026-09-25 14:47:53', NULL, N'system', NULL);
    SET IDENTITY_INSERT [dbo].[STAFF_LEAVE_TYPES] OFF;
    PRINT N'Inserted default data for [dbo].[STAFF_LEAVE_TYPES] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[STAFF_LEAVE_LOGS] (1 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[STAFF_LEAVE_LOGS])
BEGIN
    SET IDENTITY_INSERT [dbo].[STAFF_LEAVE_LOGS] ON;
    INSERT INTO [dbo].[STAFF_LEAVE_LOGS] ([id], [USERNAME], [FULL_NAME], [LEAVE_TYPE], [START_TIME], [END_TIME], [REASON], [NOTE], [USER_INSERT], [DATE_INSERT], [ACTIVE]) VALUES
        (1, N'duy.ngo', N'Ngô Nhật Duy', N'annual_leave', '2026-09-17 08:30:00', '2026-09-17 17:30:00', N'aaaaaaa', N'', N'admin', '2026-09-17 19:54:53', 1);
    SET IDENTITY_INSERT [dbo].[STAFF_LEAVE_LOGS] OFF;
    PRINT N'Inserted default data for [dbo].[STAFF_LEAVE_LOGS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[BAOCAO_DANHGIA_SNAPSHOT] (5 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[BAOCAO_DANHGIA_SNAPSHOT])
BEGIN
    SET IDENTITY_INSERT [dbo].[BAOCAO_DANHGIA_SNAPSHOT] ON;
    INSERT INTO [dbo].[BAOCAO_DANHGIA_SNAPSHOT] ([id], [period_type], [period_value], [period_year], [user_id], [user_name], [nhiemvu_tre_chua_ht], [nhiemvu_chua_ht_chua_tre], [nhiemvu_ht_tre], [nhiemvu_ht_dung_han], [so_vi_pham], [vi_pham_details], [details_json], [score_kpi], [rank_badge], [date_locked]) VALUES
        (1, N'm', N'm7', 2026, N'duy.ngo', N'Ngô Nhựt Duy', 0, 1, 2, 3, 0, N'[]', N'[{"type": "PIM", "name": "KK - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11377/)", "deadline": "2026-07-17 08:49:05", "completed_date": "2026-07-22 10:36:10", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "SS - MN - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11413/)", "deadline": "2026-07-23 09:21:52", "completed_date": "2026-07-22 17:37:25", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "SX - PD ch\u1ec9 c\u1eadp nh\u1eadt l\u1ea1i d\u1eef li\u1ec7u m\u00f3n l\u00ean pim, nh\u1edd anh ch\u1ecb ph\u00ea duy\u1ec7t v\u00e0 \u0111\u00f3ng yc - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11456/)", "deadline": "2026-07-27 10:28:16", "completed_date": "2026-07-22 10:29:10", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "ASM - Combo ch\u1ec9nh s\u1eeda / Combo m\u1edbi (Link: https://pim.ggg.com.vn/sell-dish-detail/18481)", "deadline": "2026-07-27 11:27:21", "completed_date": "2026-07-28 08:48:17", "status": "Ho\u00e0n th\u00e0nh tr\u1ec5 h\u1ea1n"}, {"type": "PIM", "name": "KK - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11510/)", "deadline": "2026-07-30 10:08:29", "completed_date": "2026-07-30 10:50:40", "status": "Ho\u00e0n th\u00e0nh tr\u1ec5 h\u1ea1n"}, {"type": "PROJECT", "name": "Tri\u1ec3n Khai KDS \u0110\u1ee3t 3", "deadline": "2026-07-31 00:00:00", "completed_date": "", "status": "Ch\u01b0a ho\u00e0n th\u00e0nh ch\u01b0a tr\u1ec5"}]', 90.0, N'A', '2026-08-06 15:44:21'),
        (2, N'm', N'm7', 2026, N'hung.phamtran', N'Phạm Trần Mạnh Hùng', 0, 0, 1, 6, 0, N'[]', N'[{"type": "PIM", "name": "YT - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11365/)", "deadline": "2026-07-17 08:46:48", "completed_date": "2026-07-14 11:19:24", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "GG - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11369/)", "deadline": "2026-07-20 09:16:03", "completed_date": "2026-07-20 20:21:36", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "MW - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11385/)", "deadline": "2026-07-24 13:25:47", "completed_date": "2026-07-22 10:38:24", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "CloudPot_MN_SBU - - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11438)", "deadline": "2026-07-27 10:36:20", "completed_date": "2026-07-23 10:38:37", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "ISS - X\u00f3a m\u00f3n / Off gi\u00e1 (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11518/)", "deadline": "2026-07-30 10:01:41", "completed_date": "2026-08-03 15:57:30", "status": "Ho\u00e0n th\u00e0nh tr\u1ec5 h\u1ea1n"}, {"type": "PIM", "name": "ASM - Combo ch\u1ec9nh s\u1eeda / Combo m\u1edbi (Link: https://pim.ggg.com.vn/sell-dish-set-action/18481)", "deadline": "2026-07-30 10:20:32", "completed_date": "2026-07-30 10:02:35", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PROJECT", "name": "Tri\u1ec3n Khai KDS \u0110\u1ee3t 3", "deadline": "2026-07-31 00:00:00", "completed_date": "2026-08-04 16:28:07", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}]', 95.0, N'A', '2026-08-06 15:44:21'),
        (3, N'm', N'm7', 2026, N'thuc.nguyen', N'Nguyễn Vũ Minh Thức', 0, 1, 0, 6, 0, N'[]', N'[{"type": "PIM", "name": "CJ - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11342/)", "deadline": "2026-07-15 00:00:00", "completed_date": "2026-07-14 10:00:07", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "WY - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11360/)", "deadline": "2026-07-22 00:00:00", "completed_date": "2026-07-17 11:53:33", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "VX - PD ch\u1ec9 c\u1eadp nh\u1eadt l\u1ea1i d\u1eef li\u1ec7u m\u00f3n l\u00ean pim, nh\u1edd anh/ ch\u1ecb ph\u00ea duy\u1ec7t v\u00e0 \u0111\u00f3ng y\u00eau c\u1ea7u - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11425/)", "deadline": "2026-07-23 09:25:34", "completed_date": "2026-07-20 14:01:22", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "HT - PD ch\u1ec9 c\u1eadp nh\u1eadt l\u1ea1i d\u1eef li\u1ec7u l\u00ean pim, nh\u1edd anh ch\u1ecb ph\u00ea duy\u1ec7t v\u00e0 \u0111\u00f3ng y\u00eau c\u1ea7u - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11426)", "deadline": "2026-07-27 10:29:56", "completed_date": "2026-07-22 10:30:23", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "MW - Combo ch\u1ec9nh s\u1eeda / Combo m\u1edbi (Link: https://pim.ggg.com.vn/sell-dish-detail/18462)", "deadline": "2026-07-27 11:27:51", "completed_date": "2026-07-22 16:47:50", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "ISS - SBU - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11511/)", "deadline": "2026-07-30 10:10:22", "completed_date": "2026-07-29 09:28:29", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PROJECT", "name": "Tri\u1ec3n Khai KDS \u0110\u1ee3t 3", "deadline": "2026-07-31 00:00:00", "completed_date": "", "status": "Ch\u01b0a ho\u00e0n th\u00e0nh ch\u01b0a tr\u1ec5"}]', 100.0, N'A', '2026-08-06 15:44:21'),
        (4, N'm', N'm7', 2026, N'tram.nv', N'Nguyễn Vi Trầm', 0, 0, 0, 6, 0, N'[]', N'[{"type": "PIM", "name": "LCLC - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11391/)", "deadline": "2026-07-20 09:07:47", "completed_date": "2026-07-15 17:00:36", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "Wow!Yakiniku_MN-PD ch\u1ec9 c\u1eadp nh\u1eadt l\u1ea1i d\u1eef li\u1ec7u l\u00ean pim, nh\u1edd anh ch\u1ecb ph\u00ea duy\u1ec7t v\u00e0 \u0111\u00f3ng y\u00eau c\u1ea7u \u1ea1 - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11422/)", "deadline": "2026-07-23 09:29:24", "completed_date": "2026-07-20 10:44:25", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "MT - PD Ch\u1ec9 c\u1eadp nh\u1eadt l\u1ea1i d\u1eef li\u1ec7u m\u00f3n l\u00ean pim, nh\u1edd anh ch\u1ecb ph\u00ea duy\u1ec7t v\u00e0 \u0111\u00f3ng yc - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11448/)", "deadline": "2026-07-27 10:33:29", "completed_date": "2026-07-22 10:33:43", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "WY - \u0110\u1ed5i gi\u00e1 / \u0110\u1ed5i t\u00ean (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11468/)", "deadline": "2026-07-28 10:39:58", "completed_date": "2026-07-23 13:37:57", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "KP - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/sell-dish-set-action/18519)", "deadline": "2026-07-30 10:17:52", "completed_date": "2026-07-30 09:21:02", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PROJECT", "name": "Tri\u1ec3n Khai KDS \u0110\u1ee3t 3", "deadline": "2026-07-31 00:00:00", "completed_date": "2026-07-31 10:24:13", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}]', 100.0, N'A', '2026-08-06 15:44:21'),
        (5, N'm', N'm7', 2026, N'quyen.tt', N'TÔ THỊ QUYÊN', 0, 0, 0, 6, 0, N'[]', N'[{"type": "PIM", "name": "GG - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11372/)", "deadline": "2026-07-17 08:52:02", "completed_date": "2026-07-14 10:40:15", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "GG - MN - Combo ch\u1ec9nh s\u1eeda / Combo m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11414/)", "deadline": "2026-07-23 09:27:28", "completed_date": "2026-07-20 10:29:17", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "PD ch\u1ec9 c\u1eadp nh\u1eadt l\u1ea1i d\u1eef li\u1ec7u l\u00ean pim, nh\u1edd anh ch\u1ecb ph\u00ea duy\u1ec7t v\u00e0 \u0111\u00f3ng y\u00eau c\u1ea7u - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-approve-update-lto/11428/)", "deadline": "2026-07-27 10:32:00", "completed_date": "2026-07-22 10:32:14", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "BB - Combo ch\u1ec9nh s\u1eeda / Combo m\u1edbi (Link: https://pim.ggg.com.vn/sell-dish-detail/18470)", "deadline": "2026-07-27 11:28:15", "completed_date": "2026-07-24 00:22:08", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PIM", "name": "ASM - M\u00f3n m\u1edbi / Menu m\u1edbi (Link: https://pim.ggg.com.vn/menu-request-approve-master-price/11441/)", "deadline": "2026-07-30 10:15:07", "completed_date": "2026-07-27 17:46:23", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}, {"type": "PROJECT", "name": "Tri\u1ec3n Khai KDS \u0110\u1ee3t 3", "deadline": "2026-07-31 00:00:00", "completed_date": "2026-08-01 20:38:07", "status": "Ho\u00e0n th\u00e0nh \u0111\u00fang h\u1ea1n"}]', 100.0, N'A', '2026-08-06 15:44:21');
    SET IDENTITY_INSERT [dbo].[BAOCAO_DANHGIA_SNAPSHOT] OFF;
    PRINT N'Inserted default data for [dbo].[BAOCAO_DANHGIA_SNAPSHOT] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[THEODOI_PR_PO_DO] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[THEODOI_PR_PO_DO])
BEGIN
    SET IDENTITY_INSERT [dbo].[THEODOI_PR_PO_DO] ON;
    INSERT INTO [dbo].[THEODOI_PR_PO_DO] ([id], [LOAI], [SO], [NOIDUNG], [NGAY_THEM], [NGAY_INSERT], [NGAY_UPDATE], [TRANGTHAI], [GHICHU], [INSERT_TRANGTHAI], [STATUS_XOA]) VALUES
        (10, N'PR', N'1100007041', N'Manwah Gò Đậu Bình Dương - Order camera cho nhà hàng
', '2022-11-26 00:00:00', '2022-11-28 14:38:06', NULL, N'DONE', N'', N'N', NULL),
        (11, N'PR', N'1300020308', N'Gogi Nguyễn Kim Gia Lai - Chi phi thi công camera cho NH 
', '2022-11-27 00:00:00', '2022-11-28 14:39:12', NULL, N'DONE', N'', N'N', NULL),
        (12, N'PR', N'1200002135', N'Isushi VC Đồng Khởi - Chi phí thi công hệ thống IT  
', '2022-11-28 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL),
        (13, N'DO', N'', N'', '2022-11-28 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL),
        (14, N'PR', N'1300020305', N'Gogi VC Đồng Khởi - CP thi công camera ', '2022-11-28 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL),
        (15, N'PO', N'4100013815', N'Isushi VC Đồng Khởi - Thiết bị IT - FO
', '2022-11-28 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL),
        (16, N'PR', N'1100007039', N'Gogi Nguyễn Kim Gia Lai - Order camera cho nhà hàng
', '2022-11-28 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL),
        (17, N'PR', N'', N'', '2022-11-29 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL),
        (18, N'PR', N'1300019330', N'Kichi Nguyễn Trãi - Chi phí lắp đặt Wifi 
', '2022-11-30 00:00:00', NULL, NULL, N'DONE', N'PR nhà hàng tự làm', N'N', NULL),
        (19, N'PR', N'1100006994', N'Isushi VC Đồng Khởi - FO thiết bị IT 

', '2022-11-30 00:00:00', NULL, NULL, N'DONE', N'', N'N', NULL);
    SET IDENTITY_INSERT [dbo].[THEODOI_PR_PO_DO] OFF;
    PRINT N'Inserted default data for [dbo].[THEODOI_PR_PO_DO] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[SO_LIEU_CHECK_SALES_DAILY] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[SO_LIEU_CHECK_SALES_DAILY])
BEGIN
    SET IDENTITY_INSERT [dbo].[SO_LIEU_CHECK_SALES_DAILY] ON;
    INSERT INTO [dbo].[SO_LIEU_CHECK_SALES_DAILY] ([id], [DVCS], [TEN_NHAHANG], [TONGTIEN_NH], [TONGTIEN_SV], [SL_KHACH_NH], [SL_KHACH_SV], [NGAY_SALE], [ACTIVE], [NOTE], [TRANGTHAI], [IP_NHAHANG], [LAN1_KETNOI_NH], [THOIGIAN_LAY_SALE_LAN1], [THOIGIAN_LAY_SALE_LAN2], [CREATED_AT], [UPDATED_AT]) VALUES
        (1, N'4930', N'Happy Bull Nha Trang (0874)', NULL, N'16372440.0000', NULL, N'60', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (2, N'4071', N'Gogi House Cao Lanh - Dong Thap (0465)', NULL, N'29181138.0000', NULL, N'67', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (3, N'4349', N'Manwah Lotte Go Vap (0371)', NULL, N'79134605.0000', NULL, N'170', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (4, N'4031', N'Gogi House Vincom B Le Thanh Ton (081)', NULL, N'65456446.0000', NULL, N'148', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (5, N'4017', N'Gogi House Lotte Mart Can Tho (0129)', NULL, N'55088444.0000', NULL, N'149', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (6, N'4077', N'Gogi House Vincom Vinh Long (0486)', NULL, N'21126835.0000', NULL, N'48', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (7, N'4943', N'Man Tang Guo Nguyen Trai (0878)', NULL, N'37058610.0000', NULL, N'62', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (8, N'4570', N'Isushi Thiso Mall Mai Chi Tho (0624)', NULL, N'50760818.0000', NULL, N'95', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (9, N'4067', N'Gogi House Tran Hung Dao - PT (0405)', NULL, N'29671038.0000', NULL, N'72', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25'),
        (10, N'4281', N'Kichi-Kichi Nguyen Anh Thu 2 (0333)', NULL, N'29248347.0000', NULL, N'68', '2026-09-18 00:00:00', 1, N'Lấy từ Server RK7', N'DA_LAY_RK7', NULL, NULL, NULL, NULL, '2026-09-19 05:45:25', '2026-09-19 05:45:25');
    SET IDENTITY_INSERT [dbo].[SO_LIEU_CHECK_SALES_DAILY] OFF;
    PRINT N'Inserted default data for [dbo].[SO_LIEU_CHECK_SALES_DAILY] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[TOTAL_SALES_DAILY] (5 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[TOTAL_SALES_DAILY])
BEGIN
    SET IDENTITY_INSERT [dbo].[TOTAL_SALES_DAILY] ON;
    INSERT INTO [dbo].[TOTAL_SALES_DAILY] ([id], [NGAY], [TOTAL_SALE], [TOTAL_TC], [ACTIVE], [CREATED_AT]) VALUES
        (1, '2026-09-18 00:00:00', N'11576103835', N'28395', 1, '2026-09-19 05:45:25'),
        (2, '2026-09-19 00:00:00', N'20172091770', N'48890', 1, '2026-09-20 05:45:44'),
        (3, '2026-09-25 00:00:00', N'14606446164', N'35425', 1, '2026-09-26 05:45:34'),
        (4, '2026-10-01 00:00:00', N'9818545209', N'24458', 1, '2026-10-02 05:45:40'),
        (5, '2026-10-02 00:00:00', N'11835945669', N'29381', 1, '2026-10-03 05:45:36');
    SET IDENTITY_INSERT [dbo].[TOTAL_SALES_DAILY] OFF;
    PRINT N'Inserted default data for [dbo].[TOTAL_SALES_DAILY] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 9: GIÁM SÁT THIẾT BỊ ĐÊM & TÁC VỤ QUÉT TỰ ĐỘNG
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[OVERNIGHT_DEVICES_LOG] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[OVERNIGHT_DEVICES_LOG])
BEGIN
    SET IDENTITY_INSERT [dbo].[OVERNIGHT_DEVICES_LOG] ON;
    INSERT INTO [dbo].[OVERNIGHT_DEVICES_LOG] ([id], [scan_date], [scan_time], [restaurant_id], [sap_code], [rk7_code], [restaurant_name], [ip_gateway], [subnet], [email], [overnight_devices], [device_count], [raw_details], [summary_line], [created_at]) VALUES
        (451, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1143, N'1', N'1', N'Cloud Pot Vincom An Giang', N'10.8.148.x', N'10.8.148.', N'agg.cp.vcr.thd@ggg.com.vn', N'Thu Ngân 11, Máy PC Quản Lý 41, Máy KDS 32', 3, N'{"10.8.148.11": "OPEN", "10.8.148.12": "CLOSED", "10.8.148.41": "OPEN", "10.8.148.31": "CLOSED", "10.8.148.32": "OPEN", "10.8.148.33": "CLOSED", "10.8.148.34": "CLOSED", "10.8.148.35": "CLOSED", "10.8.148.36": "CLOSED", "10.8.148.37": "CLOSED", "10.8.148.38": "CLOSED"}', N'1 Cloud Pot Vincom An Giang (RK7: 1) 10.8.148.x      Thu Ngân 11, Máy PC Quản Lý 41, Máy KDS 32  agg.cp.vcr.thd@ggg.com.vn
19-09-2026', '2026-09-19 06:22:27'),
        (452, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1152, N'1', N'1', N'TCH Garden Mall', N'10.60.71.x', N'10.60.71.', N'hcm.tch.gm.hb@thecoffeehouse.vn', N'Thu Ngân 11, Máy PC Quản Lý 41, Máy KDS 31', 3, N'{"10.60.71.11": "OPEN", "10.60.71.12": "CLOSED", "10.60.71.41": "OPEN", "10.60.71.31": "OPEN", "10.60.71.32": "CLOSED", "10.60.71.33": "CLOSED", "10.60.71.34": "CLOSED", "10.60.71.35": "CLOSED", "10.60.71.36": "CLOSED", "10.60.71.37": "CLOSED", "10.60.71.38": "CLOSED"}', N'1 TCH Garden Mall (RK7: 1) 10.60.71.x      Thu Ngân 11, Máy PC Quản Lý 41, Máy KDS 31  hcm.tch.gm.hb@thecoffeehouse.vn
19-09-2026', '2026-09-19 06:22:27'),
        (453, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1146, N'1', N'1', N'TCH EZY CENTER Đồng Nai', N'10.60.69.x', N'10.60.69.', N'dni.tch.ezy.naq@thecoffeehouse.vn', N'Thu Ngân 11', 1, N'{"10.60.69.11": "OPEN", "10.60.69.12": "CLOSED", "10.60.69.41": "CLOSED", "10.60.69.31": "CLOSED", "10.60.69.32": "CLOSED", "10.60.69.33": "CLOSED", "10.60.69.34": "CLOSED", "10.60.69.35": "CLOSED", "10.60.69.36": "CLOSED", "10.60.69.37": "CLOSED", "10.60.69.38": "CLOSED"}', N'1 TCH EZY CENTER Đồng Nai (RK7: 1) 10.60.69.x      Thu Ngân 11  dni.tch.ezy.naq@thecoffeehouse.vn
19-09-2026', '2026-09-19 06:22:27'),
        (454, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1142, N'1', N'1', N'TCH Grand Park', N'10.60.67.x', N'10.60.67.', N'hcm.tch.vcr.pt@thecoffeehouse.vn', N'Máy KDS 31', 1, N'{"10.60.67.11": "CLOSED", "10.60.67.12": "CLOSED", "10.60.67.41": "CLOSED", "10.60.67.31": "OPEN", "10.60.67.32": "CLOSED", "10.60.67.33": "CLOSED", "10.60.67.34": "CLOSED", "10.60.67.35": "CLOSED", "10.60.67.36": "CLOSED", "10.60.67.37": "CLOSED", "10.60.67.38": "CLOSED"}', N'1 TCH Grand Park (RK7: 1) 10.60.67.x      Máy KDS 31  hcm.tch.vcr.pt@thecoffeehouse.vn
19-09-2026', '2026-09-19 06:22:27'),
        (455, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1126, N'1', N'1', N'TCH Mạc Đỉnh Chi', N'10.60.64.X', N'10.60.64.', N'hcm.tch.sh.mdc@thecoffeehouse.com.vn', N'Thu Ngân 11', 1, N'{"10.60.64.11": "OPEN", "10.60.64.12": "CLOSED", "10.60.64.41": "CLOSED", "10.60.64.31": "CLOSED", "10.60.64.32": "CLOSED", "10.60.64.33": "CLOSED", "10.60.64.34": "CLOSED", "10.60.64.35": "CLOSED", "10.60.64.36": "CLOSED", "10.60.64.37": "CLOSED", "10.60.64.38": "CLOSED"}', N'1 TCH Mạc Đỉnh Chi (RK7: 1) 10.60.64.x      Thu Ngân 11  hcm.tch.sh.mdc@thecoffeehouse.com.vn
19-09-2026', '2026-09-19 06:22:27'),
        (456, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1044, N'1', N'1', N'Hutong Palace Vincom Xuân Khánh', N'10.8.114.X', N'10.8.114.', N'cth.ht.vcr.30t4@ggg.com.vn', N'Máy KDS 34', 1, N'{"10.8.114.11": "CLOSED", "10.8.114.12": "CLOSED", "10.8.114.41": "CLOSED", "10.8.114.31": "CLOSED", "10.8.114.32": "CLOSED", "10.8.114.33": "CLOSED", "10.8.114.34": "OPEN", "10.8.114.35": "CLOSED", "10.8.114.36": "CLOSED", "10.8.114.37": "CLOSED", "10.8.114.38": "CLOSED"}', N'1 Hutong Palace Vincom Xuân Khánh (RK7: 1) 10.8.114.x      Máy KDS 34  cth.ht.vcr.30t4@ggg.com.vn
19-09-2026', '2026-09-19 06:22:27'),
        (457, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 1147, N'1', N'1', N'Cloud Pot Thiso Mai Chí Thọ', N'10.8.159.x', N'10.8.159.', N'hcm.cp.tsm.mct@ggg.com.vn', N'Thu Ngân 11', 1, N'{"10.8.159.11": "OPEN", "10.8.159.12": "CLOSED", "10.8.159.41": "CLOSED", "10.8.159.31": "CLOSED", "10.8.159.32": "CLOSED", "10.8.159.33": "CLOSED", "10.8.159.34": "CLOSED", "10.8.159.35": "CLOSED", "10.8.159.36": "CLOSED", "10.8.159.37": "CLOSED", "10.8.159.38": "CLOSED"}', N'1 Cloud Pot Thiso Mai Chí Thọ (RK7: 1) 10.8.159.x      Thu Ngân 11  hcm.cp.tsm.mct@ggg.com.vn
19-09-2026', '2026-09-19 06:22:27'),
        (458, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 771, N'4008', N'150', N'Gogi House Vincom Long Xuyên (An Giang)', N'10.8.74.1', N'10.8.74.', N'agg.ggh.vcr.thd@ggg.com.vn', N'Thu Ngân 12', 1, N'{"10.8.74.11": "CLOSED", "10.8.74.12": "OPEN", "10.8.74.41": "CLOSED", "10.8.74.31": "CLOSED", "10.8.74.32": "CLOSED", "10.8.74.33": "CLOSED", "10.8.74.34": "CLOSED", "10.8.74.35": "CLOSED", "10.8.74.36": "CLOSED", "10.8.74.37": "CLOSED", "10.8.74.38": "CLOSED"}', N'4008 Gogi House Vincom Long Xuyên (An Giang) (RK7: 150) 10.8.74.x      Thu Ngân 12  agg.ggh.vcr.thd@ggg.com.vn
19-09-2026', '2026-09-19 06:22:27'),
        (459, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 748, N'4009', N'396', N'Gogi Quy Nhơn Bình Định', N'10.8.221.1', N'10.8.221.', N'bdi.ggh.sh.adv@ggg.com.vn', N'Máy KDS 32, Máy KDS 33, Máy KDS 34', 3, N'{"10.8.221.11": "CLOSED", "10.8.221.12": "CLOSED", "10.8.221.41": "CLOSED", "10.8.221.31": "CLOSED", "10.8.221.32": "OPEN", "10.8.221.33": "OPEN", "10.8.221.34": "OPEN", "10.8.221.35": "CLOSED", "10.8.221.36": "CLOSED", "10.8.221.37": "CLOSED", "10.8.221.38": "CLOSED"}', N'4009 Gogi Quy Nhơn Bình Định (RK7: 396) 10.8.221.x      Máy KDS 32, Máy KDS 33, Máy KDS 34  bdi.ggh.sh.adv@ggg.com.vn
19-09-2026', '2026-09-19 06:22:27'),
        (460, '2026-09-19 00:00:00', '2026-09-19 06:22:27', 837, N'4010', N'101', N'Gogi House Aeon Mall Bình Dương', N'10.8.32.1', N'10.8.32.', N'bdg.ggh.aom.dlbd@ggg.com.vn', N'Thu Ngân 12, Máy PC Quản Lý 41', 2, N'{"10.8.32.11": "CLOSED", "10.8.32.12": "OPEN", "10.8.32.41": "OPEN", "10.8.32.31": "CLOSED", "10.8.32.32": "CLOSED", "10.8.32.33": "CLOSED", "10.8.32.34": "CLOSED", "10.8.32.35": "CLOSED", "10.8.32.36": "CLOSED", "10.8.32.37": "CLOSED", "10.8.32.38": "CLOSED"}', N'4010 Gogi House Aeon Mall Bình Dương (RK7: 101) 10.8.32.x      Thu Ngân 12, Máy PC Quản Lý 41  bdg.ggh.aom.dlbd@ggg.com.vn
19-09-2026', '2026-09-19 06:22:27');
    SET IDENTITY_INSERT [dbo].[OVERNIGHT_DEVICES_LOG] OFF;
    PRINT N'Inserted default data for [dbo].[OVERNIGHT_DEVICES_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[RAM_LIMIT_AUDIT_LOG] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[RAM_LIMIT_AUDIT_LOG])
BEGIN
    SET IDENTITY_INSERT [dbo].[RAM_LIMIT_AUDIT_LOG] ON;
    INSERT INTO [dbo].[RAM_LIMIT_AUDIT_LOG] ([id], [scan_date], [restaurant_id], [sap_code], [restaurant_name], [subnet], [ip_gateway], [sql_ip], [sql_connected], [sql_max_memory_mb], [sql_is_limited_4gb], [sql_status], [mongo_ip], [mongo_connected], [mongo_cache_size_gb], [mongo_is_limited_6gb], [mongo_status], [summary_note], [created_at], [sql_is_limited_2gb]) VALUES
        (1577, N'2026-09-19', 591, N'Khong Phai NH', N'Central Kitchen (Xưởng Hồ Học Lãm)', N'10.8.118', N'10.8.118.1', N'10.8.118.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', NULL, 0, NULL, 0, N'NH này Mongo chưa cấu hình mở port IP ❌', N'SQL: Không kết nối | Mongo: Chưa mở port IP', '2026-09-19 17:08:18', 0),
        (1578, N'2026-09-19', 592, N'Khong Phai NH', N'Kho Việt Mỹ Thành', N'10.8.84', N'10.8.84.1', N'10.8.84.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', NULL, 0, NULL, 0, N'NH này Mongo chưa cấu hình mở port IP ❌', N'SQL: Không kết nối | Mongo: Chưa mở port IP', '2026-09-19 17:08:18', 0),
        (1579, N'2026-09-19', 593, N'Khong Phai NH', N'Kho Gia Phú', N'10.8.163', N'10.8.163.1', N'10.8.163.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', NULL, 0, NULL, 0, N'NH này Mongo chưa cấu hình mở port IP ❌', N'SQL: Không kết nối | Mongo: Chưa mở port IP', '2026-09-19 17:08:18', 0),
        (1580, N'2026-09-19', 594, N'4388', N'Ashima Nguyễn Đình Chiểu', N'10.8.45', N'10.8.45.1', N'10.8.45.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', N'10.8.45.41', 1, 6.0, 1, N'Đã giới hạn 6GB (10.8.45.41: 6.0 GB, Config=4.0GB) ✅', N'SQL: Không kết nối | Mongo 6GB: Đạt', '2026-09-19 17:08:18', 0),
        (1581, N'2026-09-19', 595, N'4389', N'Ashima Tú Xương', N'10.8.46', N'10.8.46.1', N'10.8.46.41', 1, 2048, 1, N'Đã giới hạn 2GB (2048 MB) ✅', N'10.8.46.12', 1, 6.0, 1, N'Đã giới hạn 6GB (10.8.46.12: 6.0 GB, Mặc định chưa set mongod.cfg) ✅', N'SQL <= 2GB: Đạt | Mongo 6GB: Đạt', '2026-09-19 17:08:18', 1),
        (1582, N'2026-09-19', 596, N'4391', N'Ashima Nguyễn Trãi', N'10.8.130', N'10.8.130.1', N'10.8.130.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', N'10.8.130.12', 1, 6.0, 1, N'Đã giới hạn 6GB (10.8.130.12: 6.0 GB, Mặc định chưa set mongod.cfg) ✅', N'SQL: Không kết nối | Mongo 6GB: Đạt', '2026-09-19 17:08:18', 0),
        (1583, N'2026-09-19', 597, N'4392', N'Ashima Xuân Thủy', N'10.8.137', N'10.8.137.1', N'10.8.137.41', 1, 2048, 1, N'Đã giới hạn 2GB (2048 MB) ✅', N'10.8.137.12', 1, 6.0, 1, N'Đã giới hạn 6GB (10.8.137.12: 6.0 GB, Mặc định chưa set mongod.cfg) ✅', N'SQL <= 2GB: Đạt | Mongo 6GB: Đạt', '2026-09-19 17:08:18', 1),
        (1584, N'2026-09-19', 599, N'4942', N'Kichi Aeon Mall Long An', N'10.8.87', N'10.8.87.1', N'10.8.87.41', 1, 2048, 1, N'Đã giới hạn 2GB (2048 MB) ✅', N'10.8.87.41', 0, NULL, 0, N'Lỗi MongoDB (10.8.87.41): Server at 10.8.87.41:27017 reports wire version 7, but this ', N'SQL <= 2GB: Đạt | Mongo: Chưa mở port IP', '2026-09-19 17:08:18', 1),
        (1585, N'2026-09-19', 600, N'4941', N'Gogi House Aeon Mall Long An', N'10.8.102', N'10.8.102.1', N'10.8.102.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', N'10.8.102.41', 1, 6.0, 1, N'Đã giới hạn 6GB (10.8.102.41: 6.0 GB, Mặc định chưa set mongod.cfg) ✅', N'SQL: Không kết nối | Mongo 6GB: Đạt', '2026-09-19 17:08:18', 0),
        (1586, N'2026-09-19', 601, N'4529', N'Crystal Jade Aeon Mall Bình Tân', N'10.8.94', N'10.8.94.1', N'10.8.94.41', 0, NULL, 0, N'Không kết nối được SQL .41 (Port 1433 đóng)', N'10.8.94.12', 1, 6.0, 1, N'Đã giới hạn 6GB (10.8.94.12: 6.0 GB, Mặc định chưa set mongod.cfg) ✅', N'SQL: Không kết nối | Mongo 6GB: Đạt', '2026-09-19 17:08:18', 0);
    SET IDENTITY_INSERT [dbo].[RAM_LIMIT_AUDIT_LOG] OFF;
    PRINT N'Inserted default data for [dbo].[RAM_LIMIT_AUDIT_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- DỮ LIỆU BẢNG: [dbo].[UNASSIGNED_3CX_TICKETS_LOG] (10 bản ghi)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM [dbo].[UNASSIGNED_3CX_TICKETS_LOG])
BEGIN
    SET IDENTITY_INSERT [dbo].[UNASSIGNED_3CX_TICKETS_LOG] ON;
    INSERT INTO [dbo].[UNASSIGNED_3CX_TICKETS_LOG] ([id], [scan_date], [ticket_id], [ticket_title], [creator], [created_at_str], [due_date_str], [status], [assignee_status], [ticket_url], [scanned_at], [source_type]) VALUES
        (1, N'2026-09-25', N'1871988', N'HCM Cloudpot Cao Thắng-HỔ TRỢ CHECK DATA LŨY KẾ LỖI DO ÁP DỤNG VOUCHER NGÀY 20/9', N'hcm.cp.sh.ct', N'24/09/2026 17:58:51', N'25/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1871988', '2026-09-25 16:49:08', NULL),
        (2, N'2026-09-25', N'1872975', N'HCM Cloudpot Giga Mall Phạm Văn Đồng-LỖI KDS CO/SO không vào được', N'hcm.cp.ggm.pvd', N'25/09/2026 12:26:21', N'26/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1872975', '2026-09-25 16:49:08', NULL),
        (3, N'2026-09-25', N'1873162', N'HCM Kichi Kichi Lotte Mart Tân Bình-CẤP TÀI KHOẢN KDS', N'hcm.kk.lte.ch', N'25/09/2026 14:05:31', N'27/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1873162', '2026-09-25 16:49:08', NULL),
        (4, N'2026-09-25', N'1872475', N'DNG Manwah AEON Đà Nẵng-MẠNG NHÀ HÀNG BỊ LỖI', N'dng.mw.aom.dbp', N'25/09/2026 09:01:43', N'28/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1872475', '2026-09-25 16:49:08', NULL),
        (5, N'2026-09-25', N'1872185', N'LDG Manwah Nguyễn Chí Thanh Đà Lạt-4369 - MW Đà Lạt - burn ví bù', N'ldo.mw.sh.nct', N'24/09/2026 20:56:11', N'29/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1872185', '2026-09-25 16:49:08', NULL),
        (6, N'2026-09-25', N'1873509', N'Kichi Phan Đình Phùng - Quãng Ngãi-HỖ TRỢ TÀI KHOẢN TRUY CẬP KDS', N'qng.kk.sh.pdp', N'25/09/2026 16:03:01', N'29/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1873509', '2026-09-25 16:49:08', NULL),
        (7, N'2026-09-25', N'1873204', N'HCM Manwah Vincom Lê Văn Việt-4350_KDS NGÀY 25/09', N'hcm.mw.vcr.lvv', N'25/09/2026 14:20:03', N'30/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1873204', '2026-09-25 16:49:08', NULL),
        (8, N'2026-09-25', N'1873205', N'DNI CloudPot Vincom Biên Hòa-TÌNH TRẠNG LỖI PHÂN QUYỀN SSC THANH LÝ/HỦY', N'dni.cp.vcr.pvt', N'25/09/2026 14:20:04', N'30/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1873205', '2026-09-25 16:49:08', NULL),
        (9, N'2026-09-25', N'1872309', N'KC-BẤM POS ĐĨA MỜI KHÔNG VÀO KDS - GG SBU02', N'mi.nguyen', N'24/09/2026 22:14:35', N'30/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1872309', '2026-09-25 16:49:08', NULL),
        (10, N'2026-09-25', N'1873128', N'DNI CloudPot Vincom Biên Hòa-TÌNH TRẠNG KDS CỦA CD VINCOM BIÊN HÒA', N'dni.cp.vcr.pvt', N'25/09/2026 13:45:26', N'30/09/26 23:59:59', N'Mới mở', N'Chưa gán người xử lý', N'https://gpms.ggg.com.vn/gticket/work-list/detail?id=1873128', '2026-09-25 16:49:08', NULL);
    SET IDENTITY_INSERT [dbo].[UNASSIGNED_3CX_TICKETS_LOG] OFF;
    PRINT N'Inserted default data for [dbo].[UNASSIGNED_3CX_TICKETS_LOG] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 10: CÁC BẢNG KHÁC
-- ============================================================================
