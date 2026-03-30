var mongoose = require('mongoose');

var traGopSchema = new mongoose.Schema({
    HoaDon: { type: mongoose.Schema.Types.ObjectId, ref: 'HoaDon', required: true },
    KhachHang: { type: mongoose.Schema.Types.ObjectId, ref: 'KhachHang', required: true },
    
    SoTienTraTruoc: { type: Number, required: true },
    SoThang: { type: Number, required: true }, // Vd: 6, 9, 12 tháng
    LaiSuat: { type: Number, default: 0 }, // Tính theo %
    TienTraMoiThang: { type: Number, required: true },
    TrangThai: { type: String, default: 'Đang trả' }, // Đang trả, Quá hạn, Nợ xấu, Đã tất toán

    // CÁC TRƯỜNG LƯU VẾT TIẾN ĐỘ
    SoThangDaTra: { type: Number, default: 0 },
    NgayThanhToanGanNhat: { type: Date, default: Date.now }, 
    
    // ĐÂY CHÍNH LÀ TRƯỜNG QUAN TRỌNG ĐỂ LƯU ĐƯỢC SỐ LẦN NHẮC NHỞ NÈ:
    SoLanNhacNho: { type: Number, default: 0 }, 
    
    LichSuThuTien: [{
        NgayThu: { type: Date, default: Date.now },
        SoTienThu: Number,
        KỳThanhToan: Number
    }]
});

module.exports = mongoose.model('TraGop', traGopSchema);