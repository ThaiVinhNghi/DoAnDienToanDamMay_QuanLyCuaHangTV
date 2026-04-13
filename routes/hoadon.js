var express = require('express');
var router = express.Router();
var HoaDon = require('../models/hoadon');
var SanPham = require('../models/sanpham');

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

// FIX #2: Xóa route /duyet/:id tại đây — logic duyệt đầy đủ (trừ kho + tạo trả góp)
// đã có ở routes/admin.js tại GET /admin/hoadon/duyet/:id, dùng route đó.

// FIX #3: Hủy Hóa đơn — cộng lại kho nếu đơn đã duyệt trước đó
router.get('/huy/:id', async (req, res) => {
    try {
        const hd = await HoaDon.findById(req.params.id);
        if (!hd) return res.redirect('/admin/hoadon');

        // Nếu đơn đã duyệt và kho đã bị trừ → cộng lại kho
        if (hd.TrangThai === 'Đã duyệt') {
            for (let item of hd.ChiTietHoaDon) {
                await SanPham.findByIdAndUpdate(item.SanPham, {
                    $inc: { SoLuongTon: item.SoLuong }
                });
            }
        }

        hd.TrangThai = 'Đã hủy';
        hd.NhanVienDuyet = req.session.NhanVien._id;
        await hd.save();

        res.redirect('/admin/hoadon');
    } catch (error) { 
        console.log(error);
        res.send("Lỗi hủy hóa đơn: " + error.message);
    }
});

module.exports = router;