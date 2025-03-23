$("#menu-toggle").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled-2");
    
    // Xử lý đặc biệt khi thu gọn sidebar
    if ($("#wrapper").hasClass("toggled-2")) {
        // Ẩn tất cả submenu
        $('#menu ul').hide();
        
        // Đảm bảo các văn bản trong menu bị ẩn
        $('.sidebar-nav li a span:not(.fa-stack)').css({
            'display': 'none',
            'visibility': 'hidden',
            'width': '0',
            'height': '0',
            'opacity': '0'
        });
        
        // Xử lý icon hiển thị
        $('.sidebar-nav li a').css({
            'text-align': 'center',
            'padding': '10px 0',
            'font-size': '0'
        });
        
        $('.sidebar-nav .fa-stack, .sidebar-nav .fa-stack-1x').css({
            'margin': '0 auto',
            'font-size': '20px',
            'width': '50px',
            'display': 'inline-block',
            'text-align': 'center'
        });
        
        // Đảm bảo width của sidebar
        $('#sidebar-wrapper').css({
            'width': '50px',
            'min-width': '50px',
            'max-width': '50px'
        });
        
        // Điều chỉnh lại page content
        $('#page-content-wrapper').css({
            'margin-left': '50px',
            'width': 'calc(100% - 50px)'
        });
    } else {
        // Khôi phục lại khi mở rộng sidebar
        $('.sidebar-nav li a span:not(.fa-stack)').css({
            'display': '',
            'visibility': '',
            'width': '',
            'height': '',
            'opacity': ''
        });
        
        $('.sidebar-nav li a').css({
            'text-align': '',
            'padding': '',
            'font-size': ''
        });
        
        $('.sidebar-nav .fa-stack, .sidebar-nav .fa-stack-1x').css({
            'margin': '',
            'font-size': '',
            'width': '',
            'display': '',
            'text-align': ''
        });
        
        $('#sidebar-wrapper').css({
            'width': '250px',
            'min-width': '',
            'max-width': ''
        });
        
        $('#page-content-wrapper').css({
            'margin-left': '250px',
            'width': ''
        });
    }
});

$("#menu-toggle-2").click(function(e) {
    e.preventDefault();
    $("#wrapper").toggleClass("toggled-2");
    $('#menu ul').hide();
});

function ensureDashboardExists() {
    var dashboardExists = false;
    var firstMenuItem = $('#menu li:first-child a');
    if (firstMenuItem.length) {
        dashboardExists = firstMenuItem.text().trim().indexOf('Dashboard') !== -1;
    }
    
    if (!dashboardExists) {
        console.log('Dashboard không tồn tại, thêm vào đầu sidebar');
        
        var dashboardUrl = '/admin/';
        if (window.location.pathname.indexOf('/manager/') !== -1) {
            dashboardUrl = '/manager/';
        } else if (window.location.pathname.indexOf('/employee/') !== -1) {
            dashboardUrl = '/employee/';
        }
        
        var dashboardItem = $('<li><a href="' + dashboardUrl + '"><span class="fa-stack fa-lg pull-left"><i class="fa fa-tachometer fa-stack-1x"></i></span> Dashboard</a></li>');
        $('#menu').prepend(dashboardItem);
    }
    
    $('#menu li:first-child').addClass('active');
}

function initMenu() {
    $('#menu ul').hide();
    $('#menu ul').children('.current').parent().show();
    
    ensureDashboardExists();

    $('#menu li a').off('click').on('click', function(e) {
        if ($(this).attr('onclick')) {
            // Đảm bảo Dashboard vẫn active
            $('#menu li:first-child').addClass('active');
            // Để event bubbling xử lý modal
            return true;
        }
        
        var checkElement = $(this).next();
        
        // Xử lý submenu (như trong Employees)
        if (checkElement.is('ul')) {
            if (checkElement.is(':visible')) {
                checkElement.slideUp('normal');
                return false;
            }
            
            if (!checkElement.is(':visible')) {
                $('#menu ul:visible').slideUp('normal');
                checkElement.slideDown('normal');
                return false;
            }
        }
        
        // Nếu menu item không phải là Dashboard, thêm class active cho nó
        // nhưng vẫn giữ Dashboard active
        if (!$(this).closest('li').is(':first-child')) {
            $('#menu li').not(':first-child').removeClass('active');
            $(this).closest('li').addClass('active');
        }
    });
    
    // Đặc biệt xử lý cho Dashboard
    $('#menu li:first-child a').click(function() {
        $('#menu li').not(':first-child').removeClass('active');
        $(this).parent().addClass('active');
    });
}

$(document).ready(function() {
    // Khởi tạo menu
    initMenu();
    
    // MutationObserver để theo dõi các thay đổi trong DOM
    // và đảm bảo Dashboard luôn tồn tại khi DOM thay đổi
    if (typeof MutationObserver !== 'undefined') {
        var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    ensureDashboardExists();
                }
            });
        });
        
        // Bắt đầu quan sát
        observer.observe(document.getElementById('menu'), {
            childList: true,
            subtree: true
        });
    }
    
    // Fix cho các trang có modal
    $('.modal').on('show.bs.modal hide.bs.modal', function(e) {
        // Ngăn chặn việc thay đổi trạng thái active của menu
        e.stopPropagation();
        
        // Đảm bảo Dashboard vẫn active
        setTimeout(function() {
            ensureDashboardExists();
        }, 10);
    });
    
    // Interval để kiểm tra định kỳ và đảm bảo Dashboard luôn hiển thị
    // Đây là giải pháp dự phòng cho các trường hợp khó xác định
    setInterval(function() {
        ensureDashboardExists();
    }, 500);
    
    // Đặc biệt xử lý cho các sự kiện AJAX
    $(document).ajaxComplete(function() {
        ensureDashboardExists();
    });
});