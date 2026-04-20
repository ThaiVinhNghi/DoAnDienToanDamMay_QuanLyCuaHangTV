var mongoose = require('mongoose');

var nhatKySchema = new mongoose.Schema({
    NhanVien: { type: mongoose.Schema.Types.ObjectId, ref: 'NhanVien', default: null },
    TenNhanVien: { type: String, default: 'Hệ thống' }, // Lưu thẳng tên để tránh mất log khi xóa NV
    HanhDong: { type: String, required: true },
    ChiTiet: { type: String, default: '' },
    LoaiLog: {
        type: String,
        enum: ['dang-nhap', 'hoa-don', 'tra-gop', 'nhap-hang', 'doi-tra', 'khac'],
        default: 'khac'
    },
    ThoiGian: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NhatKy', nhatKySchema);
