var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var NhanVien = require('../models/nhanvien');
var KhachHang = require('../models/khachhang');
var SanPham = require('../models/sanpham');
var HoaDon = require('../models/hoadon');
var TraGop = require('../models/tragop');
var DoiTra = require('../models/doitra');

// 1. MIDDLEWARE: Bức tường bảo vệ tab Admin
const checkLogin = (req, res, next) => {
    if (req.session && req.session.NhanVien) {
        next();
    } else {
        res.redirect('/admin/dangnhap');
    }
};

// 2. GET: Giao diện Đăng nhập
router.get('/dangnhap', (req, res) => {
    if (req.session.NhanVien) return res.redirect('/admin');
    res.render('dangnhap', { title: 'Đăng nhập Quản trị', error: null });
});

// 3. POST: Xử lý Đăng nhập
router.post('/dangnhap', async (req, res) => {
    try {
        const { TenDangNhap, MatKhau } = req.body;
        const nv = await NhanVien.findOne({ TenDangNhap: TenDangNhap });

        if (!nv) {
            return res.render('dangnhap', { title: 'Đăng nhập Quản trị', error: 'Tài khoản không tồn tại!' });
        }

        const isMatch = bcrypt.compareSync(MatKhau, nv.MatKhau);
        if (!isMatch) {
            return res.render('dangnhap', { title: 'Đăng nhập Quản trị', error: 'Mật khẩu không chính xác!' });
        }

        if (nv.TrangThai === 0) {
            return res.render('dangnhap', { title: 'Đăng nhập Quản trị', error: 'Tài khoản của bạn đã bị khóa!' });
        }

        req.session.NhanVien = nv;
        res.redirect('/admin');
    } catch (error) {
        console.log(error);
        res.render('dangnhap', { title: 'Đăng nhập Quản trị', error: 'Lỗi hệ thống!' });
    }
});

// FIX #11: Xóa route /taomau để tránh lộ thông tin trong môi trường thực tế
// router.get('/taomau', ...) — Đã xóa


// ======================== BẢNG ĐIỀU KHIỂN ========================
router.get('/', checkLogin, async (req, res) => {
    try {
        const soSanPham = await SanPham.countDocuments();
        const soKhachHang = await KhachHang.countDocuments();
        const soHoaDon = await HoaDon.countDocuments({ TrangThai: 'Chờ duyệt' });

        const danhSachHoaDon = await HoaDon.find({ TrangThai: 'Đã duyệt' });
        let tongDoanhThu = danhSachHoaDon.reduce((sum, hd) => sum + hd.TongTien, 0);

        // THÊM MỚI: Lấy 5 hóa đơn mới nhất đẩy ra giao diện
        const hoaDonMoi = await HoaDon.find().sort({ _id: -1 }).limit(5).populate('KhachHang');

        res.render('admin/index', {
            title: 'Bảng điều khiển Admin',
            nhanvien: req.session.NhanVien,
            soSanPham: soSanPham,
            soKhachHang: soKhachHang,
            soHoaDon: soHoaDon,
            tongDoanhThu: tongDoanhThu,
            hoaDonMoi: hoaDonMoi // Truyền biến mới này
        });
    } catch (error) {
        console.log(error);
        res.send("Lỗi tải bảng điều khiển: " + error.message);
    }
});

// ======================== QUẢN LÝ TRẢ GÓP & HÓA ĐƠN ========================

// 1. Tự động trừ kho & tạo hồ sơ Trả góp khi Duyệt Hóa đơn
router.get('/hoadon/duyet/:id', checkLogin, async (req, res) => {
    try {
        const hd = await HoaDon.findById(req.params.id);

        // Chặn lỗi click duyệt 2 lần làm trừ kho 2 lần
        if (!hd || hd.TrangThai !== 'Chờ duyệt') {
            return res.redirect('/admin/hoadon');
        }

        hd.TrangThai = 'Đã duyệt';
        hd.NhanVienDuyet = req.session.NhanVien._id;
        await hd.save();

        // THÊM MỚI: CHẠY VÒNG LẶP TRỪ KHO SẢN PHẨM
        for (let item of hd.ChiTietHoaDon) {
            let sp = await SanPham.findById(item.SanPham);
            if (sp) {
                sp.SoLuongTon -= item.SoLuong; // Trừ đi số lượng khách đã mua
                if (sp.SoLuongTon < 0) sp.SoLuongTon = 0; // Đảm bảo kho không bị âm
                await sp.save();
            }
        }

        // Tự động tạo sổ nợ (Giữ nguyên logic cũ)
        if (hd.HinhThucThanhToan === 'Trả góp') {
            const checkTonTai = await TraGop.findOne({ HoaDon: hd._id });
            if (!checkTonTai) {
                let traTruoc = hd.TongTien * 0.3; // Thu trước 30%
                let conLai = hd.TongTien - traTruoc; // Gốc còn lại cần vay

                let soThang = hd.SoThangTraGop || 6;
                let laiSuat = 1; // Cứng 1% / tháng

                let tienMoiThang = Math.round((conLai / soThang) + (conLai * (laiSuat / 100)));

                await TraGop.create({
                    HoaDon: hd._id,
                    KhachHang: hd.KhachHang,
                    SoTienTraTruoc: traTruoc,
                    SoThang: soThang,
                    LaiSuat: laiSuat,
                    TienTraMoiThang: tienMoiThang,
                    SoThangDaTra: 0,
                    NgayThanhToanGanNhat: new Date()
                });
            }
        }
        res.redirect('/admin/hoadon');
    } catch (error) {
        console.log(error);
        res.send("Lỗi hệ thống: " + error.message);
    }
});
// 2. Hiển thị danh sách & Cảnh báo Nợ xấu tự động
router.get('/tragop', checkLogin, async (req, res) => {
    try {
        let dsTraGop = await TraGop.find().populate('KhachHang').populate('HoaDon');
        const now = new Date();

        for (let tg of dsTraGop) {
            if (tg.TrangThai !== 'Đã tất toán') {
                let diffTime = Math.abs(now - tg.NgayThanhToanGanNhat);
                let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let soLanNhac = tg.SoLanNhacNho || 0;

                // Quá 90 ngày HOẶC Bị nhắc 3 lần -> Bắt buộc là Nợ Xấu
                if (diffDays > 90 || soLanNhac >= 3) {
                    tg.TrangThai = 'Nợ xấu';
                } else if (diffDays > 30) {
                    tg.TrangThai = 'Quá hạn';
                } else {
                    tg.TrangThai = 'Đang trả';
                }
                await tg.save();
            }
        }

        res.render('admin/tragop', { title: 'Quản lý Trả góp', tragop: dsTraGop, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

// 3. Thu tiền hàng tháng
router.post('/tragop/thutien/:id', checkLogin, async (req, res) => {
    try {
        let tg = await TraGop.findById(req.params.id);
        if (!tg) return res.redirect('/admin/tragop');

        tg.SoThangDaTra += 1;
        tg.NgayThanhToanGanNhat = new Date(); // Reset mốc thời gian
        tg.SoLanNhacNho = 0; // Đã nộp tiền thì xóa cảnh báo nhắc nhở

        tg.LichSuThuTien.push({
            SoTienThu: tg.TienTraMoiThang,
            KỳThanhToan: tg.SoThangDaTra
        });

        if (tg.SoThangDaTra >= tg.SoThang) {
            tg.SoThangDaTra = tg.SoThang; // Chống vượt quá số tháng
            tg.TrangThai = 'Đã tất toán';
        } else {
            tg.TrangThai = 'Đang trả';
        }

        await tg.save();
        res.redirect('/admin/tragop');
    } catch (err) { console.log(err); }
});

// 4. Nhắc nhở nợ
router.get('/tragop/nhacnho/:id', checkLogin, async (req, res) => {
    try {
        let tg = await TraGop.findById(req.params.id);
        if (tg && tg.TrangThai !== 'Đã tất toán' && tg.TrangThai !== 'Nợ xấu') {
            tg.SoLanNhacNho = (tg.SoLanNhacNho || 0) + 1;

            if (tg.SoLanNhacNho >= 3) {
                tg.TrangThai = 'Nợ xấu';
            }
            await tg.save();
        }
        res.redirect('/admin/tragop');
    } catch (error) {
        console.log(error);
        res.send("Lỗi nhắc nhở: " + error.message);
    }
});

// 5. Tất toán toàn bộ (Đã fix lỗi redirect back)
router.post('/tragop/tattoan/:id', checkLogin, async (req, res) => {
    try {
        const tragop = await TraGop.findById(req.params.id);

        if (!tragop) {
            return res.redirect('/admin/tragop');
        }

        // KIỂM TRA PHÂN LOẠI TRƯỚC KHI ĐÓNG SỔ
        if (tragop.TrangThai === 'Nợ xấu') {
            // Lưu lại vết nhơ tài chính (Đưa vào Blacklist)
            tragop.TrangThai = 'Đã thu hồi nợ';
        } else {
            // Khách hàng uy tín trả xong bình thường
            tragop.TrangThai = 'Đã tất toán';
        }

        // Cập nhật tiến độ thành 100%
        tragop.SoThangDaTra = tragop.SoThang;
        await tragop.save();

        // FIX: Trỏ thẳng về trang Quản lý Trả góp thay vì dùng 'back'
        res.redirect('/admin/tragop');

    } catch (error) {
        console.log("Lỗi khi tất toán:", error);
        // Nếu có lỗi cũng an toàn đẩy về trang danh sách, không để trang trắng
        res.redirect('/admin/tragop');
    }
});
// 1. Hiển thị danh sách Yêu cầu
router.get('/doitra', checkLogin, async (req, res) => {
    try {
        const danhSach = await DoiTra.find()
            .populate('KhachHang')
            .populate({ path: 'HoaDon', populate: { path: 'ChiTietHoaDon.SanPham' } })
            .populate('SanPhamMoi.SanPham')
            .sort({ NgayYeuCau: -1 });

        res.render('admin/doitra', { title: 'Quản lý Đổi/Trả', dsDoiTra: danhSach, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

// 2. Xử lý Duyệt Yêu Cầu Đổi/Trả
router.post('/doitra/duyet/:id', checkLogin, async (req, res) => {
    try {
        let dt = await DoiTra.findById(req.params.id)
            .populate({ path: 'HoaDon', populate: { path: 'ChiTietHoaDon.SanPham' } })
            .populate('SanPhamMoi.SanPham');

        if (!dt || dt.TrangThai !== 'Chờ xử lý') return res.redirect('/admin/doitra');

        let hd = dt.HoaDon;

        if (dt.LoaiYeuCau === 'Trả hàng') {
            // TRẢ HÀNG: Cộng lại kho, Hủy hóa đơn
            for (let item of hd.ChiTietHoaDon) {
                let sp = await SanPham.findById(item.SanPham._id);
                sp.SoLuongTon += item.SoLuong;
                await sp.save();
            }
            hd.TrangThai = 'Đã hoàn trả';
            await hd.save();

        } else if (dt.LoaiYeuCau === 'Đổi hàng') {
            // ĐỔI HÀNG: Cộng kho SP cũ, Trừ kho SP mới, cập nhật lại Hóa Đơn
            // Cộng lại kho cũ
            for (let item of hd.ChiTietHoaDon) {
                let spCu = await SanPham.findById(item.SanPham._id);
                spCu.SoLuongTon += item.SoLuong;
                await spCu.save();
            }

            // FIX #6: Trừ kho SP mới đúng số lượng từ yêu cầu đổi (không cứng 1)
            let spMoiReq = dt.SanPhamMoi[0];
            let spMoi = spMoiReq.SanPham;
            let soLuongDoi = spMoiReq.SoLuong || 1;
            let spDb = await SanPham.findById(spMoi._id);
            spDb.SoLuongTon -= soLuongDoi;
            if (spDb.SoLuongTon < 0) spDb.SoLuongTon = 0;
            await spDb.save();

            // Cập nhật lại Hóa đơn thành SP mới
            hd.ChiTietHoaDon = [{ SanPham: spMoi._id, SoLuong: soLuongDoi, DonGiaBan: spMoi.GiaBan }];
            hd.TongTien = spMoi.GiaBan * soLuongDoi;
            hd.TrangThai = 'Đã đổi hàng';
            await hd.save();
        }


        dt.TrangThai = 'Đã duyệt';
        await dt.save();

        res.redirect('/admin/doitra');
    } catch (error) { console.log(error); }
});

// ======================== TÍNH NĂNG KHÁC ========================

// GET: Xem và In Hóa Đơn
router.get('/hoadon/in/:id', checkLogin, async (req, res) => {
    try {
        const hd = await HoaDon.findById(req.params.id)
            .populate('KhachHang')
            .populate('ChiTietHoaDon.SanPham');

        if (!hd) return res.send('Không tìm thấy hóa đơn!');

        res.render('admin/hoadon_in', { title: 'In Hóa Đơn', hoadon: hd });
    } catch (error) {
        console.log(error);
        res.send("Lỗi in hóa đơn: " + error.message);
    }
});

// GET: Đăng xuất Admin
router.get('/dangxuat', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log("Lỗi đăng xuất admin:", err);
        res.redirect('/admin/dangnhap');
    });
});

module.exports = router;