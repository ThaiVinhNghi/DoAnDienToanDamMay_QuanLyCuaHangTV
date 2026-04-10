var express = require('express');
var router = express.Router();
var multer = require('multer');
var TinTuc = require('../models/tintuc');

// Cấu hình Multer để upload hình ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// GET: Danh sách Tin tức
router.get('/', async (req, res) => {
    try {
        const ds = await TinTuc.find().sort({ NgayDang: -1 });
        res.render('admin/tintuc', { title: 'Quản lý Bảng tin', tintuc: ds, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm
router.get('/them', (req, res) => {
    res.render('admin/tintuc_them', { title: 'Thêm bài báo', nhanvien: req.session.NhanVien });
});

// POST: Thêm mới
router.post('/them', upload.single('HinhAnh'), async (req, res) => {
    try {
        const data = {
            TieuDe: req.body.TieuDe,
            TomTat: req.body.TomTat,
            NoiDung: req.body.NoiDung,
            TrangThai: req.body.TrangThai === 'on' || req.body.TrangThai === '1'
        };
        if (req.file) data.HinhAnh = req.file.filename;

        await TinTuc.create(data);
        res.redirect('/admin/tintuc');
    } catch (error) { console.log(error); }
});

// GET: Form Sửa
router.get('/sua/:id', async (req, res) => {
    try {
        const tt = await TinTuc.findById(req.params.id);
        res.render('admin/tintuc_sua', { title: 'Sửa Tin tức', tintuc: tt, nhanvien: req.session.NhanVien });
    } catch (error) { console.log(error); }
});

// POST: Sửa
router.post('/sua/:id', upload.single('HinhAnh'), async (req, res) => {
    try {
        const data = {
            TieuDe: req.body.TieuDe,
            TomTat: req.body.TomTat,
            NoiDung: req.body.NoiDung,
            TrangThai: req.body.TrangThai === 'on' || req.body.TrangThai === '1'
        };
        if (req.file) data.HinhAnh = req.file.filename;

        await TinTuc.findByIdAndUpdate(req.params.id, data);
        res.redirect('/admin/tintuc');
    } catch (error) { console.log(error); }
});

// GET: Xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        await TinTuc.findByIdAndDelete(req.params.id);
        res.redirect('/admin/tintuc');
    } catch (error) { console.log(error); }
});

module.exports = router;
