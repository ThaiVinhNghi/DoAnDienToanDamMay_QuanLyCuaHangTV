// ============================================================
// utils/email.js — Module gửi email tự động (Nodemailer + Gmail)
// ============================================================
const nodemailer = require('nodemailer');

// Tạo transporter dùng Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,   // Gmail của shop: vd admin@gmail.com
        pass: process.env.EMAIL_PASS    // App Password (16 ký tự), KHÔNG dùng mật khẩu thường
    }
});

// Kiểm tra kết nối SMTP khi server khởi động
transporter.verify((error, success) => {
    if (error) {
        console.error('[Email] ❌ Kết nối SMTP thất bại:', error.message);
    } else {
        console.log('[Email] ✅ Kết nối Gmail SMTP thành công! Sẵn sàng gửi email.');
    }
});


// ============================================================
// 1. GỬI BIÊN LAI XÁC NHẬN ĐẶT HÀNG
//    Gọi sau khi tạo HoaDon thành công ở route /thanhtoan
// ============================================================
async function guiBienLai({ toEmail, hoVaTen, hoaDonId, tongTien, diaChiGiaoHang, hinhThucThanhToan, chiTietSanPham }) {
    if (!toEmail || !toEmail.includes('@')) return; // Bỏ qua nếu không có email

    const tenSPList = chiTietSanPham && chiTietSanPham.length > 0
        ? chiTietSanPham.map((item, i) => `<li style="margin-bottom:4px;">${i+1}. ${item.TenSP || 'Sản phẩm'} — SL: ${item.SoLuong} — Đơn giá: <strong>${item.DonGiaBan ? item.DonGiaBan.toLocaleString('vi-VN') : '?'} đ</strong></li>`).join('')
        : '<li>Không có chi tiết</li>';

    const mailOptions = {
        from: `"Cửa hàng Tivi TVN" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `✅ Xác nhận đặt hàng thành công – Mã đơn: ${hoaDonId}`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1d4ed8, #2563eb); padding: 28px 32px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: 1px;">📺 Cửa hàng Tivi TVN</h1>
                <p style="color: #bfdbfe; margin: 6px 0 0; font-size: 14px;">Cảm ơn bạn đã mua sắm!</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px; background: #fff;">
                <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">Xin chào <strong>${hoVaTen}</strong>,</p>
                <p style="color: #475569; line-height: 1.7; margin: 0 0 24px;">
                    Đơn hàng của bạn đã được hệ thống ghi nhận và đang chờ nhân viên duyệt. 
                    Chúng tôi sẽ liên hệ xác nhận sớm nhất có thể!
                </p>

                <!-- Info box -->
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1e293b;">
                        <tr>
                            <td style="padding: 6px 0; color: #64748b; width: 160px;">Mã đơn hàng:</td>
                            <td style="padding: 6px 0; font-weight: bold;">#${hoaDonId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Hình thức thanh toán:</td>
                            <td style="padding: 6px 0; font-weight: bold;">${hinhThucThanhToan}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #64748b;">Địa chỉ giao hàng:</td>
                            <td style="padding: 6px 0; font-weight: bold;">${diaChiGiaoHang || 'Theo địa chỉ tài khoản'}</td>
                        </tr>
                    </table>
                </div>

                <!-- Danh sách sản phẩm -->
                <h3 style="font-size: 15px; color: #1e293b; margin: 0 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">🛒 Sản phẩm đã đặt</h3>
                <ul style="padding: 0 0 0 16px; margin: 0 0 24px; color: #374151; font-size: 14px; line-height: 2;">
                    ${tenSPList}
                </ul>

                <!-- Tổng tiền -->
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: right;">
                    <span style="font-size: 14px; color: #64748b;">Tổng cộng:</span>
                    <span style="font-size: 22px; font-weight: 800; color: #dc2626; margin-left: 12px;">${tongTien ? tongTien.toLocaleString('vi-VN') : 0} đ</span>
                </div>

                <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center; line-height: 1.6;">
                    Mọi thắc mắc vui lòng liên hệ cửa hàng.<br>
                    Email này được gửi tự động, vui lòng không trả lời.
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2025 Cửa hàng Tivi TVN. All rights reserved.</p>
            </div>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Biên lai gửi thành công → ${toEmail}`);
    } catch (err) {
        console.error(`[Email] Lỗi gửi biên lai:`, err.message);
        // Không throw — lỗi email NOT crash app
    }
}

// ============================================================
// 2. GỬI EMAIL NHẮC NỢ TRẢ GÓP
//    Gọi từ admin khi bấm nút "Nhắc nhở" ở trang Trả Góp
// ============================================================
async function guiNhacNo({ toEmail, hoVaTen, soLanNhacNho, tienTraMoiThang, soThang, soThangDaTra, hoaDonId }) {
    if (!toEmail || !toEmail.includes('@')) return;

    const soKyCon = soThang - soThangDaTra;
    const tongConLai = Math.round(tienTraMoiThang * soKyCon);
    const canhBao = soLanNhacNho >= 2
        ? `<div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:12px 16px; margin-top:16px; color:#dc2626; font-weight:bold; font-size:14px;">
               ⚠️ Đây là lần nhắc nợ thứ <strong>${soLanNhacNho}/3</strong>. Nếu không thanh toán, tài khoản sẽ bị chuyển sang danh sách <strong>Nợ Xấu</strong>!
           </div>`
        : '';

    const mailOptions = {
        from: `"Cửa hàng Tivi TVN" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `⚠️ Nhắc nhở thanh toán trả góp (Lần ${soLanNhacNho}) – Cửa hàng Tivi TVN`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 620px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 32px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 22px;">⏰ Nhắc nhở Thanh toán Trả góp</h1>
                <p style="color: #fef3c7; margin: 6px 0 0; font-size: 14px;">Cửa hàng Tivi TVN</p>
            </div>

            <!-- Body -->
            <div style="padding: 32px; background: #fff;">
                <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">Xin chào <strong>${hoVaTen}</strong>,</p>
                <p style="color: #475569; line-height: 1.7; margin: 0 0 24px;">
                    Chúng tôi xin thông báo rằng bạn hiện đang có khoản thanh toán trả góp <strong>quá hạn</strong>. 
                    Vui lòng đến cửa hàng hoặc liên hệ nhân viên để thanh toán kỳ này.
                </p>

                <!-- Info box -->
                <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #1e293b;">
                        <tr>
                            <td style="padding: 8px 0; color: #92400e; width: 200px;">Mã hóa đơn gốc:</td>
                            <td style="padding: 8px 0; font-weight: bold;">#${hoaDonId}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #92400e;">Tiến độ:</td>
                            <td style="padding: 8px 0; font-weight: bold;">${soThangDaTra} / ${soThang} kỳ đã đóng</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #92400e;">Số tiền mỗi kỳ:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${tienTraMoiThang ? tienTraMoiThang.toLocaleString('vi-VN') : 0} đ</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #92400e;">Còn lại phải đóng:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #dc2626;">${tongConLai.toLocaleString('vi-VN')} đ (${soKyCon} kỳ)</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #92400e;">Lần nhắc nhở:</td>
                            <td style="padding: 8px 0; font-weight: bold; color: #d97706;">${soLanNhacNho} / 3</td>
                        </tr>
                    </table>
                </div>

                ${canhBao}

                <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center; line-height: 1.6;">
                    Mọi thắc mắc vui lòng liên hệ cửa hàng trực tiếp.<br>
                    Email này được gửi tự động, vui lòng không trả lời.
                </p>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">© 2025 Cửa hàng Tivi TVN. All rights reserved.</p>
            </div>
        </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[Email] Nhắc nợ gửi thành công → ${toEmail}`);
    } catch (err) {
        console.error(`[Email] Lỗi gửi nhắc nợ:`, err.message);
    }
}

module.exports = { guiBienLai, guiNhacNo };
