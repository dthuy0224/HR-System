const locations = {
  'Hà Nội': [
    'Ba Đình', 'Hoàn Kiếm', 'Hai Bà Trưng', 'Đống Đa', 'Tây Hồ', 
    'Cầu Giấy', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên', 'Nam Từ Liêm', 
    'Bắc Từ Liêm', 'Hà Đông'
  ],
  'TP.Hồ Chí Minh': [
    'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
    'Quận 10', 'Quận 11', 'Quận 12', 'Bình Thạnh', 'Phú Nhuận', 'Tân Bình',
    'Tân Phú', 'Bình Tân', 'Gò Vấp', 'Thủ Đức'
  ],
  'Đà Nẵng': [
    'Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'
  ],
  'Hải Phòng': [
    'Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Kiến An', 'Hải An', 'Đồ Sơn', 'Dương Kinh'
  ],
  'Cần Thơ': [
    'Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt'
  ]
};

function getCities() {
  return Object.keys(locations);
}

function getDistricts(city) {
  return locations[city] || [];
}

module.exports = {
  getCities,
  getDistricts
};