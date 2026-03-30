var mongoose = require('mongoose');
var nhaCungCapSchema = new mongoose.Schema({
    TenNCC: { type: String, required: true },
    SoDienThoai: { type: String },
    Email: { type: String },
    DiaChi: { type: String }
});
module.exports = mongoose.model('NhaCungCap', nhaCungCapSchema);