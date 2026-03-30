var express = require('express');
var router = express.Router();
var bcrypt = require('bcryptjs');
var KhachHang = require('../models/khachhang');

router.get('/', async (req, res) => {
    try {
        var kh = await KhachHang.find();
        res.render('admin/khachhang', { title: 'Quản lý Khách hàng', dsKhachHang: kh, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

router.get('/them', (req, res) => {
    res.render('admin/khachhang_them', { title: 'Thêm Khách hàng', nhanvien: req.session.NhanVien });
});

router.post('/them', async (req, res) => {
    try {
        var salt = bcrypt.genSaltSync(10);
        await KhachHang.create({
            HoVaTen: req.body.HoVaTen,
            TenDangNhap: req.body.TenDangNhap,
            MatKhau: bcrypt.hashSync(req.body.MatKhau, salt),
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            DiaChi: req.body.DiaChi
        });
        res.redirect('/admin/khachhang');
    } catch (error) { console.log(error); }
});

router.get('/sua/:id', async (req, res) => {
    try {
        var kh = await KhachHang.findById(req.params.id);
        res.render('admin/khachhang_sua', { title: 'Sửa Khách hàng', khEdit: kh, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

router.post('/sua/:id', async (req, res) => {
    try {
        var data = {
            HoVaTen: req.body.HoVaTen,
            TenDangNhap: req.body.TenDangNhap,
            SoDienThoai: req.body.SoDienThoai,
            Email: req.body.Email,
            DiaChi: req.body.DiaChi
        };
        if (req.body.MatKhau) {
            var salt = bcrypt.genSaltSync(10);
            data.MatKhau = bcrypt.hashSync(req.body.MatKhau, salt);
        }
        await KhachHang.findByIdAndUpdate(req.params.id, data);
        res.redirect('/admin/khachhang');
    } catch (error) { console.log(error); }
});

router.get('/xoa/:id', async (req, res) => {
    try {
        await KhachHang.findByIdAndDelete(req.params.id);
        res.redirect('/admin/khachhang');
    } catch (error) { console.log(error); }
});

module.exports = router;