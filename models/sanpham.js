var mongoose = require('mongoose');
var sanPhamSchema = new mongoose.Schema({
    TenSP: { type: String, required: true },
    HinhAnh: { type: String, required: true }, // Lưu tên file ảnh (VD: tivi-sony-65inch.jpg)
    GiaBan: { type: Number, required: true, default: 0 },
    SoLuongTon: { type: Number, default: 0 },
    MoTa: { type: String },
    LoaiSanPham: { type: mongoose.Schema.Types.ObjectId, ref: 'LoaiSanPham', required: true },
    HangSanXuat: { type: mongoose.Schema.Types.ObjectId, ref: 'HangSanXuat', required: true }
});
module.exports = mongoose.model('SanPham', sanPhamSchema);