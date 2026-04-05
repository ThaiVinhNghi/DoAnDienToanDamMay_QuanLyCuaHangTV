var mongoose = require('mongoose');

var doiTraSchema = new mongoose.Schema({
    KhachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang', required: true },
    HoaDon: { type: mongoose.Schema.Types.ObjectId, ref: 'HoaDon', required: true },
    LoaiYeuCau: { type: String, required: true }, // 'Trả hàng' hoặc 'Đổi hàng'
    
    // Nếu là Đổi hàng thì mới có mảng Sản phẩm muốn đổi lấy
    SanPhamMoi: [{
        SanPham: { type: mongoose.Schema.Types.ObjectId, ref: 'SanPham' },
        SoLuong: { type: Number, default: 1 }
    }],
    
    LyDo: { type: String },
    TrangThai: { type: String, default: 'Chờ xử lý' }, // Chờ xử lý, Đã duyệt, Từ chối
    NgayYeuCau: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DoiTra', doiTraSchema);