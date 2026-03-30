var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var NhanVien = require('../models/nhanvien');
var KhachHang = require('../models/khachhang');
var SanPham = require('../models/sanpham');
var HoaDon = require('../models/hoadon');
var TraGop = require('../models/tragop');

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

// 4. ĐƯỜNG DẪN BÍ MẬT: Tạo tài khoản Admin đầu tiên
router.get('/taomau', async (req, res) => {
    try {
        const checkExist = await NhanVien.findOne({ TenDangNhap: 'admin' });
        if (checkExist) return res.send('Tài khoản admin đã tồn tại rồi!');

        const salt = bcrypt.genSaltSync(10);
        await NhanVien.create({
            HoVaTen: 'Quản trị viên',
            TenDangNhap: 'admin',
            MatKhau: bcrypt.hashSync('123456', salt), 
            QuyenHan: 'admin',
            TrangThai: 1
        });
        res.send('Đã tạo thành công tài khoản: admin / Mật khẩu: 123456. Hãy quay lại trang /admin/dangnhap để thử.');
    } catch (error) {
        res.send('Lỗi tạo mẫu: ' + error.message);
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

        res.render('admin/index', { 
            title: 'Bảng điều khiển Admin', 
            nhanvien: req.session.NhanVien,
            soSanPham: soSanPham,
            soKhachHang: soKhachHang,
            soHoaDon: soHoaDon,
            tongDoanhThu: tongDoanhThu
        });
    } catch (error) {
        console.log(error);
        res.send("Lỗi tải bảng điều khiển: " + error.message);
    }
});

// ======================== QUẢN LÝ TRẢ GÓP & HÓA ĐƠN ========================

// 1. Tự động tạo hồ sơ Trả góp khi Duyệt Hóa đơn
router.get('/hoadon/duyet/:id', checkLogin, async (req, res) => {
    try {
        const hd = await HoaDon.findById(req.params.id);
        hd.TrangThai = 'Đã duyệt';
        hd.NhanVienDuyet = req.session.NhanVien._id;
        await hd.save();

        if (hd.HinhThucThanhToan === 'Trả góp') {
            const checkTonTai = await TraGop.findOne({ HoaDon: hd._id });
            if(!checkTonTai) {
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
    } catch(err) { console.log(err); }
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

// 5. Tất toán toàn bộ
router.post('/tragop/tattoan/:id', checkLogin, async (req, res) => {
    try {
        let tg = await TraGop.findById(req.params.id);
        
        if (tg && tg.TrangThai !== 'Đã tất toán') {
            let soThangConLai = tg.SoThang - tg.SoThangDaTra;
            let soTienTatToan = soThangConLai * tg.TienTraMoiThang;

            tg.SoThangDaTra = tg.SoThang;
            tg.TrangThai = 'Đã tất toán';
            tg.NgayThanhToanGanNhat = new Date();
            tg.SoLanNhacNho = 0; // Tất toán xong thì sạch nợ, sạch cảnh báo

            tg.LichSuThuTien.push({
                SoTienThu: soTienTatToan,
                KỳThanhToan: tg.SoThang 
            });

            await tg.save();
        }
        res.redirect('/admin/tragop');
    } catch (error) { 
        console.log(error); 
        res.send("Lỗi tất toán: " + error.message); 
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