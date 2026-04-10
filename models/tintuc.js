var mongoose = require('mongoose');

var tinTucSchema = new mongoose.Schema({
    TieuDe: { type: String, required: true },
    HinhAnh: { type: String, required: true }, // Có thể là link ảnh mạng hoặc tên file ảnh
    TomTat: { type: String, required: true },
    NoiDung: { type: String }, // Nội dung chi tiết (nếu có làm trang chi tiết tin tức)
    NgayDang: { type: Date, default: Date.now },
    TrangThai: { type: Boolean, default: true } // true là hiện, false là ẩn
});

module.exports = mongoose.model('TinTuc', tinTucSchema);