var mongoose = require('mongoose');
var nhapHangSchema = new mongoose.Schema({
    NhanVien: { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', required: true }, // Ai nhập
    NhaCungCap: { type: mongoose.Schema.Types.ObjectId, ref: 'NhaCungCap', required: true },
    NgayNhap: { type: Date, default: Date.now },
    TongTienNhap: { type: Number, default: 0 },
    ChiTietNhap: [{
        SanPham: { type: mongoose.Schema.Types.ObjectId, ref: 'SanPham', required: true },
        SoLuong: { type: Number, required: true },
        DonGiaNhap: { type: Number, required: true }
    }]
});
module.exports = mongoose.model('NhapHang', nhapHangSchema);