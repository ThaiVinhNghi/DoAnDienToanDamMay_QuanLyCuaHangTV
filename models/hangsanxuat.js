var mongoose = require('mongoose');
var hangSanXuatSchema = new mongoose.Schema({
    TenHang: { type: String, required: true, unique: true }, // Vd: Sony, Samsung, LG...
    QuocGia: { type: String }
});
module.exports = mongoose.model('HangSanXuat', hangSanXuatSchema);