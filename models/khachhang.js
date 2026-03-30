var mongoose = require('mongoose');
var khachHangSchema = new mongoose.Schema({
    HoVaTen: { type: String, required: true },
    TenDangNhap: { type: String, unique: true, required: true },
    MatKhau: { type: String, required: true },
    SoDienThoai: { type: String, required: true },
    Email: { type: String },
    DiaChi: { type: String, required: true } // Cần để giao hàng
});
module.exports = mongoose.model('KhachHang', khachHangSchema);