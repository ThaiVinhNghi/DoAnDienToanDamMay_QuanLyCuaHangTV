var express = require('express');
var router = express.Router();
var HangSanXuat = require('../models/hangsanxuat');

// GET: Danh sách Hãng sản xuất
router.get('/', async (req, res) => {
    try {
        var hsx = await HangSanXuat.find(); 
        res.render('admin/hangsanxuat', { 
            title: 'Quản lý Hãng sản xuất', 
            hangsanxuat: hsx,
            nhanvien: req.session.NhanVien 
        });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm
router.get('/them', (req, res) => {
    res.render('admin/hangsanxuat_them', { 
        title: 'Thêm Hãng sản xuất',
        nhanvien: req.session.NhanVien
    });
});

// POST: Xử lý Thêm vào DB
router.post('/them', async (req, res) => {
    try {
        var data = {
            TenHang: req.body.TenHang,
            QuocGia: req.body.QuocGia
        };
        await HangSanXuat.create(data);
        res.redirect('/admin/hangsanxuat');
    } catch (error) { console.log(error); }
});

// GET: Form Sửa
router.get('/sua/:id', async (req, res) => {
    try {
        var hsx = await HangSanXuat.findById(req.params.id);
        res.render('admin/hangsanxuat_sua', { 
            title: 'Sửa Hãng sản xuất', 
            hang: hsx,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Sửa trong DB
router.post('/sua/:id', async (req, res) => {
    try {
        var data = {
            TenHang: req.body.TenHang,
            QuocGia: req.body.QuocGia
        };
        await HangSanXuat.findByIdAndUpdate(req.params.id, data);
        res.redirect('/admin/hangsanxuat');
    } catch (error) { console.log(error); }
});

// GET: Xử lý Xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        await HangSanXuat.findByIdAndDelete(req.params.id);
        res.redirect('/admin/hangsanxuat');
    } catch (error) { console.log(error); }
});

module.exports = router;