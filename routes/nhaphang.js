var express = require('express');
var router = express.Router();
var NhapHang = require('../models/nhaphang');
var SanPham = require('../models/sanpham');
var NhaCungCap = require('../models/nhacungcap');

// GET: Danh sách Phiếu Nhập Hàng
router.get('/', async (req, res) => {
    try {
        var dsNhap = await NhapHang.find()
            .populate('NhanVien')
            .populate('NhaCungCap')
            .sort({ NgayNhap: -1 });

        res.render('admin/nhaphang', { 
            title: 'Quản lý Nhập hàng', 
            nhaphang: dsNhap,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm Phiếu Nhập
router.get('/them', async (req, res) => {
    try {
        var ncc = await NhaCungCap.find();
        var sp = await SanPham.find(); // Lấy Tivi ra để chọn
        
        res.render('admin/nhaphang_them', { 
            title: 'Tạo Phiếu Nhập hàng',
            nhacungcap: ncc,
            sanpham: sp,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Lưu Phiếu Nhập & CỘNG VÀO KHO
router.post('/them', async (req, res) => {
    try {
        // Dữ liệu từ form gửi lên có thể là mảng (nếu nhập nhiều Tivi) hoặc chuỗi (nếu nhập 1 Tivi)
        let { NhaCungCap, SanPhamId, SoLuong, DonGiaNhap } = req.body;

        // Ép kiểu về mảng (Array) để dễ dùng vòng lặp, đề phòng trường hợp chỉ nhập 1 món
        if (!Array.isArray(SanPhamId)) {
            SanPhamId = [SanPhamId];
            SoLuong = [SoLuong];
            DonGiaNhap = [DonGiaNhap];
        }

        let chiTietNhap = [];
        let tongTien = 0;

        // Lặp qua từng món hàng được nhập
        for (let i = 0; i < SanPhamId.length; i++) {
            if (SanPhamId[i]) {
                let sl = parseInt(SoLuong[i]) || 0;
                let gia = parseInt(DonGiaNhap[i]) || 0;
                
                chiTietNhap.push({
                    SanPham: SanPhamId[i],
                    SoLuong: sl,
                    DonGiaNhap: gia
                });
                tongTien += (sl * gia);

                // QUAN TRỌNG NHẤT: Cập nhật số lượng tồn kho của Tivi đó
                // Dùng toán tử $inc (increment) của MongoDB để cộng dồn số lượng
                await SanPham.findByIdAndUpdate(SanPhamId[i], {
                    $inc: { SoLuongTon: sl }
                });
            }
        }

        // Tạo biên lai Nhập hàng
        await NhapHang.create({
            NhanVien: req.session.NhanVien._id,
            NhaCungCap: NhaCungCap,
            TongTienNhap: tongTien,
            ChiTietNhap: chiTietNhap
        });

        res.redirect('/admin/nhaphang');
    } catch (error) { console.log(error); }
});

// GET: Xem chi tiết Phiếu Nhập
router.get('/chitiet/:id', async (req, res) => {
    try {
        var pn = await NhapHang.findById(req.params.id)
            .populate('NhanVien')
            .populate('NhaCungCap')
            .populate('ChiTietNhap.SanPham');

        res.render('admin/nhaphang_chitiet', { 
            title: 'Chi tiết Phiếu Nhập', 
            phieunhap: pn,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

module.exports = router;