module.exports.isLoggedIn = (req, res, next) => {
  const publicRoutes = ["/", "/signup", "/forgot-password"];
  if (publicRoutes.includes(req.path) || req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login"); // ✅ Redirect hợp lý hơn
};
