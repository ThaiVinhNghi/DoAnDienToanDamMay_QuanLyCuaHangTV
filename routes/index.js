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


const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;

// 1. Cấu hình Chiến lược Đăng nhập Facebook
passport.use(new FacebookStrategy({
    clientID: '26573543515632775',       // Sẽ lấy ở Bước 3
    clientSecret: 'cbacc4d544f065d90fb668388358ea63', // Sẽ lấy ở Bước 3
    callbackURL: "https://doandientoandammay-quanlycuahangtv.onrender.com/auth/facebook/callback",

    profileFields: ['id', 'displayName', 'emails']
},
    async function (accessToken, refreshToken, profile, cb) {
        try {
            // Kiểm tra xem khách này đã từng đăng nhập bằng Facebook chưa
            let user = await KhachHang.findOne({ FacebookId: profile.id });

            if (!user) {
                // Nếu là khách mới tinh -> Tự động tạo tài khoản mới vào CSDL
                user = await KhachHang.create({
                    FacebookId: profile.id,
                    HoVaTen: profile.displayName,
                    Email: profile.emails ? profile.emails[0].value : '',
                    TenDangNhap: 'fb_' + profile.id, // Tạo tên đăng nhập tự động
                    MatKhau: 'da_dang_nhap_bang_facebook', // Bỏ qua mật khẩu
                    DiaChi: 'Chưa cập nhật',
                    SoDienThoai: 'Chưa cập nhật',
                    TrangThai: 1
                });
            }
            return cb(null, user); // Trả thông tin user về cho Passport
        } catch (err) {
            return cb(err, null);
        }
    }
));

// (Bắt buộc cho Passport) Hàm đóng gói user
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));


// ================================================================
// 2. TẠO 2 ROUTE ĐỂ GIAO TIẾP VỚI FACEBOOK
// ================================================================

// Route 1: Khi khách bấm nút "Đăng nhập bằng FB", đẩy họ sang trang của Facebook
// Mới
router.get('/auth/facebook', passport.authenticate('facebook'));
// Route 2: Nơi Facebook trả kết quả về sau khi khách bấm "Tiếp tục dưới tên..."
router.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/dangnhap' }),
    function (req, res) {
        // Thành công! Lưu thông tin khách vào Session giống hệt cách bạn đang làm
        req.session.KhachHang = req.user;
        res.redirect('/'); // Đá về trang chủ
    }
);


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

        // Flash Sale: ưu tiên SP có GiaGoc > GiaBan (giảm giá thật)
        // Nếu chưa có SP nào được set GiaGoc → fallback: lấy 4 SP rẻ nhất còn hàng
        let spGiamGia = await SanPham.find({ GiaGoc: { $gt: 0 }, $expr: { $gt: ['$GiaGoc', '$GiaBan'] } })
            .sort({ GiaBan: 1 }).limit(4).populate('HangSanXuat');

        let isFlashSaleReal = spGiamGia.length > 0;

        if (!isFlashSaleReal) {
            // Fallback: lấy 4 SP rẻ nhất còn hàng để section không trống
            spGiamGia = await SanPham.find({ SoLuongTon: { $gt: 0 } })
                .sort({ GiaBan: 1 }).limit(4).populate('HangSanXuat');
        }

        const tinTucMoi = await TinTuc.find({ TrangThai: true }).sort({ NgayDang: -1 }).limit(3);

        res.render('index', {
            title: 'Cửa hàng Tivi TVN',
            sanpham: spTatCa,
            spgiamgia: spGiamGia,
            isFlashSaleReal: isFlashSaleReal, // true = có GiaGoc thật, false = fallback
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



// ======================== TIN TỨC ========================
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
        // FIX #10: Thêm lọc theo Hãng cho trang /sanpham
        if (req.query.hang && req.query.hang.trim() !== '') {
            dieuKienLoc.HangSanXuat = new mongoose.Types.ObjectId(req.query.hang.trim());
        }
        if (req.query.gia && req.query.gia !== '') {
            if (req.query.gia === 'duoi10') dieuKienLoc.GiaBan = { $lt: 10000000 };
            else if (req.query.gia === '10den20') dieuKienLoc.GiaBan = { $gte: 10000000, $lte: 20000000 };
            else if (req.query.gia === 'tren20') dieuKienLoc.GiaBan = { $gt: 20000000 };
        }

        const spTatCa = await SanPham.find(dieuKienLoc).populate('HangSanXuat');
        const dsHang = await HangSanXuat.find();
        res.render('sanpham', {
            title: 'Tất cả Tivi',
            sanpham: spTatCa,
            hangsanxuat: dsHang,
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
        const sp = await SanPham.findById(req.params.id)
            .populate('HangSanXuat')
            .populate('LoaiSanPham')
            .populate('DanhGia.KhachHang');

        if (!sp) return res.redirect('/');

        let queryLienQuan = { _id: { $ne: sp._id } };
        if (sp.LoaiSanPham) queryLienQuan.LoaiSanPham = sp.LoaiSanPham._id;

        const spLienQuan = await SanPham.find(queryLienQuan).limit(4).populate('HangSanXuat');

        let daMuaHang = false;
        let daDanhGia = false;
        let dangDoiTra = false; // THÊM BIẾN NÀY ĐỂ CHECK ĐỔI TRẢ Ở TRANG CHI TIẾT

        if (req.session.KhachHang) {
            // Check hóa đơn đã mua
            const checkHD = await HoaDon.findOne({
                KhachHang: req.session.KhachHang._id,
                'ChiTietHoaDon.SanPham': sp._id,
                TrangThai: { $ne: 'Chờ duyệt' }
            }).lean();

            if (checkHD) {
                daMuaHang = true;
                // Nếu đã mua, kiểm tra xem đơn hàng chứa sản phẩm này có đang yêu cầu Đổi/Trả không
                const checkDoiTra = await DoiTra.findOne({ HoaDon: checkHD._id });
                if (checkDoiTra) {
                    dangDoiTra = true; // Bật cờ khóa đánh giá
                }
            }

            // Check xem khách đã gửi đánh giá trước đó chưa
            const checkDG = sp.DanhGia.find(dg => dg.KhachHang._id.toString() === req.session.KhachHang._id.toString());
            if (checkDG) daDanhGia = true;
        }

        res.render('chitiet', {
            title: sp.TenSP,
            sanpham: sp,
            splienquan: spLienQuan,
            khachhang: req.session.KhachHang,
            query: req.query,
            daMuaHang: daMuaHang,
            daDanhGia: daDanhGia,
            dangDoiTra: dangDoiTra // ĐẨY BIẾN NÀY RA GIAO DIỆN CHITIET.EJS
        });
    } catch (error) {
        console.log("Lỗi ở trang chi tiết:", error);
        res.redirect('/');
    }
});

// ======================== TÀI KHOẢN KHÁCH HÀNG ========================
router.get('/dangky', (req, res) => {
    if (req.session.KhachHang) return res.redirect('/');
    res.render('dangky', { title: 'Đăng ký Tài khoản', error: null, khachhang: null });
});

router.post('/dangky', async (req, res) => {
    try {
        // FIX #13: Validate đầu vào
        const { HoVaTen, SoDienThoai, TenDangNhap, MatKhau, Email, DiaChi } = req.body;
        if (!TenDangNhap || TenDangNhap.trim().length < 4) {
            return res.render('dangky', { title: 'Căng ký', error: 'Tên đăng nhập phải có ít nhất 4 ký tự!', khachhang: null });
        }
        if (!MatKhau || MatKhau.length < 6) {
            return res.render('dangky', { title: 'Đăng ký', error: 'Mật khẩu phải có ít nhất 6 ký tự!', khachhang: null });
        }
        if (!/^\d{9,11}$/.test(SoDienThoai)) {
            return res.render('dangky', { title: 'Đăng ký', error: 'Số điện thoại không hợp lệ!', khachhang: null });
        }

        const checkExist = await KhachHang.findOne({ TenDangNhap: TenDangNhap });
        if (checkExist) return res.render('dangky', { title: 'Đăng ký', error: 'Tên đăng nhập đã tồn tại!', khachhang: null });

        const salt = bcrypt.genSaltSync(10);
        await KhachHang.create({
            HoVaTen: HoVaTen,
            SoDienThoai: SoDienThoai,
            Email: Email,
            DiaChi: DiaChi,
            TenDangNhap: TenDangNhap,
            MatKhau: bcrypt.hashSync(MatKhau, salt)
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

// ======================== QUÊN MẬT KHẨU ========================
// 1. Hiển thị form nhập thông tin xác thực
router.get('/quenmatkhau', (req, res) => {
    if (req.session.KhachHang) return res.redirect('/');
    res.render('quenmatkhau', { title: 'Quên mật khẩu', error: null });
});

// 2. Xử lý kiểm tra thông tin
router.post('/quenmatkhau', async (req, res) => {
    try {
        const { TenDangNhap, SoDienThoai } = req.body;
        // Tìm khách hàng có khớp cả Tên đăng nhập và Số điện thoại không
        const kh = await KhachHang.findOne({ TenDangNhap: TenDangNhap, SoDienThoai: SoDienThoai });

        if (!kh) {
            return res.render('quenmatkhau', { title: 'Quên mật khẩu', error: 'Tên đăng nhập hoặc Số điện thoại không chính xác!' });
        }

        // Nếu đúng, lưu tạm ID vào session để bước sau cho phép đổi mật khẩu
        req.session.ResetPassId = kh._id;
        res.redirect('/datlaimatkhau');
    } catch (error) {
        console.log(error);
        res.redirect('/quenmatkhau');
    }
});

// 3. Hiển thị form nhập mật khẩu mới
router.get('/datlaimatkhau', (req, res) => {
    // Chặn người dùng nếu chưa vượt qua bước nhập số điện thoại
    if (!req.session.ResetPassId) return res.redirect('/quenmatkhau');
    res.render('datlaimatkhau', { title: 'Đặt lại mật khẩu', error: null });
});

// 4. Xử lý lưu mật khẩu mới vào Database
router.post('/datlaimatkhau', async (req, res) => {
    if (!req.session.ResetPassId) return res.redirect('/quenmatkhau');

    try {
        const { MatKhauMoi, XacNhanMatKhau } = req.body;

        if (MatKhauMoi !== XacNhanMatKhau) {
            return res.render('datlaimatkhau', { title: 'Đặt lại mật khẩu', error: 'Mật khẩu xác nhận không khớp!' });
        }

        // Mã hóa mật khẩu mới
        const salt = bcrypt.genSaltSync(10);
        const hashPassword = bcrypt.hashSync(MatKhauMoi, salt);

        // Cập nhật vào DB
        await KhachHang.findByIdAndUpdate(req.session.ResetPassId, { MatKhau: hashPassword });

        // Xóa quyền đổi mật khẩu tạm thời
        delete req.session.ResetPassId;

        // Báo thành công và chuyển về trang đăng nhập
        res.send(`<script>alert("Khôi phục mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới."); window.location.href="/dangnhap";</script>`);
    } catch (error) {
        console.log(error);
        res.redirect('/datlaimatkhau');
    }
});

// ======================== LỊCH SỬ MUA HÀNG ========================
router.get('/lichsu', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');
    try {
        // FIX #5: Bỏ lọc HinhThucThanhToan - hiển thị cả đơn trả góp
        const hoadon = await HoaDon.find({
            KhachHang: req.session.KhachHang._id,
            TrangThai: { $ne: 'Chờ duyệt' }
        }).populate('ChiTietHoaDon.SanPham').lean();

        for (let hd of hoadon) {
            // 1. LẤY CHI TIẾT YÊU CẦU ĐỔI TRẢ (᫪U CÓ)
            let checkYeuCau = await DoiTra.findOne({ HoaDon: hd._id }).lean();
            hd.YeuCauDoiTra = checkYeuCau || null;

            // 2. KIỂM TRA ĐÃ ĐÁNH GIÁ
            hd.daDanhGiaSanPham = false;
            if (hd.ChiTietHoaDon && hd.ChiTietHoaDon.length > 0) {
                for (let item of hd.ChiTietHoaDon) {
                    if (item.SanPham && item.SanPham.DanhGia && item.SanPham.DanhGia.length > 0) {
                        const foundReview = item.SanPham.DanhGia.find(
                            dg => dg.KhachHang.toString() === req.session.KhachHang._id.toString()
                        );
                        if (foundReview) { hd.daDanhGiaSanPham = true; break; }
                    }
                }
            }

            // 3. FIX #5: LẤY THÔNG TIN TRẢ GÓP cho các đơn hàng trả góp
            if (hd.HinhThucThanhToan === 'Trả góp') {
                const tgInfo = await TraGop.findOne({ HoaDon: hd._id }).lean();
                hd.TraGopInfo = tgInfo;
            }
        }

        const tatCaSanPham = await SanPham.find({ SoLuongTon: { $gt: 0 } });
        res.render('lichsu', {
            title: 'Lịch sử mua hàng',
            khachhang: req.session.KhachHang,
            hoadon: hoadon,
            sanpham: tatCaSanPham
        });
    } catch (error) { console.log(error); }
});


// ======================== TÍNH NĂNG ĐÁNH GIÁ SAO ========================
router.post('/danhgia/:id', async (req, res) => {
    if (!req.session.KhachHang) {
        return res.send('<script>alert("Vui lòng đăng nhập để gửi đánh giá!"); window.history.back();</script>');
    }
    try {
        const checkHD = await HoaDon.findOne({
            KhachHang: req.session.KhachHang._id,
            'ChiTietHoaDon.SanPham': req.params.id,
            TrangThai: { $ne: 'Chờ duyệt' }
        });

        if (!checkHD) {
            return res.send('<script>alert("Cảnh báo: Bạn phải mua sản phẩm này thì mới được đánh giá!"); window.history.back();</script>');
        }

        // KIỂM TRA ĐỔI TRẢ ĐỂ CHẶN ĐÁNH GIÁ TỪ SERVER (BẢO MẬT)
        const checkDoiTra = await DoiTra.findOne({ HoaDon: checkHD._id });
        if (checkDoiTra) {
            return res.send('<script>alert("Cảnh báo: Sản phẩm này đang yêu cầu đổi trả, không thể đánh giá!"); window.history.back();</script>');
        }

        const sp = await SanPham.findById(req.params.id);
        if (sp) {
            const daDanhGia = sp.DanhGia.find(dg => dg.KhachHang.toString() === req.session.KhachHang._id.toString());
            if (daDanhGia) {
                return res.send('<script>alert("Bạn đã đánh giá sản phẩm này rồi!"); window.history.back();</script>');
            }

            sp.DanhGia.push({
                KhachHang: req.session.KhachHang._id,
                SoSao: parseInt(req.body.SoSao),
                BinhLuan: req.body.BinhLuan
            });
            await sp.save();
        }
        res.redirect('/sanpham/' + req.params.id);
    } catch (error) { console.log(error); }
});

// ======================== GIỎ HÀNG & THANH TOÁN ========================
router.get('/themvaogio/:id', async (req, res) => {
    try {
        const sp = await SanPham.findById(req.params.id);
        if (!sp) return res.redirect('/');

        // FIX #8: Kiểm tra tồn kho trước khi cho vào giỏ
        if (sp.SoLuongTon <= 0) {
            return res.send('<script>alert("Sản phẩm này đã hết hàng!"); window.history.back();</script>');
        }

        let giaBanThucTe = sp.GiaBan;
        if (!req.session.GioHang) req.session.GioHang = [];

        let index = req.session.GioHang.findIndex(item => item.SanPhamId == sp._id);
        if (index !== -1) {
            // Kiểm tra số lượng trong giỏ không vượt tồn kho
            if (req.session.GioHang[index].SoLuong >= sp.SoLuongTon) {
                return res.send('<script>alert("Số lượng trong giỏ đã đạt tối đa tồn kho!"); window.history.back();</script>');
            }
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

// ======================== YÊU CẦU ĐỔI / TRẢ HÀNG ========================
router.post('/yeucau-doitra', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');

    try {
        const { HoaDonId, LoaiYeuCau, LyDo, SanPhamMoiId } = req.body;

        // Xác minh hóa đơn thuộc về khách đang đăng nhập
        const hd = await HoaDon.findOne({
            _id: HoaDonId,
            KhachHang: req.session.KhachHang._id,
            TrangThai: { $ne: 'Chờ duyệt' } // Chỉ đổi/trả đơn đã được duyệt
        });

        if (!hd) {
            return res.send('<script>alert("Yêu cầu không hợp lệ!"); window.history.back();</script>');
        }

        // Kiểm tra đã có yêu cầu đổi/trả cho đơn này chưa
        const checkTonTai = await DoiTra.findOne({ HoaDon: HoaDonId });
        if (checkTonTai) {
            return res.send('<script>alert("Đơn hàng này đã có yêu cầu Đổi/Trả trước đó!"); window.history.back();</script>');
        }

        let sanPhamMoiData = [];
        if (LoaiYeuCau === 'Đổi hàng' && SanPhamMoiId) {
            sanPhamMoiData = [{ SanPham: SanPhamMoiId, SoLuong: 1 }];
        }

        await DoiTra.create({
            KhachHang: req.session.KhachHang._id,
            HoaDon: HoaDonId,
            LoaiYeuCau: LoaiYeuCau,
            LyDo: LyDo,
            SanPhamMoi: sanPhamMoiData
        });

        res.send('<script>alert("Gửi yêu cầu Đổi/Trả thành công! Nhân viên sẽ liên hệ bạn sớm."); window.location.href="/lichsu";</script>');
    } catch (error) {
        console.log("Lỗi yeucau-doitra:", error);
        res.send('<script>alert("Có lỗi xảy ra, vui lòng thử lại!"); window.history.back();</script>');
    }
});

router.post('/thanhtoan', async (req, res) => {
    if (!req.session.KhachHang) return res.redirect('/dangnhap');
    let giohang = req.session.GioHang || [];
    if (giohang.length === 0) return res.redirect('/giohang');

    let tongTien = giohang.reduce((sum, item) => sum + item.ThanhTien, 0);
    let hinhThuc = req.body.HinhThucThanhToan || 'Trả hết';
    let soThang = (hinhThuc === 'Trả góp') ? parseInt(req.body.SoThangTraGop) : 0;

    try {
        // FIX #9: Kiểm tra tồn kho trước khi đặt hàng
        for (let item of giohang) {
            const sp = await SanPham.findById(item.SanPhamId);
            if (!sp || sp.SoLuongTon < item.SoLuong) {
                return res.send(`<script>alert("Sản phẩm '${item.TenSP}' không đủ số lượng trong kho (chỉ còn ${sp ? sp.SoLuongTon : 0})!"); window.history.back();</script>`);
            }
        }

        let chiTiet = giohang.map(item => ({ SanPham: item.SanPhamId, SoLuong: item.SoLuong, DonGiaBan: item.GiaBan }));

        // XỬ LÝ CHẶN DANH SÁCH ĐEN KHI MUA TRẢ GÓP
        if (hinhThuc === 'Trả góp') {
            const checkBlacklist = await TraGop.findOne({
                KhachHang: req.session.KhachHang._id,
                TrangThai: { $in: ['Nợ xấu', 'Đã thu hồi nợ'] }
            });

            if (checkBlacklist) {
                return res.send(`<script>alert("TỪ CHỐI: Tài khoản của bạn nằm trong Danh Sách Đen do từng có lịch sử Nợ Xấu. Bạn vĩnh viễn không thể sử dụng tính năng Trả góp!"); window.history.back();</script>`);
            }
        }

        await HoaDon.create({
            KhachHang: req.session.KhachHang._id,
            TongTien: tongTien,
            ChiTietHoaDon: chiTiet,
            HinhThucThanhToan: hinhThuc,
            SoThangTraGop: soThang,
            TrangThai: 'Chờ duyệt',
            CCCD: req.body.CCCD,           // <--- THÊM DÒNG NÀY VÀO
            NgaySinh: req.body.NgaySinh    // <--- THÊM DÒNG NÀY VÀO
        });

        req.session.GioHang = [];
        res.send(`<script>alert("Đặt hàng thành công!"); window.location.href="/";</script>`);
    } catch (error) { console.log(error); }
});


module.exports = router;