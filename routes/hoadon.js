var express = require('express');
var router = express.Router();
var HoaDon = require('../models/hoadon');

// GET: Danh sách Hóa đơn
router.get('/', async (req, res) => {
    try {
        // Lấy danh sách hóa đơn, populate để lấy tên Khách hàng và tên Nhân viên duyệt
        var hd = await HoaDon.find()
                             .populate('KhachHang')
                             .populate('NhanVienDuyet')
                             .sort({ NgayLap: -1 }); // Sắp xếp đơn mới nhất lên đầu

        res.render('admin/hoadon', { 
            title: 'Quản lý Hóa đơn', 
            hoadon: hd,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// GET: Xem chi tiết Hóa đơn
router.get('/chitiet/:id', async (req, res) => {
    try {
        // Populate sâu vào mảng ChiTietHoaDon để lấy thông tin Sản phẩm (Tivi)
        var hd = await HoaDon.findById(req.params.id)
                             .populate('KhachHang')
                             .populate('NhanVienDuyet')
                             .populate('ChiTietHoaDon.SanPham');

        res.render('admin/hoadon_chitiet', { 
            title: 'Chi tiết Hóa đơn', 
            hoadon: hd,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// GET: Duyệt Hóa đơn
router.get('/duyet/:id', async (req, res) => {
    try {
        await HoaDon.findByIdAndUpdate(req.params.id, { 
            TrangThai: 'Đã duyệt',
            NhanVienDuyet: req.session.NhanVien._id // Lưu ID admin duyệt đơn
        });
        res.redirect('/admin/hoadon');
    } catch (error) { console.log(error); }
});

// GET: Hủy Hóa đơn
router.get('/huy/:id', async (req, res) => {
    try {
        await HoaDon.findByIdAndUpdate(req.params.id, { 
            TrangThai: 'Đã hủy',
            NhanVienDuyet: req.session.NhanVien._id
        });
        res.redirect('/admin/hoadon');
    } catch (error) { console.log(error); }
});

module.exports = router;