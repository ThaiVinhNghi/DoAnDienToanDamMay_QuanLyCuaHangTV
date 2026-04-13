HƯỚNG DẪN SỬ DỤNG ĐỒ ÁN QUẢN LÝ CỬA HÀNG TIVI
=============================================

1. THÔNG TIN CHUNG
- Tên dự án: Hệ thống quản lý Cửa hàng Tivi TVN
- Công nghệ sử dụng: Node.js, Express, EJS, MongoDB (Mongoose)
- Chức năng chính: Bán hàng trực tuyến, Giỏ hàng, Trả góp, Đổi/Trả hàng, Quản lý kho, Quản lý nhân viên/khách hàng.

2. HƯỚNG DẪN CÀI ĐẶT VÀ CHẠY DỰ ÁN
Bước 1: Cài đặt Node.js trên máy tính của bạn (tải từ web nodejs.org).
Bước 2: Mở Terminal / Command Prompt tại thư mục gốc của dự án.
Bước 3: Chạy lệnh sau để cài đặt các thư viện cần thiết:
   npm install
Bước 4: Khởi động dự án:
   node index.js
Bước 5: Mở trình duyệt web và truy cập vào địa chỉ:
   - Giao diện khách hàng (Storefront): http://localhost:3000
   - Giao diện quản trị (Admin): http://localhost:3000/admin

3. CƠ SỞ DỮ LIỆU
Dự án đã được cấu hình kết nối sẵn với MongoDB Atlas trên Cloud. Bạn không cần phải cài đặt MongoDB nội bộ, chỉ cần có kết nối Internet là dự án sẽ tự động tải dữ liệu gốc (đã được nạp sẵn).

4. THÔNG TIN TÀI KHOẢN ĐĂNG NHẬP DÙNG THỬ
Hệ thống đã có sẵn một số tài khoản cấp trước để bạn kiểm thử.

* Tài khoản Quản trị / Nhân viên (Truy cập http://localhost:3000/admin/dangnhap)
- Tài khoản Admin:
  + Tên đăng nhập: Bo
  + Mật khẩu: 123
- Tài khoản Nhân viên:
  + Tên đăng nhập: Vu
  + Mật khẩu: 123
- Tài khoản khác (nếu cần): Thuan (123) hoặc phatle (123)

* Tài khoản Khách hàng (Truy cập http://localhost:3000/dangnhap)
  + Tên đăng nhập: yenle
  + Mật khẩu: 123
  (Hoặc khách hàng có thể tự đăng ký tài khoản mới trên giao diện web. Hệ thống cấm các tài khoản đang nợ xấu đặt hàng trả góp.)

5. HƯỚNG DẪN CÁC TÍNH NĂNG CHÍNH

* Dành cho Khách hàng:
- Tìm kiếm và Lọc: Sử dụng thanh tìm kiếm hoặc bộ lọc theo hãng, mức giá ở trang chủ và trang Sản phẩm.
- Đặt hàng: Chọn sản phẩm -> Thêm vào giỏ hàng -> Vào giỏ hàng chọn phương thức thanh toán (Trả hết / Trả góp) -> Đặt hàng. (Lưu ý: Không thể đặt hàng nếu chọn số lượng vượt quá tồn kho).
- Trả góp: Mua hàng theo hình thức Trả góp sẽ hiển thị số tiền trả trước và lãi suất. Nếu khách hàng không thanh toán đúng hạn hoặc bị nhắc nhở quá 3 lần, tài khoản sẽ bị báo Trạng thái Nợ Xấu (sẽ bị cấm mua trả góp tiếp).
- Đổi/Trả hàng: Truy cập "Lịch sử mua hàng". Với các đơn hàng Đã Duyệt, chọn nút "Yêu cầu Đổi/Trả", nhập lý do và chọn sản phẩm mới (nếu là đổi hàng).

* Dành cho Quản trị viên (Admin):
- Bảng điều khiển: Xem tổng quan doanh thu, số đơn hàng đang chờ duyệt và các hóa đơn mới.
- Quản lý Hóa đơn: Duyệt hóa đơn của khách. Khi bấm duyệt, hệ thống sẽ tự động trừ kho sản phẩm và tự động tạo Hồ sơ Trả góp nếu phương thức khách chọn là Trả góp.
- Quản lý Trả góp: Theo dõi tiến độ đóng tiền hàng tháng của khách. Tại đây Admin nhấn "Thu tiền" khi khách đóng tiền hoặc "Nhắc nhở". Có thể click "Tất toán" nếu khách trả một cục.
- Quản lý Đổi/Trả hàng: Khi duyệt yêu cầu Đổi/Trả, số lượng tồn kho tự động được cập nhật hoàn lại/trừ đi tùy theo mặt hàng, và hóa đơn tương ứng sẽ được tự động đổi trạng thái.
- Quản lý Kho bằng Nhập Hàng: Bổ sung nguồn hàng bằng tính năng phiếu Nhập Hàng. Tồn kho tự động tăng lên sau khi nhập.


