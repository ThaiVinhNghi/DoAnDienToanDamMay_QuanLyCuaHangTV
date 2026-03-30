var mongoose = require('mongoose');
var loaiSanPhamSchema = new mongoose.Schema({
    TenLoai: { type: String, required: true, unique: true } // Vd: Smart TV, TV OLED, TV 8K...
});
module.exports = mongoose.model('LoaiSanPham', loaiSanPhamSchema);