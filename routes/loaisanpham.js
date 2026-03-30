var express = require('express');
var router = express.Router();
var LoaiSanPham = require('../models/loaisanpham');

// GET: Danh sách Loại sản phẩm
router.get('/', async (req, res) => {
    try {
        var lsp = await LoaiSanPham.find(); // Lấy tất cả loại SP từ DB
        res.render('admin/loaisanpham', { 
            title: 'Quản lý Loại sản phẩm', 
            loaisanpham: lsp,
            nhanvien: req.session.NhanVien 
        });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm
router.get('/them', (req, res) => {
    res.render('admin/loaisanpham_them', { 
        title: 'Thêm Loại sản phẩm',
        nhanvien: req.session.NhanVien
    });
});

// POST: Xử lý Thêm vào DB
router.post('/them', async (req, res) => {
    try {
        await LoaiSanPham.create({ TenLoai: req.body.TenLoai });
        res.redirect('/admin/loaisanpham');
    } catch (error) { console.log(error); }
});

// GET: Form Sửa
router.get('/sua/:id', async (req, res) => {
    try {
        var lsp = await LoaiSanPham.findById(req.params.id);
        res.render('admin/loaisanpham_sua', { 
            title: 'Sửa Loại sản phẩm', 
            loai: lsp,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Sửa trong DB
router.post('/sua/:id', async (req, res) => {
    try {
        await LoaiSanPham.findByIdAndUpdate(req.params.id, { TenLoai: req.body.TenLoai });
        res.redirect('/admin/loaisanpham');
    } catch (error) { console.log(error); }
});

// GET: Xử lý Xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        await LoaiSanPham.findByIdAndDelete(req.params.id);
        res.redirect('/admin/loaisanpham');
    } catch (error) { console.log(error); }
});

module.exports = router;