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
var NhatKy = require('../models/nhatky'); // Import Model Nhật Ký
var BaoHanh = require('../models/baohanh'); // Import Model Bảo Hành
var { guiNhacNo } = require('../utils/email'); // Import hàm gửi email nhắc nợ

// ======================== HÀM TIỆN ÍCH GHI NHẬT KÝ ========================
async function ghiNhatKy(nhanVienId, tenNhanVien, hanhDong, chiTiet, loaiLog) {
    try {
        await NhatKy.create({
            NhanVien: nhanVienId || null,
            TenNhanVien: tenNhanVien || 'Hệ thống',
            HanhDong: hanhDong,
            ChiTiet: chiTiet || '',
            LoaiLog: loaiLog || 'khac'
        });
    } catch (err) {
        console.log('Lỗi ghi nhật ký:', err.message);
    }
}

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

        // GHI NHẬT KÝ: Đăng nhập
        await ghiNhatKy(nv._id, nv.HoVaTen, 'Đăng nhập hệ thống', `Nhân viên "${nv.HoVaTen}" (${nv.TenDangNhap}) đã đăng nhập vào hệ thống quản trị.`, 'dang-nhap');

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

        // Doanh thu = tất cả đơn đã duyệt + đơn đã đổi hàng (TongTien đã được cập nhật về giá SP mới)
        // KHÔNG tính đơn 'Đã hoàn trả' (khách trả hàng toàn bộ)
        const danhSachHoaDon = await HoaDon.find({
            TrangThai: { $in: ['Đã duyệt', 'Đã đổi hàng'] }
        });
        let tongDoanhThu = danhSachHoaDon.reduce((sum, hd) => sum + hd.TongTien, 0);

        // Tiền hoàn trả hàng hoàn toàn
        const danhSachHoanTra = await HoaDon.find({ TrangThai: 'Đã hoàn trả' });
        const tongHoanTraHang = danhSachHoanTra.reduce((sum, hd) => sum + hd.TongTien, 0);

        // Tiền hoàn lại khi đổi sang SP rẻ hơn (chênh lệch giá)
        const tongHoanLaiDoiHang = danhSachHoaDon
            .filter(hd => hd.TrangThai === 'Đã đổi hàng')
            .reduce((sum, hd) => sum + (hd.SoTienHoanLai || 0), 0);

        // Tổng tiền đã hoàn cho khách (gộp cả 2 loại để hiển thị trên dashboard)
        const tongHoanTra = tongHoanTraHang + tongHoanLaiDoiHang;

        // --- CÁC TRUY VẤN MỚI CHO DASHBOARD TỰ ĐỘNG ---

        // 1. Sản phẩm sắp hết hàng (Tồn kho <= 5)
        const spHetHang = await SanPham.find({ SoLuongTon: { $lte: 5 } }).sort({ SoLuongTon: 1 }).limit(5);

        // 2. Các yêu cầu chưa xử lý (Đổi trả chờ xử lý)
        const ycKhachHang = await DoiTra.find({ TrangThai: 'Chờ xử lý' }).populate('KhachHang').limit(5);

        // 3. Đơn hàng chờ duyệt mới nhất
        const hdChoDuyet = await HoaDon.find({ TrangThai: 'Chờ duyệt' }).populate('KhachHang').sort({ NgayLap: -1 }).limit(5);

        // 4. Sản phẩm bán chạy 

        const spBanChay = await SanPham.find({}).sort({ SoLuongTon: 1 }).limit(5);

        res.render('admin/index', {
            title: 'Bảng điều khiển Admin',
            nhanvien: req.session.NhanVien,
            soSanPham, soKhachHang, soHoaDon, tongDoanhThu, tongHoanTra, doanhThuThuc,
            spHetHang, ycKhachHang, hdChoDuyet, spBanChay
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

        // Lấy thêm thông tin khách hàng để ghi log
        const khDuyet = await KhachHang.findById(hd.KhachHang);
        const tenKH = khDuyet ? khDuyet.HoVaTen : 'Không xác định';

        for (let item of hd.ChiTietHoaDon) {
            let sp = await SanPham.findById(item.SanPham);
            if (sp) {
                sp.SoLuongTon -= item.SoLuong;
                if (sp.SoLuongTon < 0) sp.SoLuongTon = 0;
                await sp.save();
            }
        }

        // GHI NHẬT KÝ: Duyệt hóa đơn
        const nv = req.session.NhanVien;
        await ghiNhatKy(nv._id, nv.HoVaTen, 'Duyệt hóa đơn', `Duyệt hóa đơn #${hd._id} của khách hàng "${tenKH}", tổng tiền ${hd.TongTien.toLocaleString('vi-VN')} VNĐ.`, 'hoa-don');

        // TỰ ĐỘNG SINH PHỪU BẢO HÀNH cho mỗi sản phẩm trong đơn
        for (let item of hd.ChiTietHoaDon) {
            const spBH = await SanPham.findById(item.SanPham);
            const tenSP = spBH ? spBH.TenSP : 'Sản phẩm không xác định';
            const ngayBatDau = new Date();
            const ngayKetThuc = new Date(ngayBatDau);
            ngayKetThuc.setMonth(ngayKetThuc.getMonth() + 24); // Bảo hành 24 tháng

            await BaoHanh.create({
                HoaDon: hd._id,
                KhachHang: hd.KhachHang,
                SanPham: item.SanPham,
                TenSanPham: tenSP,
                SoLuong: item.SoLuong,
                NgayBatDau: ngayBatDau,
                NgayKetThuc: ngayKetThuc,
                ThoiHanBaoHanh: 24,
                TrangThai: 'Còn bảo hành'
            });
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

                // GHI NHẬT KÝ: Lập hồ sơ trả góp
                await ghiNhatKy(nv._id, nv.HoVaTen, 'Lập hồ sơ trả góp', `Lập hồ sơ trả góp cho khách hàng "${tenKH}", ${soThang} tháng, trả mỗi tháng ${tienMoiThang.toLocaleString('vi-VN')} VNĐ.`, 'tra-gop');
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
        const hoadon = await HoaDon.findById(req.params.id).populate('KhachHang');
        if (hoadon) {
            hoadon.TrangThai = 'Từ chối';
            await hoadon.save();

            // GHI NHẬT KÝ: Từ chối hóa đơn
            const nv = req.session.NhanVien;
            const tenKH = hoadon.KhachHang ? hoadon.KhachHang.HoVaTen : 'Không xác định';
            await ghiNhatKy(nv._id, nv.HoVaTen, 'Từ chối hóa đơn', `Từ chối hóa đơn #${hoadon._id} của khách hàng "${tenKH}".`, 'hoa-don');
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

        // Ghi nhật ký: Thu tiền
        const nv = req.session.NhanVien;
        await ghiNhatKy(nv._id, nv.HoVaTen, 'Thu tiền trả góp', `Thu tiền kỳ ${tg.SoThangDaTra} (Số tiền: ${tg.TienTraMoiThang.toLocaleString('vi-VN')} VNĐ) cho hồ sơ #${tg._id}.`, 'tra-gop');
        res.redirect('/admin/tragop');
    } catch (err) { console.log(err); }
});

// 4. Nhắc nhở nợ + GỬI EMAIL TỰ ĐỘNG
router.post('/tragop/nhacnho/:id', checkLogin, async (req, res) => {
    try {
        let tg = await TraGop.findById(req.params.id)
            .populate('KhachHang')
            .populate('HoaDon');

        if (tg && tg.TrangThai !== 'Đã tất toán' && tg.TrangThai !== 'Nợ xấu' && tg.TrangThai !== 'Đã thu hồi nợ') {
            tg.SoLanNhacNho = (tg.SoLanNhacNho || 0) + 1;

            if (tg.SoLanNhacNho >= 3) {
                tg.TrangThai = 'Nợ xấu';
            }
            await tg.save();

            // Ghi nhật ký: Nhắc nhở
            const nv = req.session.NhanVien;
            await ghiNhatKy(nv._id, nv.HoVaTen, 'Nhắc nhở trả góp (có Email)', `Gửi nhắc nhở lần ${tg.SoLanNhacNho} cho hồ sơ #${tg._id} (KH: ${tg.KhachHang ? tg.KhachHang.HoVaTen : 'N/A'}).`, 'tra-gop');

            // ── GỬI EMAIL NHẮC NỢ ──
            if (tg.KhachHang && tg.KhachHang.Email) {
                guiNhacNo({
                    toEmail: tg.KhachHang.Email,
                    hoVaTen: tg.KhachHang.HoVaTen,
                    soLanNhacNho: tg.SoLanNhacNho,
                    tienTraMoiThang: tg.TienTraMoiThang,
                    soThang: tg.SoThang,
                    soThangDaTra: tg.SoThangDaTra,
                    hoaDonId: tg.HoaDon ? tg.HoaDon._id : tg._id
                }).catch(err => console.error('[Email] Gửi nhắc nợ thất bại:', err.message));
            }
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

        // Ghi nhật ký: Tất toán
        const nv = req.session.NhanVien;
        await ghiNhatKy(nv._id, nv.HoVaTen, 'Tất toán trả góp', `Tất toán hồ sơ trả góp #${tragop._id} (Trạng thái chốt: ${tragop.TrangThai}).`, 'tra-gop');

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
            .populate('KhachHang')
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

            // HỦY BẢO HÀNH CŨ
            await BaoHanh.updateMany(
                { HoaDon: hd._id },
                {
                    TrangThai: 'Đã hủy',
                    GhiChu: 'Đã hủy do khách hoàn trả sản phẩm.'
                }
            );

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

            // Tính giá trị mặt hàng mới và chênh lệch
            const tongTienMoi = spDb.GiaBan * soLuongDoi;
            const tongTienCu = hd.TongTien;
            const chenhLech = tongTienCu - tongTienMoi;

            // Cập nhật TongTien về giá thực tế của SP mới
            hd.TongTien = tongTienMoi;

            // Nếu SP mới rẻ hơn → ghi nhận tiền hoàn lại
            if (chenhLech > 0) {
                hd.SoTienHoanLai = chenhLech;
            } else {
                // SP mới đắt hơn → khách bù thêm (hoặc bằng nhau)
                hd.SoTienHoanLai = 0;
            }

            hd.TrangThai = 'Đã đổi hàng';
            await hd.save();


            // HỦY BẢO HÀNH CŨ
            await BaoHanh.updateMany(
                { HoaDon: hd._id, TrangThai: { $ne: 'Đã hủy' } },
                {
                    TrangThai: 'Đã hủy',
                    GhiChu: `Đã hủy do đổi sang sản phẩm: ${spDb.TenSP}.`
                }
            );

            // SINH BẢO HÀNH MỚI CHO SẢN PHẨM MỚI
            const batDauMoi = new Date();
            const ketThucMoi = new Date(batDauMoi);
            ketThucMoi.setMonth(ketThucMoi.getMonth() + 24);

            await BaoHanh.create({
                HoaDon: hd._id,
                KhachHang: hd.KhachHang,
                SanPham: spDb._id,
                TenSanPham: spDb.TenSP,
                SoLuong: soLuongDoi,
                NgayBatDau: batDauMoi,
                NgayKetThuc: ketThucMoi,
                ThoiHanBaoHanh: 24,
                TrangThai: 'Còn bảo hành',
                GhiChu: 'Phiếu bảo hành cấp lại do khách hàng đổi sản phẩm.'
            });
        }

        dt.TrangThai = 'Đã duyệt';
        await dt.save();

        // Ghi nhật ký: Đổi / Trả hàng
        const nv = req.session.NhanVien;
        const tenKH = dt.KhachHang ? dt.KhachHang.HoVaTen : 'Không xác định';
        await ghiNhatKy(nv._id, nv.HoVaTen, 'Duyệt yêu cầu đổi trả', `Duyệt yêu cầu "${dt.LoaiYeuCau}" cho hóa đơn #${hd._id} của khách hàng "${tenKH}".`, 'doi-tra');

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
            .populate('NhaCungCap')
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

        // GHI NHẬT KÝ: Nhập hàng
        const nvNhap = req.session.NhanVien;
        const soSP = chiTiet.length;
        await ghiNhatKy(nvNhap._id, nvNhap.HoVaTen, 'Lập phiếu nhập hàng', `Nhập ${soSP} dòng sản phẩm, tổng tiền ${tongTienNhap.toLocaleString('vi-VN')} VNĐ.`, 'nhap-hang');

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

// ======================== NHẬT KÝ HỆ THỐNG ========================

// GET: Hiển thị trang Nhật Ký
router.get('/nhatky', checkLogin, async (req, res) => {
    try {
        // Chỉ admin mới được xem nhật ký
        if (req.session.NhanVien.QuyenHan !== 'admin') {
            return res.redirect('/admin');
        }

        let dieuKien = {};
        if (req.query.loai && req.query.loai !== '') {
            dieuKien.LoaiLog = req.query.loai;
        }
        if (req.query.nhanvien && req.query.nhanvien !== '') {
            dieuKien.NhanVien = req.query.nhanvien;
        }

        const dsNhatKy = await NhatKy.find(dieuKien)
            .populate('NhanVien', 'HoVaTen TenDangNhap QuyenHan')
            .sort({ ThoiGian: -1 })
            .limit(500);

        const dsNhanVien = await NhanVien.find({}, 'HoVaTen TenDangNhap');

        const tongLog = await NhatKy.countDocuments();
        const logHomNay = await NhatKy.countDocuments({
            ThoiGian: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        res.render('admin/nhatky', {
            title: 'Nhật Ký Hệ Thống',
            nhanvien: req.session.NhanVien,
            dsnhatky: dsNhatKy,
            dsnhanvien: dsNhanVien,
            tongLog,
            logHomNay,
            query: req.query
        });
    } catch (error) {
        console.log("Lỗi nhật ký:", error);
        res.send("Lỗi tải nhật ký: " + error.message);
    }
});

// POST: Xóa log cũ hơn 30 ngày (chỉ admin)
router.post('/nhatky/xoa-cu', checkLogin, async (req, res) => {
    try {
        if (req.session.NhanVien.QuyenHan !== 'admin') {
            return res.redirect('/admin');
        }
        const ngay30TruocDay = new Date();
        ngay30TruocDay.setDate(ngay30TruocDay.getDate() - 30);

        const ketQua = await NhatKy.deleteMany({ ThoiGian: { $lt: ngay30TruocDay } });

        // Ghi lại chính hành động xóa log
        const nv = req.session.NhanVien;
        await ghiNhatKy(nv._id, nv.HoVaTen, 'Dọn dẹp nhật ký', `Đã xóa ${ketQua.deletedCount} bản ghi log cũ hơn 30 ngày.`, 'khac');

        res.redirect('/admin/nhatky?xoa=ok');
    } catch (error) {
        console.log("Lỗi xóa log:", error);
        res.redirect('/admin/nhatky');
    }
});

// ======================== QUẢN LÝ BẢO HÀNH ========================

// GET: Danh sách tất cả phiếu bảo hành
router.get('/baohanh', checkLogin, async (req, res) => {
    try {
        let dieuKien = {};
        if (req.query.trangthai && req.query.trangthai !== '') {
            dieuKien.TrangThai = req.query.trangthai;
        }
        if (req.query.timkiem && req.query.timkiem.trim() !== '') {
            dieuKien.TenSanPham = { $regex: req.query.timkiem.trim(), $options: 'i' };
        }

        let dsBaoHanh = await BaoHanh.find(dieuKien)
            .populate('KhachHang', 'HoVaTen SoDienThoai DiaChi')
            .populate('SanPham', 'TenSP HinhAnh')
            .populate('HoaDon', 'NgayLap TongTien')
            .sort({ NgayBatDau: -1 });

        // Cập nhật trạng thái tự động
        const now = new Date();
        const threshold30 = new Date();
        threshold30.setDate(threshold30.getDate() + 30);

        for (let bh of dsBaoHanh) {
            if (bh.TrangThai === 'Đã hủy') continue; // Bỏ qua nếu đã hủy

            let newTT;
            if (bh.NgayKetThuc <= now) {
                newTT = 'Hết bảo hành';
            } else if (bh.NgayKetThuc <= threshold30) {
                newTT = 'Sắp hết bảo hành';
            } else {
                newTT = 'Còn bảo hành';
            }
            if (bh.TrangThai !== newTT) {
                bh.TrangThai = newTT;
                await bh.save();
            }
        }

        // Thống kê nhanh
        const tongPhieu = await BaoHanh.countDocuments();
        const conBH = await BaoHanh.countDocuments({ TrangThai: 'Còn bảo hành' });
        const sapHet = await BaoHanh.countDocuments({ TrangThai: 'Sắp hết bảo hành' });
        const hetBH = await BaoHanh.countDocuments({ TrangThai: 'Hết bảo hành' });

        res.render('admin/baohanh', {
            title: 'Quản lý Bảo Hành',
            nhanvien: req.session.NhanVien,
            dsbaohanh: dsBaoHanh,
            tongPhieu, conBH, sapHet, hetBH,
            query: req.query
        });
    } catch (error) {
        console.log('Lỗi bảo hành:', error);
        res.send('Lỗi: ' + error.message);
    }
});

// POST: Cập nhật ghi chú phiếu bảo hành
router.post('/baohanh/ghichu/:id', checkLogin, async (req, res) => {
    try {
        await BaoHanh.findByIdAndUpdate(req.params.id, { GhiChu: req.body.GhiChu });
        res.redirect('/admin/baohanh');
    } catch (error) {
        console.log('Lỗi ghi chú bảo hành:', error);
        res.redirect('/admin/baohanh');
    }
});

// GET: Trang in phiếu bảo hành
router.get('/baohanh/in/:id', checkLogin, async (req, res) => {
    try {
        const bh = await BaoHanh.findById(req.params.id)
            .populate('KhachHang')
            .populate('SanPham')
            .populate('HoaDon');
        if (!bh) return res.send('Không tìm thấy phiếu bảo hành!');
        res.render('admin/baohanh_in', { title: 'In Phiếu Bảo Hành', baohanh: bh });
    } catch (error) {
        console.log('Lỗi in bảo hành:', error);
        res.send('Lỗi: ' + error.message);
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