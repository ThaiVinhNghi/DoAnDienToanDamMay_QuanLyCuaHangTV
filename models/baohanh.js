var mongoose = require('mongoose');

var baoHanhSchema = new mongoose.Schema({
    HoaDon:      { type: mongoose.Schema.Types.ObjectId, ref: 'HoaDon', required: true },
    KhachHang:   { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang', required: true },
    SanPham:     { type: mongoose.Schema.Types.ObjectId, ref: 'SanPham' },
    TenSanPham:  { type: String, required: true }, // Lưu thẳng tên tránh mất khi sửa SP
    SoLuong:     { type: Number, default: 1 },
    NgayBatDau:  { type: Date, default: Date.now },
    NgayKetThuc: { type: Date },                  // Tự tính = NgayBatDau + ThoiHanBaoHanh tháng
    ThoiHanBaoHanh: { type: Number, default: 24 }, // Số tháng bảo hành
    TrangThai:   {
        type: String,
        enum: ['Còn bảo hành', 'Sắp hết bảo hành', 'Hết bảo hành', 'Đã hủy'],
        default: 'Còn bảo hành'
    },
    GhiChu: { type: String, default: '' } // Nhân viên ghi chú lịch sử sửa chữa
});

module.exports = mongoose.model('BaoHanh', baoHanhSchema);
