var express = require('express');
var router = express.Router();
var NhaCungCap = require('../models/nhacungcap');

// GET: Danh sách Nhà cung cấp
router.get('/', async (req, res) => {
    try {
        var ncc = await NhaCungCap.find(); 
        res.render('admin/nhacungcap', { 
            title: 'Quản lý Nhà cung cấp', 
            nhacungcap: ncc,
            nhanvien: req.session.NhanVien 
        });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm
router.get('/them', (req, res) => {
    res.render('admin/nhacungcap_them', { 
        title: 'Thêm Nhà cung cấp',
        nhanvien: req.session.NhanVien
    });
});

// POST: Xử lý Thêm vào DB
router.post('/them', async (req, res) => {
    try {
        await NhaCungCap.create({
            TenNCC: req.body.TenNCC,
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            DiaChi: req.body.DiaChi
        });
        res.redirect('/admin/nhacungcap');
    } catch (error) { console.log(error); }
});

// GET: Form Sửa
router.get('/sua/:id', async (req, res) => {
    try {
        var ncc = await NhaCungCap.findById(req.params.id);
        res.render('admin/nhacungcap_sua', { 
            title: 'Sửa Nhà cung cấp', 
            nhacungcap: ncc,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Sửa trong DB
router.post('/sua/:id', async (req, res) => {
    try {
        await NhaCungCap.findByIdAndUpdate(req.params.id, {
            TenNCC: req.body.TenNCC,
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            DiaChi: req.body.DiaChi
        });
        res.redirect('/admin/nhacungcap');
    } catch (error) { console.log(error); }
});

// GET: Xử lý Xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        await NhaCungCap.findByIdAndDelete(req.params.id);
        res.redirect('/admin/nhacungcap');
    } catch (error) { console.log(error); }
});

module.exports = router;