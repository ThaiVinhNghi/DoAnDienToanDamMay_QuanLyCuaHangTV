var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var NhanVien = require('../models/nhanvien');

// GET: Danh sách
router.get('/', async (req, res) => {
    try {
        var nv = await NhanVien.find();
        res.render('admin/nhanvien', { 
            title: 'Quản lý Nhân viên', 
            dsNhanVien: nv, 
            nhanvien: req.session.NhanVien 
        });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm
router.get('/them', (req, res) => {
    res.render('admin/nhanvien_them', { title: 'Thêm Nhân viên', nhanvien: req.session.NhanVien });
});

// POST: Xử lý Thêm
router.post('/them', async (req, res) => {
    try {
        var salt = bcrypt.genSaltSync(10);
        await NhanVien.create({
            HoVaTen: req.body.HoVaTen,
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt), // Mã hóa mật khẩu
            QuyenHan: req.body.QuyenHan,
            TrangThai: req.body.TrangThai
        });
        res.redirect('/admin/nhanvien');
    } catch (error) { console.log(error); }
});

// GET: Form Sửa
router.get('/sua/:id', async (req, res) => {
    try {
        var nv = await NhanVien.findById(req.params.id);
        res.render('admin/nhanvien_sua', { title: 'Sửa Nhân viên', nvEdit: nv, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Sửa
router.post('/sua/:id', async (req, res) => {
    try {
        var data = {
            HoVaTen: req.body.HoVaTen,
            TenDangNhap: req.body.TenDangNhap,
            QuyenHan: req.body.QuyenHan,
            TrangThai: req.body.TrangThai
        };
        // Nếu có nhập mật khẩu mới thì mới cập nhật mật khẩu
        if (req.body.MatKhau) {
            var salt = bcrypt.genSaltSync(10);
            data.MatKhau = bcrypt.hashSync(req.body.MatKhau, salt);
        }
        await NhanVien.findByIdAndUpdate(req.params.id, data);
        res.redirect('/admin/nhanvien');
    } catch (error) { console.log(error); }
});

// GET: Xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        await NhanVien.findByIdAndDelete(req.params.id);
        res.redirect('/admin/nhanvien');
    } catch (error) { console.log(error); }
});

module.exports = router;