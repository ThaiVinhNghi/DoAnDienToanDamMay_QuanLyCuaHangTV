var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var mongoose = require('mongoose'); // Gọi sẵn mongoose trên cùng để dùng cho toàn file

var SanPham = require('../models/sanpham');
var KhachHang = require('../models/khachhang');
var HoaDon = require('../models/hoadon');
var HangSanXuat = require('../models/hangsanxuat');

// ======================== TRANG CHỦ & TÌM KIẾM ========================
router.get('/', async (req, res) => {
    try {
        let dieuKienLoc = {}; 

        // 1. Lọc theo Tên (Tìm kiếm tương đối)
        if (req.query.timkiem && req.query.timkiem.trim() !== '') {
            dieuKienLoc.TenSP = { $regex: req.query.timkiem.trim(), $options: 'i' }; 
        }

        // 2. Lọc theo Hãng (Ép kiểu về ObjectId)
        if (req.query.hang && req.query.hang.trim() !== '') {
            dieuKienLoc.HangSanXuat = new mongoose.Types.ObjectId(req.query.hang.trim());
        }

        // 3. Lọc theo Khoảng Giá
        if (req.query.gia && req.query.gia !== '') {
            if (req.query.gia === 'duoi10') dieuKienLoc.GiaBan = { $lt: 10000000 };
            else if (req.query.gia === '10den20') dieuKienLoc.GiaBan = { $gte: 10000000, $lte: 20000000 };
            else if (req.query.gia === 'tren20') dieuKienLoc.GiaBan = { $gt: 20000000 };
        }

        const dsHang = await HangSanXuat.find(); 
        const spTatCa = await SanPham.find(dieuKienLoc).populate('HangSanXuat');
        const spGiamGia = await SanPham.find(dieuKienLoc).sort({ GiaBan: 1 }).limit(4).populate('HangSanXuat');

        res.render('index', { 
            title: 'Cửa hàng Tivi TVN', 
            sanpham: spTatCa,
            spgiamgia: spGiamGia,
            hangsanxuat: dsHang,
            khachhang: req.session.KhachHang, 
            query: req.query 
        });
    } catch (error) { 
        console.log("Lỗi bộ lọc trang chủ:", error); 
        res.redirect('/'); 
    }
});

// ======================== CHI TIẾT SẢN PHẨM ========================
router.get('/sanpham/:id', async (req, res) => {
    try {
        const sp = await SanPham.findById(req.params.id).populate('HangSanXuat').populate('LoaiSanPham');
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
    } catch (error) {
        console.log("Lỗi ở trang chi tiết:", error);
        res.redirect('/');
    }
});

// ======================== TÀI KHOẢN KHÁCH HÀNG ========================

// 1. Đăng ký
router.get('/dangky', (req, res) => {
    if (req.session.KhachHang) return res.redirect('/');
    res.render('dangky', { title: 'Đăng ký Tài khoản', error: null, khachhang: null });
});

router.post('/dangky', async (req, res) => {
    try {
        const checkExist = await KhachHang.findOne({ TenDangNhap: req.body.TenDangNhap });
        if (checkExist) {
            return res.render('dangky', { title: 'Đăng ký Tài khoản', error: 'Tên đăng nhập đã có người sử dụng!', khachhang: null });
        }

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

// 2. Đăng nhập Khách Hàng
router.get('/dangnhap', (req, res) => {
    if (req.session.KhachHang) return res.redirect('/');
    // Trỏ CHÍNH XÁC về file dangnhap_khach.ejs
    res.render('dangnhap_khach', { title: 'Đăng nhập Khách hàng', error: null, khachhang: null });
});

router.post('/dangnhap', async (req, res) => {
    try {
        const kh = await KhachHang.findOne({ TenDangNhap: req.body.TenDangNhap });
        if (!kh) {
            // Lỗi cũng phải trỏ về dangnhap_khach
            return res.render('dangnhap_khach', { title: 'Đăng nhập', error: 'Tài khoản không tồn tại!', khachhang: null });
        }

        const isMatch = bcrypt.compareSync(req.body.MatKhau, kh.MatKhau);
        if (!isMatch) {
            // Lỗi cũng phải trỏ về dangnhap_khach
            return res.render('dangnhap_khach', { title: 'Đăng nhập', error: 'Mật khẩu không chính xác!', khachhang: null });
        }

        req.session.KhachHang = kh;
        res.redirect('/');
    } catch (error) { console.log(error); }
});
// 3. Đăng xuất Khách Hàng (Duy nhất 1 cái ở đây)
router.get('/dangxuat', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.log("Lỗi đăng xuất:", err);
        res.redirect('/'); // Về trang chủ
    });
});


// ======================== GIỎ HÀNG & THANH TOÁN ========================

// 1. Thêm sản phẩm vào giỏ hàng
router.get('/themvaogio/:id', async (req, res) => {
    try {
        const idSP = req.params.id;
        const sp = await SanPham.findById(idSP);
        if (!sp) return res.redirect('/');

        let phanTramGiam = parseInt(req.query.km) || 0;
        let giaBanThucTe = sp.GiaBan - (sp.GiaBan * phanTramGiam / 100);

        if (!req.session.GioHang) req.session.GioHang = [];

        let index = req.session.GioHang.findIndex(item => item.SanPhamId == idSP);

        if (index !== -1) {
            req.session.GioHang[index].SoLuong += 1;
            if (phanTramGiam > 0) req.session.GioHang[index].GiaBan = giaBanThucTe;
            req.session.GioHang[index].ThanhTien = req.session.GioHang[index].SoLuong * req.session.GioHang[index].GiaBan;
        } else {
            req.session.GioHang.push({
                SanPhamId: sp._id,
                TenSP: sp.TenSP,
                HinhAnh: sp.HinhAnh,
                GiaBan: giaBanThucTe,
                SoLuong: 1,
                ThanhTien: giaBanThucTe
            });
        }
        res.redirect('/giohang');
    } catch (error) { console.log(error); }
});

// 2. Hiển thị Giỏ hàng
router.get('/giohang', (req, res) => {
    let giohang = req.session.GioHang || [];
    let tongTien = giohang.reduce((sum, item) => sum + item.ThanhTien, 0);

    res.render('giohang', {
        title: 'Giỏ hàng của bạn',
        khachhang: req.session.KhachHang,
        giohang: giohang,
        tongTien: tongTien
    });
});

// 3. Xóa 1 sản phẩm khỏi giỏ
router.get('/xoagiohang/:id', (req, res) => {
    if (req.session.GioHang) {
        req.session.GioHang = req.session.GioHang.filter(item => item.SanPhamId != req.params.id);
    }
    res.redirect('/giohang');
});

// 4. Thanh toán & Tạo Hóa đơn
router.post('/thanhtoan', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');

    let giohang = req.session.GioHang || [];
    if (giohang.length === 0) return res.redirect('/giohang');

    let tongTien = giohang.reduce((sum, item) => sum + item.ThanhTien, 0);
    let hinhThuc = req.body.HinhThucThanhToan || 'Trả hết';
    let soThang = (hinhThuc === 'Trả góp') ? parseInt(req.body.SoThangTraGop) : 0;

    try {
        let chiTiet = giohang.map(item => {
            return { SanPham: item.SanPhamId, SoLuong: item.SoLuong, DonGiaBan: item.GiaBan }
        });

        await HoaDon.create({
            KhachHang: req.session.KhachHang._id,
            TongTien: tongTien,
            ChiTietHoaDon: chiTiet,
            HinhThucThanhToan: hinhThuc,
            SoThangTraGop: soThang, 
            TrangThai: 'Chờ duyệt'
        });

        req.session.GioHang = []; // Thanh toán xong thì xóa trắng giỏ hàng
        res.send(`<script>alert("🎉 Đặt hàng thành công! Hình thức: ${hinhThuc}. Đơn hàng đang chờ Admin duyệt."); window.location.href="/";</script>`);
    } catch (error) { console.log(error); }
});

module.exports = router;