module.exports = {
    workHours: {
        start: '09:00', // bắt đầu làm việc
        end: '18:00',   // kết thúc làm việc
        lateThreshold: '09:30', // đim được coi là đi muộn
        breakStart: '12:00', // bắt đầu nghỉ trưa
        breakEnd: '13:00',   // kết thúc nghỉ trưa
    },
    
    // Thời gian làm việc tiêu chuẩn (tính bằng giờ)
    standardWorkDay: 8,
    
    // Các ngưỡng tính toán trạng thái
    thresholds: {
        minWorkHours: 4, // Số giờ tối thiểu để tính là halfDay
        fullDay: 8,      // Số giờ để tính là fullDay
    },
    
    // Cấu hình tính overtime
    overtime: {
        minDuration: 1, // Số giờ tối thiểu để tính OT
        maxDuration: 4, // Số giờ tối đa được phép OT/ngày
        rates: {
            normal: 1.5,    // Hệ số lương OT ngày thường
            weekend: 2.0,   // Hệ số lương OT cuối tuần
            holiday: 3.0    // Hệ số lương OT ngày lễ
        }
    }
};