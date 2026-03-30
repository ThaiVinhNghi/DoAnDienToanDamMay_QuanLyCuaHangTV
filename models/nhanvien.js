var mongoose = require('mongoose');
var nhanVienSchema = new mongoose.Schema({
    HoVaTen: { type: String, required: true }, 
    TenDangNhap: { type: String, unique: true, required: true },
    MatKhau: { type: String, required: true }, 
    QuyenHan: { type: String, default: 'admin' }, // admin, nhanvien 
    TrangThai: { type: Number, default: 1 } // 1: Hoạt động, 0: Khóa 
});
module.exports = mongoose.model('NhanVien', nhanVienSchema);