var mongoose = require('mongoose');

var sanPhamSchema = new mongoose.Schema({
    TenSP: { type: String, required: true },
    GiaBan: { type: Number, required: true },
    SoLuongTon: { type: Number, default: 0 },
    HinhAnh: { type: String },
    MoTa: { type: String },
    LoaiSanPham: { type: mongoose.Schema.Types.ObjectId, ref: 'LoaiSanPham' },
    HangSanXuat: { type: mongoose.Schema.Types.ObjectId, ref: 'HangSanXuat' },
    
    // ĐOẠN NÀY LÀ THÊM MỚI ĐỂ LƯU ĐÁNH GIÁ CỦA KHÁCH
    DanhGia: [{
        KhachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang' },
        SoSao: { type: Number, required: true, min: 1, max: 5 },
        BinhLuan: { type: String },
        NgayDanhGia: { type: Date, default: Date.now }
    }]
});

module.exports = mongoose.model('SanPham', sanPhamSchema);