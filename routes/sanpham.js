var express = require('express');
var router = express.Router();
var multer = require('multer');
var SanPham = require('../models/sanpham');
var LoaiSanPham = require('../models/loaisanpham');
var HangSanXuat = require('../models/hangsanxuat');

// Cấu hình Multer để upload hình ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/'); // Lưu vào thư mục public/images
    },
    filename: function (req, file, cb) {
        // Đổi tên file để không bị trùng (Thêm mốc thời gian vào trước tên file gốc)
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// GET: Danh sách Sản phẩm
router.get('/', async (req, res) => {
    try {
        // Lấy danh sách Tivi, dùng populate để móc dữ liệu tên Hãng và Loại
        var sp = await SanPham.find().populate('LoaiSanPham').populate('HangSanXuat');
        res.render('admin/sanpham', { 
            title: 'Quản lý Sản phẩm', 
            sanpham: sp,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// GET: Form Thêm Sản phẩm
router.get('/them', async (req, res) => {
    try {
        // Phải lấy danh sách Loại và Hãng để đổ vào thẻ <select>
        var lsp = await LoaiSanPham.find();
        var hsx = await HangSanXuat.find();
        
        res.render('admin/sanpham_them', { 
            title: 'Thêm Sản phẩm',
            loaisanpham: lsp,
            hangsanxuat: hsx,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Thêm vào DB (Lưu ý chữ 'HinhAnh' trong upload.single phải trùng tên input file HTML)
router.post('/them', upload.single('HinhAnh'), async (req, res) => {
    try {
        var data = {
            TenSP: req.body.TenSP,
            GiaBan: req.body.GiaBan,
            GiaGoc: req.body.GiaGoc || 0, // FIX #4: Lưu giá gốc
            SoLuongTon: req.body.SoLuongTon,
            MoTa: req.body.MoTa,
            LoaiSanPham: req.body.LoaiSanPham,
            HangSanXuat: req.body.HangSanXuat
        };
        if (req.file) { data.HinhAnh = req.file.filename; }
        await SanPham.create(data);
        res.redirect('/admin/sanpham');
    } catch (error) { console.log(error); }
});


// GET: Form Sửa Sản phẩm
router.get('/sua/:id', async (req, res) => {
    try {
        var sp = await SanPham.findById(req.params.id);
        var lsp = await LoaiSanPham.find();
        var hsx = await HangSanXuat.find();
        
        res.render('admin/sanpham_sua', { 
            title: 'Sửa Sản phẩm',
            sanpham: sp, // Truyền dữ liệu tivi hiện tại ra form
            loaisanpham: lsp,
            hangsanxuat: hsx,
            nhanvien: req.session.NhanVien
        });
    } catch (error) { console.log(error); }
});

// POST: Xử lý Sửa trong DB
router.post('/sua/:id', upload.single('HinhAnh'), async (req, res) => {
    try {
        var data = {
            TenSP: req.body.TenSP,
            GiaBan: req.body.GiaBan,
            GiaGoc: req.body.GiaGoc || 0, // FIX #4: Cập nhật giá gốc
            SoLuongTon: req.body.SoLuongTon,
            MoTa: req.body.MoTa,
            LoaiSanPham: req.body.LoaiSanPham,
            HangSanXuat: req.body.HangSanXuat
        };
        if (req.file) { data.HinhAnh = req.file.filename; }
        await SanPham.findByIdAndUpdate(req.params.id, data);
        res.redirect('/admin/sanpham');
    } catch (error) { console.log(error); }
});


// GET: Xử lý Xóa
router.get('/xoa/:id', async (req, res) => {
    try {
        await SanPham.findByIdAndDelete(req.params.id);
        res.redirect('/admin/sanpham');
    } catch (error) { console.log(error); }
});

module.exports = router;