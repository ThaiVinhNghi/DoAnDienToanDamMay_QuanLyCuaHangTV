var mongoose = require('mongoose');
var hoaDonSchema = new mongoose.Schema({
    KhachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang', required: true },
    NhanVienDuyet: { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien' }, // Admin duyệt đơn
    NgayLap: { type: Date, default: Date.now },
    HinhThucThanhToan: { type: String, default: 'Trả hết' },
    SoThangTraGop: { type: Number, default: 0 },
    SoLanNhacNho: { type: Number, default: 0 },
    TongTien: { type: Number, required: true },
    TrangThai: { type: String, default: 'Chờ duyệt' }, // Chờ duyệt, Đã duyệt, Đang giao, Đã thanh toán, Đã hủy
    ChiTietHoaDon: [{
        SanPham: { type: mongoose.Schema.Types.ObjectId, ref: 'SanPham', required: true },
        SoLuong: { type: Number, required: true },
        DonGiaBan: { type: Number, required: true }


    }]
});
module.exports = mongoose.model('HoaDon', hoaDonSchema);