module.exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "Vui lòng đăng nhập để tiếp tục");
  res.redirect("/");
};

module.exports.isAdmin = (req, res, next) => {
  console.log("[isAdmin] req.user:", req.user);
  if (req.isAuthenticated() && req.user && req.user.type === "admin") {
    return next();
  }
  req.flash("error", "Bạn không có quyền truy cập trang này");
  res.redirect("/");
};

module.exports.isProjectManager = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.type === "project_manager") {
    return next();
  }
  req.flash("error", "Bạn không có quyền truy cập trang này");
  res.redirect("/");
};

module.exports.isAccountsManager = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.type === "accounts_manager") {
    return next();
  }
  req.flash("error", "Bạn không có quyền truy cập trang này");
  res.redirect("/");
};

module.exports.isEmployee = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.type === "employee") {
    return next();
  }
  req.flash("error", "Bạn không có quyền truy cập trang này");
  res.redirect("/");
};

module.exports.isManager = (req, res, next) => {
  if (req.isAuthenticated() && req.user && (req.user.type === "project_manager" || req.user.type === "accounts_manager")) {
    return next();
  }
  req.flash("error", "Bạn không có quyền truy cập trang này");
  res.redirect("/");
};

module.exports.checkAttendanceBeforeLogout = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }

  try {
    const today = new Date();
    const attendance = await require('../models/attendance').findOne({
      employeeID: req.user._id,
      date: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear()
    });

    if (attendance && attendance.checkInTime && !attendance.checkOutTime) {
      req.flash('warning', 'You have checked in but not checked out. Please check out before logging out.');
      return res.redirect(req.headers.referer || '/');
    }

    next();
  } catch (err) {
    console.error('Error checking attendance before logout:', err);
    next();
  }
};
