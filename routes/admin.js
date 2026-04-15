var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');

// IMPORT MODELS
var NhanVien = require('../models/nhanvien');
var KhachHang = require('../models/khachhang');
var SanPham = require('../models/sanpham');
var HoaDon = require('../models/hoadon');
var TraGop = require('../models/tragop');
var DoiTra = require('../models/doitra');
var HangSanXuat = require('../models/hangsanxuat'); 
var NhapHang = require('../models/nhaphang'); // ĐÃ THÊM: Import Model Nhập Hàng

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

// ======================== BẢNG ĐIỀU KHIỂN ========================
router.get('/', checkLogin, async (req, res) => {
    try {
        const soSanPham = await SanPham.countDocuments();
        const soKhachHang = await KhachHang.countDocuments();
        const soHoaDon = await HoaDon.countDocuments({ TrangThai: 'Chờ duyệt' });

        const danhSachHoaDon = await HoaDon.find({ TrangThai: 'Đã duyệt' });
        let tongDoanhThu = danhSachHoaDon.reduce((sum, hd) => sum + hd.TongTien, 0);

        const hoaDonMoi = await HoaDon.find().sort({ _id: -1 }).limit(5).populate('KhachHang');

        res.render('admin/index', {
            title: 'Bảng điều khiển Admin',
            nhanvien: req.session.NhanVien,
            soSanPham: soSanPham,
            soKhachHang: soKhachHang,
            soHoaDon: soHoaDon,
            tongDoanhThu: tongDoanhThu,
            hoaDonMoi: hoaDonMoi 
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

        if (!hd || hd.TrangThai !== 'Chờ duyệt') {
            return res.redirect('/admin/hoadon');
        }

        hd.TrangThai = 'Đã duyệt';
        hd.NhanVienDuyet = req.session.NhanVien._id;
        await hd.save();

        for (let item of hd.ChiTietHoaDon) {
            let sp = await SanPham.findById(item.SanPham);
            if (sp) {
                sp.SoLuongTon -= item.SoLuong; 
                if (sp.SoLuongTon < 0) sp.SoLuongTon = 0; 
                await sp.save();
            }
        }

        if (hd.HinhThucThanhToan === 'Trả góp') {
            const checkTonTai = await TraGop.findOne({ HoaDon: hd._id });
            if (!checkTonTai) {
                let traTruoc = hd.TongTien * 0.3; 
                let conLai = hd.TongTien - traTruoc; 

                let soThang = hd.SoThangTraGop || 6;
                let laiSuat = 1; 

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

// Route xử lý TỪ CHỐI đơn hàng
router.get('/hoadon/tuchoi/:id', checkLogin, async (req, res) => {
    try {
        const hoadon = await HoaDon.findById(req.params.id);
        if (hoadon) {
            hoadon.TrangThai = 'Từ chối';
            await hoadon.save();
        }
        res.redirect('/admin/hoadon');
    } catch (error) {
        console.log(error);
        res.redirect('/admin/hoadon');
    }
});

// 2. Hiển thị danh sách & Cảnh báo Nợ xấu tự động
router.get('/tragop', checkLogin, async (req, res) => {
    try {
        let dsTraGop = await TraGop.find().populate('KhachHang').populate('HoaDon');
        const now = new Date();

        for (let tg of dsTraGop) {
            if (tg.TrangThai !== 'Đã tất toán' && tg.TrangThai !== 'Đã thu hồi nợ') {
                let diffTime = Math.abs(now - tg.NgayThanhToanGanNhat);
                let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let soLanNhac = tg.SoLanNhacNho || 0;

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
        tg.NgayThanhToanGanNhat = new Date(); 
        tg.SoLanNhacNho = 0; 

        tg.LichSuThuTien.push({
            SoTienThu: tg.TienTraMoiThang,
            KỳThanhToan: tg.SoThangDaTra
        });

        if (tg.SoThangDaTra >= tg.SoThang) {
            tg.SoThangDaTra = tg.SoThang; 
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
        if (tg && tg.TrangThai !== 'Đã tất toán' && tg.TrangThai !== 'Nợ xấu' && tg.TrangThai !== 'Đã thu hồi nợ') {
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

// 5. Tất toán toàn bộ 
router.post('/tragop/tattoan/:id', checkLogin, async (req, res) => {
    try {
        const tragop = await TraGop.findById(req.params.id);

        if (!tragop) {
            return res.redirect('/admin/tragop');
        }

        if (tragop.TrangThai === 'Nợ xấu') {
            tragop.TrangThai = 'Đã thu hồi nợ';
        } else {
            tragop.TrangThai = 'Đã tất toán';
        }

        tragop.SoThangDaTra = tragop.SoThang;
        await tragop.save();

        res.redirect('/admin/tragop');

    } catch (error) {
        console.log("Lỗi khi tất toán:", error);
        res.redirect('/admin/tragop');
    }
});

// ======================== QUẢN LÝ YÊU CẦU ĐỔI TRẢ ========================
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
            for (let item of hd.ChiTietHoaDon) {
                let sp = await SanPham.findById(item.SanPham._id);
                sp.SoLuongTon += item.SoLuong;
                await sp.save();
            }
            hd.TrangThai = 'Đã hoàn trả';
            await hd.save();

        } else if (dt.LoaiYeuCau === 'Đổi hàng') {
            for (let item of hd.ChiTietHoaDon) {
                let spCu = await SanPham.findById(item.SanPham._id);
                spCu.SoLuongTon += item.SoLuong;
                await spCu.save();
            }

            let spMoiReq = dt.SanPhamMoi[0];
            let spMoi = spMoiReq.SanPham;
            let soLuongDoi = spMoiReq.SoLuong || 1;
            let spDb = await SanPham.findById(spMoi._id);
            
            spDb.SoLuongTon -= soLuongDoi;
            if (spDb.SoLuongTon < 0) spDb.SoLuongTon = 0;
            await spDb.save();

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

// ======================== QUẢN LÝ NHẬP HÀNG ========================

// 1. GET: Hiển thị danh sách Lịch sử Nhập Hàng (ĐÃ THÊM MỚI)
router.get('/nhaphang', checkLogin, async (req, res) => {
    try {
        // Lấy danh sách, populate HangSanXuat (hoặc NhaCungCap) và NhanVien
        const dsNhapHang = await NhapHang.find()
            .populate('HangSanXuat') 
            .populate('NhaCungCap') // Đề phòng DB dùng field cũ
            .populate('NhanVien')
            .sort({ NgayNhap: -1 });

        res.render('admin/nhaphang', { 
            title: 'Lịch sử Nhập Hàng', 
            nhaphang: dsNhapHang,
            nhanvien: req.session.NhanVien
        });
    } catch (error) {
        console.log(error);
        res.send("Lỗi tải danh sách nhập hàng: " + error.message);
    }
});

// 2. GET: Hiển thị trang Tạo Phiếu Nhập Hàng Mới
router.get('/nhaphang/them', checkLogin, async (req, res) => {
    try {
        const dsHangSanXuat = await HangSanXuat.find({}); 
        const dsSanPham = await SanPham.find({}).populate('HangSanXuat'); 

        res.render('admin/nhaphang_them', {
            title: 'Tạo Phiếu Nhập Hàng Mới',
            hangsanxuat: dsHangSanXuat, 
            sanpham: dsSanPham,
            nhanvien: req.session.NhanVien
        });
    } catch (error) {
        console.log("Lỗi khi load trang thêm phiếu nhập:", error);
        res.redirect('/admin/nhaphang');
    }
});

// 3. POST: Xử lý Lưu Phiếu Nhập & Cộng Tồn Kho (ĐÃ THÊM MỚI)
router.post('/nhaphang/them', checkLogin, async (req, res) => {
    try {
        let { NhaCungCap, SanPhamId, SoLuong, DonGiaNhap } = req.body;
        
        // Xử lý trường hợp chỉ nhập 1 sản phẩm (form gửi lên dạng chuỗi thay vì mảng)
        if (!Array.isArray(SanPhamId)) {
            SanPhamId = [SanPhamId];
            SoLuong = [SoLuong];
            DonGiaNhap = [DonGiaNhap];
        }

        let chiTiet = [];
        let tongTienNhap = 0;

        // Vòng lặp lấy chi tiết & CỘNG TỒN KHO TIVI
        for (let i = 0; i < SanPhamId.length; i++) {
            let sl = parseInt(SoLuong[i]);
            let giaNhap = parseInt(DonGiaNhap[i]);

            chiTiet.push({
                SanPham: SanPhamId[i],
                SoLuong: sl,
                DonGiaNhap: giaNhap
            });
            tongTienNhap += (sl * giaNhap);

            // Tự động CỘNG dồn vào kho Tivi
            let sp = await SanPham.findById(SanPhamId[i]);
            if (sp) {
                sp.SoLuongTon = (sp.SoLuongTon || 0) + sl;
                await sp.save();
            }
        }

        // Tạo phiếu nhập mới
        await NhapHang.create({
            HangSanXuat: NhaCungCap, // Lưu ID hãng sản xuất/nguồn nhập
            NhaCungCap: NhaCungCap, // Đề phòng DB của bạn vẫn bám theo field cũ
            NhanVien: req.session.NhanVien._id,
            TongTienNhap: tongTienNhap,
            ChiTietNhapHang: chiTiet,
            NgayNhap: new Date()
        });

        res.redirect('/admin/nhaphang');
    } catch (error) {
        console.log("Lỗi khi lưu phiếu nhập:", error);
        res.redirect('/admin/nhaphang/them');
    }
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