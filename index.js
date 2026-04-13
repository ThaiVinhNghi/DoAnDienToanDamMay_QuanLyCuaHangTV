var express = require('express'); 
var app = express(); 
var mongoose = require('mongoose'); 
var session = require('express-session');

// Kết nối MongoDB Atlas (Thay <db_user>, <db_password> và URL cluster của bạn vào đây)

var uri = 'mongodb://admin:admin123@ac-mehl2fb-shard-00-00.ci790jr.mongodb.net:27017,ac-mehl2fb-shard-00-01.ci790jr.mongodb.net:27017,ac-mehl2fb-shard-00-02.ci790jr.mongodb.net:27017/qltivistore?ssl=true&replicaSet=atlas-14ilul-shard-0&authSource=admin&appName=qltivistore';
mongoose.connect(uri) 
  .then(() => console.log('Đã kết nối thành công tới MongoDB Atlas.')) 
  .catch(err => console.log('Lỗi kết nối CSDL:', err)); 

// Cấu hình View Engine là EJS
app.set('views', './views');
app.set('view engine', 'ejs'); 

// Đọc dữ liệu từ body của request (form submit)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Thiết lập thư mục public chứa file tĩnh (css, js, hình ảnh sản phẩm)
// Đừng quên tạo thư mục 'public' ở thư mục gốc nhé
app.use(express.static('public'));



// Cấu hình Session (Bắt buộc phải nằm trước các Router)
app.use(session({
    secret: 'cuahangtivi_secret_key_2026', // Khóa bảo mật tự chọn
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Session sống 1 ngày (tính bằng mili giây)
}));
var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin'); // Router cho Admin
var loaiSanPhamRouter = require('./routes/loaisanpham');
var hangSanXuatRouter = require('./routes/hangsanxuat');
var sanPhamRouter = require('./routes/sanpham'); // Thêm dòng này
var hoaDonRouter = require('./routes/hoadon'); // Thêm dòng này
var nhapHangRouter = require('./routes/nhaphang'); // Thêm dòng này
var nhaCungCapRouter = require('./routes/nhacungcap');
var nhanVienRouter = require('./routes/nhanvien');
var khachHangRouter = require('./routes/khachhang');
var tintucRouter = require('./routes/tintuc');


// Bức tường bảo vệ chung cho tất cả tab Admin (Ngoại trừ trang đăng nhập)
const checkLogin = (req, res, next) => {
    if (req.session && req.session.NhanVien) {
        next();
    } else {
        res.redirect('/admin/dangnhap');
    }
};

app.use('/admin', adminRouter);
app.use('/', indexRouter);
app.use('/admin/loaisanpham', checkLogin, loaiSanPhamRouter); // Gắn bảo vệ vào đây
app.use('/admin/hangsanxuat', checkLogin, hangSanXuatRouter);
app.use('/admin/sanpham', checkLogin, sanPhamRouter); // Gắn bảo vệ vào đây
app.use('/admin/hoadon', checkLogin, hoaDonRouter); // Gắn bảo vệ vào đây
app.use('/admin/nhaphang', checkLogin, nhapHangRouter); // Gắn bảo vệ vào đây
app.use('/admin/nhacungcap', checkLogin, nhaCungCapRouter);
app.use('/admin/nhanvien', checkLogin, nhanVienRouter);
app.use('/admin/khachhang', checkLogin, khachHangRouter);
app.use('/admin/tintuc', checkLogin, tintucRouter);




// Khởi động server
app.listen(3000, () => { 
  console.log('Server is running at http://127.0.0.1:3000');
});