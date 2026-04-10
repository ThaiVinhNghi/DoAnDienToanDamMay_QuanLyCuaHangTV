var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var mongoose = require('mongoose');

var SanPham = require('../models/sanpham');
var KhachHang = require('../models/khachhang');
var HoaDon = require('../models/hoadon');
var HangSanXuat = require('../models/hangsanxuat');
var DoiTra = require('../models/doitra');
var TraGop = require('../models/tragop');
var TinTuc = require('../models/tintuc');

// ======================== TRANG CHỦ & TÌM KIẾM ========================
router.get('/', async (req, res) => {
    try {
        let dieuKienLoc = {}; 
        if (req.query.timkiem && req.query.timkiem.trim() !== '') {
            dieuKienLoc.TenSP = { $regex: req.query.timkiem.trim(), $options: 'i' }; 
        }
        if (req.query.hang && req.query.hang.trim() !== '') {
            dieuKienLoc.HangSanXuat = new mongoose.Types.ObjectId(req.query.hang.trim());
        }
        if (req.query.gia && req.query.gia !== '') {
            if (req.query.gia === 'duoi10') dieuKienLoc.GiaBan = { $lt: 10000000 };
            else if (req.query.gia === '10den20') dieuKienLoc.GiaBan = { $gte: 10000000, $lte: 20000000 };
            else if (req.query.gia === 'tren20') dieuKienLoc.GiaBan = { $gt: 20000000 };
        }

        const dsHang = await HangSanXuat.find(); 
        const spTatCa = await SanPham.find(dieuKienLoc).populate('HangSanXuat');
        const spGiamGia = await SanPham.find(dieuKienLoc).sort({ GiaBan: 1 }).limit(4).populate('HangSanXuat');
        const tinTucMoi = await TinTuc.find({ TrangThai: true }).sort({ NgayDang: -1 }).limit(3);

        res.render('index', { 
            title: 'Cửa hàng Tivi TVN', 
            sanpham: spTatCa,
            spgiamgia: spGiamGia,
            hangsanxuat: dsHang,
            tintuc: tinTucMoi, 
            khachhang: req.session.KhachHang, 
            query: req.query 
        });
    } catch (error) { 
        console.log("Lỗi bộ lọc trang chủ:", error); 
        res.redirect('/'); 
    }
});

// ======================== TIN TỨC (MỚI THÊM) ========================
// Trang danh sách tất cả tin tức
router.get('/tintuc', async (req, res) => {
    try {
        const dsTinTuc = await TinTuc.find({ TrangThai: true }).sort({ NgayDang: -1 });
        res.render('tintuc_danhsach', {
            title: 'Tất cả Bảng tin Công nghệ',
            tintuc: dsTinTuc,
            khachhang: req.session.KhachHang
        });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

// Trang chi tiết đọc 1 bài tin tức
router.get('/tin/:id', async (req, res) => {
    try {
        const tin = await TinTuc.findById(req.params.id);
        if (!tin) return res.redirect('/tintuc');
        res.render('tintuc_chitiet', {
            title: tin.TieuDe,
            tin: tin,
            khachhang: req.session.KhachHang
        });
    } catch (error) {
        console.log(error);
        res.redirect('/tintuc');
    }
});

// ======================== TẤT CẢ SẢN PHẨM ========================
router.get('/sanpham', async (req, res) => {
    try {
        let dieuKienLoc = {}; 
        if (req.query.timkiem && req.query.timkiem.trim() !== '') dieuKienLoc.TenSP = { $regex: req.query.timkiem.trim(), $options: 'i' }; 
        if (req.query.gia && req.query.gia !== '') {
            if (req.query.gia === 'duoi10') dieuKienLoc.GiaBan = { $lt: 10000000 };
            else if (req.query.gia === '10den20') dieuKienLoc.GiaBan = { $gte: 10000000, $lte: 20000000 };
            else if (req.query.gia === 'tren20') dieuKienLoc.GiaBan = { $gt: 20000000 };
        }

        const spTatCa = await SanPham.find(dieuKienLoc).populate('HangSanXuat');
        res.render('sanpham', { 
            title: 'Tất cả Tivi', 
            sanpham: spTatCa,
            khachhang: req.session.KhachHang, 
            query: req.query 
        });
    } catch (error) { 
        res.redirect('/'); 
    }
});

// ======================== CHI TIẾT SẢN PHẨM ========================
router.get('/sanpham/:id', async (req, res) => {
    try {
        const sp = await SanPham.findById(req.params.id).populate('HangSanXuat').populate('LoaiSanPham')
        .populate('HangSanXuat')
        .populate('LoaiSanPham')
        .populate('DanhGia.KhachHang'); // <--- Thêm đoạn này
        if (!sp) return res.redirect('/');

        let queryLienQuan = { _id: { $ne: sp._id } };
        if (sp.LoaiSanPham) queryLienQuan.LoaiSanPham = sp.LoaiSanPham._id;

        const spLienQuan = await SanPham.find(queryLienQuan).limit(4).populate('HangSanXuat');

        res.render('chitiet', {
            title: sp.TenSP,
            sanpham: sp,
            splienquan: spLienQuan,
            khachhang: req.session.KhachHang,
            query: req.query
        });
    } catch (error) { res.redirect('/'); }
});

// ======================== TÀI KHOẢN KHÁCH HÀNG ========================
router.get('/dangky', (req, res) => {
    if (req.session.KhachHang) return res.redirect('/');
    res.render('dangky', { title: 'Đăng ký Tài khoản', error: null, khachhang: null });
});

router.post('/dangky', async (req, res) => {
    try {
        const checkExist = await KhachHang.findOne({ TenDangNhap: req.body.TenDangNhap });
        if (checkExist) return res.render('dangky', { title: 'Đăng ký', error: 'Tên đăng nhập đã tồn tại!', khachhang: null });

        const salt = bcrypt.genSaltSync(10);
        await KhachHang.create({
            HoVaTen: req.body.HoVaTen,
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            DiaChi: req.body.DiaChi,
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt)
        });
        res.redirect('/dangnhap');
    } catch (error) { console.log(error); }
});

router.get('/dangnhap', (req, res) => {
    if (req.session.KhachHang) return res.redirect('/');
    res.render('dangnhap_khach', { title: 'Đăng nhập Khách hàng', error: null, khachhang: null });
});

router.post('/dangnhap', async (req, res) => {
    try {
        const kh = await KhachHang.findOne({ TenDangNhap: req.body.TenDangNhap });
        if (!kh || !bcrypt.compareSync(req.body.MatKhau, kh.MatKhau)) {
            return res.render('dangnhap_khach', { title: 'Đăng nhập', error: 'Sai tài khoản hoặc mật khẩu!', khachhang: null });
        }
        req.session.KhachHang = kh;
        res.redirect('/');
    } catch (error) { console.log(error); }
});

router.get('/dangxuat', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// ======================== LỊCH SỬ MUA HÀNG ========================
router.get('/lichsu', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');
    try {
        const hoadon = await HoaDon.find({ 
            KhachHang: req.session.KhachHang._id,
            HinhThucThanhToan: 'Trả hết',
            TrangThai: { $ne: 'Chờ duyệt' } 
        }).populate('ChiTietHoaDon.SanPham');

        const tatCaSanPham = await SanPham.find({ SoLuongTon: { $gt: 0 } }); 
        res.render('lichsu', { title: 'Lịch sử mua hàng', khachhang: req.session.KhachHang, hoadon: hoadon, sanpham: tatCaSanPham });
    } catch (error) { console.log(error); }
});

router.post('/yeucau-doitra', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');
    try {
        const { HoaDonId, LoaiYeuCau, LyDo, SanPhamMoiId } = req.body;
        let yeuCau = { KhachHang: req.session.KhachHang._id, HoaDon: HoaDonId, LoaiYeuCau: LoaiYeuCau, LyDo: LyDo };
        if (LoaiYeuCau === 'Đổi hàng' && SanPhamMoiId) yeuCau.SanPhamMoi = [{ SanPham: SanPhamMoiId, SoLuong: 1 }];
        
        await DoiTra.create(yeuCau);
        res.send(`<script>alert("Gửi yêu cầu ${LoaiYeuCau} thành công!"); window.location.href="/lichsu";</script>`);
    } catch (error) { console.log(error); }
});

// ======================== TÍNH NĂNG ĐÁNH GIÁ SAO ========================
router.post('/danhgia/:id', async (req, res) => {
    // Phải đăng nhập mới được đánh giá
    if (!req.session.KhachHang) {
        return res.send('<script>alert("Vui lòng đăng nhập để gửi đánh giá!"); window.history.back();</script>');
    }
    try {
        const sp = await SanPham.findById(req.params.id);
        if (sp) {
            // Đẩy đánh giá mới vào mảng DanhGia của sản phẩm
            sp.DanhGia.push({
                KhachHang: req.session.KhachHang._id,
                SoSao: parseInt(req.body.SoSao),
                BinhLuan: req.body.BinhLuan
            });
            await sp.save(); // Lưu lại vào DB
        }
        res.redirect('/sanpham/' + req.params.id); // Load lại trang chi tiết Tivi
    } catch (error) { console.log(error); }
});

// ======================== GIỎ HÀNG & THANH TOÁN ========================
router.get('/themvaogio/:id', async (req, res) => {
    try {
        const sp = await SanPham.findById(req.params.id);
        if (!sp) return res.redirect('/');

        let giaBanThucTe = sp.GiaBan; // Bỏ qua khuyến mãi tạm thời cho gọn
        if (!req.session.GioHang) req.session.GioHang = [];

        let index = req.session.GioHang.findIndex(item => item.SanPhamId == sp._id);
        if (index !== -1) {
            req.session.GioHang[index].SoLuong += 1;
            req.session.GioHang[index].ThanhTien = req.session.GioHang[index].SoLuong * req.session.GioHang[index].GiaBan;
        } else {
            req.session.GioHang.push({
                SanPhamId: sp._id, TenSP: sp.TenSP, HinhAnh: sp.HinhAnh,
                GiaBan: giaBanThucTe, SoLuong: 1, ThanhTien: giaBanThucTe
            });
        }
        res.redirect('/giohang');
    } catch (error) { console.log(error); }
});

router.get('/giohang', async (req, res) => {
    let giohang = req.session.GioHang || [];
    let tongTien = giohang.reduce((sum, item) => sum + item.ThanhTien, 0);

    let isNoXau = false;
    if (req.session.KhachHang) {
        const check = await TraGop.findOne({ KhachHang: req.session.KhachHang._id, TrangThai: 'Nợ xấu' });
        if (check) isNoXau = true;
    }

    res.render('giohang', {
        title: 'Giỏ hàng của bạn', khachhang: req.session.KhachHang,
        giohang: giohang, tongTien: tongTien, isNoXau: isNoXau 
    });
});

router.get('/xoagiohang/:id', (req, res) => {
    if (req.session.GioHang) req.session.GioHang = req.session.GioHang.filter(item => item.SanPhamId != req.params.id);
    res.redirect('/giohang');
});

router.post('/thanhtoan', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');
    let giohang = req.session.GioHang || [];
    if (giohang.length === 0) return res.redirect('/giohang');

    let tongTien = giohang.reduce((sum, item) => sum + item.ThanhTien, 0);
    let hinhThuc = req.body.HinhThucThanhToan || 'Trả hết';
    let soThang = (hinhThuc === 'Trả góp') ? parseInt(req.body.SoThangTraGop) : 0;

    try {
        let chiTiet = giohang.map(item => ({ SanPham: item.SanPhamId, SoLuong: item.SoLuong, DonGiaBan: item.GiaBan }));

        if (hinhThuc === 'Trả góp') {
            const checkNoXau = await TraGop.findOne({ KhachHang: req.session.KhachHang._id, TrangThai: 'Nợ xấu' });
            if (checkNoXau) {
                return res.send(`<script>alert("Tài khoản NỢ XẤU, không thể trả góp!"); window.history.back();</script>`);
            }
        }

        await HoaDon.create({
            KhachHang: req.session.KhachHang._id, TongTien: tongTien, ChiTietHoaDon: chiTiet,
            HinhThucThanhToan: hinhThuc, SoThangTraGop: soThang, TrangThai: 'Chờ duyệt'
        });

        req.session.GioHang = [];
        res.send(`<script>alert("Đặt hàng thành công!"); window.location.href="/";</script>`);
    } catch (error) { console.log(error); }
});

module.exports = router;