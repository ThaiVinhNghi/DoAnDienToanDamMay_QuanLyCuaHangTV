document.addEventListener('DOMContentLoaded', function() {
    // Lấy phần tử đồng hồ
    const timerDisplay = document.querySelector('.flash-sale-timer');
    
    if (timerDisplay) {
        // Set thời gian đếm ngược: 2 giờ 59 phút 59 giây (tổng cộng 10799 giây)
        let timer = 10799; 
        
        setInterval(function () {
            // Tính toán Giờ, Phút, Giây
            let hours = parseInt(timer / 3600, 10);
            let minutes = parseInt((timer % 3600) / 60, 10);
            let seconds = parseInt(timer % 60, 10);

            // Thêm số 0 đằng trước nếu nhỏ hơn 10 (Ví dụ: 09 thay vì 9)
            hours = hours < 10 ? "0" + hours : hours;
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            // Hiển thị ra màn hình
            timerDisplay.textContent = hours + ":" + minutes + ":" + seconds;

            // Trừ đi 1 giây. Nếu hết giờ thì reset lại từ đầu (Hoặc cho = 0 tùy ý bạn)
            if (--timer < 0) {
                timer = 10799; 
            }
        }, 1000); // 1000ms = 1 giây
    }
});